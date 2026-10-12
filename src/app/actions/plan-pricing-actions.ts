'use server';

import { requireSuperAdmin, AuthError } from '@/lib/auth-guard';
import {
    PRICING_PRODUCTS,
    PRICING_CATALOG,
    checkKeyCollectionPairing,
    diffPricing,
    executeSave,
    firestorePricingStore,
    isPricingWriteEnabled,
    mergeWithDefaults,
    planPricingCollection,
    priceField,
    stripeKeyMode,
    validateDraft,
    type PlanPricingEntry,
    type PriceChange,
    type PricingProduct,
    type SaveResult,
} from '@/lib/plan-pricing';
import { countSubscriptionsOnPrice, stripePricingPort } from '@/lib/stripe-admin';

/**
 * ราคาแพ็กเกจ (Super Admin เท่านั้น) — PLAN-08 เฟส 3
 *
 * ทุก action เรียก requireSuperAdmin() และเขียนผ่าน Admin SDK เท่านั้น
 * log เก็บแค่ uid ของแอดมิน (ห้ามอีเมล/ข้อมูลส่วนตัว)
 *
 * ไม่อยู่ในขอบเขตตอนนี้: ย้ายผู้สมัครเดิมไปราคาใหม่ และอีเมลแจ้งผู้สมัคร
 * → ผู้สมัครเดิมจ่ายราคาเดิมต่อไป ราคาใหม่มีผลกับคนที่สมัครใหม่เท่านั้น
 */

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

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
    product: PricingProduct;
    plans: Record<string, PlanPricingEntry>;
    isDefault: boolean;
    updatedAt: string | null;
    portalConfigId: string | null;
};

export type PricingOverview = {
    products: ProductPricingView[];
    collection: string;
    stripeMode: 'test' | 'live' | 'missing' | 'invalid';
    writeEnabled: boolean;
    writeBlockedReason: string | null;
};

export async function getPricingAction(): Promise<Result<PricingOverview>> {
    try {
        const { adminApp } = await requireSuperAdmin();
        const store = firestorePricingStore(adminApp.firestore());
        const products: ProductPricingView[] = [];
        for (const product of PRICING_PRODUCTS) {
            const doc = await store.read(product);
            products.push({
                product,
                plans: mergeWithDefaults(product, doc),
                isDefault: !doc,
                updatedAt: doc?.updatedAt || null,
                portalConfigId: doc?.portalConfigId ?? null,
            });
        }
        const reason = writeBlockedReason();
        return {
            ok: true,
            data: {
                products,
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

export async function previewPriceChangeAction(product: PricingProduct, draft: unknown): Promise<Result<PricingPreview>> {
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

export async function savePricingAction(product: PricingProduct, draft: unknown): Promise<Result<SaveResult>> {
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
        return { ok: true, data: result };
    } catch (e) {
        return fail(e);
    }
}
