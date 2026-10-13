/**
 * ผังช่อง admin → Google Sheet ต้นทุน (ส่งทางเดียว: หน้า "ราคาแพ็กเกจ" เป็นต้นฉบับ Sheet เป็นที่ให้คนอื่นดู)
 *
 * Sheet = ไฟล์ LAWSLANE-ต้นทุน-2026-10.xlsx ที่อัปโหลดขึ้น Google Sheets (สูตรเหมือนเดิม)
 * id ของ Sheet มาจาก env `COST_SHEET_ID` เท่านั้น (repo เป็น public ห้ามใส่ในโค้ด)
 *
 * กติกา:
 *  - เขียนเฉพาะช่องค่าคงที่ (ตัวเลขสีน้ำเงิน / ชื่อโมเดล) ห้ามเขียนทับช่องสูตร — เทสต์ตรวจกับ cost-sheet-fixture.json
 *    และตอนส่งจริงตรวจซ้ำกับ Sheet สด (ช่องเป้าหมายต้องไม่เป็นสูตร + ป้ายแถวต้องตรง = แถวไม่เลื่อน)
 *  - ไม่เพิ่มช่องใหม่ใน Sheet — ช่องใน admin ที่ไม่มีที่ใน Sheet ใส่ sheetCell: null พร้อมเหตุผล
 *    (หน้าเว็บแสดงป้าย "ไม่มีช่องใน Sheet")
 *  - ช่องที่มี defined name ในไฟล์ ใส่ชื่อไว้ (เทสต์ตรวจว่าชื่อชี้ช่องเดียวกัน) แต่เขียนด้วย A1 ตรง ๆ
 *    เพราะชื่อในไฟล์ xlsx อาจไม่ถูกแปลงเป็น named range ของ Google Sheets
 *  - ราคาแพลนเขียน "ราคาจริงที่เว็บใช้" (plans ใน planPricing) — มีร่างก็ยังเขียนราคาจริง
 *  - ช่องเปอร์เซ็นต์ในไฟล์เก็บเป็นสัดส่วน (80% = 0.8) · admin เก็บสัดส่วนอยู่แล้ว ยกเว้น GP ล่าม (เก็บ 15 = 15%)
 *
 * pure — ไม่มี server-only ใช้ได้ทั้ง client (ป้ายในหน้า) และเทสต์
 */
import {
    DEFAULT_COST_ASSUMPTIONS,
    SHEET_PLAN_PRICES,
    type AiCall,
    type CostAssumptions,
    type Label,
    type PlanPrices,
    type RunContext,
} from './cost-model';

export const COST_SHEET_TABS = {
    assumptions: 'สมมติฐาน',
    vendors: 'ราคาบริการ',
    units: 'ต้นทุนต่อหน่วย',
} as const;
export type CostSheetTab = (typeof COST_SHEET_TABS)[keyof typeof COST_SHEET_TABS];

/** 'สมมติฐาน'!B5 — ชื่อแท็บภาษาไทยต้องอยู่ในเครื่องหมาย ' เสมอ */
export function a1(tab: CostSheetTab, cell: string): string {
    return `'${tab.replace(/'/g, "''")}'!${cell}`;
}

/**
 * number = เขียนค่าเดิม · fraction = สัดส่วน 0–1 เขียนค่าเดิม (ไฟล์จัดรูปเป็น %)
 * percent = admin เก็บเป็นเปอร์เซ็นต์ (15) → เขียนสัดส่วน (0.15) · text = ข้อความ (ชื่อโมเดล)
 */
export type SheetValueKind = 'number' | 'fraction' | 'percent' | 'text';

export type SheetTarget = {
    /** A1 แบบเต็ม เช่น 'สมมติฐาน'!B5 */
    sheetCell: string;
    tab: CostSheetTab;
    cell: string;
    /** defined name ในไฟล์ (ช่องเดี่ยว) หรือ NAME#n = ตัวที่ n (1–3) ของช่วงสถานการณ์ · null = ไม่มีชื่อ */
    name: string | null;
    kind: SheetValueKind;
    /** ช่องป้ายของแถวนี้ — ใช้ตรวจว่าแถวใน Sheet ไม่เลื่อนก่อนเขียน */
    labelCell: string;
};

export type NoSheetTarget = {
    sheetCell: null;
    reason: Label;
};

