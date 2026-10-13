/**
 * ราคากลางแพ็กเกจ (planPricing) — ตรรกะล้วน ไม่แตะ Firestore/Stripe ตรง ๆ
 *
 * สัญญาข้อมูลใช้ร่วม 3 repo (lawslane-admin, CapDeal, Lawslane) ดู PLAN-08 "โครงข้อมูลกลาง"
 * ตอนนี้มีแค่สองผลิตภัณฑ์ที่เก็บเงินผ่าน Stripe subscription: `capdeal` และ `lawyer`
 *
 * แยกไฟล์นี้ออกจาก plan-pricing.ts (server-only) เพื่อให้
 *   - client component import ชนิดข้อมูล/ค่าเริ่มต้น/validation ได้
 *   - เทสต์ (tsx) รัน savePlan/executeSave กับ Stripe ปลอมและ Firestore ปลอมได้
 * ห้ามใส่ secret หรือเรียก API จริงในไฟล์นี้
 */

// ---------------------------------------------------------------------------
// ชนิดข้อมูลตามสัญญา
// ---------------------------------------------------------------------------

/** ผลิตภัณฑ์ที่เก็บเงินผ่าน Stripe แล้ว (หน้า admin สร้าง Product/Price ให้) */
export const PRICING_PRODUCTS = ['capdeal', 'lawyer'] as const;
export type PricingProduct = (typeof PRICING_PRODUCTS)[number];

/**
 * แพ็กเกจรายเดือนทั้งหมดในหน้า "ราคาแพ็กเกจ"
 * wittaya / lawslane (ลูกค้า AI Plus) ยังไม่เปิดขายบนเว็บ (PLAN-08 เฟส 4) → บันทึกราคาลง Firestore อย่างเดียว ไม่สร้างของใน Stripe
 */
export const SUBSCRIPTION_PRODUCTS = ['capdeal', 'lawyer', 'wittaya', 'lawslane'] as const;
export type SubscriptionProduct = (typeof SUBSCRIPTION_PRODUCTS)[number];
export const STORED_ONLY_PRODUCTS = ['wittaya', 'lawslane'] as const;

export type PricingInterval = 'monthly' | 'yearly';
export const PRICING_INTERVALS: PricingInterval[] = ['monthly', 'yearly'];

/** ค่า `metadata.product` บน Stripe Product/Price — webhook ของแต่ละเว็บกรองด้วยค่านี้ */
export const STRIPE_PRODUCT_TAG: Record<PricingProduct, 'capdeal_plan' | 'lawyer_plan'> = {
    capdeal: 'capdeal_plan',
    lawyer: 'lawyer_plan',
};

export type PlanStripeRefs = {
    productId: string;
    monthlyPriceId?: string | null;
    yearlyPriceId?: string | null;
    /** ทุก Price ที่แพลนนี้เคยใช้ (webhook ยังต้องจำได้) */
    previousPriceIds: string[];
};

export type PlanPricingEntry = {
    /** บาทเต็ม · null = ไม่ขาย */
    monthly: number | null;
    yearly: number | null;
    stripe?: PlanStripeRefs;
};

export type PlanPricingDoc = {
    currency: 'thb';
    plans: Record<string, PlanPricingEntry>;
    portalConfigId?: string | null;
    updatedAt: string;
    /** uid แอดมินเท่านั้น ห้ามอีเมล */
    updatedBy: string;
    /**
     * ราคาร่าง (ยังไม่ใช้จริง) — admin อ่าน/เขียนฝ่ายเดียว เว็บต้องไม่สนฟิลด์นี้
     * ห้ามเอาไปไว้ใน plans/stripe เพราะเว็บแสดง plans เป็นราคา และใช้ stripe.*PriceId เก็บเงิน
     */
    draft?: PlanPriceDraft | null;
};

export type PlanPriceDraft = {
    plans: Record<string, { monthly: number | null; yearly: number | null }>;
    /** เวอร์ชันของร่าง (แยกจาก updatedAt ของเอกสาร — บันทึกร่างไม่เปลี่ยน updatedAt หลัก) */
    updatedAt: string;
    /** uid แอดมินเท่านั้น */
    updatedBy: string;
};

export type PlanPricingLog = {
    /** doc id ที่แก้: capdeal | lawyer | wittaya | lawslane | ai_credits | ebook | costModel | interpreter_gp */
    product: string;
    /** 'draft' = บันทึก/ล้างราคาร่าง (ไม่มีผลกับเว็บ) · ไม่มี = เปลี่ยนราคาจริง */
    kind?: 'draft';
    before: unknown;
    after: unknown;
    createdPriceIds: string[];
    actorUid: string;
    at: string;
};

export const PRICING_CATALOG: Record<SubscriptionProduct, {
    name: [string, string];
    /** ชื่อที่ใช้ตั้ง Stripe Product (ลูกค้าเห็นในหน้า Checkout/ใบเสร็จ) */
    stripeName: string;
    plans: { id: string; name: string; yearlyOptional?: boolean }[];
}> = {
    capdeal: {
        name: ['CapDeal', 'CapDeal'],
        stripeName: 'CapDeal',
        plans: [
            { id: 'lite', name: 'Lite' },
            { id: 'pro', name: 'Pro' },
            { id: 'scale', name: 'Scale' },
        ],
    },
    lawyer: {
        name: ['ทนาย', 'Lawyer'],
        stripeName: 'Lawslane สำหรับทนาย',
        plans: [
            { id: 'pro', name: 'Pro', yearlyOptional: true },
            { id: 'top', name: 'บริษัท', yearlyOptional: true },
        ],
    },
    wittaya: {
        name: ['Wittaya', 'Wittaya'],
        stripeName: 'Wittaya',
        plans: [
            { id: 'premium', name: 'Premium', yearlyOptional: true },
            { id: 'pro', name: 'Pro', yearlyOptional: true },
        ],
    },
    lawslane: {
        name: ['ลูกค้า AI Plus', 'Customer AI Plus'],
        stripeName: 'Lawslane AI',
        plans: [{ id: 'plus', name: 'Plus', yearlyOptional: true }],
    },
};

