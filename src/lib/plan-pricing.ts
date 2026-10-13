import 'server-only';
import type * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
    PricingConflictError,
    parsePlanDraft,
    type DocStorePort,
    type StoredDoc,
    type PlanPricingDoc,
    type PlanPricingLog,
    type SubscriptionProduct,
    type PricingStorePort,
} from './plan-pricing-core';

export * from './plan-pricing-core';

/**
 * ราคากลางแพ็กเกจ — ส่วนที่แตะ Firestore (server-only)
 *
 * ตรรกะล้วน (ชนิดข้อมูล ค่าเริ่มต้น validation diff ลำดับการบันทึก) อยู่ใน plan-pricing-core.ts
 *
 * collection มาจาก env `PLAN_PRICING_COLLECTION` (ค่าเริ่มต้น `planPricing`)
 * ตอนใช้ Stripe test key ต้องตั้งเป็น `planPricing_test` เพราะ Firestore มีแค่ production
 * อ่าน/เขียนผ่าน Admin SDK เท่านั้น (rules เป็น default deny)
 */

export const PLAN_PRICING_LOGS_COLLECTION = 'planPricingLogs';

export function planPricingCollection(): string {
    const v = process.env.PLAN_PRICING_COLLECTION?.trim();
    return v && /^[A-Za-z0-9_-]+$/.test(v) ? v : 'planPricing';
}

/** ปุ่มบันทึกเปิดเมื่อ PRICING_WRITE_ENABLED === 'true' เท่านั้น (หลังตัวอ่านราคากลางขึ้นครบทุกเว็บ) */
export function isPricingWriteEnabled(): boolean {
    return process.env.PRICING_WRITE_ENABLED === 'true';
}

/** โหมดของ key ที่ตั้งไว้ (ไม่คืนค่า key) */
export function stripeKeyMode(): 'test' | 'live' | 'missing' | 'invalid' {
    const k = process.env.STRIPE_SECRET_KEY;
    if (!k) return 'missing';
    if (/^(sk|rk)_test_/.test(k)) return 'test';
    if (/^(sk|rk)_live_/.test(k)) return 'live';
    return 'invalid';
}

function toDoc(product: SubscriptionProduct, data: FirebaseFirestore.DocumentData | undefined): PlanPricingDoc | null {
    if (!data) return null;
    return {
        currency: 'thb',
        plans: data.plans ?? {},
        portalConfigId: typeof data.portalConfigId === 'string' ? data.portalConfigId : null,
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
        updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : '',
        // ร่างผิดรูป = ไม่มีร่าง (ไม่ทำให้หน้าพัง)
        draft: parsePlanDraft(product, data.draft),
    };
}

/** ที่เก็บจริงบน Firestore สำหรับ executeSave */
export function firestorePricingStore(db: admin.firestore.Firestore): PricingStorePort {
    const col = () => db.collection(planPricingCollection());
    return {
        async read(product: SubscriptionProduct) {
            const snap = await col().doc(product).get();
            return snap.exists ? toDoc(product, snap.data()) : null;
        },
        async commit(product, expectedUpdatedAt, build) {
            const ref = col().doc(product);
            const logRef = db.collection(PLAN_PRICING_LOGS_COLLECTION).doc();
            return db.runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                const current = snap.exists ? toDoc(product, snap.data()) : null;
                if ((current?.updatedAt || null) !== expectedUpdatedAt) throw new PricingConflictError();
                const { doc, log }: { doc: PlanPricingDoc; log: PlanPricingLog } = build(current);
                // เขียนทับทั้งเอกสาร (ไม่ merge) → ฟิลด์ draft หายไปด้วย = ร่างถูกล้างเมื่อบันทึกราคาจริงสำเร็จ
                tx.set(ref, doc);
                tx.set(logRef, log);
                return doc;
            });
        },
        async setPortalConfigId(product, portalConfigId) {
            // ไม่แตะ updatedAt: ไม่ใช่การเปลี่ยนราคา และไม่ให้แอดมินที่เปิดหน้าอยู่ชนเวอร์ชัน
            await col().doc(product).set({ portalConfigId }, { merge: true });
        },
        async commitDraft(product, expectedDraftUpdatedAt, build) {
            const ref = col().doc(product);
            const logRef = db.collection(PLAN_PRICING_LOGS_COLLECTION).doc();
            return db.runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                const current = snap.exists ? toDoc(product, snap.data()) : null;
                if ((current?.draft?.updatedAt || null) !== expectedDraftUpdatedAt) throw new PricingConflictError();
                const { patch, log } = build(current);
                // แตะเฉพาะฟิลด์ draft — plans/stripe/portalConfigId/updatedAt ของเอกสารไม่เปลี่ยน
                if (snap.exists) {
                    tx.update(ref, { draft: patch.draft ?? FieldValue.delete() });
                } else if (patch.draft) {
                    // ยังไม่มีเอกสาร: สร้างเอกสารที่มีแค่ draft — เว็บเห็นว่าไม่มี currency/plans จึงใช้ราคาใน env เหมือนเดิม
                    tx.set(ref, { draft: patch.draft });
                }
                tx.set(logRef, log);
                return patch.draft;
            });
        },
    };
}

/** doc id ใน collection ราคากลาง นอกจากแพ็กเกจ (capdeal/lawyer/wittaya/lawslane) */
/** costSheetExport = สถานะการส่งต้นทุนไป Google Sheet ล่าสุด (ดู cost-sheet-export.ts) — เว็บอื่นไม่อ่าน */
export const PRICING_DOC_IDS = { aiCredits: 'ai_credits', ebook: 'ebook', costModel: 'costModel', costSheetExport: 'costSheetExport' } as const;

/** ที่เก็บทั่วไปสำหรับเอกสารที่ไม่แตะ Stripe (wittaya, lawslane, ai_credits, ebook, costModel) */
export function firestoreDocStore(db: admin.firestore.Firestore): DocStorePort {
    const col = () => db.collection(planPricingCollection());
    return {
        async read(docId) {
            const snap = await col().doc(docId).get();
            return snap.exists ? (snap.data() as StoredDoc) : null;
        },
        async commit(docId, expectedUpdatedAt, build) {
            const ref = col().doc(docId);
            const logRef = db.collection(PLAN_PRICING_LOGS_COLLECTION).doc();
            return db.runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                const current = snap.exists ? (snap.data() as StoredDoc) : null;
                const cur = typeof current?.updatedAt === 'string' && current.updatedAt ? current.updatedAt : null;
                if (cur !== expectedUpdatedAt) throw new PricingConflictError();
                const { doc, log } = build(current);
                tx.set(ref, doc);
                tx.set(logRef, log);
                return doc;
            });
        },
    };
}