export type SheetMapEntry = SheetTarget | NoSheetTarget;

const target = (tab: CostSheetTab, cell: string, name: string | null, kind: SheetValueKind, labelCol = 'A'): SheetTarget => ({
    sheetCell: a1(tab, cell),
    tab,
    cell,
    name,
    kind,
    labelCell: a1(tab, `${labelCol}${cell.replace(/^[A-Z]+/, '')}`),
});

/** หน้า สมมติฐาน คอลัมน์ B */
const asm = (row: number, name: string, kind: SheetValueKind = 'number') => target(COST_SHEET_TABS.assumptions, `B${row}`, name, kind);
/** หน้า ราคาบริการ คอลัมน์ C (ป้ายแถวใช้คอลัมน์ B "รายการ" เพราะ A ซ้ำกันหลายแถว) */
const vendor = (row: number, name: string) => target(COST_SHEET_TABS.vendors, `C${row}`, name, 'number', 'B');

const none = (th: string, en: string): NoSheetTarget => ({ sheetCell: null, reason: [th, en] });

const NO_VAT = none(
    'ไฟล์ไม่คิด VAT บนค่าธรรมเนียม (ส่วนนี้มีเฉพาะใน admin)',
    'The file has no VAT on fees (admin-only setting)',
);
const NO_BEAM = none(
    'ไฟล์คิดค่าธรรมเนียม Stripe + Connect ไม่มีอัตรา Beam (admin ใช้ Beam กับงานล่าม/จ่ายครั้งเดียว)',
    'The file uses Stripe + Connect; it has no Beam rates (admin uses Beam for interpreter jobs / one-time payments)',
);
const NO_OVERRIDE = none(
    'ไฟล์คำนวณค่าส่วนกลางจากสูตรเสมอ ไม่มีช่อง "ใช้ยอดจริงแทน"',
    'The file always computes shared infra by formula; there is no "real bill override" cell',
);
const NO_TYPHOON = none(
    'แถว typhoon ใน Sheet เป็นสูตรอ้างราคา Typhoon ช่องเดียว (P_TYPHOON) — ไม่เขียนทับสูตร',
    'The typhoon row in the Sheet is a formula pointing at the single Typhoon price (P_TYPHOON); formulas are never overwritten',
);

// ---------------------------------------------------------------------------
// สมมติฐาน (key = path แบบ assumptionLeafPaths ใน pricing-field-docs: general/fx, scenarios/lawPro/1 ...)
// ---------------------------------------------------------------------------

const GENERAL: Record<keyof CostAssumptions['general'], SheetMapEntry> = {
    fx: asm(5, 'FX'),
    targetMargin: asm(6, 'TARGET_MARGIN', 'fraction'),
    avgUsage: asm(7, 'MARGIN_USAGE', 'fraction'),
    marginScenario: asm(8, 'MARGIN_SCEN'),
    cardPct: asm(9, 'PAY_PCT', 'fraction'),
    cardFixed: asm(10, 'PAY_FIX'),
    billingPct: asm(11, 'BILLING_PCT', 'fraction'),
    vatOnFees: NO_VAT,
};

const QUOTAS: Record<keyof CostAssumptions['quotas'], SheetMapEntry> = {
    lawPro: asm(13, 'Q_LAW_PRO'),
    lawFirm: asm(14, 'Q_LAW_FIRM'),
    custFree: asm(15, 'Q_CUST_FREE'),
    custPlus: asm(16, 'Q_CUST_PLUS'),
    cdFree: asm(17, 'Q_CD_FREE'),
    cdLite: asm(18, 'Q_CD_LITE'),
    cdPro: asm(19, 'Q_CD_PRO'),
    cdScale: asm(20, 'Q_CD_SCALE'),
    cdScanX: asm(21, 'CD_SCAN_X'),
    witFree: asm(22, 'Q_WIT_FREE'),
    witHeavy: asm(23, 'Q_WIT_HEAVY'),
    witEssayPerSet: asm(24, 'WIT_ESSAY_PER_SET'),
    bizStarter: asm(25, 'Q_BIZ_STARTER'),
    bizPro: asm(26, 'Q_BIZ_PRO'),
    bizEsignStarter: asm(27, 'BIZ_ESIGN_STARTER'),
    bizEsignPro: asm(28, 'BIZ_ESIGN_PRO'),
};

