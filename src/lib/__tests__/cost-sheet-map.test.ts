/**
 * เทสต์ผังช่อง admin → Google Sheet ต้นทุน (cost-sheet-map)
 * fixture = ช่องที่ admin เขียนใน Sheet จริง (ค่า + เป็นสูตรไหม) ป้ายแถว และ defined names
 * สร้างใหม่ด้วย scripts/cost-sheet-fixture.ts เมื่อโครง Sheet เปลี่ยน
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_COST_ASSUMPTIONS, DEFAULT_RUN_CONTEXT, SHEET_PLAN_PRICES } from '../cost-model';
import { COST_SHEET_DOC, LIVE_EFFECT_LABELS, assumptionLeafPaths } from '../pricing-field-docs';
import {
    COST_SHEET_ASSUMPTION_MAP,
    COST_SHEET_PRICING_MAP,
    COST_SHEET_TABS,
    PREFLIGHT_RANGES,
    a1,
    buildCostSheetBatch,
    checkSheetLayout,
    costSheetUrl,
    isEditableAssumptionPath,
    noSheetReason,
    runContextFromPlans,
    toBatchUpdateBody,
    type SheetGrid,
    type SheetTarget,
} from '../cost-sheet-map';
import fixture from '../cost-sheet-fixture.json';

type Cell = { v: number | string | null; f: boolean };
const cells = fixture.cells as Record<string, Cell>;
const labels = fixture.labels as Record<string, string>;
const names = fixture.names as Record<string, string>;
const batch = () => buildCostSheetBatch(DEFAULT_COST_ASSUMPTIONS, DEFAULT_RUN_CONTEXT);
const writtenRanges = new Set(batch().map((w) => w.range));
const isWritten = (t: SheetTarget) => writtenRanges.has(t.sheetCell);

/** ทุก leaf ของโมเดล (รวมช่องเครดิต/mix ที่หน้าเว็บซ่อน) */
function allLeafPaths(): string[] {
    const out: string[] = [];
    const walk = (v: unknown, path: string) => {
        if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}/${i}`));
        if (v !== null && typeof v === 'object') {
            for (const k of Object.keys(v)) walk((v as any)[k], path ? `${path}/${k}` : k);
            return;
        }
        out.push(path);
    };
    walk(DEFAULT_COST_ASSUMPTIONS, '');
    return out;
}

test('ทุกช่องสมมติฐานที่แก้ได้ มีช่องใน Sheet หรือระบุ null พร้อมเหตุผล', () => {
    for (const p of assumptionLeafPaths()) {
        const e = COST_SHEET_ASSUMPTION_MAP[p];
        assert.ok(e, `ไม่มีในผัง: ${p}`);
        if (e.sheetCell === null) assert.ok(e.reason[0].trim() && e.reason[1].trim(), `null ต้องมีเหตุผล: ${p}`);
        assert.equal(isEditableAssumptionPath(p), true, p);
    }
    // ไม่มี key เกิน (ผังตรงกับโมเดล)
    const leaves = new Set(allLeafPaths());
    for (const k of Object.keys(COST_SHEET_ASSUMPTION_MAP)) assert.ok(leaves.has(k), `key ไม่มีในโมเดล: ${k}`);
});

test('ช่องที่ไม่มีใน Sheet: VAT, Beam, ใช้ยอดจริงแทน, typhoon — และมีแค่นี้', () => {
    const nulls = Object.entries(COST_SHEET_ASSUMPTION_MAP).filter(([, e]) => e.sheetCell === null).map(([k]) => k).sort();
    assert.deepEqual(nulls, [
        'beam/amexPct', 'beam/cardPct', 'beam/ewalletPct', 'beam/intlPct', 'beam/premiumPct', 'beam/promptpayPct',
        'general/vatOnFees',
        'models/typhoon/cached', 'models/typhoon/input', 'models/typhoon/output',
        'sharedOverride/0', 'sharedOverride/1', 'sharedOverride/2',
    ]);
    assert.ok(noSheetReason('general/vatOnFees'));
    assert.equal(noSheetReason('general/fx'), null);
});

test('ทุกช่องที่เขียนเป็นค่าคงที่ (ไม่ใช่สูตร) ใน Sheet จริง', () => {
    const writes = batch();
    for (const w of writes) {
        const c = cells[w.range];
        assert.ok(c, `ไม่มีใน fixture: ${w.range} (${w.source})`);
        assert.equal(c.f, false, `ช่องสูตร: ${w.range} (${w.source})`);
        assert.ok(c.v !== null, `ช่องว่างใน Sheet: ${w.range}`);
        assert.ok(labels[w.target.labelCell], `ไม่มีป้ายแถว: ${w.target.labelCell}`);
    }
    assert.equal(Object.keys(cells).length, writes.length, 'fixture ควรมีเฉพาะช่องที่เขียน');
});

test('defined name ในไฟล์ชี้ช่องเดียวกับผัง', () => {
    const targets: SheetTarget[] = [
        ...Object.values(COST_SHEET_ASSUMPTION_MAP).filter((e): e is SheetTarget => e.sheetCell !== null),
        ...Object.values(COST_SHEET_PRICING_MAP),
    ];
    let checked = 0;
    for (const t of targets) {
        if (!t.name) continue;
        const [base, nth] = t.name.split('#');
        const ref = names[base];
        if (!ref && !isWritten(t)) continue;
        assert.ok(ref, `ไม่มี defined name ${base}`);
        const m = /^'(.+)'!\$([A-Z]+)\$(\d+)(?::\$([A-Z]+)\$(\d+))?$/.exec(ref)!;
        assert.ok(m, ref);
        assert.equal(m[1], t.tab, t.name);
        let cell: string;
        if (nth) {
            // ช่วงแนวนอน (สถานการณ์ B:D) หรือแนวตั้ง (ตารางโมเดล M_*)
            const i = Number(nth) - 1;
            cell = m[3] === m[5] ? `${String.fromCharCode(m[2].charCodeAt(0) + i)}${m[3]}` : `${m[2]}${Number(m[3]) + i}`;
        } else {
            assert.equal(m[4], undefined, `${t.name} ควรเป็นช่องเดี่ยว`);
            cell = `${m[2]}${m[3]}`;
        }
        assert.equal(cell, t.cell, `${t.name} → ${ref}`);
        checked++;
    }
    assert.ok(checked > 190, `ตรวจได้ ${checked}`);
});

test('ค่าตั้งต้นของ admin = ค่าใน Sheet ทุกช่อง (ผังชี้ถูกช่อง)', () => {
    for (const w of batch()) {
        const sv = cells[w.range].v;
        if (typeof w.value === 'number') assert.ok(typeof sv === 'number' && Math.abs(sv - w.value) < 1e-12, `${w.range} (${w.source}): sheet ${sv} admin ${w.value}`);
        else assert.equal(sv, w.value, `${w.range} (${w.source})`);
    }
});

test('buildCostSheetBatch: จำนวนช่องและค่าตัวอย่าง (สัดส่วน % เขียนเป็นทศนิยม)', () => {
    const writes = batch();
    const by = (r: string) => writes.find((w) => w.range === r)?.value;
    const A = (c: string) => a1(COST_SHEET_TABS.assumptions, c);
    const V = (c: string) => a1(COST_SHEET_TABS.vendors, c);
    const U = (c: string) => a1(COST_SHEET_TABS.units, c);
    const count = (tab: string) => writes.filter((w) => w.target.tab === tab).length;
    assert.equal(writes.length, 276);
    assert.equal(count(COST_SHEET_TABS.assumptions), 160);
    assert.equal(count(COST_SHEET_TABS.vendors), 43);
    assert.equal(count(COST_SHEET_TABS.units), 73);
    assert.equal(A('B5'), "'สมมติฐาน'!B5");
    assert.equal(by(A('B5')), 33);
    assert.equal(by(A('B6')), 0.8); // เป้า margin 80%
    assert.equal(by(A('B9')), 0.0365);
    assert.equal(by(A('B29')), 0.15); // GP 15% → 0.15
    assert.equal(by(A('B50')), 590);
    assert.equal(by(A('B52')), 0); // AI Plus ยังไม่ตั้งราคา
    assert.equal(by(A('B58')), 2900);
    assert.equal(by(A('C66')), 40); // ทนาย Pro สถานการณ์เติบโต
    assert.equal(by(A('D71')), 0.5); // สัดส่วนใช้โควตา สถานการณ์ขยาย
    assert.equal(by(V('C5')), 0.000024);
    assert.equal(by(V('C35')), 450);
    assert.equal(by(V('D39')), 2.5);
    assert.equal(by(U('B19')), 'gemini-3.1-flash-lite');
    assert.equal(by(U('J5')), 0.5);
    assert.equal(by(U('F11')), 1);
    // งานที่ไม่คิดเครดิต/mix: ช่อง F/J ใน Sheet ว่าง ห้ามเติม
    assert.equal(by(U('F12')), undefined);
    assert.equal(by(U('J11')), undefined);
    // ไม่มีช่องสูตร/ช่องที่ admin ไม่มี
    assert.equal(by(A('B12')), undefined); // CONNECT_PCT
    assert.equal(by(V('C29')), undefined); // P_TYPHOON
    assert.equal(by(V('B44')), undefined); // แถว typhoon เป็นสูตร
});

test('ราคาที่ส่ง = ราคาจริง (ไม่ใช่ร่าง) · GP เป็นสัดส่วน · ค่าที่แก้ไปถึง Sheet', () => {
    const run = runContextFromPlans([
        { product: 'capdeal', plans: { lite: { monthly: 199 }, pro: { monthly: null }, scale: { monthly: 1049 } } },
        { product: 'lawyer', plans: { pro: { monthly: 690 }, top: { monthly: 1990 } } },
        // wittaya / lawslane ไม่มีในรายการ → ราคาในไฟล์
    ], 7.5);
    assert.equal(run.prices.cdLite, 199);
    assert.equal(run.prices.cdPro, 0); // ไม่ขาย
    assert.equal(run.prices.lawPro, 690);
    assert.equal(run.prices.witPremium, SHEET_PLAN_PRICES.witPremium);
    const m = structuredClone(DEFAULT_COST_ASSUMPTIONS);
    m.general.fx = 35.5;
    m.scenarios.vMain[2] = 123456;
    m.aiCalls.lalin.model = 'gemini-2.5-flash';
    const writes = buildCostSheetBatch(m, run);
    const by = (r: string) => writes.find((w) => w.range === r)?.value;
    assert.equal(by("'สมมติฐาน'!B5"), 35.5);
    assert.equal(by("'สมมติฐาน'!D77"), 123456);
    assert.equal(by("'สมมติฐาน'!B53"), 199);
    assert.equal(by("'สมมติฐาน'!B54"), 0);
    assert.equal(by("'สมมติฐาน'!B29"), 0.075);
    assert.equal(by("'ต้นทุนต่อหน่วย'!B19"), 'gemini-2.5-flash');
});

test('ค่าผิดรูปไม่ถูกส่ง (โยน error ก่อนเรียก Google)', () => {
    const m = structuredClone(DEFAULT_COST_ASSUMPTIONS);
    (m.general as any).fx = Number.NaN;
    assert.throws(() => buildCostSheetBatch(m, DEFAULT_RUN_CONTEXT));
});

test('body ของ batchUpdate ใช้ RAW และหนึ่งช่องต่อช่วง', () => {
    const body = toBatchUpdateBody(batch());
    assert.equal(body.valueInputOption, 'RAW');
    assert.equal(body.data.length, 276);
    assert.deepEqual(body.data[0], { range: "'สมมติฐาน'!B5", majorDimension: 'ROWS', values: [[33]] });
});

/** ตาราง Sheet จำลองจาก fixture (ช่องเป้าหมาย + ป้ายแถว) */
function gridFromFixture(): SheetGrid {
    const grid = {} as SheetGrid;
    for (const t of Object.values(COST_SHEET_TABS)) grid[t] = [];
    const put = (ref: string, v: unknown) => {
        const m = /^'(.+)'!([A-Z]+)(\d+)$/.exec(ref)!;
        const rows = grid[m[1] as keyof SheetGrid];
        const r = Number(m[3]) - 1;
        rows[r] = rows[r] ?? [];
        rows[r][m[2].charCodeAt(0) - 65] = v;
    };
    for (const [ref, c] of Object.entries(cells)) put(ref, c.v);
    for (const [ref, l] of Object.entries(labels)) put(ref, l);
    return grid;
}

test('ตรวจ Sheet ก่อนเขียน: โครงตรง = ผ่าน · ช่องสูตร/แถวเลื่อน = ไม่ผ่าน', () => {
    const writes = batch();
    assert.deepEqual(checkSheetLayout(gridFromFixture(), writes, labels), []);

    const withFormula = gridFromFixture();
    withFormula['สมมติฐาน'][4][1] = '=B6*2';
    assert.deepEqual(checkSheetLayout(withFormula, writes, labels), ["'สมมติฐาน'!B5 เป็นสูตร"]);

    // แทรกแถวเหนือแถว 5 → ทุกแถวเลื่อนลง
    const shifted = gridFromFixture();
    shifted['สมมติฐาน'].splice(4, 0, ['แถวใหม่']);
    const problems = checkSheetLayout(shifted, writes, labels);
    assert.ok(problems.some((p) => p.startsWith("'สมมติฐาน'!A5 ควรเป็น")), problems.join('\n'));

    assert.ok(PREFLIGHT_RANGES['สมมติฐาน'].endsWith('A1:D103'));
});

test('ลิงก์ Sheet สร้างจาก id ที่ส่งมา (ไม่มี id ในโค้ด)', () => {
    assert.equal(costSheetUrl('abc_DEF-123'), 'https://docs.google.com/spreadsheets/d/abc_DEF-123/edit');
});

test('ปุ่มส่ง Sheet มีคำอธิบาย 4 ส่วน + ป้ายเตือน "ทุกคนที่มีลิงก์ดูได้"', () => {
    const d = COST_SHEET_DOC;
    for (const l of [d.title, d.what, d.how, d.when, d.liveDetail, ...d.affects]) assert.ok(l[0].trim() && l[1].trim());
    assert.equal(d.live, 'sheet');
    assert.ok(LIVE_EFFECT_LABELS.sheet[0].includes('ทุกคนที่มีลิงก์ดูได้'));
});
