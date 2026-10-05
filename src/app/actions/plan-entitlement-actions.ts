'use server';

import * as admin from 'firebase-admin';
import { requireAdmin, AuthError } from '@/lib/auth-guard';
import {
    PLAN_CATALOG,
    PlanProduct,
    PlanValues,
    isPlanProduct,
    mergeWithDefaults,
    sanitizePlans,
} from '@/lib/plan-entitlements';

/**
 * แพ็กเกจและสิทธิ์ของลูกค้า CapDeal / Wittaya
 *
 * ทุก action ผ่าน requireAdmin(<สิทธิ์ของผลิตภัณฑ์นั้น>) และเขียนผ่าน Admin SDK เท่านั้น
 * (client เขียน planEntitlements / users.planGrants เองไม่ได้ตาม firestore.rules)
 *
 * การมอบแพ็กเกจเก็บ 2 ที่:
 *   - `users/{uid}.planGrants.{product}` = { planId, expiresAt, grantedAt } เท่าที่แอปต้องใช้ตัดสิน
 *     ⚠️ ลูกค้าอ่านเอกสาร users ของตัวเองได้ จึงห้ามใส่หมายเหตุภายในหรืออีเมลแอดมินตรงนี้
 *   - `planGrantRecords/{product}_{uid}` = รายละเอียดสำหรับหลังบ้าน (หมายเหตุ ผู้มอบ) — ไม่มีกฎ = client อ่านไม่ได้
 * ทุกการเปลี่ยนแปลงบันทึกลง `planGrantLogs` ว่าใครทำอะไรเมื่อไร
 */

type Result<T = null> = { ok: true; data: T } | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    if (e instanceof Error && e.message) return { ok: false, error: e.message };
    console.error('PLAN_ENTITLEMENT_ACTION_ERROR', e);
    return { ok: false, error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' };
}

async function guard(product: unknown) {
    if (!isPlanProduct(product)) throw new Error('ไม่รู้จักผลิตภัณฑ์นี้');
    const session = await requireAdmin(PLAN_CATALOG[product].permission);
    return { product, db: session.adminApp.firestore(), admin: session };
}

function toIso(v: any): string | null {
    const d: Date | undefined = v?.toDate?.();
    return d ? d.toISOString() : null;
}

async function log(
    db: admin.firestore.Firestore,
    entry: { product: PlanProduct; action: string; by: { uid: string; email?: string }; [k: string]: unknown },
) {
    await db.collection('planGrantLogs').add({ ...entry, at: admin.firestore.FieldValue.serverTimestamp() });
}

// ---------------------------------------------------------------------------
// สิทธิ์ของแต่ละแพ็กเกจ
// ---------------------------------------------------------------------------

export type PlanConfig = {
    plans: Record<string, PlanValues>;
    isDefault: boolean;
    updatedAt: string | null;
    updatedByEmail: string | null;
};

export async function getPlanConfigAction(product: PlanProduct): Promise<Result<PlanConfig>> {
    try {
        const { db } = await guard(product);
        const snap = await db.collection('planEntitlements').doc(product).get();
        const data = snap.data();
        return {
            ok: true,
            data: {
                plans: mergeWithDefaults(product, data?.plans),
                isDefault: !snap.exists,
                updatedAt: toIso(data?.updatedAt),
                updatedByEmail: data?.updatedBy?.email ?? null,
            },
        };
    } catch (e) {
        return fail(e);
    }
}

export async function savePlanConfigAction(product: PlanProduct, plans: unknown): Promise<Result> {
    try {
        const { db, admin: session } = await guard(product);
        const clean = sanitizePlans(product, plans);
        const by = { uid: session.uid, email: session.token.email ?? null };
        const ref = db.collection('planEntitlements').doc(product);
        const before = (await ref.get()).data()?.plans ?? null;
        await ref.set({ plans: clean, updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: by });
        await log(db, { product, action: 'config.update', by: { uid: session.uid, email: session.token.email }, before, after: clean });
        return { ok: true, data: null };
    } catch (e) {
        return fail(e);
    }
}

// ---------------------------------------------------------------------------
// มอบแพ็กเกจให้ลูกค้ารายคน
// ---------------------------------------------------------------------------

export type CustomerPlanRow = {
    uid: string;
    name: string | null;
    email: string | null;
    grant: { planId: string; expiresAt: string | null; note: string | null; grantedAt: string | null; grantedByEmail: string | null } | null;
    /** แพ็กเกจที่จ่ายผ่าน Stripe (CapDeal เท่านั้น) */
    stripe: { planId: string | null; status: string | null; currentPeriodEnd: string | null } | null;
};