const INFRA: Record<keyof CostAssumptions['infra'], SheetMapEntry> = {
    pagesPerVisit: asm(30, 'PAGES_PER_VISIT'),
    fsReadsPerVisit: asm(31, 'FS_READS_PER_VISIT'),
    fsWritesPerVisit: asm(32, 'FS_WRITES_PER_VISIT'),
    reqSec: asm(33, 'REQ_SEC'),
    reqConcurrency: asm(34, 'REQ_CONCURRENCY'),
    instVcpu: asm(35, 'INST_VCPU'),
    instGib: asm(36, 'INST_GIB'),
    mbPerPage: asm(37, 'MB_PER_PAGE'),
    vectors: asm(38, 'VECTORS'),
    vecDims: asm(39, 'VEC_DIMS'),
    embedTokens: asm(40, 'EMBED_TOKENS'),
    emailsPerUser: asm(41, 'EMAILS_PER_USER'),
    vercelSeats: asm(42, 'VERCEL_SEATS'),
    domains: asm(43, 'DOMAINS'),
    invoiceSec: asm(44, 'INVOICE_SEC'),
    lalinCalls: asm(45, 'LALIN_CALLS'),
    adminAiCalls: asm(46, 'ADMIN_AI_CALLS'),
};

/** แถวสถานการณ์ (B/C/D = เริ่มต้น/เติบโต/ขยาย) */
const SCENARIO_ROWS: Record<keyof CostAssumptions['scenarios'], [row: number, name: string]> = {
    lawFree: [65, 'S_LAW_FREE'],
    lawPro: [66, 'S_LAW_PRO'],
    lawFirm: [67, 'S_LAW_FIRM'],
    custMau: [68, 'S_CUST_MAU'],
    custPlus: [69, 'S_CUST_PLUS'],
    custFreeCredits: [70, 'S_CUST_FREE_CREDITS'],
    usage: [71, 'S_USAGE'],
    findPerUser: [72, 'S_FIND_PER_USER'],
    bookings: [73, 'S_BOOKINGS'],
    invoices: [74, 'S_INVOICES'],
    lineMain: [75, 'S_LINE_MAIN'],
    slips: [76, 'S_SLIPS'],
    vMain: [77, 'S_V_MAIN'],
    cdFree: [79, 'S_CD_FREE'],
    cdLite: [80, 'S_CD_LITE'],
    cdPro: [81, 'S_CD_PRO'],
    cdScale: [82, 'S_CD_SCALE'],
    cdScansPerContract: [83, 'S_CD_SCANS_PER_CONTRACT'],
    sms: [84, 'S_SMS'],
    lineCd: [85, 'S_LINE_CD'],
    vCd: [86, 'S_V_CD'],
    witFree: [88, 'S_WIT_FREE'],
    witPremium: [89, 'S_WIT_PREMIUM'],
    witPro: [90, 'S_WIT_PRO'],
    witSetsFree: [91, 'S_WIT_SETS_FREE'],
    witSetsPaid: [92, 'S_WIT_SETS_PAID'],
    vWit: [93, 'S_V_WIT'],
    bizStarter: [95, 'S_BIZ_STARTER'],
    bizPro: [96, 'S_BIZ_PRO'],
    bizReviews: [97, 'S_BIZ_REVIEWS'],
    vBiz: [98, 'S_V_BIZ'],
    vAdmin: [99, 'S_V_ADMIN'],
    fsGb: [100, 'S_FS_GB'],
    gcsGb: [101, 'S_GCS_GB'],
    r2Gb: [102, 'S_R2_GB'],
    imgStored: [103, 'S_IMG_STORED'],
};
/** สัดส่วนใช้โควตา (S_USAGE) เป็น % */
const FRACTION_SCENARIOS = new Set<string>(['usage']);

