'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { requireSuperAdmin, AuthError } from '@/lib/auth-guard';
import {
    SUBSCRIPTION_PRODUCTS,
    PRICING_CATALOG,
    PRICING_DOC_IDS,
    DEFAULT_INTERPRETER_GP_PERCENT,
    executeStoredPlanSave,
    firestoreDocStore,
    isPricingProduct,
    mergeCreditPacks,
    mergeEbook,
    saveStoredDoc,
    validateCreditPacks,
    validateEbook,
    validateGpPercent,
    PLAN_PRICING_LOGS_COLLECTION,
    type CreditPack,
    type EbookPricing,
    type StoredSaveResult,
    type SubscriptionProduct,
    checkKeyCollectionPairing,
    diffPricing,
    executeSave,
    executeDraftClear,
    executeDraftSave,
    firestorePricingStore,
    isPricingWriteEnabled,
    mergeWithDefaults,
    planPricingCollection,
    priceField,
    stripeKeyMode,
    validateDraft,
    type DraftSaveResult,
    type PlanPriceDraft,
    type PlanPricingEntry,
    type PriceChange,
    type PricingProduct,
    type SaveResult,
} from '@/lib/plan-pricing';
import { countSubscriptionsOnPrice, stripePricingPort } from '@/lib/stripe-admin';
import { mergeCostAssumptions, validateCostAssumptions, type CostAssumptions } from '@/lib/cost-model';
import { autoExportAfterSave, type SheetNotice } from '@/lib/cost-sheet-export';

/**
 * ราคาแพ็กเกจ (Super Admin เท่านั้น) — PLAN-08 เฟส 3
 *
 * ทุก action เรียก requireSuperAdmin() และเขียนผ่าน Admin SDK เท่านั้น
 * log เก็บแค่ uid ของแอดมิน (ห้ามอีเมล/ข้อมูลส่วนตัว)
 *
 * เอกสารที่ไม่แตะ Stripe (wittaya, lawslane, ai_credits, ebook, costModel) และ GP ล่าม
 * บันทึกได้โดยไม่ต้องรอ PRICING_WRITE_ENABLED (PLAN-08 เฟส 3) แต่ยังต้อง Super Admin + ยืนยัน + log
 *
 * ไม่อยู่ในขอบเขตตอนนี้: ย้ายผู้สมัครเดิมไปราคาใหม่ และอีเมลแจ้งผู้สมัคร
 * → ผู้สมัครเดิมจ่ายราคาเดิมต่อไป ราคาใหม่มีผลกับคนที่สมัครใหม่เท่านั้น
 */

/**
 * sheet = ผลส่งไป Google Sheet อัตโนมัติหลังบันทึก (COST_SHEET_AUTO_EXPORT=true) · null/ไม่มี = ไม่ได้ส่ง
 * ส่งไม่สำเร็จไม่ทำให้การบันทึกล้ม — หน้าเว็บขึ้น toast เตือนแทน
 */
type Result<T> = { ok: true; data: T; sheet?: SheetNotice | null } | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
    if (e instanceof AuthError) return { ok: false, error: 'ไม่มีสิทธิ์ดำเนินการ — ต้องเป็น Super Admin เท่านั้น' };
    if (e instanceof Error && e.message) return { ok: false, error: e.message };
    console.error('PLAN_PRICING_ACTION_ERROR');
    return { ok: false, error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' };
}

/** เหตุผลที่ยังบันทึกไม่ได้ (null = บันทึกได้) */
function writeBlockedReason(): string | null {
    if (!isPricingWriteEnabled()) {
        return 'ดูได้อย่างเดียว: ยังไม่เปิด PRICING_WRITE_ENABLED เพราะต้องรอให้ทุกเว็บอ่านราคาจากระบบกลางก่อน ไม่อย่างนั้นคนที่สมัครใหม่อาจได้แพลนผิด';
    }
    return checkKeyCollectionPairing(process.env.STRIPE_SECRET_KEY, planPricingCollection());
}