/**
 * ค่าเริ่มต้น = ราคาที่เว็บใช้อยู่วันนี้ (ใช้เมื่อยังไม่มีเอกสารใน Firestore)
 * ทนาย: Pro 590 / บริษัท (Firm) 1,990 ต่อเดือน ตาม PRD (ผู้ใช้ยืนยัน 2026-10-12) — Price จริงยังอยู่ใน env ของ Lawslane
 * Wittaya: ตามหน้า pricing ของ Wittaya · ลูกค้า AI Plus: ยังไม่ตั้งราคา
 */
export const DEFAULT_PRICES: Record<SubscriptionProduct, Record<string, { monthly: number | null; yearly: number | null }>> = {
    capdeal: {
        lite: { monthly: 159, yearly: 1590 },
        pro: { monthly: 249, yearly: 2490 },
        scale: { monthly: 1049, yearly: 10490 },
    },
    lawyer: {
        pro: { monthly: 590, yearly: null },
        top: { monthly: 1990, yearly: null },
    },
    wittaya: {
        premium: { monthly: 199, yearly: null },
        pro: { monthly: 399, yearly: null },
    },
    lawslane: {
        plus: { monthly: null, yearly: null },
    },
};

export const MIN_PRICE_BAHT = 1;
export const MAX_PRICE_BAHT = 1_000_000;

export function isPricingProduct(v: unknown): v is PricingProduct {
    return typeof v === 'string' && (PRICING_PRODUCTS as readonly string[]).includes(v);
}

export function isSubscriptionProduct(v: unknown): v is SubscriptionProduct {
    return typeof v === 'string' && (SUBSCRIPTION_PRODUCTS as readonly string[]).includes(v);
}

export function priceField(interval: PricingInterval): 'monthlyPriceId' | 'yearlyPriceId' {
    return interval === 'monthly' ? 'monthlyPriceId' : 'yearlyPriceId';
}

export function stripeInterval(interval: PricingInterval): 'month' | 'year' {
    return interval === 'monthly' ? 'month' : 'year';
}

// ---------------------------------------------------------------------------
// อ่าน/รวมกับค่าเริ่มต้น
// ---------------------------------------------------------------------------

function cleanAmount(v: unknown): number | null {
    return typeof v === 'number' && Number.isInteger(v) && v >= MIN_PRICE_BAHT && v <= MAX_PRICE_BAHT ? v : null;
}

function cleanStripe(v: any): PlanStripeRefs | undefined {
    if (!v || typeof v !== 'object' || typeof v.productId !== 'string' || !v.productId) return undefined;
    const str = (x: unknown) => (typeof x === 'string' && x ? x : null);
    return {
        productId: v.productId,
        monthlyPriceId: str(v.monthlyPriceId),
        yearlyPriceId: str(v.yearlyPriceId),
        previousPriceIds: Array.isArray(v.previousPriceIds)
            ? v.previousPriceIds.filter((x: unknown): x is string => typeof x === 'string' && !!x)
            : [],
    };
}

/**
 * รวมเอกสาร Firestore กับค่าเริ่มต้น — แพลนที่ไม่รู้จักถูกตัดทิ้ง แพลนที่ขาดใช้ค่าเริ่มต้น
 * คืน plans ครบทุก planId ใน catalog เสมอ
 */
export function mergeWithDefaults(product: SubscriptionProduct, raw: any): Record<string, PlanPricingEntry> {
    const out: Record<string, PlanPricingEntry> = {};
    for (const plan of PRICING_CATALOG[product].plans) {
        const def = DEFAULT_PRICES[product][plan.id];
        const stored = raw?.plans?.[plan.id];
        const entry: PlanPricingEntry = stored
            ? { monthly: cleanAmount(stored.monthly), yearly: cleanAmount(stored.yearly) }
            : { monthly: def.monthly, yearly: def.yearly };
        const stripe = cleanStripe(stored?.stripe);
        if (stripe) entry.stripe = stripe;
        out[plan.id] = entry;
    }
    return out;
}

// ---------------------------------------------------------------------------
// validation
// ---------------------------------------------------------------------------

export type PricingDraft = {
    plans: Record<string, { monthly: number | null; yearly: number | null }>;
    /** updatedAt ของเอกสารตอนที่แอดมินเปิดหน้า (null = ยังไม่มีเอกสาร) ใช้กันแก้ชนกัน */
    baseUpdatedAt: string | null;
};

export type ValidDraftPlans = Record<string, { monthly: number | null; yearly: number | null }>;

export function validateDraft(
    product: unknown,
    draft: unknown,
): { ok: true; product: SubscriptionProduct; plans: ValidDraftPlans; baseUpdatedAt: string | null } | { ok: false; errors: string[] } {
    if (!isSubscriptionProduct(product)) return { ok: false, errors: ['ไม่รู้จักผลิตภัณฑ์นี้'] };
    const d = draft as any;
    if (!d || typeof d !== 'object' || !d.plans || typeof d.plans !== 'object') {
        return { ok: false, errors: ['ข้อมูลราคาไม่ถูกต้อง'] };
    }
    if (d.baseUpdatedAt !== null && typeof d.baseUpdatedAt !== 'string') {
        return { ok: false, errors: ['ข้อมูลเวอร์ชันไม่ถูกต้อง โหลดหน้าใหม่'] };
    }
    const errors: string[] = [];
    const known = PRICING_CATALOG[product].plans.map((p) => p.id);
    for (const key of Object.keys(d.plans)) {
        if (!known.includes(key)) errors.push(`ไม่รู้จักแพลน "${key}"`);
    }
    const plans: ValidDraftPlans = {};
    for (const plan of PRICING_CATALOG[product].plans) {
        const row = d.plans[plan.id];
        if (!row || typeof row !== 'object') {
            errors.push(`${plan.name}: ไม่มีข้อมูลราคา`);
            continue;
        }
        const out: { monthly: number | null; yearly: number | null } = { monthly: null, yearly: null };
        for (const interval of PRICING_INTERVALS) {
            const v = row[interval];
            const label = interval === 'monthly' ? 'รายเดือน' : 'รายปี';
            if (v === null || v === undefined) continue;
            if (typeof v !== 'number' || !Number.isInteger(v)) {
                errors.push(`${plan.name} ${label}: ต้องเป็นจำนวนเต็มบาท`);
            } else if (v < MIN_PRICE_BAHT || v > MAX_PRICE_BAHT) {
                errors.push(`${plan.name} ${label}: ต้องอยู่ระหว่าง ${MIN_PRICE_BAHT} ถึง ${MAX_PRICE_BAHT.toLocaleString('en-US')} บาท`);
            } else {
                out[interval] = v;
            }
        }
        plans[plan.id] = out;
    }
    if (errors.length) return { ok: false, errors };
    return { ok: true, product, plans, baseUpdatedAt: d.baseUpdatedAt ?? null };
}

