/**
 * เทสต์คำอธิบายช่อง (pricing-field-docs) — ทุกช่องที่แก้ได้ต้องมีคำอธิบาย 4 ส่วน และทุกสินค้าต้องบอกว่าแสดงที่ไหน
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_COST_ASSUMPTIONS } from '../cost-model';
import { PRICING_CATALOG, SUBSCRIPTION_PRODUCTS } from '../plan-pricing-core';
import {
    PRICE_FIELD_DOCS,
    PRODUCT_DOCS,
    REFERENCE_ONLY_PATHS,
    assumptionDoc3,
    assumptionFieldDoc,
    assumptionLeafPaths,
    assumptionTitle,
    deriveAffects,
    diffAffects,
    priceFieldKey,
} from '../pricing-field-docs';

const filled = (l: [string, string]) => l[0].trim() !== '' && l[1].trim() !== '';

test('ทุกช่องสมมติฐานมีชื่อและคำอธิบาย คืออะไร/ทำงานยังไง/ควรแก้เมื่อไร', () => {
    const paths = assumptionLeafPaths();
    assert.ok(paths.length > 150);
    for (const p of paths) {
        const d = assumptionDoc3(p);
        assert.ok(d, `ไม่มีคำอธิบาย: ${p}`);
        assert.ok(filled(d!.what) && filled(d!.how) && filled(d!.when), p);
        const t = assumptionTitle(p);
        assert.notEqual(t[0], p, `ไม่มีชื่อ: ${p}`);
    }
});

test('ทุกช่องสมมติฐาน (ยกเว้นช่องอ้างอิง) กระทบตัวเลขอย่างน้อย 1 ส่วน — หาจากโมเดล', () => {
    const used = new Set(Object.values(DEFAULT_COST_ASSUMPTIONS.aiCalls).map((c) => c.model));
    const cachedUsed = new Set(Object.values(DEFAULT_COST_ASSUMPTIONS.aiCalls).filter((c) => c.cachedShare > 0).map((c) => c.model));
    const rows = new Set(assumptionLeafPaths().map((p) => (p.startsWith('scenarios/') ? p.replace(/\/\d$/, '') : p)));
    for (const p of rows) {
        const a = deriveAffects(p);
        // โมเดลที่ไม่มีงาน AI ไหนใช้อยู่ (เช่น 2.5-flash-lite, typhoon) ไม่กระทบอะไรตามจริง
        const model = p.startsWith('models/') ? p.split('/')[1] : null;
        if (model && !used.has(model)) { assert.equal(a.length, 0, p); continue; }
        // ราคา cached ไม่มีผลถ้างานที่ใช้โมเดลนั้นไม่มี cache (เช่น Lalin)
        if (model && p.endsWith('/cached') && !cachedUsed.has(model)) continue;
        if (REFERENCE_ONLY_PATHS.includes(p)) assert.equal(a.length, 0, p);
        else assert.ok(a.length > 0, `ไม่กระทบอะไร: ${p}`);
    }
});

test('อัตราแลกเปลี่ยนกระทบทุกส่วนต้นทุน · ราคา SMS กระทบ CapDeal/Business · ราคาโมเดลกระทบหลายส่วน', () => {
    const fx = deriveAffects('general/fx').map((l) => l[0]).join('\n');
    for (const s of ['ต้นทุนต่อหน่วย', 'ค่ารันรายเดือน', 'สรุปต่อเว็บ', 'Margin ต่อแพลน', 'จ่ายครั้งเดียว']) assert.ok(fx.includes(s), s);
    const sms = deriveAffects('servicePrices/sms').map((l) => l[0]).join('\n');
    assert.ok(sms.includes('SMS OTP'));
    assert.ok(sms.includes('Business Starter'));
    assert.ok(!sms.includes('GP ล่าม'));
    // VAT กระทบ GP ล่าม (ค่าธรรมเนียม Beam) ด้วย
    assert.ok(deriveAffects('general/vatOnFees').some((l) => l[0].includes('GP ล่าม')));
    const f = assumptionFieldDoc('scenarios/lawPro/1');
    assert.equal(f?.live, 'estimate');
});

test('กล่องยืนยัน: diffAffects แสดงเฉพาะส่วนที่ขยับจริง', () => {
    const after = structuredClone(DEFAULT_COST_ASSUMPTIONS);
    after.servicePrices.lineBasicThb = 1500;
    const d = diffAffects(DEFAULT_COST_ASSUMPTIONS, after).map((l) => l[0]).join('\n');
    assert.ok(d.includes('LINE OA'));
    assert.ok(!d.includes('ต้นทุนต่อหน่วย'));
    assert.equal(diffAffects(DEFAULT_COST_ASSUMPTIONS, DEFAULT_COST_ASSUMPTIONS).length, 0);
});

test('ทุกแพลน/สินค้าในหน้าตั้งราคามีคำอธิบาย + ที่แสดงราคา (หรือระบุว่ายังไม่แสดง)', () => {
    const keys: string[] = ['aiCredits', 'ebook', 'interpreterGp'];
    for (const product of SUBSCRIPTION_PRODUCTS) {
        for (const plan of PRICING_CATALOG[product].plans) {
            keys.push(`${product}.${plan.id}`);
            const f = PRICE_FIELD_DOCS[priceFieldKey(product, plan.id)];
            assert.ok(f, `ไม่มีคำอธิบายช่องราคา ${product}.${plan.id}`);
            assert.ok(filled(f.what) && filled(f.how) && filled(f.when) && f.affects.length > 0 && filled(f.liveDetail));
        }
    }
    for (const k of keys) {
        const d = PRODUCT_DOCS[k];
        assert.ok(d && filled(d.about), `ไม่มี about: ${k}`);
        assert.ok(d.shownAt.length > 0 || d.notShownYet === true, `ไม่มี shownAt: ${k}`);
        for (const s of d.shownAt) assert.match(s.url, /^https:\/\/(www|capdeal|wittaya)\.lawslane\.com\//);
    }
    for (const k of ['draft.capdeal', 'draft.lawyer', 'creditPacks', 'ebook.standardPrice', 'ebook.shipping', 'interpreter.gpPercent']) {
        assert.ok(PRICE_FIELD_DOCS[k], k);
    }
    assert.equal(PRICE_FIELD_DOCS['interpreter.gpPercent'].live, 'live');
    assert.equal(PRICE_FIELD_DOCS['price.capdeal.lite'].live, 'live');
    assert.equal(PRICE_FIELD_DOCS['draft.lawyer'].live, 'stored');
});