function recordRef(db: admin.firestore.Firestore, product: PlanProduct, uid: string) {
    return db.collection('planGrantRecords').doc(`${product}_${uid}`);
}

function toRow(
    product: PlanProduct,
    doc: admin.firestore.DocumentSnapshot,
    record?: admin.firestore.DocumentData | null,
): CustomerPlanRow {
    const d = doc.data() ?? {};
    // เอกสาร users คือสิ่งที่แอปใช้ตัดสินจริง — record เอาไว้แค่หมายเหตุ/ผู้มอบ
    const g = d.planGrants?.[product];
    return {
        uid: doc.id,
        name: d.name ?? d.displayName ?? null,
        email: d.email ?? null,
        grant: g?.planId ? {
            planId: g.planId,
            expiresAt: toIso(g.expiresAt),
            note: record?.note ?? null,
            grantedAt: toIso(g.grantedAt),
            grantedByEmail: record?.grantedBy?.email ?? null,
        } : null,
        stripe: product === 'capdeal' && d.subscription ? {
            planId: d.subscription.planId ?? null,
            status: d.subscription.status ?? null,
            currentPeriodEnd: toIso(d.subscription.currentPeriodEnd),
        } : null,
    };
}

async function withRecords(
    db: admin.firestore.Firestore,
    product: PlanProduct,
    docs: admin.firestore.DocumentSnapshot[],
): Promise<CustomerPlanRow[]> {
    if (docs.length === 0) return [];
    const records = await db.getAll(...docs.map(doc => recordRef(db, product, doc.id)));
    return docs.map((doc, i) => toRow(product, doc, records[i].data() ?? null));
}

/** ลูกค้าที่ได้รับแพ็กเกจจากแอดมินอยู่ (รวมที่หมดอายุแล้วแต่ยังไม่ได้ถอน) */
export async function listPlanGrantsAction(product: PlanProduct): Promise<Result<CustomerPlanRow[]>> {
    try {
        const { db } = await guard(product);
        const granted = PLAN_CATALOG[product].plans.map(p => p.id).filter(id => id !== PLAN_CATALOG[product].basePlan);
        if (product === 'lawyer') {
            const snap = await db.collection('lawyerProfiles').where('planGrant.tier', 'in', granted).limit(300).get();
            const rows = await withLawyerRecords(db, snap.docs);
            rows.sort((a, b) => (b.grant?.grantedAt ?? '').localeCompare(a.grant?.grantedAt ?? ''));
            return { ok: true, data: rows };
        }
        const snap = await db.collection('users')
            .where(`planGrants.${product}.planId`, 'in', granted)
            .limit(300)
            .get();
        const rows = await withRecords(db, product, snap.docs);
        rows.sort((a, b) => (b.grant?.grantedAt ?? '').localeCompare(a.grant?.grantedAt ?? ''));
        return { ok: true, data: rows };
    } catch (e) {
        return fail(e);
    }
}

/** หาลูกค้าด้วยอีเมล (ตรงตัว) หรือ UID */
export async function findCustomerAction(product: PlanProduct, query: string): Promise<Result<CustomerPlanRow[]>> {
    try {
        const { db, admin: session } = await guard(product);
        const q = (query ?? '').trim();
        if (!q || q.length > 200) return { ok: true, data: [] };
        if (product === 'lawyer') return { ok: true, data: await findLawyers(db, session, q) };

        const found = new Map<string, admin.firestore.DocumentSnapshot>();
        if (q.includes('@')) {
            const lower = q.toLowerCase();
            const snaps = await Promise.all(
                [...new Set([q, lower])].map(email => db.collection('users').where('email', '==', email).limit(5).get()),
            );
            snaps.forEach(s => s.docs.forEach(doc => found.set(doc.id, doc)));
            if (found.size === 0) {
                // เอกสาร users ไม่มีอีเมล (เช่นสมัครผ่าน LINE แล้วผูกอีเมลทีหลัง) — ลองจาก Firebase Auth
                const authUser = await session.adminApp.auth().getUserByEmail(lower).catch(() => null);
                if (authUser) {
                    const doc = await db.collection('users').doc(authUser.uid).get();
                    if (doc.exists) found.set(doc.id, doc);
                }
            }
        } else if (/^[A-Za-z0-9_-]{6,128}$/.test(q)) {
            const doc = await db.collection('users').doc(q).get();
            if (doc.exists) found.set(doc.id, doc);
        }
        return { ok: true, data: await withRecords(db, product, [...found.values()]) };
    } catch (e) {
        return fail(e);
    }
}