// ---------------------------------------------------------------------------
// diff: อะไรจะเปลี่ยนบ้าง
// ---------------------------------------------------------------------------

export type PriceChange = {
    planId: string;
    interval: PricingInterval;
    from: number | null;
    to: number | null;
    /** Price ปัจจุบันที่เก็บใน Firestore (ถ้ามี) — จะถูกย้ายไป previousPriceIds และปิดขาย */
    currentPriceId: string | null;
    /** true = ต้องสร้าง Price ใหม่ใน Stripe */
    createsPrice: boolean;
};

/**
 * เทียบราคาปัจจุบันกับร่าง — คืนเฉพาะช่องที่เปลี่ยนจริง
 * ราคาเท่าเดิม = ไม่ทำอะไร (สำคัญต่อการกด "ลองใหม่" ไม่ให้สร้าง Price ซ้ำ)
 */
export function diffPricing(current: Record<string, PlanPricingEntry>, draft: ValidDraftPlans): PriceChange[] {
    const changes: PriceChange[] = [];
    for (const planId of Object.keys(draft)) {
        const cur = current[planId] ?? { monthly: null, yearly: null };
        for (const interval of PRICING_INTERVALS) {
            const from = cur[interval] ?? null;
            const to = draft[planId][interval];
            if (from === to) continue;
            changes.push({
                planId,
                interval,
                from,
                to,
                currentPriceId: cur.stripe?.[priceField(interval)] ?? null,
                createsPrice: to !== null,
            });
        }
    }
    return changes;
}

/**
 * idempotencyKey ของการสร้าง Price
 * มาจาก product + planId + interval + ยอด + เวอร์ชันเอกสารที่แก้อยู่
 *   - กดซ้ำ/ลองใหม่ก่อนเอกสารถูกเขียน → key เดิม → Stripe คืน Price ตัวเดิม
 *   - ใส่เวอร์ชันด้วยกันกรณีเปลี่ยนกลับไปราคาเดิม (159 → 199 → 159) ภายใน 24 ชม.
 *     แล้ว Stripe คืน Price เก่าที่ถูกปิดขายไปแล้ว
 */
export function priceIdempotencyKey(
    product: PricingProduct, planId: string, interval: PricingInterval, amountBaht: number, baseUpdatedAt: string | null,
): string {
    return `planPricing:price:${product}:${planId}:${interval}:${amountBaht}:${baseUpdatedAt ?? 'new'}`;
}

// ---------------------------------------------------------------------------
// พอร์ตที่ executeSave ต้องการ (ของจริงอยู่ใน stripe-admin.ts / plan-pricing.ts)
// ---------------------------------------------------------------------------

export type CreatePriceInput = {
    product: PricingProduct;
    planId: string;
    interval: PricingInterval;
    amountBaht: number;
    productId: string;
    idempotencyKey: string;
};

export interface PricingStripePort {
    ensureProduct(product: PricingProduct, planId: string, storedProductId?: string | null): Promise<string>;
    /** หา Price ที่ยัง active ตรงกับยอด/รอบ/metadata (กันสร้างซ้ำเมื่อ idempotencyKey หมดอายุ) */
    findActivePrice(input: Omit<CreatePriceInput, 'idempotencyKey'>): Promise<string | null>;
    createPrice(input: CreatePriceInput): Promise<string>;
    /** ปิดขาย Price · คืน true ถ้าเพิ่งปิด, false ถ้าปิดอยู่แล้ว (เรียกซ้ำได้) */
    archivePrice(priceId: string): Promise<boolean>;
    upsertPortalConfig(
        product: PricingProduct,
        currentPrices: { productId: string; priceIds: string[] }[],
        existingConfigId: string | null,
    ): Promise<string | null>;
}

export class PricingConflictError extends Error {
    constructor() {
        super('มีคนแก้ราคาไปแล้ว โหลดใหม่');
        this.name = 'PricingConflictError';
    }
}

export interface PricingStorePort {
    read(product: SubscriptionProduct): Promise<PlanPricingDoc | null>;
    /**
     * เขียนเอกสารใน transaction: อ่านใหม่ → ถ้า updatedAt ไม่ตรง expected ให้โยน PricingConflictError
     * → เขียน doc + log พร้อมกัน
     */
    commit(
        product: PricingProduct,
        expectedUpdatedAt: string | null,
        build: (current: PlanPricingDoc | null) => { doc: PlanPricingDoc; log: PlanPricingLog },
    ): Promise<PlanPricingDoc>;
    setPortalConfigId(product: PricingProduct, portalConfigId: string): Promise<void>;
    /**
     * เขียนราคาร่างใน transaction: อ่านใหม่ → ถ้า draft.updatedAt ไม่ตรง expected ให้โยน PricingConflictError
     * → เขียนเฉพาะฟิลด์ `draft` (null = ลบฟิลด์) + log · ห้ามแตะ plans/stripe/portalConfigId/updatedAt
     */
    commitDraft(
        product: PricingProduct,
        expectedDraftUpdatedAt: string | null,
        build: (current: PlanPricingDoc | null) => { patch: DraftPatch; log: PlanPricingLog },
    ): Promise<PlanPriceDraft | null>;
}