export type ProductPricingView = {
    product: SubscriptionProduct;
    /** stripe = สร้าง Price ใน Stripe ตอนบันทึก · stored = บันทึกราคาไว้ก่อน ยังไม่เปิดขายบนเว็บ */
    mode: 'stripe' | 'stored';
    plans: Record<string, PlanPricingEntry>;
    isDefault: boolean;
    updatedAt: string | null;
    portalConfigId: string | null;
    /** ราคาร่าง (CapDeal/ทนาย เท่านั้น) — ยังไม่ใช้จริง เว็บไม่อ่าน */
    draft: PlanPriceDraft | null;
};

export type PricingOverview = {
    products: ProductPricingView[];
    aiCredits: { packs: Record<string, CreditPack>; updatedAt: string | null };
    ebook: { value: EbookPricing; isDefault: boolean; updatedAt: string | null };
    /** gpPercent = ค่าที่ตั้งไว้ (null = ยังไม่เคยตั้ง ระบบจองใช้ค่าเริ่มต้น) */
    gp: { gpPercent: number | null; effective: number; updatedAt: string | null };
    costModel: { assumptions: CostAssumptions; isDefault: boolean; updatedAt: string | null };
    collection: string;
    stripeMode: 'test' | 'live' | 'missing' | 'invalid';
    writeEnabled: boolean;
    writeBlockedReason: string | null;
};

const ver = (d: { updatedAt?: unknown } | null | undefined) =>
    typeof d?.updatedAt === 'string' && d.updatedAt ? d.updatedAt : null;

export async function getPricingAction(): Promise<Result<PricingOverview>> {
    try {
        const { adminApp } = await requireSuperAdmin();
        const db = adminApp.firestore();
        const store = firestorePricingStore(db);
        const docs = firestoreDocStore(db);
        const products: ProductPricingView[] = [];
        for (const product of SUBSCRIPTION_PRODUCTS) {
            const doc = await store.read(product);
            products.push({
                product,
                mode: isPricingProduct(product) ? 'stripe' : 'stored',
                plans: mergeWithDefaults(product, doc),
                // เอกสารที่มีแค่ร่าง = ราคาจริงยังเป็นค่าเริ่มต้น
                isDefault: !doc || Object.keys(doc.plans ?? {}).length === 0,
                updatedAt: doc?.updatedAt || null,
                portalConfigId: doc?.portalConfigId ?? null,
                draft: isPricingProduct(product) ? doc?.draft ?? null : null,
            });
        }
        const [credits, ebook, cost, gpSnap] = await Promise.all([
            docs.read(PRICING_DOC_IDS.aiCredits),
            docs.read(PRICING_DOC_IDS.ebook),
            docs.read(PRICING_DOC_IDS.costModel),
            db.collection('settings').doc('interpreterFees').get(),
        ]);
        const gpData = gpSnap.data();
        const gpPercent = typeof gpData?.gpPercent === 'number' ? gpData.gpPercent : null;
        const gpAt: Date | undefined = gpData?.updatedAt?.toDate?.();
        const reason = writeBlockedReason();
        return {
            ok: true,
            data: {
                products,
                aiCredits: { packs: mergeCreditPacks(credits), updatedAt: ver(credits) },
                ebook: { value: mergeEbook(ebook), isDefault: !ebook, updatedAt: ver(ebook) },
                gp: { gpPercent, effective: gpPercent ?? DEFAULT_INTERPRETER_GP_PERCENT, updatedAt: gpAt ? gpAt.toISOString() : null },
                costModel: { assumptions: mergeCostAssumptions(cost?.assumptions), isDefault: !cost, updatedAt: ver(cost) },
                collection: planPricingCollection(),
                stripeMode: stripeKeyMode(),
                writeEnabled: reason === null,
                writeBlockedReason: reason,
            },
        };
    } catch (e) {
        return fail(e);
    }
}

export type SubscriberCount = {
    planId: string;
    interval: 'monthly' | 'yearly';
    priceId: string;
    count: number | null;
    capped: boolean;
};

export type PricingPreview = {
    changes: PriceChange[];
    subscriberCounts: SubscriberCount[];
    /** หมายเหตุเมื่อนับผู้สมัครไม่ได้ (เช่นยังไม่มี key) */
    countNote: string | null;
    stale: boolean;
};