const SERVICE: Record<keyof CostAssumptions['servicePrices'], SheetMapEntry> = {
    crCpu: vendor(5, 'P_CR_CPU'),
    crMem: vendor(6, 'P_CR_MEM'),
    crReq: vendor(7, 'P_CR_REQ'),
    egress: vendor(8, 'P_EGRESS'),
    fsRead: vendor(9, 'P_FS_READ'),
    fsWrite: vendor(10, 'P_FS_WRITE'),
    fsGb: vendor(11, 'P_FS_GB'),
    gcs: vendor(12, 'P_GCS'),
    sms: vendor(13, 'P_SMS'),
    cfBase: vendor(15, 'P_CF_BASE'),
    vecQ: vendor(16, 'P_VEC_Q'),
    vecS: vendor(17, 'P_VEC_S'),
    neuron: vendor(18, 'P_NEURON'),
    bgeNeurons: vendor(19, 'P_BGE_NEURONS'),
    r2: vendor(20, 'P_R2_GB'),
    browserHour: vendor(21, 'P_BROWSER_H'),
    imgStored: vendor(22, 'P_IMG_STORED'),
    imgDeliv: vendor(23, 'P_IMG_DELIV'),
    vercel: vendor(25, 'P_VERCEL'),
    resendPro: vendor(26, 'P_RESEND_PRO'),
    resendOver: vendor(27, 'P_RESEND_OVER'),
    upstash: vendor(28, 'P_UPSTASH'),
    lineBasicThb: vendor(30, 'P_LINE_BASIC'),
    lineProThb: vendor(31, 'P_LINE_PRO'),
    lineOverThb: vendor(32, 'P_LINE_OVER'),
    slipokThb: vendor(33, 'P_SLIPOK'),
    slipokOverThb: vendor(34, 'P_SLIPOK_OVER'),
    domainThb: vendor(35, 'P_DOMAIN'),
};

/** ตารางราคาโมเดล หน้า ราคาบริการ แถว 39–43 (B/C/D = input/cached/output) · ลำดับในช่วง M_* เริ่มที่ 1 */
const MODEL_ROWS: Record<string, number> = {
    'gemini-2.5-flash': 39,
    'gemini-2.5-flash-lite': 40,
    'gemini-3.5-flash-lite': 41,
    'gemini-3.1-flash-lite': 42,
    'gemini-2.0-flash': 43,
};
const MODEL_COLS = { input: ['B', 'M_IN'], cached: ['C', 'M_CACHE'], output: ['D', 'M_OUT'] } as const;

/** หน้า ต้นทุนต่อหน่วย แถว 5–19 */
const AI_CALL_ROWS: Record<keyof CostAssumptions['aiCalls'], number> = {
    lawAsk: 5,
    lawStatute: 6,
    lawJudgment: 7,
    lawAttach: 8,
    lawDraft: 9,
    lawContract: 10,
    cust: 11,
    custFind: 12,
    cdScan: 13,
    cdDraft: 14,
    witEssay: 15,
    bizReview: 16,
    admin: 17,
    ocrPage: 18,
    lalin: 19,
};
const AI_CALL_COLS: Record<keyof AiCall, [col: string, kind: SheetValueKind]> = {
    model: ['B', 'text'],
    inputTokens: ['C', 'number'],
    cachedShare: ['D', 'fraction'],
    outputTokens: ['E', 'number'],
    credits: ['F', 'number'],
    mix: ['J', 'fraction'],
};

function buildAssumptionMap(): Record<string, SheetMapEntry> {
    const out: Record<string, SheetMapEntry> = {};
    const put = (group: string, m: Record<string, SheetMapEntry>) => {
        for (const [k, v] of Object.entries(m)) out[`${group}/${k}`] = v;
    };
    put('general', GENERAL);
    for (const k of Object.keys(DEFAULT_COST_ASSUMPTIONS.beam)) out[`beam/${k}`] = NO_BEAM;
    put('quotas', QUOTAS);
    out['business/starterPrice'] = asm(58, 'PR_BIZ_STARTER');
    out['business/proPrice'] = asm(59, 'PR_BIZ_PRO');
    out['interpreter/bookingValue'] = asm(60, 'BOOKING_VALUE');
    put('infra', INFRA);
    for (const [k, [row, name]] of Object.entries(SCENARIO_ROWS)) {
        ['B', 'C', 'D'].forEach((col, i) => {
            out[`scenarios/${k}/${i}`] = target(
                COST_SHEET_TABS.assumptions, `${col}${row}`, `${name}#${i + 1}`, FRACTION_SCENARIOS.has(k) ? 'fraction' : 'number',
            );
        });
    }
    put('servicePrices', SERVICE);
    for (const model of Object.keys(DEFAULT_COST_ASSUMPTIONS.models)) {
        const row = MODEL_ROWS[model];
        for (const f of ['input', 'cached', 'output'] as const) {
            if (!row) { out[`models/${model}/${f}`] = NO_TYPHOON; continue; }
            const [col, range] = MODEL_COLS[f];
            out[`models/${model}/${f}`] = target(COST_SHEET_TABS.vendors, `${col}${row}`, `${range}#${row - 38}`, 'number');
        }
    }
    for (const [k, row] of Object.entries(AI_CALL_ROWS)) {
        for (const [f, [col, kind]] of Object.entries(AI_CALL_COLS)) {
            out[`aiCalls/${k}/${f}`] = target(COST_SHEET_TABS.units, `${col}${row}`, null, kind);
        }
    }
    out['sharedOverride/0'] = NO_OVERRIDE;
    out['sharedOverride/1'] = NO_OVERRIDE;
    out['sharedOverride/2'] = NO_OVERRIDE;
    return out;
}