// ---------------------------------------------------------------------------
// บันทึก (ลำดับต้องทำซ้ำได้ปลอดภัย)
// ---------------------------------------------------------------------------

export type SaveStep = 'validate' | 'conflict' | 'stripe_create' | 'firestore' | 'archive' | 'portal';

export type SaveResult =
    | {
        status: 'ok' | 'partial';
        changes: PriceChange[];
        createdPriceIds: string[];
        archivedPriceIds: string[];
        portalConfigId: string | null;
        /** updatedAt ใหม่ — ใช้เป็น baseUpdatedAt ตอนกด "ลองใหม่" */
        updatedAt: string | null;
        /** ขั้นที่ล้มหลังเขียน Firestore แล้ว (มีเมื่อ status = partial) */
        failed: { step: 'archive' | 'portal'; message: string }[];
    }
    | { status: 'error'; step: SaveStep; message: string; createdPriceIds: string[] };

function errMsg(e: unknown): string {
    return e instanceof Error && e.message ? e.message : 'เกิดข้อผิดพลาด';
}

/**
 * ลำดับการบันทึก (ตามสัญญา):
 *   1. validate + เช็คเวอร์ชันเอกสาร
 *   2. ทุกช่องที่เปลี่ยนเป็นยอดใหม่: ensureProduct → หา Price เดิมที่ตรงกัน หรือ createPrice (idempotencyKey)
 *   3. transaction: เขียน doc (Price ใหม่เป็นปัจจุบัน, เก่าต่อท้าย previousPriceIds) + planPricingLogs
 *   4. ปิดขาย Price เก่า (archive) — ทำทุก Price ใน previousPriceIds ที่ไม่ใช่ปัจจุบัน
 *      จึงเก็บตกรอบก่อนที่ล้มได้เองเมื่อกด "ลองใหม่"
 *   5. upsertPortalConfig แล้วเก็บ portalConfigId
 * ขั้น 4–5 ล้ม = partial (ข้อมูลหลักบันทึกแล้ว) กดบันทึกซ้ำด้วยร่างเดิมได้โดยไม่เกิด Price ซ้ำ
 *
 * ⚠️ ไม่ย้ายผู้สมัครเดิมและไม่ส่งอีเมล (ยังไม่อยู่ในขอบเขต) ผู้สมัครเดิมจ่ายราคาเดิมต่อไป
 */