export async function previewPriceChangeAction(product: SubscriptionProduct, draft: unknown): Promise<Result<PricingPreview>> {
    try {
        const { adminApp } = await requireSuperAdmin();
        const valid = validateDraft(product, draft);
        if (!valid.ok) return { ok: false, error: valid.errors.join(' · ') };

        const doc = await firestorePricingStore(adminApp.firestore()).read(valid.product);
        const current = mergeWithDefaults(valid.product, doc);
        const changes = diffPricing(current, valid.plans);

        // นับผู้สมัครบน Price ปัจจุบันของทุกแพลนที่มีการเปลี่ยน (นับเฉพาะ Price ที่เก็บใน Firestore)
        const subscriberCounts: SubscriberCount[] = [];
        let countNote: string | null = null;
        const changedPlans = new Set(changes.map((c) => c.planId));
        const targets: { planId: string; interval: 'monthly' | 'yearly'; priceId: string }[] = [];
        for (const planId of changedPlans) {
            for (const interval of ['monthly', 'yearly'] as const) {
                const priceId = current[planId]?.stripe?.[priceField(interval)];
                if (priceId) targets.push({ planId, interval, priceId });
            }
        }
        const keyMode = stripeKeyMode();
        if (targets.length && (keyMode === 'missing' || keyMode === 'invalid')) {
            countNote = 'นับผู้สมัครไม่ได้: ยังไม่ได้ตั้ง STRIPE_SECRET_KEY';
        } else {
            for (const t of targets) {
                try {
                    const { count, capped } = await countSubscriptionsOnPrice(t.priceId);
                    subscriberCounts.push({ ...t, count, capped });
                } catch {
                    subscriberCounts.push({ ...t, count: null, capped: false });
                    countNote = 'นับผู้สมัครบางราคาไม่สำเร็จ';
                }
            }
        }
        if (changedPlans.size > 0 && targets.length === 0 && !countNote) {
            countNote = 'ราคาปัจจุบันยังอยู่ใน env ของเว็บ (ยังไม่เคยตั้งจากหน้านี้) จึงนับผู้สมัครจากที่นี่ไม่ได้ ดูใน Stripe Dashboard';
        }

        return {
            ok: true,
            data: { changes, subscriberCounts, countNote, stale: (doc?.updatedAt || null) !== valid.baseUpdatedAt },
        };
    } catch (e) {
        return fail(e);
    }
}

export async function savePricingAction(product: SubscriptionProduct, draft: unknown): Promise<Result<SaveResult>> {
    let actorUid: string;
    let adminApp;
    try {
        ({ uid: actorUid, adminApp } = await requireSuperAdmin());
    } catch (e) {
        return fail(e);
    }
    const blocked = writeBlockedReason();
    if (blocked) return { ok: false, error: blocked };

    try {
        const result = await executeSave(
            { stripe: stripePricingPort, store: firestorePricingStore(adminApp.firestore()), now: () => new Date() },
            product,
            draft,
            actorUid,
        );
        if (result.status !== 'ok') {
            // log แค่ uid + ขั้นที่ล้ม ไม่ log payload
            console.error('PLAN_PRICING_SAVE', {
                actorUid,
                product: PRICING_CATALOG[product as PricingProduct] ? product : 'unknown',
                status: result.status,
                step: result.status === 'error' ? result.step : result.failed.map((f) => f.step).join(','),
            });
        }
        // Firestore เขียนแล้ว (ok/partial) = ราคาจริงเปลี่ยน → ส่ง Sheet ถ้าเปิดอัตโนมัติ
        const sheet = result.status === 'error' ? null : await autoExportAfterSave(adminApp.firestore(), actorUid);
        return { ok: true, data: result, sheet };
    } catch (e) {
        return fail(e);
    }
}

// ---------------------------------------------------------------------------
// ราคาร่าง CapDeal / ทนาย (ยังไม่ใช้จริง)
// ---------------------------------------------------------------------------

/**
 * บันทึกราคาร่างลงฟิลด์ `draft` อย่างเดียว — ไม่แตะ Stripe และไม่เปลี่ยน plans/stripe/portalConfigId
 * จึงไม่ล็อกด้วย PRICING_WRITE_ENABLED / STRIPE_SECRET_KEY (เว็บยังแสดงและเก็บเงินราคาเดิม)
 * @param expectedUpdatedAt updatedAt ของร่างตอนเปิดหน้า (null = ยังไม่มีร่าง) ใช้กันแก้ชนกัน
 */