/**
 * ทุกช่องสมมติฐาน → ช่องใน Sheet (หรือ null + เหตุผล)
 * มี key ของ aiCalls ครบทุกคอลัมน์ แม้ช่องที่หน้าเว็บไม่แสดง (เครดิต/mix ของงานที่ไม่คิดเครดิต) —
 * buildCostSheetBatch เขียนเฉพาะ path ที่แก้ได้ (ดู editableAssumptionPaths)
 */
export const COST_SHEET_ASSUMPTION_MAP: Record<string, SheetMapEntry> = buildAssumptionMap();

// ---------------------------------------------------------------------------
// ราคาแพลน (ราคาจริงจาก planPricing) + GP ล่าม (settings/interpreterFees)
// ---------------------------------------------------------------------------

export type PricingSheetKey = keyof PlanPrices | 'gpPercent';

export const COST_SHEET_PRICING_MAP: Record<PricingSheetKey, SheetTarget> = {
    lawPro: asm(50, 'PR_LAW_PRO'),
    lawFirm: asm(51, 'PR_LAW_FIRM'),
    custPlus: asm(52, 'PR_CUST_PLUS'),
    cdLite: asm(53, 'PR_CD_LITE'),
    cdPro: asm(54, 'PR_CD_PRO'),
    cdScale: asm(55, 'PR_CD_SCALE'),
    witPremium: asm(56, 'PR_WIT_PREMIUM'),
    witPro: asm(57, 'PR_WIT_PRO'),
    gpPercent: asm(29, 'GP_PCT', 'percent'),
};

/** ช่องค่าคงที่ใน Sheet ที่ไม่มีช่องคู่ใน admin (ส่งไปไม่ได้ — คนดู Sheet ต้องรู้ว่าค่านี้ไม่ตาม admin) */
export const SHEET_ONLY_INPUTS: { sheetCell: string; name: string; note: Label }[] = [
    {
        sheetCell: a1(COST_SHEET_TABS.assumptions, 'B12'), name: 'CONNECT_PCT',
        note: ['Stripe Connect งานล่าม — admin คิดค่าธรรมเนียม Beam แทน', 'Stripe Connect for interpreter jobs; admin uses Beam fees instead'],
    },
    {
        sheetCell: a1(COST_SHEET_TABS.vendors, 'C29'), name: 'P_TYPHOON',
        note: ['ราคา Typhoon ช่องเดียว — admin แยก input/cached/output', 'Single Typhoon price; admin splits input/cached/output'],
    },
];

// ---------------------------------------------------------------------------
// ราคาจริงจากเอกสาร planPricing → PlanPrices (ใช้ทั้งหน้าเว็บและตอนส่ง Sheet)
// ---------------------------------------------------------------------------

export type ProductPlans = { product: string; plans: Record<string, { monthly: number | null } | undefined> };

/**
 * ราคาต่อเดือนที่เว็บใช้จริง (plans ของแต่ละสินค้า — ไม่ใช้ร่าง) · ไม่ขาย (null) = 0
 * ไม่มีสินค้า/แพลนนั้นในรายการ = ราคาในไฟล์ Excel
 */