export async function executeSave(
    deps: { stripe: PricingStripePort; store: PricingStorePort; now: () => Date },
    productInput: unknown,
    draftInput: unknown,
    actorUid: string,
): Promise<SaveResult> {
    const createdPriceIds: string[] = [];
    const valid = validateDraft(productInput, draftInput);
    if (!valid.ok) return { status: 'error', step: 'validate', message: valid.errors.join(' · '), createdPriceIds };
    if (!isPricingProduct(valid.product)) {
        return { status: 'error', step: 'validate', message: 'ผลิตภัณฑ์นี้ยังไม่ขายผ่าน Stripe', createdPriceIds };
    }
    const product: PricingProduct = valid.product;
    const { plans: draftPlans, baseUpdatedAt } = valid;

    // 1) เวอร์ชันต้องตรงก่อนแตะ Stripe (transaction ตรวจซ้ำอีกรอบตอนเขียน)
    let currentDoc: PlanPricingDoc | null;
    try {
        currentDoc = await deps.store.read(product);
    } catch (e) {
        return { status: 'error', step: 'firestore', message: `อ่านราคาปัจจุบันไม่สำเร็จ: ${errMsg(e)}`, createdPriceIds };
    }
    if ((currentDoc?.updatedAt || null) !== baseUpdatedAt) {
        return { status: 'error', step: 'conflict', message: new PricingConflictError().message, createdPriceIds };
    }
    const current = mergeWithDefaults(product, currentDoc);
    const changes = diffPricing(current, draftPlans);

    // 2) สร้าง Price ใหม่ (ยังไม่เปลี่ยนอะไรที่ลูกค้าเห็น เพราะเว็บอ่าน id จาก Firestore)
    const newIds: Record<string, { productId: string; monthly?: string; yearly?: string }> = {};
    try {
        for (const c of changes) {
            if (!c.createsPrice || c.to === null) continue;
            const slot = (newIds[c.planId] ??= {
                productId: await deps.stripe.ensureProduct(product, c.planId, current[c.planId]?.stripe?.productId ?? null),
            });
            const input = { product, planId: c.planId, interval: c.interval, amountBaht: c.to, productId: slot.productId };
            let priceId = await deps.stripe.findActivePrice(input);
            if (!priceId) {
                priceId = await deps.stripe.createPrice({
                    ...input,
                    idempotencyKey: priceIdempotencyKey(product, c.planId, c.interval, c.to, baseUpdatedAt),
                });
            }
            slot[c.interval] = priceId;
            createdPriceIds.push(priceId);
        }
    } catch (e) {
        return {
            status: 'error', step: 'stripe_create', createdPriceIds,
            message: `สร้างราคาใน Stripe ไม่สำเร็จ ยังไม่มีอะไรเปลี่ยนบนเว็บ กดบันทึกซ้ำได้: ${errMsg(e)}`,
        };
    }

    // 3) เขียน Firestore + log ใน transaction เดียว
    let savedDoc: PlanPricingDoc = currentDoc ?? {
        currency: 'thb', plans: current, portalConfigId: null, updatedAt: '', updatedBy: '',
    };
    // มีร่างค้างอยู่ → เขียนแม้ราคาไม่เปลี่ยน เพื่อล้างร่างในการเขียนครั้งเดียวกัน
    if (changes.length > 0 || currentDoc?.draft) {
        try {
            savedDoc = await deps.store.commit(product, baseUpdatedAt, (txDoc) => {
                const before = txDoc ? mergeWithDefaults(product, txDoc) : null;
                const base = mergeWithDefaults(product, txDoc);
                const after: Record<string, PlanPricingEntry> = {};
                for (const planId of Object.keys(base)) {
                    const prev = base[planId];
                    const next: PlanPricingEntry = { monthly: draftPlans[planId].monthly, yearly: draftPlans[planId].yearly };
                    let stripe: PlanStripeRefs | undefined = prev.stripe
                        ? { ...prev.stripe, previousPriceIds: [...prev.stripe.previousPriceIds] }
                        : undefined;
                    for (const interval of PRICING_INTERVALS) {
                        const c = changes.find((x) => x.planId === planId && x.interval === interval);
                        if (!c) continue;
                        const field = priceField(interval);
                        const oldId = stripe?.[field] ?? null;
                        const newId = newIds[planId]?.[interval] ?? null;
                        if (!stripe && newId) {
                            stripe = { productId: newIds[planId].productId, monthlyPriceId: null, yearlyPriceId: null, previousPriceIds: [] };
                        }
                        if (!stripe) continue; // ไม่เคยมี Price ใน Firestore และไม่ได้สร้างใหม่ (เช่นตั้งเป็น "ไม่ขาย")
                        if (oldId && oldId !== newId && !stripe.previousPriceIds.includes(oldId)) {
                            stripe.previousPriceIds.push(oldId);
                        }
                        stripe[field] = newId;
                    }
                    if (stripe) next.stripe = stripe;
                    after[planId] = next;
                }
                const at = deps.now().toISOString();
                // doc ไม่มีฟิลด์ draft → commit เขียนทับทั้งเอกสาร = ล้างร่างไปพร้อมกัน (ร่างถูกใช้แล้ว)
                return {
                    doc: {
                        currency: 'thb',
                        plans: after,
                        portalConfigId: txDoc?.portalConfigId ?? null,
                        updatedAt: at,
                        updatedBy: actorUid,
                    },
                    log: { product, before, after, createdPriceIds: [...createdPriceIds], actorUid, at },
                };
            });
        } catch (e) {
            if (e instanceof PricingConflictError) {
                return { status: 'error', step: 'conflict', message: e.message, createdPriceIds };
            }
            return {
                status: 'error', step: 'firestore', createdPriceIds,
                message: `บันทึกราคาไม่สำเร็จ ยังไม่มีอะไรเปลี่ยนบนเว็บ กดบันทึกซ้ำได้ (จะใช้ Price ที่สร้างไว้แล้ว): ${errMsg(e)}`,
            };
        }
    }

    const failed: { step: 'archive' | 'portal'; message: string }[] = [];
    const archivedPriceIds: string[] = [];

    // 4) ปิดขาย Price เก่าทุกตัวที่ไม่ใช่ราคาปัจจุบัน (ผู้สมัครเดิมยังถูกเรียกเก็บต่อตามปกติ)
    const currentIds = new Set<string>();
    for (const e of Object.values(savedDoc.plans)) {
        if (e.stripe?.monthlyPriceId) currentIds.add(e.stripe.monthlyPriceId);
        if (e.stripe?.yearlyPriceId) currentIds.add(e.stripe.yearlyPriceId);
    }
    const seen = new Set<string>();
    for (const e of Object.values(savedDoc.plans)) {
        for (const id of e.stripe?.previousPriceIds ?? []) {
            if (currentIds.has(id) || seen.has(id)) continue;
            seen.add(id);
            try {
                if (await deps.stripe.archivePrice(id)) archivedPriceIds.push(id);
            } catch (err) {
                failed.push({ step: 'archive', message: `ปิดขาย ${id} ไม่สำเร็จ: ${errMsg(err)}` });
            }
        }
    }

    // 5) Billing Portal ให้สลับได้เฉพาะราคาปัจจุบัน
    let portalConfigId: string | null = savedDoc.portalConfigId ?? null;
    const portalProducts = Object.values(savedDoc.plans)
        .filter((e) => e.stripe)
        .map((e) => ({
            productId: e.stripe!.productId,
            priceIds: [e.stripe!.monthlyPriceId, e.stripe!.yearlyPriceId].filter((x): x is string => !!x),
        }))
        .filter((p) => p.priceIds.length > 0);
    if (portalProducts.length > 0) {
        try {
            const id = await deps.stripe.upsertPortalConfig(product, portalProducts, portalConfigId);
            if (id && id !== portalConfigId) {
                await deps.store.setPortalConfigId(product, id);
            }
            portalConfigId = id ?? portalConfigId;
        } catch (err) {
            failed.push({ step: 'portal', message: `ตั้งค่า Billing Portal ไม่สำเร็จ: ${errMsg(err)}` });
        }
    }

    return {
        status: failed.length ? 'partial' : 'ok',
        changes,
        createdPriceIds,
        archivedPriceIds,
        portalConfigId,
        updatedAt: savedDoc.updatedAt || null,
        failed,
    };
}

/** ตรวจว่าโหมดของ key (test/live) คู่กับ collection ถูก — Firestore เป็น production ตัวเดียว */
export function checkKeyCollectionPairing(secretKey: string | undefined, collection: string): string | null {
    if (!secretKey) return 'ยังไม่ได้ตั้ง STRIPE_SECRET_KEY';
    const isTest = /^(sk|rk)_test_/.test(secretKey);
    const isLive = /^(sk|rk)_live_/.test(secretKey);
    if (!isTest && !isLive) return 'STRIPE_SECRET_KEY มีรูปแบบไม่ถูกต้อง';
    const testCollection = collection.endsWith('_test');
    if (isTest && !testCollection) return `ใช้ Stripe test key อยู่ แต่ collection คือ "${collection}" (ต้องลงท้าย _test)`;
    if (isLive && testCollection) return `ใช้ Stripe live key อยู่ แต่ collection คือ "${collection}" (เป็นของโหมดทดสอบ)`;
    return null;
}