export async function saveStripePlanDraftAction(
    product: PricingProduct, draft: unknown, expectedUpdatedAt?: string | null,
): Promise<Result<DraftSaveResult>> {
    try {
        const { uid, adminApp } = await requireSuperAdmin();
        const r = await executeDraftSave(
            { store: firestorePricingStore(adminApp.firestore()), now: () => new Date() },
            product, draft, expectedUpdatedAt ?? null, uid,
        );
        if (r.status === 'error') console.error('PLAN_PRICING_DRAFT_SAVE', { actorUid: uid, step: r.step });
        return { ok: true, data: r };
    } catch (e) {
        return fail(e);
    }
}

/** ล้างราคาร่าง (ไม่มีผลกับเว็บ) */
export async function clearStripePlanDraftAction(product: PricingProduct, expectedUpdatedAt: string): Promise<Result<DraftSaveResult>> {
    try {
        const { uid, adminApp } = await requireSuperAdmin();
        const r = await executeDraftClear(
            { store: firestorePricingStore(adminApp.firestore()), now: () => new Date() },
            product, expectedUpdatedAt, uid,
        );
        if (r.status === 'error') console.error('PLAN_PRICING_DRAFT_CLEAR', { actorUid: uid, step: r.step });
        return { ok: true, data: r };
    } catch (e) {
        return fail(e);
    }
}

// ---------------------------------------------------------------------------
// บันทึกที่ไม่แตะ Stripe
// ---------------------------------------------------------------------------

async function storedGuard() {
    const { uid, adminApp } = await requireSuperAdmin();
    return { uid, db: adminApp.firestore() };
}

function logStoredFailure(actorUid: string, docId: string, r: StoredSaveResult) {
    if (r.status === 'error') console.error('PLAN_PRICING_STORED_SAVE', { actorUid, docId, step: r.step });
}

/** ราคาแพ็กเกจที่ยังไม่เปิดขาย (wittaya / lawslane) — Firestore อย่างเดียว */
export async function saveStoredPlanPricingAction(product: SubscriptionProduct, draft: unknown): Promise<Result<StoredSaveResult>> {
    try {
        const { uid, db } = await storedGuard();
        const r = await executeStoredPlanSave({ store: firestoreDocStore(db), now: () => new Date() }, product, draft, uid);
        logStoredFailure(uid, String(product), r);
        const sheet = r.status === 'ok' ? await autoExportAfterSave(db, uid) : null;
        return { ok: true, data: r, sheet };
    } catch (e) {
        return fail(e);
    }
}

export async function saveCreditPacksAction(draft: unknown): Promise<Result<StoredSaveResult>> {
    try {
        const { uid, db } = await storedGuard();
        const v = validateCreditPacks(draft);
        if (!v.ok) return { ok: true, data: { status: 'error', step: 'validate', message: v.errors.join(' · ') } };
        const r = await saveStoredDoc({ store: firestoreDocStore(db), now: () => new Date() },
            PRICING_DOC_IDS.aiCredits, { currency: 'thb', packs: v.packs }, v.baseUpdatedAt, uid);
        logStoredFailure(uid, PRICING_DOC_IDS.aiCredits, r);
        return { ok: true, data: r };
    } catch (e) {
        return fail(e);
    }
}

export async function saveEbookAction(draft: unknown): Promise<Result<StoredSaveResult>> {
    try {
        const { uid, db } = await storedGuard();
        const v = validateEbook(draft);
        if (!v.ok) return { ok: true, data: { status: 'error', step: 'validate', message: v.errors.join(' · ') } };
        const r = await saveStoredDoc({ store: firestoreDocStore(db), now: () => new Date() },
            PRICING_DOC_IDS.ebook, { currency: 'thb', ...v.value }, v.baseUpdatedAt, uid);
        logStoredFailure(uid, PRICING_DOC_IDS.ebook, r);
        return { ok: true, data: r };
    } catch (e) {
        return fail(e);
    }
}

