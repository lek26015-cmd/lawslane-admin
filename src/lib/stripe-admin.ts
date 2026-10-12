import 'server-only';
import { createHash } from 'node:crypto';
import Stripe from 'stripe';
import {
    PRICING_CATALOG,
    STRIPE_PRODUCT_TAG,
    stripeInterval,
    type CreatePriceInput,
    type PricingProduct,
    type PricingStripePort,
} from './plan-pricing-core';

/**
 * Stripe ฝั่งหลังบ้าน — ใช้กับหน้า "ราคาแพ็กเกจ" (Super Admin) เท่านั้น
 *
 * key: env `STRIPE_SECRET_KEY` เป็น Restricted key ของ admin (ห้ามใช้ secret key ตัวเต็ม)
 *   - Products: Write · Prices: Write
 *   - Customer portal (Billing Portal configurations): Write
 *   - Subscriptions: Read
 * repo เป็น public: ห้าม hardcode key และห้ามมี prefix NEXT_PUBLIC_
 *
 * metadata ใส่ได้แค่ product / planId / interval (ห้ามข้อมูลส่วนตัว)
 * ทุก create ใส่ idempotencyKey
 */

let client: Stripe | null = null;

/** สร้าง client ครั้งแรกที่ใช้ (ไม่สร้างตอน import เพื่อไม่ให้ build ต้องมี key) */
export function getStripe(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('ยังไม่ได้ตั้ง STRIPE_SECRET_KEY');
    if (!client) {
        client = new Stripe(key, {
            maxNetworkRetries: 2,
            appInfo: { name: 'lawslane-admin-plan-pricing' },
        });
    }
    return client;
}

function planName(product: PricingProduct, planId: string): string {
    const cat = PRICING_CATALOG[product];
    const plan = cat.plans.find((p) => p.id === planId);
    return `${cat.stripeName} ${plan?.name ?? planId}`;
}

/** Product ของ (product, planId): ใช้ id ที่เก็บไว้ → ค้นจาก metadata → สร้างใหม่ */
export async function ensureProduct(product: PricingProduct, planId: string, storedProductId?: string | null): Promise<string> {
    const stripe = getStripe();
    const tag = STRIPE_PRODUCT_TAG[product];
    if (storedProductId) {
        const p = await stripe.products.retrieve(storedProductId);
        if (p.metadata?.product !== tag || p.metadata?.planId !== planId) {
            throw new Error(`Product ${storedProductId} ไม่ใช่ของ ${tag}/${planId}`);
        }
        if (!p.active) await stripe.products.update(storedProductId, { active: true });
        return p.id;
    }
    // planId เป็นค่าจาก catalog ในโค้ด (a-z) จึงใส่ใน query ได้ปลอดภัย
    const found = await stripe.products.search({
        query: `metadata['product']:'${tag}' AND metadata['planId']:'${planId}'`,
        limit: 10,
    });
    const existing = found.data.find((p) => p.active) ?? found.data[0];
    if (existing) {
        if (!existing.active) await stripe.products.update(existing.id, { active: true });
        return existing.id;
    }
    const created = await stripe.products.create(
        { name: planName(product, planId), metadata: { product: tag, planId } },
        { idempotencyKey: `planPricing:product:${product}:${planId}` },
    );
    return created.id;
}

/** Price ที่ยัง active ตรงยอด/รอบ/metadata — กันสร้างซ้ำตอนกด "ลองใหม่" หลัง idempotencyKey หมดอายุ (24 ชม.) */
export async function findActivePrice(input: Omit<CreatePriceInput, 'idempotencyKey'>): Promise<string | null> {
    const stripe = getStripe();
    const tag = STRIPE_PRODUCT_TAG[input.product];
    const interval = stripeInterval(input.interval);
    for await (const price of stripe.prices.list({
        product: input.productId, active: true, currency: 'thb', type: 'recurring', limit: 100,
    })) {
        if (
            price.unit_amount === input.amountBaht * 100 &&
            price.recurring?.interval === interval &&
            (price.recurring?.interval_count ?? 1) === 1 &&
            price.metadata?.product === tag &&
            price.metadata?.planId === input.planId &&
            price.metadata?.interval === input.interval
        ) {
            return price.id;
        }
    }
    return null;
}