// ---------------------------------------------------------------------------
// เอกสารที่บันทึกลง Firestore อย่างเดียว (ไม่แตะ Stripe)
//   - wittaya / lawslane      : ราคาแพ็กเกจที่ยังไม่เปิดขาย (รูปร่างเดียวกับ PlanPricingDoc)
//   - ai_credits              : แพ็กเครดิต AI (จ่ายครั้งเดียวผ่าน Beam)
//   - ebook                   : ราคา E-Book มาตรฐาน + ค่าส่งหนังสือ
//   - costModel               : สมมติฐานต้นทุน (ดู cost-model.ts)
// ไม่ต้องรอ PRICING_WRITE_ENABLED เพราะไม่สร้างอะไรใน Stripe (PLAN-08 เฟส 3) แต่ยังต้อง Super Admin + ยืนยัน + log
// ---------------------------------------------------------------------------

export type StoredDoc = Record<string, unknown> & { updatedAt?: string; updatedBy?: string };

export interface DocStorePort {
    read(docId: string): Promise<StoredDoc | null>;
    /** transaction: อ่านใหม่ → updatedAt ไม่ตรง expected ให้โยน PricingConflictError → เขียน doc + log */
    commit(
        docId: string,
        expectedUpdatedAt: string | null,
        build: (current: StoredDoc | null) => { doc: StoredDoc; log: PlanPricingLog },
    ): Promise<StoredDoc>;
}

export type StoredSaveResult =
    | { status: 'ok'; updatedAt: string; changed: boolean }
    | { status: 'error'; step: 'validate' | 'conflict' | 'firestore'; message: string };

/**
 * บันทึกเอกสาร: ตรวจเวอร์ชัน → transaction เขียน doc + planPricingLogs
 * @param fields ฟิลด์ที่ผ่าน validation แล้ว (ทับของเดิมทั้งก้อน ยกเว้นฟิลด์ใน keep)
 */
export async function saveStoredDoc(
    deps: { store: DocStorePort; now: () => Date },
    docId: string,
    fields: Record<string, unknown>,
    baseUpdatedAt: string | null,
    actorUid: string,
    keep: string[] = [],
): Promise<StoredSaveResult> {
    try {
        const doc = await deps.store.commit(docId, baseUpdatedAt, (current) => {
            const at = deps.now().toISOString();
            const before = current ? stripMeta(current) : null;
            const kept: Record<string, unknown> = {};
            for (const k of keep) if (current && k in current) kept[k] = current[k];
            const next: StoredDoc = { ...kept, ...fields, updatedAt: at, updatedBy: actorUid };
            return {
                doc: next,
                log: { product: docId, before, after: stripMeta(next), createdPriceIds: [], actorUid, at },
            };
        });
        return { status: 'ok', updatedAt: doc.updatedAt ?? '', changed: true };
    } catch (e) {
        if (e instanceof PricingConflictError) return { status: 'error', step: 'conflict', message: e.message };
        return { status: 'error', step: 'firestore', message: `บันทึกไม่สำเร็จ: ${errMsg(e)}` };
    }
}

function stripMeta(d: StoredDoc): Record<string, unknown> {
    const { updatedAt: _a, updatedBy: _b, ...rest } = d;
    return rest;
}

function versionOf(v: unknown): { ok: true; value: string | null } | { ok: false } {
    if (v === null || v === undefined) return { ok: true, value: null };
    return typeof v === 'string' ? { ok: true, value: v } : { ok: false };
}

const isInt = (v: unknown, min: number, max: number): v is number =>
    typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

// --- แพ็กเครดิต AI ---------------------------------------------------------

export type CreditPack = { credits: number; price: number };
export const MAX_CREDIT_PACKS = 20;

export function validateCreditPacks(draft: unknown):
    { ok: true; packs: Record<string, CreditPack>; baseUpdatedAt: string | null } | { ok: false; errors: string[] } {
    const d = draft as any;
    const ver = versionOf(d?.baseUpdatedAt);
    if (!d || typeof d !== 'object' || !d.packs || typeof d.packs !== 'object' || Array.isArray(d.packs) || !ver.ok) {
        return { ok: false, errors: ['ข้อมูลแพ็กเครดิตไม่ถูกต้อง'] };
    }
    const errors: string[] = [];
    const packs: Record<string, CreditPack> = {};
    const ids = Object.keys(d.packs);
    if (ids.length > MAX_CREDIT_PACKS) errors.push(`มีได้ไม่เกิน ${MAX_CREDIT_PACKS} แพ็ก`);
    for (const id of ids) {
        const p = d.packs[id];
        if (!/^[a-z0-9_-]{1,32}$/.test(id)) { errors.push(`รหัสแพ็ก "${id}" ใช้ได้แค่ a-z 0-9 _ - (ไม่เกิน 32 ตัว)`); continue; }
        if (!isInt(p?.credits, 1, MAX_PRICE_BAHT)) errors.push(`${id}: จำนวนเครดิตต้องเป็นจำนวนเต็ม 1–1,000,000`);
        if (!isInt(p?.price, MIN_PRICE_BAHT, MAX_PRICE_BAHT)) errors.push(`${id}: ราคาต้องเป็นจำนวนเต็มบาท 1–1,000,000`);
        if (isInt(p?.credits, 1, MAX_PRICE_BAHT) && isInt(p?.price, MIN_PRICE_BAHT, MAX_PRICE_BAHT)) {
            packs[id] = { credits: p.credits, price: p.price };
        }
    }
    return errors.length ? { ok: false, errors } : { ok: true, packs, baseUpdatedAt: ver.value };
}

