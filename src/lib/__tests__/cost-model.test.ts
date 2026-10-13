/**
 * เทสต์โมเดลต้นทุน — เทียบกับ LAWSLANE-ต้นทุน-2026-10.xlsx
 *
 * ค่าคาดหวังได้จากการแปลงสูตรในไฟล์ทีละช่อง (ไฟล์ไม่ได้เก็บค่าที่คำนวณไว้) ตัวอย่างคิดมือ:
 *   ต้นทุนต่อหน่วย (หน้า "ต้นทุนต่อหน่วย", gemini-2.5-flash in 0.3 / cached 0.03 / out 2.5 USD ต่อล้าน token, FX 33)
 *     ถามกฎหมาย 12,000×0.7×0.3 + 12,000×0.3×0.03 + 1,500×2.5 = 6,378 → $0.006378 → ฿0.210474
 *     ค้นตัวบท ฿0.15477 · ค้นฎีกา ฿0.210474 · ไฟล์แนบ ฿0.462 · ร่าง ฿0.526152 (2 เครดิต) · ตรวจสัญญา ฿0.528 (2 เครดิต)
 *     เฉลี่ยต่อเครดิต (H22) = Σ(บาท×mix) / Σ(เครดิต×mix) = 0.2747151 / 1.15 = ฿0.2388827
 *   ค่าส่วนกลาง (หน้า "ค่ารันรายเดือน" แถว 4–16 = SHARED_TOTALS) = ฿1,442.91 / ฿2,899.66 / ฿9,657.16
 *   บัญชีที่จ่ายเงิน (D_PAYING) = 20 / 227 / 1,193 → ส่วนกลางต่อบัญชี (เติบโต) = 2,899.66 / 227 = ฿12.7738
 *   หน้า "Margin ต่อแพลน" (ไฟล์ไม่คิด VAT บนค่าธรรมเนียม → เทสต์ตั้ง vatOnFees = 0):
 *     ทนาย Pro 590: E6 = 300 × 0.2388827 = 71.6648 · G6 = 590×(3.65%+0.7%)+10 = 35.665
 *        I6 = 590 − 71.6648 − 35.665 − 12.7738 = 469.8964 · J6 = 79.64% · K6 = 520.0617
 *        M6 = (71.6648 + 12.7738 + 10) / (1 − 0.8 − 0.0435) = 603.4417
 *     ทนาย Firm 1,990: E7 = 238.8827 · I7 = 1,641.7785 · M7 = 1,671.9266
 *     CapDeal Lite 159: E11 = 30×0.4092 + 90×(0.1254+0.000396) = 23.5977 · I11 = 105.7120 · M11 = 296.3035
 *     CapDeal Scale 1,049: E13 = 786.5894 · I13 = 194.0053 · J13 = 18.49% · M13 = 5,171.6497
 *     Wittaya Premium 199: E15 = 150 × 4 × 0.0231 = 13.86 · I15 = 153.7097
 *   PLAN-08: ค่าธรรมเนียมทนาย Pro 590 รวม VAT 7% = 35.665 × 1.07 = ฿38.16
 *
 * หน้า "ค่ารันรายเดือน" + "สรุปต่อเว็บ" (สถานการณ์เติบโต) — ประเมินสูตรทุกช่องด้วยสคริปต์ Python ทิ้ง (แปลตรงจากสูตร):
 *   ส่วนกลาง (B13/C13) ฿2,899.6552 · รวมทั้งหมด (F40) ฿28,105.0080 · USD (F44) $851.6669
 *   ค่าคงที่/ขั้นบันได (F41) ฿3,460 · ค่าธรรมเนียม (F42) ฿9,469.1705 · ค่า AI (F43) ฿12,522.4596
 *   ต่อเว็บรวมปันส่วนกลาง (F5–F12): lawslane ฿19,612.3728 · admin ฿90.4894 · CapDeal ฿4,445.6609
 *     Wittaya ฿3,465.7141 · business ฿478.6432 · docs 0 · Lalin ฿12.1275 · สิทธิคนทำงาน 0
 *   รายได้ (C22) ฿90,843 (lawslane ฿54,520 · CapDeal ฿10,603 · Wittaya ฿19,920 · business ฿5,800)
 *   ผู้ใช้ active 12,777 · บัญชีจ่ายเงิน 227 · กำไรขั้นต้น (C23) 69.06%
 * ต่างจากไฟล์โดยตั้งใจ:
 *   1) ค่าธรรมเนียมงานล่ามคิด Beam บัตร premium 2.75% ไม่มีค่าคงที่ แทน Stripe 3.65% + Connect 0.25% + ฿10
 *      เติบโต 50 งาน × ฿2,000: ไฟล์ ฿4,400 → ระบบ ฿2,750 (ไม่คิด VAT) / ฿2,942.50 (รวม VAT)
 *      → รวมทั้งหมด (ไม่คิด VAT) = 28,105.0080 − 4,400 + 2,750 = ฿26,455.0080 · lawslane = ฿17,962.3728
 *   2) ค่าธรรมเนียม Stripe คูณ 1.07 (VAT) — ค่าเริ่มต้นรวม = 26,455.0080 + 5,069.1705 × 0.07 + 192.5 = ฿27,002.3499
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_COST_ASSUMPTIONS,
    creditPackEconomics,
    costTakeaways,
    interpreterEconomics,
    mergeCostAssumptions,
    monthlyRun,
    siteSummary,
    usageVolumes,
    planEconomics,
    scenarioTotals,
    stripeSubscriptionFee,
    unitCosts,
    validateCostAssumptions,
    type CostAssumptions,
} from '../cost-model';
import { estimateStripeFee } from '../stripe-fees';

const close = (actual: number, expected: number, eps = 0.001, msg?: string) =>
    assert.ok(Math.abs(actual - expected) <= eps, `${msg ?? ''} expected ${expected} got ${actual}`);

const noVat: CostAssumptions = { ...DEFAULT_COST_ASSUMPTIONS, general: { ...DEFAULT_COST_ASSUMPTIONS.general, vatOnFees: 0 } };

test('ต้นทุนต่อหน่วยตรงหน้า "ต้นทุนต่อหน่วย"', () => {
    const u = unitCosts(DEFAULT_COST_ASSUMPTIONS);
    close(u.lawCredit, 0.2388827, 1e-6);
    close(u.lawCreditMax, 0.462, 1e-9);
    close(u.lawCreditsPerCall, 1.15, 1e-9);
    close(u.custCredit, 0.164043, 1e-9);
    close(u.rag, 0.00039645375, 1e-12);
    close(u.cdScan, 0.1254, 1e-9);
    close(u.cdDraft, 0.4092, 1e-9);
    close(u.witSet, 0.0924, 1e-9);
});

test('ค่าส่วนกลางและบัญชีที่จ่ายเงินตรงหน้า "ค่ารันรายเดือน"/"ปริมาณใช้งาน"', () => {
    const t = [0, 1, 2].map((i) => scenarioTotals(DEFAULT_COST_ASSUMPTIONS, i as 0 | 1 | 2));
    close(t[0].shared, 1442.9117, 0.001);
    close(t[1].shared, 2899.6552, 0.001);
    close(t[2].shared, 9657.1627, 0.001);
    assert.deepEqual(t.map((x) => x.paying), [20, 227, 1193]);
    close(t[1].infraPerPaying, 12.7738, 0.0001);
});

test('ใส่ยอดส่วนกลางจริงแทนค่าที่คำนวณได้', () => {
    const a: CostAssumptions = { ...DEFAULT_COST_ASSUMPTIONS, sharedOverride: [null, 4540, null] };
    const t = scenarioTotals(a, 1);
    assert.equal(t.shared, 4540);
    close(t.sharedComputed, 2899.6552, 0.001);
    close(t.infraPerPaying, 20, 1e-9);
});

test('Margin ต่อแพลน (ไม่คิด VAT = ตรงไฟล์): ทนาย Pro, Firm, CapDeal Lite, Scale, Wittaya Premium', () => {
    const pro = planEconomics(noVat, 'lawyer.pro', 590, 'monthly');
    close(pro.fullCost, 71.6648, 0.0001);
    close(pro.avgCost, 21.4994, 0.0001);
    close(pro.fee, 35.665, 1e-9);
    close(pro.infra, 12.7738, 0.0001);
    close(pro.profitFull, 469.8964, 0.001);
    close(pro.marginFull!, 0.7964, 0.0001);
    close(pro.profitAvg, 520.0617, 0.001);
    close(pro.minPrice!, 603.4417, 0.001);

    const firm = planEconomics(noVat, 'lawyer.top', 1990, 'monthly');
    close(firm.fullCost, 238.8827, 0.0001);
    close(firm.profitFull, 1641.7785, 0.001);
    close(firm.minPrice!, 1671.9266, 0.001);

    const lite = planEconomics(noVat, 'capdeal.lite', 159, 'monthly');
    close(lite.fullCost, 23.5977, 0.0001);
    close(lite.profitFull, 105.712, 0.001);
    close(lite.minPrice!, 296.3035, 0.001);

    const scale = planEconomics(noVat, 'capdeal.scale', 1049, 'monthly');
    close(scale.fullCost, 786.5894, 0.0001);
    close(scale.profitFull, 194.0053, 0.001);
    close(scale.marginFull!, 0.1849, 0.0001);
    close(scale.minPrice!, 5171.6497, 0.001);

    const wit = planEconomics(noVat, 'wittaya.premium', 199, 'monthly');
    close(wit.fullCost, 13.86, 1e-9);
    close(wit.profitFull, 153.7097, 0.001);
});

test('PLAN-08: ทนาย Pro 590 ค่าธรรมเนียม Stripe รวม VAT ≈ ฿38.16 (ค่าเริ่มต้น)', () => {
    close(stripeSubscriptionFee(DEFAULT_COST_ASSUMPTIONS, 590), 38.16, 0.005);
    close(planEconomics(DEFAULT_COST_ASSUMPTIONS, 'lawyer.pro', 590, 'monthly').fee, estimateStripeFee(590).fee, 0.005);
    close(planEconomics(DEFAULT_COST_ASSUMPTIONS, 'lawyer.pro', 590, 'monthly').profitFull, 467.3998, 0.001);
});

test('รายปี: ค่าธรรมเนียมครั้งเดียวต่อปีหาร 12 และราคาต่ำสุดเป็นราคาต่อปี', () => {
    const m = planEconomics(DEFAULT_COST_ASSUMPTIONS, 'capdeal.lite', 1590, 'yearly');
    close(m.revenue, 132.5, 1e-9);
    close(m.fee, stripeSubscriptionFee(DEFAULT_COST_ASSUMPTIONS, 1590) / 12, 1e-9);
    const monthlyMin = planEconomics(DEFAULT_COST_ASSUMPTIONS, 'capdeal.lite', 159, 'monthly').minPrice!;
    assert.ok(m.minPrice! < monthlyMin * 12, 'รายปีเสียค่าคงที่ ฿10 ครั้งเดียว ราคาต่ำสุดต้องน้อยกว่า 12 เท่าของรายเดือน');
});

test('ลูกค้า AI Plus ยังไม่ตั้งราคา: ขาดทุนเท่าต้นทุน + ส่วนกลาง (ตามไฟล์)', () => {
    const p = planEconomics(noVat, 'lawslane.plus', null, 'monthly');
    close(p.fullCost, 32.8086, 0.0001);
    close(p.profitFull, -(32.8086 + 12.7738), 0.001);
    assert.equal(p.marginFull, null);
});

test('เลือกสถานการณ์เปลี่ยนส่วนกลางต่อบัญชี', () => {
    close(planEconomics(noVat, 'lawyer.pro', 590, 'monthly', 1).infra, 1442.9117 / 20, 0.001);
    close(planEconomics(noVat, 'lawyer.pro', 590, 'monthly', 3).infra, 9657.1627 / 1193, 0.001);
});

test('งานล่าม: GP − ค่าธรรมเนียม Beam บัตร premium ของยอดเต็ม (แทน Stripe Connect ในไฟล์)', () => {
    const e = interpreterEconomics(DEFAULT_COST_ASSUMPTIONS, 15);
    assert.equal(e.gp, 300);
    close(e.feeCard, 2000 * 0.0275 * 1.07, 1e-9);
    close(e.netCard, 241.15, 1e-9);
    assert.equal(e.netPromptpay, 300);
});

test('แพ็กเครดิต AI: ต้นทุน = เครดิต × ต้นทุนเครดิตแพงสุด', () => {
    const e = creditPackEconomics(DEFAULT_COST_ASSUMPTIONS, 100, 99);
    close(e.cost, 46.2, 1e-9);
    close(e.feeCard, 99 * 0.0275 * 1.07, 1e-9);
    close(e.profitCard, 99 - 46.2 - 99 * 0.0275 * 1.07, 1e-9);
});

test('validate/merge สมมติฐาน: ค่าติดลบ/ชื่อโมเดลแปลก ถูกปฏิเสธ, เก็บบางส่วนได้', () => {
    assert.ok(validateCostAssumptions(DEFAULT_COST_ASSUMPTIONS).ok);
    const bad = structuredClone(DEFAULT_COST_ASSUMPTIONS) as any;
    bad.general.fx = -1;
    bad.aiCalls.lawAsk.model = 'gpt-x';
    bad.general.targetMargin = 1.2;
    const r = validateCostAssumptions(bad);
    assert.equal(r.ok, false);
    if (!r.ok) {
        assert.ok(r.errors.includes('general.fx'));
        assert.ok(r.errors.includes('aiCalls.lawAsk.model'));
        assert.ok(r.errors.includes('general.targetMargin'));
    }
    const merged = mergeCostAssumptions({ general: { fx: 35 }, extra: 'x' });
    assert.equal(merged.general.fx, 35);
    assert.equal(merged.general.targetMargin, 0.8);
    assert.ok(!('extra' in merged));
});

test('ค่ารันรายเดือน (เติบโต): ตรงไฟล์ ยกเว้นค่าธรรมเนียมงานล่าม (Beam แทน Stripe+Connect)', () => {
    const m = monthlyRun(noVat);
    close(m.sharedComputed[1], 2899.6552, 0.001);
    close(m.total[1], 28105.008 - 4400 + 2750, 0.001);
    close(m.fixedTiered[1], 3460, 1e-9);
    close(m.fees[1], 9469.1705 - 4400 + 2750, 0.001);
    close(m.ai[1], 12522.4596, 0.001);
    close(m.totalUsd[1], (28105.008 - 1650) / 33, 0.0001);
    const row = (k: string) => m.rows.find((r) => r.key === k)!.amounts;
    close(row('interpreterFees')[1], 2750, 1e-9);
    close(row('lineMain')[1], 1280, 1e-9);
    close(row('lineMain')[2], 1780, 1e-9);
    close(row('cdSms')[1], 528, 1e-9);
    close(row('lalin')[1], 12.1275, 1e-9);
    // สถานการณ์อื่น (ไม่คิด VAT, หักส่วนต่างงานล่าม 5 / 300 งาน)
    close(m.total[0], 3514.418 - 440 + 275, 0.001);
    close(m.total[2], 146393.6357 - 26400 + 16500, 0.001);
});

test('ค่ารันรายเดือน (เติบโต) ค่าเริ่มต้นรวม VAT บนค่าธรรมเนียม', () => {
    close(monthlyRun(DEFAULT_COST_ASSUMPTIONS).total[1], 27002.3499, 0.001);
});

test('สรุปต่อเว็บ (เติบโต): ปันส่วนกลางตามการเข้าชม รายได้ และกำไรขั้นต้น', () => {
    const s = siteSummary(noVat);
    const site = (k: string) => s.sites.find((r) => r.site === k)!;
    close(site('lawslane').withShared[1], 19612.3728 - 1650, 0.001);
    close(site('admin').withShared[1], 90.4894, 0.001);
    close(site('capdeal').withShared[1], 4445.6609, 0.001);
    close(site('wittaya').withShared[1], 3465.7141, 0.001);
    close(site('business').withShared[1], 478.6432, 0.001);
    close(site('lalin').withShared[1], 12.1275, 1e-9);
    assert.equal(site('docs').withShared[1], 0);
    assert.equal(site('sitthi').withShared[1], 0);
    close(site('lawslane').revenue[1], 54520, 1e-9);
    close(s.revenue[1], 90843, 1e-9);
    close(s.total[1], 26455.008, 0.001);
    assert.equal(s.users[1], 12777);
    assert.equal(s.paying[1], 227);
    close(s.grossMargin[1]!, (90843 - 26455.008) / 90843, 1e-6);
    close(site('capdeal').profit[1], 10603 - 4445.6609, 0.001);
    // ปันครบ: รวมรายเว็บ = ต้นทุนตรง + ส่วนกลาง
    close(s.total[1], monthlyRun(noVat).total[1], 1e-6);
});

test('ปริมาณใช้งาน (เติบโต) และข้อสังเกตอัตโนมัติ', () => {
    const v = usageVolumes(DEFAULT_COST_ASSUMPTIONS, 1);
    close(v.rag, 54936.5217, 0.001);
    assert.equal(v.witEssays, 48000);
    assert.equal(v.find, 10000);
    const t = costTakeaways(noVat);
    close(t.shared, 2899.6552, 0.001);
    assert.equal(t.lowestMargin?.tier, 'capdeal.scale');
    close(t.lowestMargin!.margin, 0.1849, 0.0001);
    close(t.aiShare, 12522.4596 / 26455.008, 1e-6);
});
