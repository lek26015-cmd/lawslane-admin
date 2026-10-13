/**
 * เทสต์ราคากลาง (planPricing) + ค่าธรรมเนียม Stripe — รันด้วย `npm test`
 * ใช้ Stripe ปลอมและ Firestore ปลอมในหน่วยความจำทั้งหมด ไม่เรียก API จริง
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateStripeFee } from '../stripe-fees';
import {
    PricingConflictError,
    checkKeyCollectionPairing,
    diffPricing,
    executeSave,
    mergeWithDefaults,
    validateDraft,
    type CreatePriceInput,
    type PlanPricingDoc,
    type PlanPricingLog,
    type PricingDraft,
    type PricingProduct,
    type PricingStorePort,
    type PricingStripePort,
    type DocStorePort,
    type StoredDoc,
    executeStoredPlanSave,
    saveStoredDoc,
    validateCreditPacks,
    validateEbook,
    validateGpPercent,
    mergeEbook,
    buildDraftWrite,
    executeDraftClear,
    executeDraftSave,
    parsePlanDraft,
    validatePlanDraft,
    type DraftPatch,
} from '../plan-pricing-core';

// ---------------------------------------------------------------------------
// ของปลอม
// ---------------------------------------------------------------------------

type FakePrice = { id: string; productId: string; amount: number; interval: string; planId: string; product: string; active: boolean };

function fakeStripe() {
    let seq = 0;
    const products = new Map<string, { product: PricingProduct; planId: string }>();
    const prices = new Map<string, FakePrice>();
    const idem = new Map<string, string>();
    const portals = new Map<string, unknown>();
    const calls: string[] = [];
    const fail: { archive?: boolean; portal?: boolean; create?: boolean } = {};
    const port: PricingStripePort = {
        async ensureProduct(product, planId, stored) {
            calls.push(`ensureProduct:${planId}`);
            if (stored) return stored;
            for (const [id, p] of products) if (p.product === product && p.planId === planId) return id;
            const id = `prod_${++seq}`;
            products.set(id, { product, planId });
            return id;
        },
        async findActivePrice(input) {
            calls.push('findActivePrice');
            for (const p of prices.values()) {
                if (p.active && p.productId === input.productId && p.amount === input.amountBaht * 100 && p.interval === input.interval && p.planId === input.planId) return p.id;
            }
            return null;
        },
        async createPrice(input: CreatePriceInput) {
            calls.push('createPrice');
            if (fail.create) throw new Error('stripe down');
            const hit = idem.get(input.idempotencyKey);
            if (hit) return hit;
            const id = `price_${++seq}`;
            prices.set(id, { id, productId: input.productId, amount: input.amountBaht * 100, interval: input.interval, planId: input.planId, product: input.product, active: true });
            idem.set(input.idempotencyKey, id);
            return id;
        },
        async archivePrice(id) {
            calls.push(`archive:${id}`);
            if (fail.archive) throw new Error('archive failed');
            const p = prices.get(id);
            if (!p || !p.active) return false;
            p.active = false;
            return true;
        },
        async upsertPortalConfig(_product, current, existing) {
            calls.push('portal');
            if (fail.portal) throw new Error('portal failed');
            const id = existing ?? `bpc_${++seq}`;
            portals.set(id, current);
            return id;
        },
    };
    return { port, products, prices, idem, portals, calls, fail };
}

function fakeStore(initial: Partial<Record<PricingProduct, PlanPricingDoc>> = {}) {
    const docs = new Map<string, PlanPricingDoc>(Object.entries(initial) as [string, PlanPricingDoc][]);
    const logs: PlanPricingLog[] = [];
    const fail: { commit?: boolean } = {};
    const store: PricingStorePort = {
        async read(product) {
            const d = docs.get(product);
            return d ? structuredClone(d) : null;
        },
        async commit(product, expected, build) {
            if (fail.commit) throw new Error('firestore unavailable');
            const cur = docs.get(product) ?? null;
            if ((cur?.updatedAt || null) !== expected) throw new PricingConflictError();
            const { doc, log } = build(cur ? structuredClone(cur) : null);
            docs.set(product, structuredClone(doc));
            logs.push(structuredClone(log));
            return doc;
        },
        async setPortalConfigId(product, id) {
            const d = docs.get(product);
            if (d) d.portalConfigId = id;
        },
        // เลียนแบบ Firestore: แตะเฉพาะคีย์ใน patch (update) — เอกสารที่ยังไม่มีได้แค่ { draft }
        async commitDraft(product, expected, build) {
            if (fail.commit) throw new Error('firestore unavailable');
            const cur = docs.get(product) ?? null;
            if ((cur?.draft?.updatedAt || null) !== expected) throw new PricingConflictError();
            const { patch, log } = build(cur ? structuredClone(cur) : null);
            patches.push(structuredClone(patch));
            if (cur) {
                if (patch.draft) cur.draft = structuredClone(patch.draft);
                else delete cur.draft;
            } else if (patch.draft) {
                docs.set(product, { draft: structuredClone(patch.draft) } as unknown as PlanPricingDoc);
            }
            logs.push(structuredClone(log));
            return patch.draft;
        },
    };
    const patches: DraftPatch[] = [];
    return { store, docs, logs, fail, patches };
}

let clock = Date.parse('2026-10-12T00:00:00Z');
const now = () => new Date((clock += 1000));

const capdealDraft = (over: Partial<Record<string, { monthly: number | null; yearly: number | null }>> = {}, base: string | null = null): PricingDraft => ({
    plans: {
        lite: { monthly: 159, yearly: 1590 },
        pro: { monthly: 249, yearly: 2490 },
        scale: { monthly: 1049, yearly: 10490 },
        ...over,
    } as PricingDraft['plans'],
    baseUpdatedAt: base,
});

// ---------------------------------------------------------------------------
// ค่าธรรมเนียม
// ---------------------------------------------------------------------------

test('estimateStripeFee: 590 → ≈ ฿38.16 (ตัวอย่างในแผน)', () => {
    const r = estimateStripeFee(590);
    assert.equal(r.fee, 38.16);
    assert.equal(r.net, 551.84);
});

test('estimateStripeFee: 0/ค่าไม่ถูกต้อง → 0', () => {
    assert.deepEqual(estimateStripeFee(0), { fee: 0, net: 0 });
    assert.deepEqual(estimateStripeFee(NaN), { fee: 0, net: 0 });
});

// ---------------------------------------------------------------------------
// validation / merge / diff
// ---------------------------------------------------------------------------

test('validateDraft: ค่าเริ่มต้นผ่าน, null = ไม่ขาย', () => {
    const r = validateDraft('capdeal', capdealDraft({ lite: { monthly: 159, yearly: null } }));
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.plans.lite.yearly, null);
});

test('validateDraft: ปฏิเสธทศนิยม, เกินช่วง, แพลนแปลก, แพลนขาด, product แปลก', () => {
    const bad = (product: unknown, draft: unknown) => {
        const r = validateDraft(product, draft);
        assert.equal(r.ok, false);
    };
    bad('capdeal', capdealDraft({ lite: { monthly: 159.5, yearly: null } }));
    bad('capdeal', capdealDraft({ lite: { monthly: 0, yearly: null } }));
    bad('capdeal', capdealDraft({ lite: { monthly: 1_000_001, yearly: null } }));
    bad('capdeal', { plans: { ...capdealDraft().plans, gold: { monthly: 1, yearly: null } }, baseUpdatedAt: null });
    bad('capdeal', { plans: { lite: { monthly: 1, yearly: null } }, baseUpdatedAt: null });
    bad('wittaya', capdealDraft());
    bad('capdeal', { plans: capdealDraft().plans, baseUpdatedAt: 123 });
    // string ที่หน้าตาเป็นตัวเลขก็ไม่รับ
    bad('capdeal', capdealDraft({ lite: { monthly: '159' as unknown as number, yearly: null } }));
});

test('validateDraft: ทนาย yearly เว้นได้, ขอบ 1 และ 1,000,000 ผ่าน', () => {
    const r = validateDraft('lawyer', { plans: { pro: { monthly: 1, yearly: null }, top: { monthly: 1_000_000, yearly: null } }, baseUpdatedAt: null });
    assert.ok(r.ok);
});

test('mergeWithDefaults: ไม่มีเอกสาร = ราคาปัจจุบัน (ทนาย 590/1,990, Wittaya 199/399, Plus ยังไม่ตั้ง)', () => {
    assert.deepEqual(mergeWithDefaults('capdeal', null).scale, { monthly: 1049, yearly: 10490 });
    assert.deepEqual(mergeWithDefaults('lawyer', null).pro, { monthly: 590, yearly: null });
    assert.deepEqual(mergeWithDefaults('lawyer', null).top, { monthly: 1990, yearly: null });
    assert.deepEqual(mergeWithDefaults('wittaya', null).premium, { monthly: 199, yearly: null });
    assert.deepEqual(mergeWithDefaults('wittaya', null).pro, { monthly: 399, yearly: null });
    assert.deepEqual(mergeWithDefaults('lawslane', null).plus, { monthly: null, yearly: null });
});

test('diffPricing: เท่าเดิม = ไม่มีอะไรเปลี่ยน, เปลี่ยน/หยุดขาย แยกถูก', () => {
    const cur = mergeWithDefaults('capdeal', null);
    const v = validateDraft('capdeal', capdealDraft());
    assert.ok(v.ok);
    if (!v.ok) return;
    assert.equal(diffPricing(cur, v.plans).length, 0);
    const v2 = validateDraft('capdeal', capdealDraft({ lite: { monthly: 199, yearly: null } }));
    assert.ok(v2.ok);
    if (!v2.ok) return;
    const d = diffPricing(cur, v2.plans);
    assert.equal(d.length, 2);
    assert.deepEqual(d.map((c) => [c.interval, c.createsPrice]), [['monthly', true], ['yearly', false]]);
});

test('checkKeyCollectionPairing: test key ต้องคู่ _test, live ห้ามใช้ _test', () => {
    assert.match(checkKeyCollectionPairing(undefined, 'planPricing')!, /STRIPE_SECRET_KEY/);
    assert.ok(checkKeyCollectionPairing('rk_test_x', 'planPricing'));
    assert.equal(checkKeyCollectionPairing('rk_test_x', 'planPricing_test'), null);
    assert.ok(checkKeyCollectionPairing('rk_live_x', 'planPricing_test'));
    assert.equal(checkKeyCollectionPairing('rk_live_x', 'planPricing'), null);
    assert.ok(checkKeyCollectionPairing('pk_live_x', 'planPricing'));
});

// ---------------------------------------------------------------------------
// executeSave
// ---------------------------------------------------------------------------

test('บันทึกครั้งแรก: สร้าง Price เฉพาะช่องที่เปลี่ยน เขียน doc + log + portal', async () => {
    const s = fakeStripe();
    const f = fakeStore();
    const r = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', capdealDraft({ pro: { monthly: 299, yearly: 2490 } }), 'uid_admin');
    assert.equal(r.status as string, 'ok');
    if (r.status === 'error') return;
    assert.equal(r.createdPriceIds.length, 1);
    const doc = f.docs.get('capdeal')!;
    assert.equal(doc.plans.pro.monthly, 299);
    assert.equal(doc.plans.pro.stripe?.monthlyPriceId, r.createdPriceIds[0]);
    assert.deepEqual(doc.plans.pro.stripe?.previousPriceIds, []);
    assert.equal(doc.plans.lite.stripe, undefined);
    assert.equal(doc.updatedBy, 'uid_admin');
    assert.equal(f.logs.length, 1);
    assert.equal(f.logs[0].actorUid, 'uid_admin');
    assert.equal(f.logs[0].before, null);
    assert.ok(!JSON.stringify(f.logs[0]).includes('@'), 'log ต้องไม่มีอีเมล');
    assert.ok(doc.portalConfigId?.startsWith('bpc_'));
    assert.equal(r.portalConfigId, doc.portalConfigId);
});

test('เปลี่ยนราคาครั้งที่สอง: Price เดิมไป previousPriceIds และถูกปิดขาย', async () => {
    const s = fakeStripe();
    const f = fakeStore();
    const r1 = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', capdealDraft({ pro: { monthly: 299, yearly: 2490 } }), 'u');
    assert.equal(r1.status as string, 'ok');
    if (r1.status === 'error') return;
    const oldId = r1.createdPriceIds[0];
    const r2 = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', capdealDraft({ pro: { monthly: 349, yearly: 2490 } }, r1.updatedAt), 'u');
    assert.equal(r2.status as string, 'ok');
    if (r2.status === 'error') return;
    const pro = f.docs.get('capdeal')!.plans.pro.stripe!;
    assert.equal(pro.monthlyPriceId, r2.createdPriceIds[0]);
    assert.deepEqual(pro.previousPriceIds, [oldId]);
    assert.deepEqual(r2.archivedPriceIds, [oldId]);
    assert.equal(s.prices.get(oldId)!.active, false);
    // ใช้ Product เดิม
    assert.equal(s.prices.get(r2.createdPriceIds[0])!.productId, pro.productId);
    assert.equal(s.products.size, 1);
});

test('หยุดขาย (null): ไม่สร้าง Price, ย้ายตัวเดิมไป previous และปิดขาย', async () => {
    const s = fakeStripe();
    const f = fakeStore();
    const r1 = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', capdealDraft({ scale: { monthly: 1099, yearly: 10490 } }), 'u');
    if (r1.status === 'error') return assert.fail(r1.message);
    const id = r1.createdPriceIds[0];
    const r2 = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', capdealDraft({ scale: { monthly: null, yearly: 10490 } }, r1.updatedAt), 'u');
    if (r2.status === 'error') return assert.fail(r2.message);
    assert.equal(r2.createdPriceIds.length, 0);
    const scale = f.docs.get('capdeal')!.plans.scale;
    assert.equal(scale.monthly, null);
    assert.equal(scale.stripe?.monthlyPriceId, null);
    assert.deepEqual(scale.stripe?.previousPriceIds, [id]);
    assert.equal(s.prices.get(id)!.active, false);
});

test('แก้ชนกัน: baseUpdatedAt ไม่ตรง → conflict และไม่แตะ Stripe', async () => {
    const s = fakeStripe();
    const f = fakeStore();
    await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', capdealDraft({ pro: { monthly: 299, yearly: 2490 } }), 'u1');
    s.calls.length = 0;
    const r = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', capdealDraft({ pro: { monthly: 399, yearly: 2490 } }, null), 'u2');
    assert.equal(r.status as string, 'error');
    if (r.status === 'error') {
        assert.equal(r.step, 'conflict');
        assert.match(r.message, /โหลดใหม่/);
    }
    assert.deepEqual(s.calls, []);
});

test('Firestore ล้มหลังสร้าง Price → กดซ้ำได้ Price ตัวเดิม ไม่ซ้ำ', async () => {
    const s = fakeStripe();
    const f = fakeStore();
    f.fail.commit = true;
    const draft = capdealDraft({ lite: { monthly: 199, yearly: 1990 } });
    const r1 = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', draft, 'u');
    assert.equal(r1.status as string, 'error');
    if (r1.status === 'error') assert.equal(r1.step, 'firestore');
    assert.equal(s.prices.size, 2);
    f.fail.commit = false;
    const r2 = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', draft, 'u');
    assert.equal(r2.status as string, 'ok');
    assert.equal(s.prices.size, 2, 'ต้องไม่สร้าง Price เพิ่ม');
    assert.deepEqual(r2.createdPriceIds.sort(), r1.createdPriceIds.sort());
});

test('idempotencyKey หมดอายุแล้ว → ยังใช้ Price active ตัวเดิม (findActivePrice)', async () => {
    const s = fakeStripe();
    const f = fakeStore();
    f.fail.commit = true;
    const draft = capdealDraft({ lite: { monthly: 199, yearly: 1590 } });
    await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', draft, 'u');
    s.idem.clear();
    f.fail.commit = false;
    const r = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', draft, 'u');
    assert.equal(r.status as string, 'ok');
    assert.equal(s.prices.size, 1);
});

test('สร้าง Price ไม่สำเร็จ → error ยังไม่เขียน Firestore', async () => {
    const s = fakeStripe();
    const f = fakeStore();
    s.fail.create = true;
    const r = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', capdealDraft({ lite: { monthly: 199, yearly: 1590 } }), 'u');
    assert.equal(r.status as string, 'error');
    if (r.status === 'error') assert.equal(r.step, 'stripe_create');
    assert.equal(f.docs.size, 0);
    assert.equal(f.logs.length, 0);
});

test('archive/portal ล้มหลังเขียน Firestore → partial แล้ว "ลองใหม่" เก็บตกได้โดยไม่สร้าง Price ซ้ำ', async () => {
    const s = fakeStripe();
    const f = fakeStore();
    const r1 = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', capdealDraft({ pro: { monthly: 299, yearly: 2490 } }), 'u');
    if (r1.status === 'error') return assert.fail(r1.message);
    const oldId = r1.createdPriceIds[0];

    s.fail.archive = true;
    s.fail.portal = true;
    const draft = capdealDraft({ pro: { monthly: 349, yearly: 2490 } }, r1.updatedAt);
    const r2 = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', draft, 'u');
    assert.equal(r2.status as string, 'partial');
    if (r2.status !== 'partial') return;
    assert.deepEqual(r2.failed.map((x) => x.step).sort(), ['archive', 'portal']);
    assert.equal(f.docs.get('capdeal')!.plans.pro.monthly, 349);
    assert.equal(s.prices.get(oldId)!.active, true);
    const priceCount = s.prices.size;

    s.fail.archive = false;
    s.fail.portal = false;
    // ปุ่ม "ลองใหม่" = ร่างเดิม + updatedAt ใหม่
    const r3 = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', { ...draft, baseUpdatedAt: r2.updatedAt }, 'u');
    assert.equal(r3.status as string, 'ok');
    if (r3.status === 'error') return;
    assert.equal(r3.changes.length, 0);
    assert.equal(s.prices.size, priceCount, 'ต้องไม่สร้าง Price เพิ่ม');
    assert.deepEqual(r3.archivedPriceIds, [oldId]);
    assert.equal(s.prices.get(oldId)!.active, false);
    assert.equal(f.logs.length, 2, 'ลองใหม่ที่ไม่มีราคาเปลี่ยนไม่เขียน log ซ้ำ');
});

test('เปลี่ยนกลับไปราคาเดิม (199 → 159 → 199) ได้ Price ใหม่ ไม่ใช่ตัวที่ปิดขายแล้ว', async () => {
    const s = fakeStripe();
    const f = fakeStore();
    const r1 = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', capdealDraft({ lite: { monthly: 199, yearly: 1590 } }), 'u');
    if (r1.status === 'error') return assert.fail(r1.message);
    const r2 = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', capdealDraft({ lite: { monthly: 159, yearly: 1590 } }, r1.updatedAt), 'u');
    if (r2.status === 'error') return assert.fail(r2.message);
    const r3 = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', capdealDraft({ lite: { monthly: 199, yearly: 1590 } }, r2.updatedAt), 'u');
    if (r3.status === 'error') return assert.fail(r3.message);
    const id = f.docs.get('capdeal')!.plans.lite.stripe!.monthlyPriceId!;
    assert.notEqual(id, r1.createdPriceIds[0]);
    assert.equal(s.prices.get(id)!.active, true);
});

test('validation ล้ม → ไม่เรียก Stripe/Firestore', async () => {
    const s = fakeStripe();
    const f = fakeStore();
    const r = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', capdealDraft({ lite: { monthly: -1, yearly: 1590 } }), 'u');
    assert.equal(r.status as string, 'error');
    if (r.status === 'error') assert.equal(r.step, 'validate');
    assert.deepEqual(s.calls, []);
});

test('ทนาย: ค่าเริ่มต้น 590/1,990 ไม่สร้าง Price ซ้ำ สร้างเฉพาะช่องที่เปลี่ยน', async () => {
    const s = fakeStripe();
    const f = fakeStore();
    const r = await executeSave(
        { stripe: s.port, store: f.store, now }, 'lawyer',
        { plans: { pro: { monthly: 690, yearly: null }, top: { monthly: 1990, yearly: 19900 } }, baseUpdatedAt: null }, 'u',
    );
    assert.equal(r.status as string, 'ok');
    if (r.status === 'error') return;
    assert.equal(r.createdPriceIds.length, 2);
    const doc = f.docs.get('lawyer')!;
    assert.equal(doc.plans.pro.stripe?.yearlyPriceId, null);
    assert.ok(doc.plans.pro.stripe?.monthlyPriceId);
    assert.ok(doc.plans.top.stripe?.yearlyPriceId);
    // รายเดือนบริษัทไม่เปลี่ยน → ยังใช้ Price ใน env ของเว็บ
    assert.equal(doc.plans.top.stripe?.monthlyPriceId, null);
    assert.equal([...s.prices.values()].every((p) => p.product === 'lawyer'), true);
});

// ---------------------------------------------------------------------------
// เอกสารที่บันทึกลง Firestore อย่างเดียว
// ---------------------------------------------------------------------------

function fakeDocStore() {
    const docs = new Map<string, StoredDoc>();
    const logs: PlanPricingLog[] = [];
    const store: DocStorePort = {
        async read(id) { const d = docs.get(id); return d ? structuredClone(d) : null; },
        async commit(id, expected, build) {
            const cur = docs.get(id) ?? null;
            if ((cur?.updatedAt || null) !== expected) throw new PricingConflictError();
            const { doc, log } = build(cur ? structuredClone(cur) : null);
            docs.set(id, structuredClone(doc));
            logs.push(structuredClone(log));
            return doc;
        },
    };
    return { store, docs, logs };
}

test('Wittaya/AI Plus: บันทึก Firestore อย่างเดียว ไม่แตะ Stripe และ executeSave ปฏิเสธ', async () => {
    const f = fakeDocStore();
    const r = await executeStoredPlanSave({ store: f.store, now }, 'wittaya',
        { plans: { premium: { monthly: 249, yearly: 2490 }, pro: { monthly: 399, yearly: null } }, baseUpdatedAt: null }, 'u');
    assert.equal(r.status, 'ok');
    const doc = f.docs.get('wittaya') as any;
    assert.deepEqual(doc.plans.premium, { monthly: 249, yearly: 2490 });
    assert.equal(doc.updatedBy, 'u');
    assert.equal(f.logs[0].product, 'wittaya');
    assert.deepEqual(f.logs[0].createdPriceIds, []);
    // Stripe path ต้องไม่รับ wittaya
    const s = fakeStripe();
    const r2 = await executeSave({ stripe: s.port, store: fakeStore().store, now }, 'wittaya',
        { plans: { premium: { monthly: 249, yearly: null }, pro: { monthly: 399, yearly: null } }, baseUpdatedAt: null }, 'u');
    assert.equal(r2.status, 'error');
    assert.deepEqual(s.calls, []);
    // และทางบันทึกแบบ Firestore ต้องไม่รับ capdeal (ต้องผ่าน Stripe)
    const r3 = await executeStoredPlanSave({ store: f.store, now }, 'capdeal', capdealDraft(), 'u');
    assert.equal(r3.status, 'error');
});

test('saveStoredDoc: แก้ชนกัน → conflict, เวอร์ชันตรง → ผ่าน + log', async () => {
    const f = fakeDocStore();
    const r1 = await saveStoredDoc({ store: f.store, now }, 'ebook', { standardPrice: 199 }, null, 'u');
    assert.equal(r1.status, 'ok');
    const stale = await saveStoredDoc({ store: f.store, now }, 'ebook', { standardPrice: 249 }, null, 'u');
    assert.equal(stale.status, 'error');
    if (stale.status === 'error') assert.equal(stale.step, 'conflict');
    if (r1.status !== 'ok') return;
    const r2 = await saveStoredDoc({ store: f.store, now }, 'ebook', { standardPrice: 249 }, r1.updatedAt, 'u');
    assert.equal(r2.status, 'ok');
    assert.equal(f.logs.length, 2);
    assert.deepEqual(f.logs[1].before, { standardPrice: 199 });
    assert.deepEqual(f.logs[1].after, { standardPrice: 249 });
});

test('validateCreditPacks: รหัส/เครดิต/ราคา ต้องถูกรูป, ว่างได้', () => {
    assert.ok(validateCreditPacks({ packs: {}, baseUpdatedAt: null }).ok);
    const ok = validateCreditPacks({ packs: { pack_100: { credits: 100, price: 99 } }, baseUpdatedAt: null });
    assert.ok(ok.ok);
    assert.equal(validateCreditPacks({ packs: { 'Bad ID': { credits: 1, price: 1 } }, baseUpdatedAt: null }).ok, false);
    assert.equal(validateCreditPacks({ packs: { p: { credits: 0, price: 1 } }, baseUpdatedAt: null }).ok, false);
    assert.equal(validateCreditPacks({ packs: { p: { credits: 10, price: 9.5 } }, baseUpdatedAt: null }).ok, false);
    assert.equal(validateCreditPacks({ packs: [], baseUpdatedAt: null }).ok, false);
});

test('validateEbook: ราคา 1–100,000 · ค่าส่ง 0 ได้ · ค่าเริ่มต้น 199/0', () => {
    assert.deepEqual(mergeEbook(null), { standardPrice: 199, shipping: { baseFee: 0, perExtraItem: 0, freeOver: 0 } });
    assert.ok(validateEbook({ standardPrice: 199, shipping: { baseFee: 0, perExtraItem: 0, freeOver: 0 }, baseUpdatedAt: null }).ok);
    assert.equal(validateEbook({ standardPrice: 0, shipping: { baseFee: 0, perExtraItem: 0, freeOver: 0 }, baseUpdatedAt: null }).ok, false);
    assert.equal(validateEbook({ standardPrice: 199, shipping: { baseFee: -1, perExtraItem: 0, freeOver: 0 }, baseUpdatedAt: null }).ok, false);
});

test('validateGpPercent: 0–50 ปัด 2 ตำแหน่ง', () => {
    assert.deepEqual(validateGpPercent(15), { ok: true, value: 15 });
    assert.deepEqual(validateGpPercent(12.345), { ok: true, value: 12.35 });
    assert.equal(validateGpPercent(51).ok, false);
    assert.equal(validateGpPercent(-1).ok, false);
    assert.equal(validateGpPercent('15').ok, false);
});

// ---------------------------------------------------------------------------
// ราคาร่าง CapDeal / ทนาย (ยังไม่ใช้จริง)
// ---------------------------------------------------------------------------

const capdealPlans = () => capdealDraft().plans;

test('validatePlanDraft: กติกาเดียวกับราคาจริง และใช้ได้แค่ capdeal/lawyer', () => {
    assert.ok(validatePlanDraft('capdeal', { plans: capdealPlans() }, null).ok);
    assert.ok(validatePlanDraft('lawyer', { plans: { pro: { monthly: 690, yearly: null }, top: { monthly: 1990, yearly: null } } }, undefined).ok);
    const bad = (plans: unknown) => validatePlanDraft('capdeal', { plans }, null).ok;
    assert.equal(bad({ ...capdealPlans(), pro: { monthly: 249.5, yearly: null } }), false);
    assert.equal(bad({ ...capdealPlans(), pro: { monthly: 0, yearly: null } }), false);
    assert.equal(bad({ ...capdealPlans(), pro: { monthly: 1_000_001, yearly: null } }), false);
    assert.equal(bad({ ...capdealPlans(), extra: { monthly: 1, yearly: null } }), false);
    assert.equal(bad({ lite: capdealPlans().lite }), false);
    assert.equal(validatePlanDraft('wittaya', { plans: { premium: { monthly: 199, yearly: null }, pro: { monthly: 399, yearly: null } } }, null).ok, false);
    assert.equal(validatePlanDraft('capdeal', { plans: capdealPlans() }, 123).ok, false);
});

test('buildDraftWrite: patch มีแค่คีย์ draft ไม่มี plans/stripe/portalConfigId/updatedAt ของเอกสาร', () => {
    const current: PlanPricingDoc = {
        currency: 'thb',
        plans: { pro: { monthly: 249, yearly: 2490, stripe: { productId: 'prod_1', monthlyPriceId: 'price_1', yearlyPriceId: null, previousPriceIds: [] } } },
        portalConfigId: 'bpc_1', updatedAt: '2026-10-01T00:00:00.000Z', updatedBy: 'uid_a',
    };
    for (const plans of [capdealPlans(), null]) {
        const { patch, log } = buildDraftWrite('capdeal', current, plans, 'uid_admin', '2026-10-13T00:00:00.000Z');
        assert.deepEqual(Object.keys(patch), ['draft']);
        assert.ok(!JSON.stringify(patch).includes('stripe'));
        assert.ok(!JSON.stringify(patch).includes('PriceId'));
        assert.ok(!('portalConfigId' in patch) && !('updatedAt' in patch));
        assert.equal(log.kind, 'draft');
        assert.equal(log.product, 'capdeal');
        assert.deepEqual(log.createdPriceIds, []);
    }
});

test('บันทึกร่าง: ไม่แตะ Stripe และ plans/stripe/portalConfigId/updatedAt เดิมไม่เปลี่ยน', async () => {
    const s = fakeStripe();
    const f = fakeStore();
    const saved = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', capdealDraft({ pro: { monthly: 299, yearly: 2490 } }), 'uid_admin');
    assert.equal(saved.status, 'ok');
    const before = structuredClone(f.docs.get('capdeal')!);
    const calls = s.calls.length;

    const r = await executeDraftSave({ store: f.store, now }, 'capdeal', { plans: capdealDraft({ pro: { monthly: 349, yearly: 3490 } }).plans }, null, 'uid_admin');
    assert.equal(r.status, 'ok');
    if (r.status !== 'ok') return;
    const after = f.docs.get('capdeal')!;
    const { draft, ...rest } = after;
    assert.deepEqual(rest, before, 'ทุกฟิลด์ที่เว็บอ่านต้องเหมือนเดิม');
    assert.equal(draft?.plans.pro.monthly, 349);
    assert.equal(after.plans.pro.monthly, 299, 'ราคาที่เว็บแสดงยังเป็นราคาจริง');
    assert.equal(s.calls.length, calls, 'ไม่เรียก Stripe');
    assert.deepEqual(Object.keys(f.patches[0]), ['draft']);
    assert.equal(f.logs.at(-1)?.kind, 'draft');

    // ร่างที่สอง: ต้องส่งเวอร์ชันของร่าง ไม่งั้นชนกัน
    const stale = await executeDraftSave({ store: f.store, now }, 'capdeal', { plans: capdealPlans() }, null, 'uid_admin');
    assert.equal(stale.status === 'error' && stale.step, 'conflict');
    const ok2 = await executeDraftSave({ store: f.store, now }, 'capdeal', { plans: capdealPlans() }, r.draft!.updatedAt, 'uid_admin');
    assert.equal(ok2.status, 'ok');
});

test('บันทึกร่างตอนยังไม่มีเอกสาร: สร้างเอกสารที่มีแค่ draft (เว็บใช้ env ตามเดิม) แล้วล้างร่างได้', async () => {
    const f = fakeStore();
    const r = await executeDraftSave({ store: f.store, now }, 'lawyer', { plans: { pro: { monthly: 690, yearly: 6900 }, top: { monthly: 1990, yearly: null } } }, null, 'uid_admin');
    assert.equal(r.status, 'ok');
    assert.deepEqual(Object.keys(f.docs.get('lawyer')!), ['draft']);
    // admin parser: ราคาจริง = ค่าเริ่มต้น (ไม่หยิบร่างมาเป็นราคา)
    assert.equal(mergeWithDefaults('lawyer', f.docs.get('lawyer')).pro.monthly, 590);
    const v = r.status === 'ok' ? r.draft!.updatedAt : '';
    assert.equal((await executeDraftClear({ store: f.store, now }, 'lawyer', 'wrong', 'uid_admin')).status, 'error');
    assert.equal((await executeDraftClear({ store: f.store, now }, 'lawyer', v, 'uid_admin')).status, 'ok');
    assert.equal(f.docs.get('lawyer')!.draft, undefined);
    assert.deepEqual(f.patches.at(-1), { draft: null });
});

test('บันทึกร่าง: validation ล้ม → ไม่เขียนอะไร', async () => {
    const f = fakeStore();
    const r = await executeDraftSave({ store: f.store, now }, 'capdeal', { plans: { ...capdealPlans(), lite: { monthly: -5, yearly: null } } }, null, 'uid_admin');
    assert.equal(r.status === 'error' && r.step, 'validate');
    assert.equal(f.patches.length, 0);
    assert.equal(f.docs.size, 0);
});

test('parser ของ admin รับเอกสารที่มี draft: plans มาจาก plans เท่านั้น, ร่างผิดรูป = null', () => {
    const raw = {
        currency: 'thb',
        plans: { lite: { monthly: 159, yearly: 1590 }, pro: { monthly: 249, yearly: 2490 }, scale: { monthly: 1049, yearly: 10490 } },
        portalConfigId: null, updatedAt: '2026-10-01T00:00:00.000Z', updatedBy: 'uid_a',
        draft: { plans: { lite: { monthly: 199, yearly: null }, pro: { monthly: 299, yearly: 2990 }, scale: { monthly: 1099, yearly: 10990 } }, updatedAt: '2026-10-13T00:00:00.000Z', updatedBy: 'uid_b' },
    };
    const merged = mergeWithDefaults('capdeal', raw);
    assert.deepEqual(merged.pro, { monthly: 249, yearly: 2490 });
    assert.deepEqual(Object.keys(merged), ['lite', 'pro', 'scale']);
    const d = parsePlanDraft('capdeal', raw.draft);
    assert.equal(d?.plans.pro.monthly, 299);
    assert.equal(d?.plans.lite.yearly, null);
    assert.equal(parsePlanDraft('capdeal', null), null);
    assert.equal(parsePlanDraft('capdeal', { plans: raw.draft.plans }), null, 'ไม่มี updatedAt = ผิดรูป');
    assert.equal(parsePlanDraft('capdeal', { updatedAt: 'x', plans: { lite: raw.draft.plans.lite } }), null, 'แพลนขาด = ผิดรูป');
});

test('บันทึกผ่าน Stripe สำเร็จ → ร่างถูกล้างในการเขียนเดียวกัน (รวมกรณีร่างเท่าราคาเดิม)', async () => {
    const s = fakeStripe();
    const f = fakeStore();
    const d1 = await executeDraftSave({ store: f.store, now }, 'capdeal', { plans: capdealDraft({ pro: { monthly: 299, yearly: 2490 } }).plans }, null, 'uid_admin');
    assert.equal(d1.status, 'ok');
    const r = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', capdealDraft({ pro: { monthly: 299, yearly: 2490 } }), 'uid_admin');
    assert.equal(r.status, 'ok');
    const doc = f.docs.get('capdeal')!;
    assert.equal(doc.draft, undefined);
    assert.equal(doc.plans.pro.monthly, 299);

    // ร่างเท่าราคาปัจจุบัน → ไม่สร้าง Price แต่ยังล้างร่าง
    await executeDraftSave({ store: f.store, now }, 'capdeal', { plans: capdealDraft({ pro: { monthly: 299, yearly: 2490 } }).plans }, null, 'uid_admin');
    assert.ok(f.docs.get('capdeal')!.draft);
    const created = s.prices.size;
    const r2 = await executeSave({ stripe: s.port, store: f.store, now }, 'capdeal', capdealDraft({ pro: { monthly: 299, yearly: 2490 } }, doc.updatedAt), 'uid_admin');
    assert.equal(r2.status, 'ok');
    assert.equal(s.prices.size, created);
    assert.equal(f.docs.get('capdeal')!.draft, undefined);
});
