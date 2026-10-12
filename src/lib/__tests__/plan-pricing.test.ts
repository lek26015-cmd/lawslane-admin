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
    const docs = new Map<PricingProduct, PlanPricingDoc>(Object.entries(initial) as [PricingProduct, PlanPricingDoc][]);
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
    };
    return { store, docs, logs, fail };
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

test('mergeWithDefaults: ไม่มีเอกสาร = ราคาปัจจุบัน, ทนาย = null', () => {
    assert.deepEqual(mergeWithDefaults('capdeal', null).scale, { monthly: 1049, yearly: 10490 });
    assert.deepEqual(mergeWithDefaults('lawyer', null).top, { monthly: null, yearly: null });
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

test('ทนาย: ตั้งราคาครั้งแรกจาก null', async () => {
    const s = fakeStripe();
    const f = fakeStore();
    const r = await executeSave(
        { stripe: s.port, store: f.store, now }, 'lawyer',
        { plans: { pro: { monthly: 590, yearly: null }, top: { monthly: 1990, yearly: 19900 } }, baseUpdatedAt: null }, 'u',
    );
    assert.equal(r.status as string, 'ok');
    if (r.status === 'error') return;
    assert.equal(r.createdPriceIds.length, 3);
    const doc = f.docs.get('lawyer')!;
    assert.equal(doc.plans.pro.stripe?.yearlyPriceId, null);
    assert.ok(doc.plans.top.stripe?.yearlyPriceId);
    assert.equal([...s.prices.values()].every((p) => p.product === 'lawyer'), true);
});