export function mergeCreditPacks(raw: any): Record<string, CreditPack> {
    const out: Record<string, CreditPack> = {};
    if (raw?.packs && typeof raw.packs === 'object') {
        for (const [id, p] of Object.entries<any>(raw.packs)) {
            if (/^[a-z0-9_-]{1,32}$/.test(id) && isInt(p?.credits, 1, MAX_PRICE_BAHT) && isInt(p?.price, 1, MAX_PRICE_BAHT)) {
                out[id] = { credits: p.credits, price: p.price };
            }
        }
    }
    return out;
}

// --- E-Book + ค่าส่ง --------------------------------------------------------

export type EbookPricing = {
    /** ราคา E-Book มาตรฐาน (บาท) */
    standardPrice: number;
    /** ค่าส่งหนังสือเล่ม · 0 = ไม่เก็บ/ไม่ใช้ */
    shipping: { baseFee: number; perExtraItem: number; freeOver: number };
};

/** EBOOK_PRICE = 199 ใน lawlanes-education (ebook-pro-download.tsx) · ค่าส่งยังไม่เก็บ = 0 ทั้งหมด */
export const DEFAULT_EBOOK: EbookPricing = { standardPrice: 199, shipping: { baseFee: 0, perExtraItem: 0, freeOver: 0 } };

export function mergeEbook(raw: any): EbookPricing {
    const n = (v: unknown, def: number, min: number) => (isInt(v, min, 100_000) ? v : def);
    return {
        standardPrice: n(raw?.standardPrice, DEFAULT_EBOOK.standardPrice, 1),
        shipping: {
            baseFee: n(raw?.shipping?.baseFee, 0, 0),
            perExtraItem: n(raw?.shipping?.perExtraItem, 0, 0),
            freeOver: n(raw?.shipping?.freeOver, 0, 0),
        },
    };
}

export function validateEbook(draft: unknown):
    { ok: true; value: EbookPricing; baseUpdatedAt: string | null } | { ok: false; errors: string[] } {
    const d = draft as any;
    const ver = versionOf(d?.baseUpdatedAt);
    if (!d || typeof d !== 'object' || !ver.ok) return { ok: false, errors: ['ข้อมูล E-Book ไม่ถูกต้อง'] };
    const errors: string[] = [];
    if (!isInt(d.standardPrice, 1, 100_000)) errors.push('ราคา E-Book ต้องเป็นจำนวนเต็มบาท 1–100,000');
    for (const k of ['baseFee', 'perExtraItem', 'freeOver'] as const) {
        if (!isInt(d.shipping?.[k], 0, 100_000)) errors.push(`ค่าส่ง ${k} ต้องเป็นจำนวนเต็มบาท 0–100,000`);
    }
    if (errors.length) return { ok: false, errors };
    return {
        ok: true,
        value: { standardPrice: d.standardPrice, shipping: { baseFee: d.shipping.baseFee, perExtraItem: d.shipping.perExtraItem, freeOver: d.shipping.freeOver } },
        baseUpdatedAt: ver.value,
    };
}

// --- GP ล่าม ---------------------------------------------------------------

/** ค่าเริ่มต้นต้องตรงกับ DEFAULT_GP_PERCENT ใน Lawslane/src/lib/interpreter-types.ts */
export const DEFAULT_INTERPRETER_GP_PERCENT = 15;

/** GP 0–50% ปัดทศนิยม 2 ตำแหน่ง (เงื่อนไขเดียวกับตัวตั้งค่าเดิมในหน้าจ่ายเงินล่าม) */
export function validateGpPercent(v: unknown): { ok: true; value: number } | { ok: false; error: string } {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 50) return { ok: false, error: 'GP ต้องอยู่ระหว่าง 0–50%' };
    return { ok: true, value: Math.round(v * 100) / 100 };
}

// --- ราคาแพ็กเกจที่ยังไม่เปิดขาย (wittaya / lawslane) -------------------------

/** บันทึกราคาแพ็กเกจของผลิตภัณฑ์ที่ยังไม่ขายผ่าน Stripe — ไม่สร้าง Product/Price */
export async function executeStoredPlanSave(
    deps: { store: DocStorePort; now: () => Date },
    productInput: unknown,
    draftInput: unknown,
    actorUid: string,
): Promise<StoredSaveResult> {
    const valid = validateDraft(productInput, draftInput);
    if (!valid.ok) return { status: 'error', step: 'validate', message: valid.errors.join(' · ') };
    if (isPricingProduct(valid.product)) {
        return { status: 'error', step: 'validate', message: 'ผลิตภัณฑ์นี้ขายผ่าน Stripe ต้องบันทึกผ่านขั้นตอน Stripe' };
    }
    const plans: Record<string, PlanPricingEntry> = {};
    for (const [planId, v] of Object.entries(valid.plans)) plans[planId] = { monthly: v.monthly, yearly: v.yearly };
    return saveStoredDoc(deps, valid.product, { currency: 'thb', plans }, valid.baseUpdatedAt, actorUid);
}

// ---------------------------------------------------------------------------
// ราคาร่างของ CapDeal / ทนาย (ยังไม่ใช้จริง)
//
// ใช้ตอนยังบันทึกผ่าน Stripe ไม่ได้ (ไม่มี PRICING_WRITE_ENABLED / STRIPE_SECRET_KEY)
// เก็บที่ฟิลด์ `draft` ในเอกสารเดียวกัน — เว็บ (Lawslane, CapDeal) อ่านแค่ currency/plans/portalConfigId จึงไม่เห็นร่าง
// ห้ามเขียนลง plans/stripe เด็ดขาด: เว็บแสดง plans[...].monthly/yearly เป็นราคา แต่เก็บเงินตาม stripe.*PriceId
// ถ้าเอาร่างไปไว้ใน plans หน้าเว็บจะแสดงราคาไม่ตรงกับที่ Stripe เรียกเก็บ
// บันทึกผ่าน Stripe สำเร็จเมื่อไร ร่างถูกล้างในการเขียนครั้งเดียวกัน (executeSave)
// ---------------------------------------------------------------------------