export function runContextFromPlans(products: ProductPlans[], gpPercent: number): RunContext {
    const monthly = (product: string, plan: string, fallback: number) => {
        const p = products.find((x) => x.product === product);
        const v = p?.plans[plan]?.monthly;
        return v === undefined ? fallback : v ?? 0;
    };
    const prices: PlanPrices = {
        lawPro: monthly('lawyer', 'pro', SHEET_PLAN_PRICES.lawPro),
        lawFirm: monthly('lawyer', 'top', SHEET_PLAN_PRICES.lawFirm),
        custPlus: monthly('lawslane', 'plus', SHEET_PLAN_PRICES.custPlus),
        cdLite: monthly('capdeal', 'lite', SHEET_PLAN_PRICES.cdLite),
        cdPro: monthly('capdeal', 'pro', SHEET_PLAN_PRICES.cdPro),
        cdScale: monthly('capdeal', 'scale', SHEET_PLAN_PRICES.cdScale),
        witPremium: monthly('wittaya', 'premium', SHEET_PLAN_PRICES.witPremium),
        witPro: monthly('wittaya', 'pro', SHEET_PLAN_PRICES.witPro),
    };
    return { prices, gpPercent };
}

// ---------------------------------------------------------------------------
// สร้างชุดเขียน
// ---------------------------------------------------------------------------

export type CostSheetWrite = {
    /** A1 แบบเต็ม */
    range: string;
    value: number | string;
    /** ที่มาใน admin (path สมมติฐาน หรือ pricing/<key>) */
    source: string;
    target: SheetTarget;
};

const AI_CREDIT_CALLS = ['lawAsk', 'lawStatute', 'lawJudgment', 'lawAttach', 'lawDraft', 'lawContract', 'cust'];
const AI_MIX_CALLS = ['lawAsk', 'lawStatute', 'lawJudgment', 'lawAttach', 'lawDraft', 'lawContract'];

/**
 * path ที่แก้ได้ในหน้า (ตรงกับ assumptionLeafPaths) — ช่องเครดิต/mix ของงานที่ไม่คิดเครดิตไม่ส่ง
 * (ใน Sheet ช่อง F/J ของแถวพวกนั้นว่าง ไม่ควรเติม 0 ลงไป)
 */
export function isEditableAssumptionPath(path: string): boolean {
    const [g, k, f] = path.split('/');
    if (g !== 'aiCalls') return true;
    if (f === 'credits') return AI_CREDIT_CALLS.includes(k);
    if (f === 'mix') return AI_MIX_CALLS.includes(k);
    return true;
}

function getPath(obj: unknown, path: string): unknown {
    // ชื่อโมเดลมีจุด จึงแยก path ด้วย /
    return path.split('/').reduce<any>((o, k) => (o == null ? o : o[k]), obj);
}

export function toSheetValue(t: SheetTarget, raw: unknown): number | string {
    if (t.kind === 'text') {
        if (typeof raw !== 'string' || raw.trim() === '') throw new Error(`ค่าไม่ถูกต้องสำหรับ ${t.sheetCell}`);
        return raw;
    }
    if (typeof raw !== 'number' || !Number.isFinite(raw)) throw new Error(`ค่าไม่ถูกต้องสำหรับ ${t.sheetCell}`);
    // ปัดเศษทศนิยมลอยจากการหาร (15/100 = 0.15 พอดี แต่กันไว้)
    return t.kind === 'percent' ? Math.round(raw * 1e6) / 1e8 : raw;
}

/**
 * ชุดค่าที่จะเขียนลง Sheet: ทุกช่องสมมติฐานที่มีที่ใน Sheet + ราคาแพลนจริง + GP ล่าม
 * @param pricing ราคาจริงที่เว็บใช้ (runContextFromPlans) — ไม่ใช่ร่าง
 */
export function buildCostSheetBatch(model: CostAssumptions, pricing: RunContext): CostSheetWrite[] {
    const out: CostSheetWrite[] = [];
    for (const [path, entry] of Object.entries(COST_SHEET_ASSUMPTION_MAP)) {
        if (entry.sheetCell === null || !isEditableAssumptionPath(path)) continue;
        out.push({ range: entry.sheetCell, value: toSheetValue(entry, getPath(model, path)), source: path, target: entry });
    }
    for (const [key, t] of Object.entries(COST_SHEET_PRICING_MAP) as [PricingSheetKey, SheetTarget][]) {
        const raw = key === 'gpPercent' ? pricing.gpPercent : pricing.prices[key];
        out.push({ range: t.sheetCell, value: toSheetValue(t, raw), source: `pricing/${key}`, target: t });
    }
    const seen = new Set<string>();
    for (const w of out) {
        if (seen.has(w.range)) throw new Error(`เขียนช่องซ้ำ: ${w.range}`);
        seen.add(w.range);
    }
    return out;
}