export async function saveCostModelAction(draft: { assumptions: unknown; baseUpdatedAt: string | null }): Promise<Result<StoredSaveResult>> {
    try {
        const { uid, db } = await storedGuard();
        const v = validateCostAssumptions(draft?.assumptions);
        if (!v.ok) return { ok: true, data: { status: 'error', step: 'validate', message: `ช่องที่ไม่ถูกต้อง: ${v.errors.join(', ')}` } };
        const base = draft?.baseUpdatedAt;
        if (base !== null && typeof base !== 'string') return { ok: false, error: 'ข้อมูลเวอร์ชันไม่ถูกต้อง โหลดหน้าใหม่' };
        const r = await saveStoredDoc({ store: firestoreDocStore(db), now: () => new Date() },
            PRICING_DOC_IDS.costModel, { assumptions: v.value }, base, uid);
        logStoredFailure(uid, PRICING_DOC_IDS.costModel, r);
        const sheet = r.status === 'ok' ? await autoExportAfterSave(db, uid) : null;
        return { ok: true, data: r, sheet };
    } catch (e) {
        return fail(e);
    }
}

/**
 * GP ทนาย (PLAN-10) — มีผลทันทีกับค่าทนายที่ลูกความชำระใหม่ (เว็บหลักอ่าน settings/lawyerFees.gpPercent)
 * การชำระที่เกิดแล้วเก็บ gpPercent ไว้ในเอกสาร lawyerPayments จึงไม่เปลี่ยน · Super Admin เท่านั้น
 */
export async function setLawyerGpAction(gpPercent: unknown): Promise<Result<{ gpPercent: number }>> {
    try {
        const { uid, db } = await storedGuard();
        const v = validateGpPercent(gpPercent);
        if (!v.ok) return { ok: false, error: v.error };
        const ref = db.collection('settings').doc('lawyerFees');
        const logRef = db.collection(PLAN_PRICING_LOGS_COLLECTION).doc();
        await db.runTransaction(async (tx) => {
            const before = (await tx.get(ref)).data();
            tx.set(ref, { gpPercent: v.value, updatedAt: FieldValue.serverTimestamp(), updatedBy: uid }, { merge: true });
            tx.set(logRef, {
                product: 'lawyer_gp',
                before: { gpPercent: typeof before?.gpPercent === 'number' ? before.gpPercent : null },
                after: { gpPercent: v.value },
                createdPriceIds: [],
                actorUid: uid,
                at: new Date().toISOString(),
            });
        });
        return { ok: true, data: { gpPercent: v.value } };
    } catch (e) {
        return fail(e);
    }
}

/**
 * GP ล่าม — มีผลทันทีกับการจองใหม่ (ระบบจองล่ามอ่าน settings/interpreterFees.gpPercent)
 * งานที่จองแล้วเก็บ gpPercent ไว้ใน quote จึงไม่เปลี่ยน
 * ย้ายมาจาก interpreter-admin-actions.ts (เดิมใช้สิทธิ์ financials.interpreterPayouts) → Super Admin เท่านั้น
 */
export async function setInterpreterGpAction(gpPercent: unknown): Promise<Result<{ gpPercent: number }>> {
    try {
        const { uid, db } = await storedGuard();
        const v = validateGpPercent(gpPercent);
        if (!v.ok) return { ok: false, error: v.error };
        const ref = db.collection('settings').doc('interpreterFees');
        const logRef = db.collection(PLAN_PRICING_LOGS_COLLECTION).doc();
        await db.runTransaction(async (tx) => {
            const before = (await tx.get(ref)).data();
            tx.set(ref, { gpPercent: v.value, updatedAt: FieldValue.serverTimestamp(), updatedBy: uid }, { merge: true });
            tx.set(logRef, {
                product: 'interpreter_gp',
                before: { gpPercent: typeof before?.gpPercent === 'number' ? before.gpPercent : null },
                after: { gpPercent: v.value },
                createdPriceIds: [],
                actorUid: uid,
                at: new Date().toISOString(),
            });
        });
        const sheet = await autoExportAfterSave(db, uid);
        return { ok: true, data: { gpPercent: v.value }, sheet };
    } catch (e) {
        return fail(e);
    }
}