export async function grantPlanAction(
    product: PlanProduct,
    uid: string,
    planId: string,
    expiresAt: string | null,
    note: string,
): Promise<Result> {
    try {
        const { db, admin: session } = await guard(product);
        const catalog = PLAN_CATALOG[product];
        if (!catalog.plans.some(p => p.id === planId) || planId === catalog.basePlan) {
            throw new Error('เลือกแพ็กเกจที่จะมอบ');
        }
        if (typeof uid !== 'string' || !/^[A-Za-z0-9_-]{6,128}$/.test(uid)) throw new Error('ไม่พบลูกค้า');

        let expires: Date | null = null;
        if (expiresAt) {
            expires = new Date(expiresAt);
            if (Number.isNaN(expires.getTime())) throw new Error('วันหมดอายุไม่ถูกต้อง');
            if (expires.getTime() <= Date.now()) throw new Error('วันหมดอายุต้องอยู่ในอนาคต');
        }
        const cleanNote = (note ?? '').trim().slice(0, 500);
        if (product === 'lawyer') {
            await grantLawyerPlan(db, session, uid, planId, expires, cleanNote);
            return { ok: true, data: null };
        }

        const ref = db.collection('users').doc(uid);
        const snap = await ref.get();
        if (!snap.exists) throw new Error('ไม่พบลูกค้า');
        const before = snap.data()?.planGrants?.[product] ?? null;

        const now = admin.firestore.FieldValue.serverTimestamp();
        const expiresTs = expires ? admin.firestore.Timestamp.fromDate(expires) : null;
        const batch = db.batch();
        // update() กับ field path — ไม่ทับ planGrants ของผลิตภัณฑ์อื่น
        batch.update(ref, { [`planGrants.${product}`]: { planId, expiresAt: expiresTs, grantedAt: now } });
        batch.set(recordRef(db, product, uid), {
            product, uid, planId,
            expiresAt: expiresTs,
            note: cleanNote || null,
            grantedAt: now,
            grantedBy: { uid: session.uid, email: session.token.email ?? null },
        });
        await batch.commit();
        await log(db, {
            product, action: 'grant.set', uid, planId,
            expiresAt: expires?.toISOString() ?? null, note: cleanNote || null,
            before: before ? { planId: before.planId ?? null, expiresAt: toIso(before.expiresAt) } : null,
            by: { uid: session.uid, email: session.token.email },
        });
        return { ok: true, data: null };
    } catch (e) {
        return fail(e);
    }
}

export async function revokePlanAction(product: PlanProduct, uid: string): Promise<Result> {
    try {
        const { db, admin: session } = await guard(product);
        if (typeof uid !== 'string' || !/^[A-Za-z0-9_-]{6,128}$/.test(uid)) throw new Error('ไม่พบลูกค้า');
        if (product === 'lawyer') {
            await revokeLawyerPlan(db, session, uid);
            return { ok: true, data: null };
        }
        const ref = db.collection('users').doc(uid);
        const snap = await ref.get();
        if (!snap.exists) throw new Error('ไม่พบลูกค้า');
        const before = snap.data()?.planGrants?.[product] ?? null;
        const batch = db.batch();
        batch.update(ref, { [`planGrants.${product}`]: admin.firestore.FieldValue.delete() });
        batch.delete(recordRef(db, product, uid));
        await batch.commit();
        await log(db, {
            product, action: 'grant.revoke', uid,
            before: before ? { planId: before.planId ?? null, expiresAt: toIso(before.expiresAt) } : null,
            by: { uid: session.uid, email: session.token.email },
        });
        return { ok: true, data: null };
    } catch (e) {
        return fail(e);
    }
}

// ---------------------------------------------------------------------------
// ทนาย — แพลนอยู่บน lawyerProfiles (ไม่ใช่ users) · row.uid ของทนาย = รหัสโปรไฟล์ทนาย
// ฝั่งเว็บทนายอ่าน lawyerProfiles.planGrant ผ่าน grantTier()/lawyerTier() ใน Lawlanes/src/lib/provider-plans.ts
// ---------------------------------------------------------------------------

type AdminSession = Awaited<ReturnType<typeof requireAdmin>>;

function isoOf(v: any): string | null {
    if (typeof v === 'string') return v;
    return toIso(v);
}

function toLawyerRow(doc: admin.firestore.DocumentSnapshot, record?: admin.firestore.DocumentData | null, email?: string | null): CustomerPlanRow {
    const d = doc.data() ?? {};
    const g = d.planGrant;
    return {
        uid: doc.id,
        name: d.name ?? null,
        email: email ?? d.email ?? null,
        grant: g?.tier ? {
            planId: g.tier,
            expiresAt: toIso(g.expiresAt),
            note: record?.note ?? null,
            grantedAt: toIso(g.grantedAt),
            grantedByEmail: record?.grantedBy?.email ?? null,
        } : null,
        stripe: d.plan?.tier ? {
            planId: d.plan.tier,
            status: d.plan.status ?? null,
            currentPeriodEnd: isoOf(d.plan.currentPeriodEnd),
        } : null,
    };
}