export async function createPrice(input: CreatePriceInput): Promise<string> {
    const stripe = getStripe();
    const price = await stripe.prices.create(
        {
            product: input.productId,
            currency: 'thb',
            unit_amount: input.amountBaht * 100,
            recurring: { interval: stripeInterval(input.interval) },
            metadata: { product: STRIPE_PRODUCT_TAG[input.product], planId: input.planId, interval: input.interval },
        },
        { idempotencyKey: input.idempotencyKey },
    );
    return price.id;
}

/**
 * ปิดขาย Price เก่า: subscription เดิมยังถูกเรียกเก็บตามปกติ แค่ใช้เปิด Checkout ใหม่ไม่ได้
 * @returns true ถ้าเพิ่งปิด, false ถ้าปิดอยู่แล้ว
 */
export async function archivePrice(priceId: string): Promise<boolean> {
    const stripe = getStripe();
    const price = await stripe.prices.retrieve(priceId);
    if (!price.active) return false;
    await stripe.prices.update(priceId, { active: false });
    return true;
}

/**
 * การปรับยอดเมื่อลูกค้าสลับแพลนเองใน Portal: เก็บส่วนต่างทันที (อัปเกรด) / เครดิตคืนในบิลถัดไป (ดาวน์เกรด)
 * ถ้าปล่อยค่าเริ่มต้นของ Stripe ('none') ลูกค้าจะอัปเกรดฟรีจนถึงรอบบิลถัดไป
 */
const PORTAL_PRORATION: Stripe.BillingPortal.ConfigurationCreateParams.Features.SubscriptionUpdate.ProrationBehavior = 'always_invoice';

/**
 * Billing Portal configuration ของผลิตภัณฑ์นี้: เปลี่ยนบัตร, ยกเลิกเมื่อหมดรอบ,
 * สลับระหว่างราคาปัจจุบันของผลิตภัณฑ์นี้, ดูใบแจ้งหนี้ย้อนหลัง
 */
export async function upsertPortalConfig(
    product: PricingProduct,
    currentPrices: { productId: string; priceIds: string[] }[],
    existingConfigId: string | null,
): Promise<string | null> {
    if (currentPrices.length === 0) return existingConfigId;
    const stripe = getStripe();
    const features = {
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: 'at_period_end' as const },
        subscription_update: {
            enabled: true,
            default_allowed_updates: ['price' as const],
            products: currentPrices.map((p) => ({ product: p.productId, prices: p.priceIds })),
            proration_behavior: PORTAL_PRORATION,
        },
        invoice_history: { enabled: true },
    };
    const metadata = { product: STRIPE_PRODUCT_TAG[product] };
    if (existingConfigId) {
        const updated = await stripe.billingPortal.configurations.update(existingConfigId, { active: true, features, metadata });
        return updated.id;
    }
    const created = await stripe.billingPortal.configurations.create(
        { name: `${PRICING_CATALOG[product].stripeName} plans`, features, metadata },
        // key ยาวได้ไม่เกิน 255 ตัวอักษร จึงใช้ hash ของชุด Price
        { idempotencyKey: `planPricing:portal:${product}:${createHash('sha256').update(currentPrices.flatMap((p) => p.priceIds).sort().join(',')).digest('hex').slice(0, 32)}` },
    );
    return created.id;
}

export const SUBSCRIBER_COUNT_CAP = 100;

/**
 * นับ subscription active + trialing บน Price นี้ (แบ่งหน้า หยุดที่ CAP)
 * คืนแค่จำนวน ไม่คืนข้อมูลลูกค้า
 */
export async function countSubscriptionsOnPrice(priceId: string): Promise<{ count: number; capped: boolean }> {
    const stripe = getStripe();
    let count = 0;
    for (const status of ['active', 'trialing'] as const) {
        for await (const _sub of stripe.subscriptions.list({ price: priceId, status, limit: 100 })) {
            count += 1;
            if (count >= SUBSCRIBER_COUNT_CAP) return { count, capped: true };
        }
    }
    return { count, capped: false };
}

export const stripePricingPort: PricingStripePort = {
    ensureProduct,
    findActivePrice,
    createPrice,
    archivePrice,
    upsertPortalConfig,
};