/** สิ่งที่เขียนลงเอกสารตอนบันทึก/ล้างร่าง — มีคีย์ draft คีย์เดียวเสมอ (null = ลบฟิลด์) */
export type DraftPatch = { draft: PlanPriceDraft | null };

/** อ่านร่างจากเอกสารดิบ — ผิดรูป = null (ไม่ทำให้หน้าพัง) · ตัดแพลนที่ไม่รู้จัก */
export function parsePlanDraft(product: SubscriptionProduct, raw: unknown): PlanPriceDraft | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, any>;
    if (typeof r.updatedAt !== 'string' || !r.updatedAt || !r.plans || typeof r.plans !== 'object') return null;
    const plans: PlanPriceDraft['plans'] = {};
    for (const plan of PRICING_CATALOG[product].plans) {
        const row = r.plans[plan.id];
        if (!row || typeof row !== 'object') return null;
        plans[plan.id] = { monthly: cleanAmount(row.monthly), yearly: cleanAmount(row.yearly) };
    }
    return { plans, updatedAt: r.updatedAt, updatedBy: typeof r.updatedBy === 'string' ? r.updatedBy : '' };
}

/** ตรวจร่างด้วยกติกาเดียวกับราคาจริง (validateDraft) และต้องเป็นผลิตภัณฑ์ที่ขายผ่าน Stripe */
export function validatePlanDraft(
    product: unknown,
    draft: unknown,
    expectedUpdatedAt: unknown,
): { ok: true; product: PricingProduct; plans: ValidDraftPlans; expectedUpdatedAt: string | null } | { ok: false; errors: string[] } {
    if (expectedUpdatedAt !== null && expectedUpdatedAt !== undefined && typeof expectedUpdatedAt !== 'string') {
        return { ok: false, errors: ['ข้อมูลเวอร์ชันไม่ถูกต้อง โหลดหน้าใหม่'] };
    }
    const v = validateDraft(product, { plans: (draft as any)?.plans, baseUpdatedAt: expectedUpdatedAt ?? null });
    if (!v.ok) return v;
    if (!isPricingProduct(v.product)) return { ok: false, errors: ['ราคาร่างใช้กับ CapDeal และทนายเท่านั้น'] };
    return { ok: true, product: v.product, plans: v.plans, expectedUpdatedAt: v.baseUpdatedAt };
}

/** สร้าง patch + log ของการบันทึก/ล้างร่าง (plans = null คือล้างร่าง) — patch มีแค่คีย์ draft */
export function buildDraftWrite(
    product: PricingProduct,
    current: PlanPricingDoc | null,
    plans: ValidDraftPlans | null,
    actorUid: string,
    at: string,
): { patch: DraftPatch; log: PlanPricingLog } {
    const draft: PlanPriceDraft | null = plans
        ? {
            plans: Object.fromEntries(
                Object.entries(plans).map(([id, v]) => [id, { monthly: v.monthly, yearly: v.yearly }]),
            ),
            updatedAt: at,
            updatedBy: actorUid,
        }
        : null;
    const before = current?.draft ? { plans: current.draft.plans } : null;
    return {
        patch: { draft },
        log: { product, kind: 'draft', before, after: draft ? { plans: draft.plans } : null, createdPriceIds: [], actorUid, at },
    };
}

export type DraftSaveResult =
    | { status: 'ok'; draft: PlanPriceDraft | null }
    | { status: 'error'; step: 'validate' | 'conflict' | 'firestore'; message: string };

/** บันทึกราคาร่าง — ไม่แตะ Stripe ไม่ต้องรอ PRICING_WRITE_ENABLED · ไม่เปลี่ยนสิ่งที่เว็บเห็น */
export async function executeDraftSave(
    deps: { store: PricingStorePort; now: () => Date },
    productInput: unknown,
    draftInput: unknown,
    expectedUpdatedAt: unknown,
    actorUid: string,
): Promise<DraftSaveResult> {
    const v = validatePlanDraft(productInput, draftInput, expectedUpdatedAt);
    if (!v.ok) return { status: 'error', step: 'validate', message: v.errors.join(' · ') };
    return commitDraftWrite(deps, v.product, v.plans, v.expectedUpdatedAt, actorUid);
}

/** ล้างราคาร่าง (ปุ่ม "ล้างร่าง") */
export async function executeDraftClear(
    deps: { store: PricingStorePort; now: () => Date },
    productInput: unknown,
    expectedUpdatedAt: unknown,
    actorUid: string,
): Promise<DraftSaveResult> {
    if (!isPricingProduct(productInput)) return { status: 'error', step: 'validate', message: 'ราคาร่างใช้กับ CapDeal และทนายเท่านั้น' };
    if (typeof expectedUpdatedAt !== 'string' || !expectedUpdatedAt) {
        return { status: 'error', step: 'validate', message: 'ไม่มีราคาร่างให้ล้าง' };
    }
    return commitDraftWrite(deps, productInput, null, expectedUpdatedAt, actorUid);
}

async function commitDraftWrite(
    deps: { store: PricingStorePort; now: () => Date },
    product: PricingProduct,
    plans: ValidDraftPlans | null,
    expected: string | null,
    actorUid: string,
): Promise<DraftSaveResult> {
    try {
        const draft = await deps.store.commitDraft(product, expected, (current) =>
            buildDraftWrite(product, current, plans, actorUid, deps.now().toISOString()));
        return { status: 'ok', draft };
    } catch (e) {
        if (e instanceof PricingConflictError) return { status: 'error', step: 'conflict', message: e.message };
        return { status: 'error', step: 'firestore', message: `บันทึกร่างไม่สำเร็จ: ${errMsg(e)}` };
    }
}