async function withLawyerRecords(db: admin.firestore.Firestore, docs: admin.firestore.DocumentSnapshot[], emails?: Map<string, string>) {
    if (docs.length === 0) return [];
    const records = await db.getAll(...docs.map(doc => recordRef(db, 'lawyer', doc.id)));
    return docs.map((doc, i) => toLawyerRow(doc, records[i].data() ?? null, emails?.get(doc.id)));
}

/** หาทนายด้วยอีเมล, UID ผู้ใช้, รหัสโปรไฟล์ หรือต้นชื่อ */
async function findLawyers(db: admin.firestore.Firestore, session: AdminSession, q: string): Promise<CustomerPlanRow[]> {
    const found = new Map<string, admin.firestore.DocumentSnapshot>();
    const emails = new Map<string, string>();
    const byUserId = async (uid: string, email?: string) => {
        const snap = await db.collection('lawyerProfiles').where('userId', '==', uid).limit(3).get();
        snap.docs.forEach(doc => { found.set(doc.id, doc); if (email) emails.set(doc.id, email); });
    };

    if (q.includes('@')) {
        const lower = q.toLowerCase();
        const [profiles, users] = await Promise.all([
            Promise.all([...new Set([q, lower])].map(email => db.collection('lawyerProfiles').where('email', '==', email).limit(5).get())),
            Promise.all([...new Set([q, lower])].map(email => db.collection('users').where('email', '==', email).limit(5).get())),
        ]);
        profiles.forEach(s => s.docs.forEach(doc => found.set(doc.id, doc)));
        for (const s of users) for (const u of s.docs) await byUserId(u.id, u.get('email'));
        if (found.size === 0) {
            const authUser = await session.adminApp.auth().getUserByEmail(lower).catch(() => null);
            if (authUser) await byUserId(authUser.uid, authUser.email ?? undefined);
        }
    } else if (/^[A-Za-z0-9_-]{6,128}$/.test(q)) {
        const doc = await db.collection('lawyerProfiles').doc(q).get();
        if (doc.exists) found.set(doc.id, doc);
        else await byUserId(q);
    }
    if (found.size === 0 && !q.includes('@')) {
        // ชื่อทนาย (ตรงต้นชื่อ ตัวพิมพ์ตามที่บันทึกไว้)
        const snap = await db.collection('lawyerProfiles').orderBy('name').startAt(q).endAt(q + '\uf8ff').limit(10).get();
        snap.docs.forEach(doc => found.set(doc.id, doc));
    }
    return withLawyerRecords(db, [...found.values()], emails);
}

async function grantLawyerPlan(db: admin.firestore.Firestore, session: AdminSession, profileId: string, tier: string, expires: Date | null, note: string) {
    const ref = db.collection('lawyerProfiles').doc(profileId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('ไม่พบทนาย');
    const before = snap.data()?.planGrant ?? null;
    const now = admin.firestore.FieldValue.serverTimestamp();
    const expiresTs = expires ? admin.firestore.Timestamp.fromDate(expires) : null;
    const batch = db.batch();
    batch.update(ref, { planGrant: { tier, expiresAt: expiresTs, grantedAt: now } });
    batch.set(recordRef(db, 'lawyer', profileId), {
        product: 'lawyer', uid: profileId, lawyerUserId: snap.get('userId') ?? null, planId: tier,
        expiresAt: expiresTs,
        note: note || null,
        grantedAt: now,
        grantedBy: { uid: session.uid, email: session.token.email ?? null },
    });
    await batch.commit();
    await log(db, {
        product: 'lawyer', action: 'grant.set', uid: profileId, planId: tier,
        expiresAt: expires?.toISOString() ?? null, note: note || null,
        before: before ? { planId: before.tier ?? null, expiresAt: toIso(before.expiresAt) } : null,
        by: { uid: session.uid, email: session.token.email },
    });
}

async function revokeLawyerPlan(db: admin.firestore.Firestore, session: AdminSession, profileId: string) {
    const ref = db.collection('lawyerProfiles').doc(profileId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('ไม่พบทนาย');
    const before = snap.data()?.planGrant ?? null;
    const batch = db.batch();
    batch.update(ref, { planGrant: admin.firestore.FieldValue.delete() });
    batch.delete(recordRef(db, 'lawyer', profileId));
    await batch.commit();
    await log(db, {
        product: 'lawyer', action: 'grant.revoke', uid: profileId,
        before: before ? { planId: before.tier ?? null, expiresAt: toIso(before.expiresAt) } : null,
        by: { uid: session.uid, email: session.token.email },
    });
}