/** body ของ spreadsheets.values.batchUpdate (RAW = ตัวเลขเป็นตัวเลข ข้อความไม่ถูกแปลงเป็นสูตร) */
export function toBatchUpdateBody(writes: CostSheetWrite[]) {
    return {
        valueInputOption: 'RAW' as const,
        data: writes.map((w) => ({ range: w.range, majorDimension: 'ROWS' as const, values: [[w.value]] })),
    };
}

// ---------------------------------------------------------------------------
// ตรวจ Sheet สดก่อนเขียน
// ---------------------------------------------------------------------------

/** ช่วงที่อ่าน (แบบสูตร) ก่อนเขียน — ครอบทุกช่องเป้าหมายและป้ายแถว */
export const PREFLIGHT_RANGES: Record<CostSheetTab, string> = {
    [COST_SHEET_TABS.assumptions]: a1(COST_SHEET_TABS.assumptions, 'A1:D103'),
    [COST_SHEET_TABS.vendors]: a1(COST_SHEET_TABS.vendors, 'A1:D44'),
    [COST_SHEET_TABS.units]: a1(COST_SHEET_TABS.units, 'A1:J19'),
};

export type SheetGrid = Record<CostSheetTab, unknown[][]>;

function cellAt(grid: SheetGrid, tab: CostSheetTab, cell: string): unknown {
    const m = /^([A-Z]+)(\d+)$/.exec(cell);
    if (!m) return undefined;
    const col = m[1].split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
    return grid[tab]?.[Number(m[2]) - 1]?.[col];
}

function splitA1(ref: string): { tab: CostSheetTab; cell: string } {
    const m = /^'(.+)'!([A-Z]+\d+)$/.exec(ref);
    if (!m) throw new Error(`A1 ไม่ถูกต้อง: ${ref}`);
    return { tab: m[1].replace(/''/g, "'") as CostSheetTab, cell: m[2] };
}

const norm = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();

/**
 * ตรวจก่อนเขียน: (1) ช่องเป้าหมายต้องไม่เป็นสูตร (2) ป้ายแถวต้องตรงกับที่คาดไว้ (แถวไม่ถูกแทรก/ลบ/ย้าย)
 * @param grid ค่าที่อ่านด้วย valueRenderOption=FORMULA (ช่องสูตรขึ้นต้นด้วย =)
 * @param labels ป้ายที่คาดไว้ (A1 → ข้อความ) จาก cost-sheet-fixture.json
 * @returns รายการปัญหา (ว่าง = เขียนได้)
 */
export function checkSheetLayout(grid: SheetGrid, writes: CostSheetWrite[], labels: Record<string, string>): string[] {
    const problems: string[] = [];
    const checkedLabels = new Set<string>();
    for (const w of writes) {
        const { tab, cell } = splitA1(w.range);
        const v = cellAt(grid, tab, cell);
        if (typeof v === 'string' && v.trim().startsWith('=')) problems.push(`${w.range} เป็นสูตร`);
        const lc = w.target.labelCell;
        if (checkedLabels.has(lc)) continue;
        checkedLabels.add(lc);
        const expected = labels[lc];
        if (expected === undefined) { problems.push(`ไม่รู้ป้ายแถวของ ${lc}`); continue; }
        const l = splitA1(lc);
        if (norm(cellAt(grid, l.tab, l.cell)) !== norm(expected)) problems.push(`${lc} ควรเป็น "${expected}"`);
    }
    return problems;
}

// ---------------------------------------------------------------------------
// ช่วยหน้าเว็บ
// ---------------------------------------------------------------------------

/** ป้าย "ไม่มีช่องใน Sheet" ของช่องสมมติฐาน (null = มีช่องใน Sheet / ไม่รู้จัก) */
export function noSheetReason(path: string): Label | null {
    const e = COST_SHEET_ASSUMPTION_MAP[path];
    return e && e.sheetCell === null ? e.reason : null;
}

/** ลิงก์เปิด Sheet (id มาจาก env ฝั่ง server เท่านั้น) */
export function costSheetUrl(sheetId: string): string {
    return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/edit`;
}
