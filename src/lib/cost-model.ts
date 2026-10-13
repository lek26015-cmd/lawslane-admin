/**
 * โมเดลต้นทุน/กำไรต่อแพ็กเกจ — พอร์ตจาก LAWSLANE-ต้นทุน-2026-10.xlsx (จัดทำ 2026-10-11)
 *
 * ค่าเริ่มต้นทุกตัว = ช่องตัวเลขสีน้ำเงินในไฟล์ (หน้า สมมติฐาน / ราคาบริการ / ต้นทุนต่อหน่วย)
 * Super Admin แก้ได้ที่หน้า "ราคาแพ็กเกจ" → เก็บที่ `{PLAN_PRICING_COLLECTION}/costModel`
 *
 * สิ่งที่พอร์ต (ทั้งไฟล์):
 *   - ต้นทุนต่อหน่วย (ต่อการเรียก AI, ต่อเครดิต, RAG, SMS, ใบแจ้งหนี้)  = หน้า "ต้นทุนต่อหน่วย"
 *   - ปริมาณใช้งาน                                              = หน้า "ปริมาณใช้งาน"      → usageVolumes()
 *   - ค่ารันรายเดือนทุกแถว (ส่วนกลาง + ต้นทุนตรงรายเว็บ)           = หน้า "ค่ารันรายเดือน"    → monthlyRun()
 *   - สรุปต่อเว็บ (ปันส่วนกลางตามการเข้าชม, รายได้, กำไรขั้นต้น)   = หน้า "สรุปต่อเว็บ"       → siteSummary()
 *   - กำไร/margin/ราคาต่ำสุดต่อแพลน (รวม Business ร่าง)          = หน้า "Margin ต่อแพลน"
 * ต่างจากไฟล์ (ตาม PLAN-08):
 *   - ค่าธรรมเนียม Stripe คูณ (1 + VAT) ด้วย (ไฟล์ไม่รวม VAT) — ตั้ง vatOnFees = 0 จะได้ตัวเลขตรงไฟล์
 *   - งานล่าม/การจ่ายครั้งเดียว คิดค่าธรรมเนียม Beam (บัตร premium ไม่มีค่าคงที่) แทน Stripe บัตร + Connect + ฿10
 *     → แถว "ค่าธรรมเนียมรับเงินงานล่าม" ในหน้า ค่ารันรายเดือน ต่ำกว่าไฟล์ (เติบโต: ฿2,750 แทน ฿4,400 เมื่อไม่คิด VAT)
 * หน้าแสดงผล: /pricing/costs (ต้นทุนระบบ) · แก้สมมติฐานที่ /pricing
 *
 * ไฟล์นี้เป็น pure function ไม่มี 'server-only' — ใช้ได้ทั้ง client component และเทสต์
 */

export type Triple = [number, number, number];

export type AiCall = {
    model: string;
    inputTokens: number;
    /** สัดส่วน input ที่ cache ได้ (0–1) */
    cachedShare: number;
    outputTokens: number;
    /** เครดิตที่หักต่อครั้ง (ใช้กับแถวทนาย/ลูกค้า) */
    credits: number;
    /** สัดส่วนการใช้ของแถวทนาย (ถ่วงน้ำหนักต้นทุนต่อเครดิต) */
    mix: number;
};

export type CostAssumptions = {
    general: {
        /** บาท / USD */
        fx: number;
        targetMargin: number;
        /** สัดส่วนการใช้โควตาเฉลี่ยของผู้จ่ายเงิน */
        avgUsage: number;
        /** สถานการณ์ที่ใช้ปันค่าส่วนกลาง 1=เริ่มต้น 2=เติบโต 3=ขยาย */
        marginScenario: number;
        cardPct: number;
        cardFixed: number;
        billingPct: number;
        /** VAT บนค่าธรรมเนียม (Stripe และ Beam) */
        vatOnFees: number;
    };
    beam: {
        cardPct: number;
        premiumPct: number;
        intlPct: number;
        amexPct: number;
        ewalletPct: number;
        promptpayPct: number;
    };
    quotas: {
        lawPro: number;
        lawFirm: number;
        custFree: number;
        custPlus: number;
        cdFree: number;
        cdLite: number;
        cdPro: number;
        cdScale: number;
        cdScanX: number;
        witHeavy: number;
        witEssayPerSet: number;
        /** Wittaya Free ทำได้ต่อเดือน (3 ชุด/วัน × 30) — ใช้แค่แถว Free ในตาราง Margin */
        witFree: number;
        /** Business (ร่าง) AI รีวิว / เดือน ที่ใช้หนักสุด */
        bizStarter: number;
        bizPro: number;
        /** Business (ร่าง) e-sign ที่ส่ง SMS OTP / เดือน */
        bizEsignStarter: number;
        bizEsignPro: number;
    };
    /** ราคาแพลน Business (ร่าง ยังไม่มีในระบบราคา) บาท/เดือน */
    business: {
        starterPrice: number;
        proPrice: number;
    };
    interpreter: {
        bookingValue: number;
    };
    infra: {
        pagesPerVisit: number;
        fsReadsPerVisit: number;
        fsWritesPerVisit: number;
        reqSec: number;
        reqConcurrency: number;
        instVcpu: number;
        instGib: number;
        mbPerPage: number;
        vectors: number;
        vecDims: number;
        embedTokens: number;
        emailsPerUser: number;
        vercelSeats: number;
        domains: number;
        /** วินาทีที่ใช้ render ใบแจ้งหนี้ PDF 1 ใบ (Browser Rendering) */
        invoiceSec: number;
        /** Lalin: ครั้งที่เรียก AI / เดือน */
        lalinCalls: number;
        /** admin: เรียก AI (ร่างสัญญา/แปล) / เดือน */
        adminAiCalls: number;
    };
    scenarios: {
        lawFree: Triple;
        lawPro: Triple;
        lawFirm: Triple;
        custMau: Triple;
        custPlus: Triple;
        custFreeCredits: Triple;
        usage: Triple;
        vMain: Triple;
        cdFree: Triple;
        cdLite: Triple;
        cdPro: Triple;
        cdScale: Triple;
        cdScansPerContract: Triple;
        vCd: Triple;
        witFree: Triple;
        witPremium: Triple;
        witPro: Triple;
        vWit: Triple;
        bizStarter: Triple;
        bizPro: Triple;
        bizReviews: Triple;
        vBiz: Triple;
        vAdmin: Triple;
        fsGb: Triple;
        gcsGb: Triple;
        r2Gb: Triple;
        imgStored: Triple;
        /** ใช้ AI ค้นหาทนาย / ลูกค้า / เดือน */
        findPerUser: Triple;
        /** งานล่าม / เดือน */
        bookings: Triple;
        /** ใบแจ้งหนี้ PDF / เดือน */
        invoices: Triple;
        /** LINE push ของ OA หลัก / เดือน */
        lineMain: Triple;
        /** สลิปที่ตรวจด้วย SlipOK / เดือน */
        slips: Triple;
        /** SMS OTP (phone auth) ของ CapDeal / เดือน */
        sms: Triple;
        /** LINE push ของ OA CapDeal / เดือน */
        lineCd: Triple;
        /** ข้อสอบที่ทำ / ผู้ใช้ Free / เดือน */
        witSetsFree: Triple;
        /** ข้อสอบที่ทำ / ผู้ใช้จ่ายเงิน / เดือน */
        witSetsPaid: Triple;
    };
    /** USD เว้นแต่ระบุ */
    servicePrices: {
        crCpu: number;
        crMem: number;
        crReq: number;
        egress: number;
        fsRead: number;
        fsWrite: number;
        fsGb: number;
        gcs: number;
        cfBase: number;
        vecQ: number;
        vecS: number;
        neuron: number;
        bgeNeurons: number;
        r2: number;
        imgStored: number;
        imgDeliv: number;
        vercel: number;
        resendPro: number;
        resendOver: number;
        upstash: number;
        /** บาท / ปี */
        domainThb: number;
        /** SMS OTP ไทย (USD / ข้อความ) ⚠ ยังไม่ยืนยัน */
        sms: number;
        /** Browser Rendering (USD / ชั่วโมง) เกิน 10 ชม./เดือน */
        browserHour: number;
        /** LINE OA ไทย (บาท / เดือน, ไม่รวม VAT) */
        lineBasicThb: number;
        lineProThb: number;
        /** บาท / ข้อความที่เกิน 35,000 (Pro) ⚠ ควรตรวจ */
        lineOverThb: number;
        /** SlipOK 500 สลิป (บาท / เดือน) และสลิปที่เกิน (บาท / สลิป) */
        slipokThb: number;
        slipokOverThb: number;
    };
    /** USD / ล้าน token */
    models: Record<string, { input: number; cached: number; output: number }>;
    aiCalls: {
        lawAsk: AiCall;
        lawStatute: AiCall;
        lawJudgment: AiCall;
        lawAttach: AiCall;
        lawDraft: AiCall;
        lawContract: AiCall;
        cust: AiCall;
        cdScan: AiCall;
        cdDraft: AiCall;
        witEssay: AiCall;
        custFind: AiCall;
        bizReview: AiCall;
        admin: AiCall;
        ocrPage: AiCall;
        lalin: AiCall;
    };
    /**
     * ใส่ยอดค่าส่วนกลางรายเดือนจริง (บาท) ต่อสถานการณ์ เพื่อใช้แทนค่าที่คำนวณ — null = ใช้ค่าที่คำนวณ
     * ใช้เมื่อมีบิลจริงแล้ว
     */
    sharedOverride: [number | null, number | null, number | null];
};

const ai = (model: string, inputTokens: number, cachedShare: number, outputTokens: number, credits = 0, mix = 0): AiCall =>
    ({ model, inputTokens, cachedShare, outputTokens, credits, mix });

export const DEFAULT_COST_ASSUMPTIONS: CostAssumptions = {
    general: {
        fx: 33, targetMargin: 0.8, avgUsage: 0.3, marginScenario: 2,
        cardPct: 0.0365, cardFixed: 10, billingPct: 0.007, vatOnFees: 0.07,
    },
    // ค่าธรรมเนียม Beam ตาม PLAN-08 (ยังไม่รวม VAT 7%) · PromptPay ฟรีช่วงเริ่มต้น
    beam: { cardPct: 0.018, premiumPct: 0.0275, intlPct: 0.0325, amexPct: 0.035, ewalletPct: 0.022, promptpayPct: 0 },
    quotas: {
        lawPro: 300, lawFirm: 1000, custFree: 20, custPlus: 200,
        cdFree: 2, cdLite: 30, cdPro: 100, cdScale: 1000, cdScanX: 3,
        witHeavy: 150, witEssayPerSet: 4, witFree: 90,
        bizStarter: 50, bizPro: 200, bizEsignStarter: 20, bizEsignPro: 100,
    },
    business: { starterPrice: 2900, proPrice: 8900 },
    interpreter: { bookingValue: 2000 },
    infra: {
        pagesPerVisit: 4, fsReadsPerVisit: 30, fsWritesPerVisit: 2, reqSec: 0.3, reqConcurrency: 8,
        instVcpu: 1, instGib: 0.5, mbPerPage: 0.5, vectors: 1_000_000, vecDims: 1024, embedTokens: 150,
        emailsPerUser: 2, vercelSeats: 1, domains: 2, invoiceSec: 5, lalinCalls: 150, adminAiCalls: 100,
    },
    scenarios: {
        lawFree: [50, 300, 1500],
        lawPro: [5, 40, 200],
        lawFirm: [1, 8, 40],
        custMau: [1000, 10000, 50000],
        custPlus: [0, 50, 300],
        custFreeCredits: [3, 4, 5],
        usage: [0.3, 0.4, 0.5],
        vMain: [5000, 50000, 300000],
        cdFree: [50, 300, 1500],
        cdLite: [5, 30, 150],
        cdPro: [2, 15, 80],
        cdScale: [0, 2, 10],
        cdScansPerContract: [2, 2, 2],
        vCd: [1000, 10000, 50000],
        witFree: [200, 2000, 10000],
        witPremium: [5, 60, 300],
        witPro: [2, 20, 100],
        vWit: [2000, 20000, 100000],
        bizStarter: [0, 2, 10],
        bizPro: [0, 0, 3],
        bizReviews: [20, 30, 40],
        vBiz: [500, 2000, 10000],
        vAdmin: [1000, 2000, 5000],
        fsGb: [1, 3, 10],
        gcsGb: [2, 10, 40],
        r2Gb: [5, 30, 150],
        imgStored: [2000, 10000, 50000],
        findPerUser: [1, 1, 1],
        bookings: [5, 50, 300],
        invoices: [20, 200, 1000],
        lineMain: [200, 3000, 20000],
        slips: [0, 0, 0],
        sms: [30, 200, 1000],
        lineCd: [100, 1500, 10000],
        witSetsFree: [5, 5, 5],
        witSetsPaid: [20, 25, 30],
    },
    servicePrices: {
        crCpu: 0.000024, crMem: 0.0000025, crReq: 0.4, egress: 0.15,
        fsRead: 0.06, fsWrite: 0.18, fsGb: 0.18, gcs: 0.026,
        cfBase: 5, vecQ: 0.01, vecS: 0.05, neuron: 0.011, bgeNeurons: 1075, r2: 0.015,
        imgStored: 5, imgDeliv: 1, vercel: 20, resendPro: 20, resendOver: 0.9, upstash: 0.2, domainThb: 450,
        sms: 0.08, browserHour: 0.09, lineBasicThb: 1280, lineProThb: 1780, lineOverThb: 0.06, slipokThb: 210, slipokOverThb: 0.42,
    },
    models: {
        'gemini-2.5-flash': { input: 0.3, cached: 0.03, output: 2.5 },
        'gemini-2.5-flash-lite': { input: 0.1, cached: 0.01, output: 0.4 },
        'gemini-3.5-flash-lite': { input: 0.3, cached: 0.03, output: 2.5 },
        'gemini-3.1-flash-lite': { input: 0.25, cached: 0.025, output: 1.5 },
        // ปลดระวางแล้ว — ไฟล์คิดเท่า 2.5-flash-lite (Wittaya ยังใช้)
        'gemini-2.0-flash': { input: 0.1, cached: 0.01, output: 0.4 },
        typhoon: { input: 0, cached: 0, output: 0 },
    },
    aiCalls: {
        lawAsk: ai('gemini-2.5-flash', 12000, 0.3, 1500, 1, 0.5),
        lawStatute: ai('gemini-2.5-flash', 10000, 0.3, 1000, 1, 0.15),
        lawJudgment: ai('gemini-2.5-flash', 12000, 0.3, 1500, 1, 0.1),
        lawAttach: ai('gemini-2.5-flash', 30000, 0, 2000, 1, 0.1),
        lawDraft: ai('gemini-2.5-flash', 14000, 0.2, 5000, 2, 0.1),
        lawContract: ai('gemini-2.5-flash', 20000, 0, 4000, 2, 0.05),
        cust: ai('gemini-2.5-flash', 9000, 0.3, 1200, 1),
        cdScan: ai('gemini-2.5-flash', 6000, 0, 800),
        cdDraft: ai('gemini-2.5-flash', 8000, 0, 4000),
        witEssay: ai('gemini-2.0-flash', 3000, 0, 1000),
        custFind: ai('gemini-2.5-flash', 4000, 0, 600),
        bizReview: ai('gemini-2.5-flash', 20000, 0, 4000),
        admin: ai('gemini-2.5-flash', 5000, 0, 2000),
        ocrPage: ai('gemini-2.5-flash', 1500, 0, 1500),
        lalin: ai('gemini-3.1-flash-lite', 5000, 0, 800),
    },
    sharedOverride: [null, null, null],
};

// ---------------------------------------------------------------------------
// อ่านค่าที่เก็บไว้ให้ปลอดภัย (รูปร่างตามค่าเริ่มต้น ตัวเลขต้องเป็นจำนวนจริงไม่ติดลบ)
// ---------------------------------------------------------------------------

const MAX_ASSUMPTION = 1e12;

function okNum(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_ASSUMPTION;
}

function sanitizeLike(def: any, raw: any, path: string, errors: string[] | null): any {
    if (typeof def === 'number') {
        if (okNum(raw)) return raw;
        if (raw !== undefined && errors) errors.push(path);
        return def;
    }
    if (Array.isArray(def)) {
        const arr = Array.isArray(raw) ? raw : [];
        return def.map((d, i) => {
            const v = arr[i];
            if (d === null) {
                // sharedOverride: null หรือจำนวน
                if (v === null || v === undefined) return null;
                if (okNum(v)) return v;
                if (errors) errors.push(`${path}[${i}]`);
                return null;
            }
            return sanitizeLike(d, v, `${path}[${i}]`, errors);
        });
    }
    if (def && typeof def === 'object') {
        const out: any = {};
        for (const k of Object.keys(def)) out[k] = sanitizeLike(def[k], raw?.[k], path ? `${path}.${k}` : k, errors);
        return out;
    }
    return def;
}

/** รวมค่าที่เก็บไว้กับค่าเริ่มต้น — ช่องที่ผิดรูปใช้ค่าเริ่มต้นแทน */
export function mergeCostAssumptions(raw: unknown): CostAssumptions {
    const out = sanitizeLike(DEFAULT_COST_ASSUMPTIONS, raw, '', null) as CostAssumptions;
    return fixModels(out, raw, null);
}

function fixModels(out: CostAssumptions, raw: any, errors: string[] | null): CostAssumptions {
    // ชื่อโมเดลต้องเป็นหนึ่งในตาราง models (ห้ามเพิ่มชื่อใหม่จากหน้าเว็บ)
    for (const k of Object.keys(out.aiCalls) as (keyof CostAssumptions['aiCalls'])[]) {
        const m = raw?.aiCalls?.[k]?.model;
        if (typeof m === 'string' && m in out.models) out.aiCalls[k].model = m;
        else {
            if (m !== undefined && errors) errors.push(`aiCalls.${k}.model`);
            out.aiCalls[k].model = DEFAULT_COST_ASSUMPTIONS.aiCalls[k].model;
        }
    }
    const g = out.general;
    if (![1, 2, 3].includes(g.marginScenario)) {
        if (errors) errors.push('general.marginScenario');
        g.marginScenario = 2;
    }
    for (const [k, v] of [['general.targetMargin', g.targetMargin], ['general.avgUsage', g.avgUsage]] as const) {
        if (v >= 1 && errors) errors.push(k);
    }
    return out;
}

/** ตรวจร่างจากหน้าเว็บ — ไม่เติมค่าแทนเงียบ ๆ ถ้าช่องไหนผิดให้คืนรายชื่อช่อง */
export function validateCostAssumptions(raw: unknown): { ok: true; value: CostAssumptions } | { ok: false; errors: string[] } {
    if (!raw || typeof raw !== 'object') return { ok: false, errors: ['ข้อมูลสมมติฐานไม่ถูกต้อง'] };
    const errors: string[] = [];
    const out = sanitizeLike(DEFAULT_COST_ASSUMPTIONS, raw, '', errors) as CostAssumptions;
    fixModels(out, raw, errors);
    if (out.general.targetMargin >= 1) errors.push('general.targetMargin');
    if (out.general.avgUsage > 1) errors.push('general.avgUsage');
    if (out.infra.reqConcurrency <= 0) errors.push('infra.reqConcurrency');
    const uniq = [...new Set(errors)];
    return uniq.length ? { ok: false, errors: uniq } : { ok: true, value: out };
}

// ---------------------------------------------------------------------------
// คำนวณ
// ---------------------------------------------------------------------------

/** บาทต่อการเรียก AI 1 ครั้ง = (in×(1−cache)×ราคา in + in×cache×ราคา cache + out×ราคา out) / 1M × FX */
export function aiCallCost(a: CostAssumptions, call: AiCall): number {
    const m = a.models[call.model] ?? { input: 0, cached: 0, output: 0 };
    const usd = (call.inputTokens * (1 - call.cachedShare) * m.input
        + call.inputTokens * call.cachedShare * m.cached
        + call.outputTokens * m.output) / 1_000_000;
    return usd * a.general.fx;
}

export type UnitCosts = {
    /** ต้นทุนเฉลี่ยต่อ 1 เครดิต AI ทนาย (ถ่วงตาม mix) */
    lawCredit: number;
    /** ต้นทุนสูงสุดต่อ 1 เครดิต AI ทนาย */
    lawCreditMax: number;
    /** เครดิตเฉลี่ยต่อการเรียก 1 ครั้ง (ทนาย) */
    lawCreditsPerCall: number;
    custCredit: number;
    rag: number;
    cdScan: number;
    cdDraft: number;
    witSet: number;
    witEssay: number;
    custFind: number;
    bizReview: number;
    admin: number;
    lalin: number;
    ocrPage: number;
    /** OCR ข้อสอบ 1 ชุด (20 หน้า) — ค่าใช้ครั้งเดียว */
    examOcrSet: number;
    /** SMS OTP 1 ข้อความ */
    sms: number;
    /** ใบแจ้งหนี้ PDF 1 ใบ (เมื่อเกิน 10 ชม.ฟรี) */
    invoice: number;
    /** ค่าธรรมเนียมบัตร Stripe ต่อยอด ฿100 (ไม่รวมค่าคงที่/VAT) */
    pay100: number;
};

const LAW_ROWS = ['lawAsk', 'lawStatute', 'lawJudgment', 'lawAttach', 'lawDraft', 'lawContract'] as const;

export function unitCosts(a: CostAssumptions): UnitCosts {
    let costMix = 0, creditMix = 0, mixSum = 0, max = 0;
    for (const k of LAW_ROWS) {
        const c = a.aiCalls[k];
        const cost = aiCallCost(a, c);
        costMix += cost * c.mix;
        creditMix += c.credits * c.mix;
        mixSum += c.mix;
        if (c.credits > 0) max = Math.max(max, cost / c.credits);
    }
    const sp = a.servicePrices;
    const inf = a.infra;
    const fx = a.general.fx;
    const call = (k: keyof CostAssumptions['aiCalls']) => aiCallCost(a, a.aiCalls[k]);
    return {
        lawCredit: creditMix > 0 ? costMix / creditMix : 0,
        lawCreditMax: max,
        lawCreditsPerCall: mixSum > 0 ? creditMix / mixSum : 0,
        custCredit: a.aiCalls.cust.credits > 0 ? call('cust') / a.aiCalls.cust.credits : 0,
        rag: fx * (inf.embedTokens * sp.bgeNeurons / 1_000_000 * sp.neuron / 1000 + inf.vecDims / 1_000_000 * sp.vecQ),
        cdScan: call('cdScan'),
        cdDraft: call('cdDraft'),
        witSet: call('witEssay') * a.quotas.witEssayPerSet,
        witEssay: call('witEssay'),
        custFind: call('custFind'),
        bizReview: call('bizReview'),
        admin: call('admin'),
        lalin: call('lalin'),
        ocrPage: call('ocrPage'),
        examOcrSet: 20 * call('ocrPage'),
        sms: sp.sms * fx,
        invoice: inf.invoiceSec / 3600 * sp.browserHour * fx,
        pay100: 100 * a.general.cardPct,
    };
}

/** ปริมาณใช้งานต่อเดือน = หน้า "ปริมาณใช้งาน" */
export type UsageVolumes = {
    lawCredits: number;
    lawCalls: number;
    custCredits: number;
    find: number;
    cdContracts: number;
    cdScans: number;
    witEssays: number;
    bizReviews: number;
    /** คำถามที่ยิง RAG = AI ทนาย + ลูกค้า + CapDeal + Business */
    rag: number;
    /** การเข้าชมเว็บบน App Hosting (lawslane + capdeal + business) */
    visitsAppHosting: number;
    visitsAll: number;
    pageViews: number;
    vcpuSec: number;
    gibSec: number;
    egressGb: number;
    fsReads: number;
    fsWrites: number;
    users: number;
    /** บัญชีที่จ่ายเงิน (รวม Business ร่าง ตามไฟล์) */
    paying: number;
    emails: number;
    upstash: number;
    imgDelivered: number;
};

export function usageVolumes(a: CostAssumptions, i: 0 | 1 | 2, u = unitCosts(a)): UsageVolumes {
    const s = a.scenarios;
    const q = a.quotas;
    const inf = a.infra;
    const at = (t: Triple) => t[i];
    const lawCredits = (at(s.lawPro) * q.lawPro + at(s.lawFirm) * q.lawFirm) * at(s.usage);
    const lawCalls = u.lawCreditsPerCall > 0 ? lawCredits / u.lawCreditsPerCall : 0;
    const custCredits = (at(s.custMau) - at(s.custPlus)) * at(s.custFreeCredits) + at(s.custPlus) * q.custPlus * at(s.usage);
    const cdContracts = (at(s.cdLite) * q.cdLite + at(s.cdPro) * q.cdPro + at(s.cdScale) * q.cdScale) * at(s.usage)
        + at(s.cdFree) * q.cdFree * 0.5;
    const cdScans = cdContracts * at(s.cdScansPerContract);
    const witEssays = (at(s.witFree) * at(s.witSetsFree) + (at(s.witPremium) + at(s.witPro)) * at(s.witSetsPaid)) * q.witEssayPerSet;
    const bizReviews = (at(s.bizStarter) + at(s.bizPro)) * at(s.bizReviews);
    const visitsAppHosting = at(s.vMain) + at(s.vCd) + at(s.vBiz);
    const visitsAll = visitsAppHosting + at(s.vWit) + at(s.vAdmin);
    const pageViews = visitsAppHosting * inf.pagesPerVisit;
    const users = at(s.lawFree) + at(s.lawPro) + at(s.lawFirm) + at(s.custMau) + at(s.cdFree) + at(s.cdLite) + at(s.cdPro)
        + at(s.cdScale) + at(s.witFree) + at(s.witPremium) + at(s.witPro) + at(s.bizStarter) + at(s.bizPro);
    return {
        lawCredits, lawCalls, custCredits,
        find: at(s.custMau) * at(s.findPerUser),
        cdContracts, cdScans, witEssays, bizReviews,
        rag: lawCalls + custCredits + cdScans + bizReviews,
        visitsAppHosting, visitsAll, pageViews,
        vcpuSec: pageViews * inf.reqSec / inf.reqConcurrency * inf.instVcpu,
        gibSec: pageViews * inf.reqSec / inf.reqConcurrency * inf.instGib,
        egressGb: pageViews * inf.mbPerPage / 1024,
        fsReads: visitsAll * inf.fsReadsPerVisit,
        fsWrites: visitsAll * inf.fsWritesPerVisit,
        users,
        paying: at(s.lawPro) + at(s.lawFirm) + at(s.custPlus) + at(s.cdLite) + at(s.cdPro) + at(s.cdScale)
            + at(s.witPremium) + at(s.witPro) + at(s.bizStarter) + at(s.bizPro),
        emails: users * inf.emailsPerUser,
        upstash: (lawCalls + custCredits) * 2 + at(s.vMain) * inf.pagesPerVisit,
        imgDelivered: visitsAll * inf.pagesPerVisit * 2,
    };
}

export type ScenarioTotals = {
    /** ค่าส่วนกลางรายเดือน (บาท) ที่ใช้จริง (override ถ้ามี) */
    shared: number;
    /** ค่าที่คำนวณจากสมมติฐาน (ก่อน override) */
    sharedComputed: number;
    /** บัญชีที่จ่ายเงิน (รวม Business ร่าง ตามไฟล์) */
    paying: number;
    /** ค่าส่วนกลางต่อบัญชีที่จ่ายเงิน */
    infraPerPaying: number;
};

/** ค่าส่วนกลางต่อสถานการณ์ (index 0..2) = หน้า "ค่ารันรายเดือน" แถว 4–16 */
export function scenarioTotals(a: CostAssumptions, i: 0 | 1 | 2): ScenarioTotals {
    const v = usageVolumes(a, i);
    const sharedComputed = RUN_ROWS.filter((r) => r.site === 'shared')
        .reduce((sum, r) => sum + r.calc(runCtx(a, i, v, DEFAULT_RUN_CONTEXT)), 0);
    const override = a.sharedOverride[i];
    const shared = typeof override === 'number' ? override : sharedComputed;
    return { shared, sharedComputed, paying: v.paying, infraPerPaying: v.paying > 0 ? shared / v.paying : 0 };
}

// ---------------------------------------------------------------------------
// ค่ารันรายเดือน (ทุกแถว) = หน้า "ค่ารันรายเดือน"
// ---------------------------------------------------------------------------

/** ข้อความ [ไทย, อังกฤษ] */
export type Label = [string, string];

/** ราคาแพลนต่อเดือน (บาท) ที่ใช้คิดค่าธรรมเนียมและรายได้ · 0 = ยังไม่ขาย/ยังไม่ตั้งราคา */
export type PlanPrices = {
    lawPro: number;
    lawFirm: number;
    custPlus: number;
    cdLite: number;
    cdPro: number;
    cdScale: number;
    witPremium: number;
    witPro: number;
};

/** ราคาในไฟล์ Excel (หน้า สมมติฐาน แถว 50–57) = ราคาเริ่มต้นของระบบราคา */
export const SHEET_PLAN_PRICES: PlanPrices = {
    lawPro: 590, lawFirm: 1990, custPlus: 0, cdLite: 159, cdPro: 249, cdScale: 1049, witPremium: 199, witPro: 399,
};

export type RunContext = {
    prices: PlanPrices;
    /** GP งานล่าม (%) */
    gpPercent: number;
};

export const DEFAULT_RUN_CONTEXT: RunContext = { prices: SHEET_PLAN_PRICES, gpPercent: 15 };

export type RunSite = 'shared' | 'lawslane' | 'admin' | 'capdeal' | 'wittaya' | 'business' | 'docs' | 'lalin' | 'sitthi';

export const RUN_SITE_LABELS: Record<RunSite, Label> = {
    shared: ['ส่วนกลาง', 'Shared'],
    lawslane: ['lawslane.com', 'lawslane.com'],
    admin: ['admin', 'admin'],
    capdeal: ['CapDeal', 'CapDeal'],
    wittaya: ['Wittaya', 'Wittaya'],
    business: ['business (ร่าง)', 'business (draft)'],
    docs: ['docs', 'docs'],
    lalin: ['Lalin', 'Lalin'],
    sitthi: ['สิทธิคนทำงาน', 'Sitthi Khon Tamngan'],
};

type Ctx = { a: CostAssumptions; i: 0 | 1 | 2; v: UsageVolumes; u: UnitCosts; at: (t: Triple) => number; run: RunContext };

function runCtx(a: CostAssumptions, i: 0 | 1 | 2, v: UsageVolumes, run: RunContext, u = unitCosts(a)): Ctx {
    return { a, i, v, u, at: (t) => t[i], run };
}

export type RunRowDef = {
    key: string;
    site: RunSite;
    service: Label;
    /** ผันแปร / คงที่ / ขั้นบันได */
    kind: 'variable' | 'fixed' | 'tiered';
    /** fee = ค่าธรรมเนียมรับเงิน · ai = ค่า AI (ตามไฟล์: แถวที่ขึ้นต้นด้วย AI/Gemini) */
    category: 'fee' | 'ai' | 'other';
    method: Label;
    /** หมายเหตุเมื่อวิธีคิดต่างจากไฟล์ */
    diff?: Label;
    calc: (c: Ctx) => number;
};

/** ค่าธรรมเนียม LINE OA ขั้นบันได: ฟรี 300 / Basic ≤ 15,000 / Pro + ข้อความเกิน 35,000 */
function lineOa(c: Ctx, messages: number): number {
    const sp = c.a.servicePrices;
    if (messages <= 300) return 0;
    if (messages <= 15_000) return sp.lineBasicThb;
    return sp.lineProThb + Math.max(0, messages - 35_000) * sp.lineOverThb;
}

/** จำนวนบัญชี × ค่าธรรมเนียม Stripe ต่อบัญชี (ราคา 0 = ไม่ขาย ไม่มีค่าธรรมเนียม) */
const subFees = (c: Ctx, pairs: [number, number][]) =>
    pairs.reduce((sum, [n, price]) => sum + n * stripeSubscriptionFee(c.a, price), 0);

export const RUN_ROWS: RunRowDef[] = [
    // ---- ส่วนกลาง (โควตาฟรีเป็นค่าคงที่ตามไฟล์) ----
    {
        key: 'appHostingCompute', site: 'shared', kind: 'variable', category: 'other',
        service: ['App Hosting compute (5 backend)', 'App Hosting compute (5 backends)'],
        method: ['vCPU / หน่วยความจำ / request ที่เกินโควตาฟรี', 'vCPU / memory / requests above the free tier'],
        calc: ({ a, v }) => a.general.fx * (Math.max(0, v.vcpuSec - 180_000) * a.servicePrices.crCpu
            + Math.max(0, v.gibSec - 360_000) * a.servicePrices.crMem
            + Math.max(0, v.pageViews - 2_000_000) / 1_000_000 * a.servicePrices.crReq),
    },
    {
        key: 'appHostingEgress', site: 'shared', kind: 'variable', category: 'other',
        service: ['App Hosting ข้อมูลส่งออก', 'App Hosting egress'],
        method: ['เกิน 10 GiB', 'Above 10 GiB'],
        calc: ({ a, v }) => a.general.fx * Math.max(0, v.egressGb - 10) * a.servicePrices.egress,
    },
    {
        key: 'firestore', site: 'shared', kind: 'variable', category: 'other',
        service: ['Firestore', 'Firestore'],
        method: ['อ่าน / เขียน / พื้นที่ ที่เกินโควตาฟรี', 'Reads / writes / storage above the free tier'],
        calc: ({ a, v, at }) => a.general.fx * (Math.max(0, v.fsReads - 1_500_000) / 100_000 * a.servicePrices.fsRead
            + Math.max(0, v.fsWrites - 600_000) / 100_000 * a.servicePrices.fsWrite
            + Math.max(0, at(a.scenarios.fsGb) - 1) * a.servicePrices.fsGb),
    },
    {
        key: 'firebaseStorage', site: 'shared', kind: 'variable', category: 'other',
        service: ['Firebase Storage', 'Firebase Storage'],
        method: ['เกิน 5 GB', 'Above 5 GB'],
        calc: ({ a, at }) => a.general.fx * Math.max(0, at(a.scenarios.gcsGb) - 5) * a.servicePrices.gcs,
    },
    {
        key: 'cfWorkers', site: 'shared', kind: 'fixed', category: 'other',
        service: ['Cloudflare Workers Paid', 'Cloudflare Workers Paid'],
        method: ['$5 / เดือน', '$5 / month'],
        calc: ({ a }) => a.general.fx * a.servicePrices.cfBase,
    },
    {
        key: 'vectorize', site: 'shared', kind: 'variable', category: 'other',
        service: ['Vectorize (คลังกฎหมาย RAG)', 'Vectorize (law RAG index)'],
        method: ['(คำถาม + vector) × มิติ เกิน 50 ล้าน; เก็บเกิน 10 ล้าน', '(queries + vectors) × dims above 50M; stored above 10M'],
        calc: ({ a, v }) => a.general.fx * (Math.max(0, (v.rag + a.infra.vectors) * a.infra.vecDims / 1_000_000 - 50) * a.servicePrices.vecQ
            + Math.max(0, a.infra.vectors * a.infra.vecDims / 1_000_000 - 10) / 100 * a.servicePrices.vecS),
    },
    {
        key: 'workersAi', site: 'shared', kind: 'variable', category: 'other',
        service: ['Workers AI embeddings (bge-m3)', 'Workers AI embeddings (bge-m3)'],
        method: ['เกิน 300k neurons / เดือน', 'Above 300k neurons / month'],
        calc: ({ a, v }) => a.general.fx
            * Math.max(0, v.rag * a.infra.embedTokens * a.servicePrices.bgeNeurons / 1_000_000 - 300_000) / 1000 * a.servicePrices.neuron,
    },
    {
        key: 'r2', site: 'shared', kind: 'variable', category: 'other',
        service: ['Cloudflare R2', 'Cloudflare R2'],
        method: ['เกิน 10 GB', 'Above 10 GB'],
        calc: ({ a, at }) => a.general.fx * Math.max(0, at(a.scenarios.r2Gb) - 10) * a.servicePrices.r2,
    },
    {
        key: 'cfImages', site: 'shared', kind: 'variable', category: 'other',
        service: ['Cloudflare Images', 'Cloudflare Images'],
        method: ['เก็บ (ปัดขึ้นทีละ 100k รูป) + ส่ง', 'Storage (rounded up per 100k) + delivery'],
        calc: ({ a, v, at }) => a.general.fx * (Math.ceil(at(a.scenarios.imgStored) / 100_000) * a.servicePrices.imgStored
            + v.imgDelivered / 100_000 * a.servicePrices.imgDeliv),
    },
    {
        key: 'vercel', site: 'shared', kind: 'fixed', category: 'other',
        service: ['Vercel Pro', 'Vercel Pro'],
        method: ['admin / Wittaya / Lalin', 'admin / Wittaya / Lalin'],
        calc: ({ a }) => a.general.fx * a.servicePrices.vercel * a.infra.vercelSeats,
    },
    {
        key: 'resend', site: 'shared', kind: 'variable', category: 'other',
        service: ['Resend อีเมล', 'Resend email'],
        method: ['ฟรี 3,000 ฉบับ; Pro $20 (50k) + ส่วนเกิน', 'Free 3,000; Pro $20 (50k) + overage'],
        calc: ({ a, v }) => a.general.fx * (v.emails <= 3000 ? 0
            : a.servicePrices.resendPro + Math.max(0, v.emails - 50_000) / 1000 * a.servicePrices.resendOver),
    },
    {
        key: 'upstash', site: 'shared', kind: 'variable', category: 'other',
        service: ['Upstash Redis', 'Upstash Redis'],
        method: ['เกิน 500k คำสั่ง', 'Above 500k commands'],
        calc: ({ a, v }) => a.general.fx * Math.max(0, v.upstash - 500_000) / 100_000 * a.servicePrices.upstash,
    },
    {
        key: 'domains', site: 'shared', kind: 'fixed', category: 'other',
        service: ['โดเมน', 'Domains'],
        method: ['ค่ารายปี ÷ 12', 'Yearly fee ÷ 12'],
        calc: ({ a }) => a.infra.domains * a.servicePrices.domainThb / 12,
    },
    // ---- lawslane.com ----
    {
        key: 'lawAi', site: 'lawslane', kind: 'variable', category: 'ai',
        service: ['AI ทนาย (Pro/Firm)', 'Lawyer AI (Pro/Firm)'],
        method: ['เครดิตที่ใช้ × ต้นทุนต่อเครดิต', 'Credits used × cost per credit'],
        calc: ({ v, u }) => v.lawCredits * u.lawCredit,
    },
    {
        key: 'custAi', site: 'lawslane', kind: 'variable', category: 'ai',
        service: ['AI ลูกค้า', 'Customer AI'],
        method: ['เครดิตที่ใช้ × ต้นทุนต่อเครดิต', 'Credits used × cost per credit'],
        calc: ({ v, u }) => v.custCredits * u.custCredit,
    },
    {
        key: 'custFind', site: 'lawslane', kind: 'variable', category: 'ai',
        service: ['AI ค้นหาทนาย', 'AI lawyer finder'],
        method: ['ครั้งที่ใช้ × ต้นทุนต่อครั้ง', 'Uses × cost per use'],
        calc: ({ v, u }) => v.find * u.custFind,
    },
    {
        key: 'lawslaneRag', site: 'lawslane', kind: 'variable', category: 'other',
        service: ['RAG ต่อคำถาม', 'RAG per question'],
        method: ['embed + ค้น (ส่วนเพิ่ม) ของ AI ทนาย + ลูกค้า', 'Embed + search (marginal) for lawyer + customer AI'],
        calc: ({ v, u }) => (v.lawCalls + v.custCredits) * u.rag,
    },
    {
        key: 'lawslanePlanFees', site: 'lawslane', kind: 'variable', category: 'fee',
        service: ['ค่าธรรมเนียมรับเงินแพลนทนาย / AI Plus', 'Plan payment fees (lawyer / AI Plus)'],
        method: ['Stripe บัตร + Billing + ฿10 (+ VAT)', 'Stripe card + Billing + ฿10 (+ VAT)'],
        calc: (c) => subFees(c, [
            [c.at(c.a.scenarios.lawPro), c.run.prices.lawPro],
            [c.at(c.a.scenarios.lawFirm), c.run.prices.lawFirm],
            [c.at(c.a.scenarios.custPlus), c.run.prices.custPlus],
        ]),
    },
    {
        key: 'interpreterFees', site: 'lawslane', kind: 'variable', category: 'fee',
        service: ['ค่าธรรมเนียมรับเงินงานล่าม', 'Interpreter job payment fees'],
        method: ['ยอดเต็ม × Beam บัตร premium (+ VAT)', 'Full amount × Beam premium card (+ VAT)'],
        diff: ['ไฟล์คิด Stripe บัตร + Connect + ฿10 — ระบบจริงรับเงินผ่าน Beam', 'The file uses Stripe card + Connect + ฿10; payments actually go through Beam'],
        calc: ({ a, at }) => at(a.scenarios.bookings) * beamFee(a, a.interpreter.bookingValue, a.beam.premiumPct),
    },
    {
        key: 'invoicePdf', site: 'lawslane', kind: 'variable', category: 'other',
        service: ['ใบแจ้งหนี้ PDF (Browser Rendering)', 'Invoice PDFs (Browser Rendering)'],
        method: ['เกิน 10 ชม. / เดือน', 'Above 10 hours / month'],
        calc: ({ a, at }) => a.general.fx * Math.max(0, at(a.scenarios.invoices) * a.infra.invoiceSec / 3600 - 10) * a.servicePrices.browserHour,
    },
    {
        key: 'lineMain', site: 'lawslane', kind: 'tiered', category: 'other',
        service: ['LINE OA หลัก', 'Main LINE OA'],
        method: ['ฟรี 300 / Basic / Pro ตามจำนวน push', 'Free 300 / Basic / Pro by push count'],
        calc: (c) => lineOa(c, c.at(c.a.scenarios.lineMain)),
    },
    {
        key: 'slipok', site: 'lawslane', kind: 'tiered', category: 'other',
        service: ['SlipOK', 'SlipOK'],
        method: ['ถ้ายังใช้ระบบสลิป: แพ็ก 500 สลิป + ส่วนเกิน', 'If slips are still used: 500-slip pack + overage'],
        calc: ({ a, at }) => {
            const n = at(a.scenarios.slips);
            return n === 0 ? 0 : a.servicePrices.slipokThb + Math.max(0, n - 500) * a.servicePrices.slipokOverThb;
        },
    },
    // ---- admin ----
    {
        key: 'adminAi', site: 'admin', kind: 'variable', category: 'ai',
        service: ['AI ร่างสัญญา/แปล', 'AI contract drafting / translation'],
        method: ['ครั้งต่อเดือน × ต้นทุนต่อครั้ง', 'Calls per month × cost per call'],
        calc: ({ a, u }) => a.infra.adminAiCalls * u.admin,
    },
    // ---- CapDeal ----
    {
        key: 'cdDraft', site: 'capdeal', kind: 'variable', category: 'ai',
        service: ['AI ร่าง/วิเคราะห์สัญญา', 'AI contract draft / analysis'],
        method: ['สัญญาที่สร้าง × ต้นทุนต่อฉบับ', 'Contracts × cost per contract'],
        calc: ({ v, u }) => v.cdContracts * u.cdDraft,
    },
    {
        key: 'cdScan', site: 'capdeal', kind: 'variable', category: 'ai',
        service: ['AI สแกน/แชท + RAG', 'AI scan / chat + RAG'],
        method: ['ครั้งที่สแกน × (AI + RAG)', 'Scans × (AI + RAG)'],
        calc: ({ v, u }) => v.cdScans * (u.cdScan + u.rag),
    },
    {
        key: 'cdPlanFees', site: 'capdeal', kind: 'variable', category: 'fee',
        service: ['ค่าธรรมเนียมรับเงินแพลน', 'Plan payment fees'],
        method: ['Stripe บัตร + Billing + ฿10 (+ VAT)', 'Stripe card + Billing + ฿10 (+ VAT)'],
        calc: (c) => subFees(c, [
            [c.at(c.a.scenarios.cdLite), c.run.prices.cdLite],
            [c.at(c.a.scenarios.cdPro), c.run.prices.cdPro],
            [c.at(c.a.scenarios.cdScale), c.run.prices.cdScale],
        ]),
    },
    {
        key: 'cdSms', site: 'capdeal', kind: 'variable', category: 'other',
        service: ['SMS OTP (phone auth)', 'SMS OTP (phone auth)'],
        method: ['ข้อความ × ราคาต่อ SMS', 'Messages × price per SMS'],
        calc: ({ a, at, u }) => at(a.scenarios.sms) * u.sms,
    },
    {
        key: 'lineCd', site: 'capdeal', kind: 'tiered', category: 'other',
        service: ['LINE OA CapDeal', 'CapDeal LINE OA'],
        method: ['ฟรี 300 / Basic / Pro ตามจำนวน push', 'Free 300 / Basic / Pro by push count'],
        calc: (c) => lineOa(c, c.at(c.a.scenarios.lineCd)),
    },
    // ---- Wittaya ----
    {
        key: 'witAi', site: 'wittaya', kind: 'variable', category: 'ai',
        service: ['AI ตรวจข้อเขียน', 'AI essay grading'],
        method: ['ข้อเขียนที่ตรวจ × ต้นทุนต่อข้อ', 'Essays graded × cost per essay'],
        calc: ({ v, u }) => v.witEssays * u.witEssay,
    },
    {
        key: 'witPlanFees', site: 'wittaya', kind: 'variable', category: 'fee',
        service: ['ค่าธรรมเนียมรับเงินแพลน', 'Plan payment fees'],
        method: ['เมื่อเปิดรับเงิน: Stripe บัตร + Billing + ฿10 (+ VAT)', 'Once paid plans open: Stripe card + Billing + ฿10 (+ VAT)'],
        calc: (c) => subFees(c, [
            [c.at(c.a.scenarios.witPremium), c.run.prices.witPremium],
            [c.at(c.a.scenarios.witPro), c.run.prices.witPro],
        ]),
    },
    // ---- business (ร่าง) ----
    {
        key: 'bizAi', site: 'business', kind: 'variable', category: 'ai',
        service: ['AI รีวิวสัญญา + RAG', 'AI contract review + RAG'],
        method: ['รีวิว × (AI + RAG)', 'Reviews × (AI + RAG)'],
        calc: ({ v, u }) => v.bizReviews * (u.bizReview + u.rag),
    },
    {
        key: 'bizSms', site: 'business', kind: 'variable', category: 'other',
        service: ['SMS e-sign', 'SMS e-sign'],
        method: ['(Starter × e-sign + Pro × e-sign) × ราคา SMS', '(Starter × e-sign + Pro × e-sign) × SMS price'],
        calc: ({ a, at, u }) => (at(a.scenarios.bizStarter) * a.quotas.bizEsignStarter + at(a.scenarios.bizPro) * a.quotas.bizEsignPro) * u.sms,
    },
    {
        key: 'bizPlanFees', site: 'business', kind: 'variable', category: 'fee',
        service: ['ค่าธรรมเนียมรับเงินแพลน', 'Plan payment fees'],
        method: ['Stripe บัตร + Billing + ฿10 (+ VAT)', 'Stripe card + Billing + ฿10 (+ VAT)'],
        calc: (c) => subFees(c, [
            [c.at(c.a.scenarios.bizStarter), c.a.business.starterPrice],
            [c.at(c.a.scenarios.bizPro), c.a.business.proPrice],
        ]),
    },
    // ---- เว็บอื่น ----
    {
        key: 'docs', site: 'docs', kind: 'fixed', category: 'other',
        service: ['เว็บคู่มือ (static)', 'Docs site (static)'],
        method: ['ไม่มีบริการเสียเงิน', 'No paid services'],
        calc: () => 0,
    },
    {
        key: 'lalin', site: 'lalin', kind: 'variable', category: 'ai',
        service: ['Gemini (3.1-flash-lite)', 'Gemini (3.1-flash-lite)'],
        method: ['ครั้งต่อเดือน × ต้นทุนต่อครั้ง · Turso/Vercel Blob อยู่ในโควตาฟรี', 'Calls per month × cost per call · Turso/Vercel Blob within free tier'],
        calc: ({ a, u }) => a.infra.lalinCalls * u.lalin,
    },
    {
        key: 'sitthi', site: 'sitthi', kind: 'fixed', category: 'other',
        service: ['Neon Postgres + โฮสต์', 'Neon Postgres + hosting'],
        method: ['แพลนฟรี (โดเมนอยู่ในส่วนกลาง)', 'Free plan (domain counted in shared)'],
        calc: () => 0,
    },
];

export type RunRow = Omit<RunRowDef, 'calc'> & { amounts: Triple };

export type MonthlyRun = {
    rows: RunRow[];
    /** ส่วนกลางที่คำนวณ (แถว 4–16) */
    sharedComputed: Triple;
    /** ส่วนกลางที่ใช้ (override ถ้ามี) */
    shared: Triple;
    /** รวมทั้งหมด = ต้นทุนตรงทุกเว็บ + ส่วนกลางที่ใช้ */
    total: Triple;
    /** ในนี้เป็นค่าคงที่ / ขั้นบันได */
    fixedTiered: Triple;
    /** ในนี้เป็นค่าธรรมเนียมรับเงิน */
    fees: Triple;
    /** ในนี้เป็นค่า AI */
    ai: Triple;
    /** รวมเทียบเป็น USD */
    totalUsd: Triple;
};

const IDX = [0, 1, 2] as const;
const triple = (f: (i: 0 | 1 | 2) => number): Triple => [f(0), f(1), f(2)];

export function monthlyRun(a: CostAssumptions, run: RunContext = DEFAULT_RUN_CONTEXT): MonthlyRun {
    const u = unitCosts(a);
    const ctxs = IDX.map((i) => runCtx(a, i, usageVolumes(a, i, u), run, u));
    const rows: RunRow[] = RUN_ROWS.map(({ calc, ...def }) => ({ ...def, amounts: triple((i) => calc(ctxs[i])) }));
    const sum = (pred: (r: RunRow) => boolean) => triple((i) => rows.filter(pred).reduce((s, r) => s + r.amounts[i], 0));
    const sharedComputed = sum((r) => r.site === 'shared');
    const shared = triple((i) => {
        const o = a.sharedOverride[i];
        return typeof o === 'number' ? o : sharedComputed[i];
    });
    const direct = sum((r) => r.site !== 'shared');
    const total = triple((i) => direct[i] + shared[i]);
    return {
        rows, sharedComputed, shared, total,
        fixedTiered: sum((r) => r.kind !== 'variable'),
        fees: sum((r) => r.category === 'fee'),
        ai: sum((r) => r.category === 'ai'),
        totalUsd: triple((i) => (a.general.fx > 0 ? total[i] / a.general.fx : 0)),
    };
}

// ---------------------------------------------------------------------------
// สรุปต่อเว็บ = หน้า "สรุปต่อเว็บ"
// ---------------------------------------------------------------------------

export type SiteKey = Exclude<RunSite, 'shared'>;
export const SITE_KEYS: SiteKey[] = ['lawslane', 'admin', 'capdeal', 'wittaya', 'business', 'docs', 'lalin', 'sitthi'];

export type SiteRow = {
    site: SiteKey;
    direct: Triple;
    /** สัดส่วนการเข้าชมที่ใช้ปันส่วนกลาง (docs/Lalin/สิทธิคนทำงาน = 0 ตามไฟล์) */
    share: Triple;
    /** ต้นทุนตรง + ส่วนกลางที่ปันมา */
    withShared: Triple;
    revenue: Triple;
    /** กำไรขั้นต้น = รายได้ − ต้นทุนรวมปันส่วนกลาง */
    profit: Triple;
};

export type SiteSummary = {
    sites: SiteRow[];
    shared: Triple;
    total: Triple;
    revenue: Triple;
    profit: Triple;
    /** (รายได้ − ต้นทุน) / รายได้ · null = ไม่มีรายได้ */
    grossMargin: (number | null)[];
    users: Triple;
    paying: Triple;
    costPerUser: Triple;
    costPerPaying: Triple;
};

/** รายได้ต่อเดือนต่อเว็บ: ราคาแพลน × จำนวนบัญชี · lawslane รวม GP งานล่าม */
function siteRevenue(a: CostAssumptions, run: RunContext, site: SiteKey, i: 0 | 1 | 2): number {
    const s = a.scenarios;
    const p = run.prices;
    switch (site) {
        case 'lawslane':
            return s.lawPro[i] * p.lawPro + s.lawFirm[i] * p.lawFirm + s.custPlus[i] * p.custPlus
                + s.bookings[i] * a.interpreter.bookingValue * run.gpPercent / 100;
        case 'capdeal': return s.cdLite[i] * p.cdLite + s.cdPro[i] * p.cdPro + s.cdScale[i] * p.cdScale;
        case 'wittaya': return s.witPremium[i] * p.witPremium + s.witPro[i] * p.witPro;
        case 'business': return s.bizStarter[i] * a.business.starterPrice + s.bizPro[i] * a.business.proPrice;
        default: return 0;
    }
}

export function siteSummary(a: CostAssumptions, run: RunContext = DEFAULT_RUN_CONTEXT, m = monthlyRun(a, run)): SiteSummary {
    const s = a.scenarios;
    const vols = IDX.map((i) => usageVolumes(a, i));
    const visits: Partial<Record<SiteKey, Triple>> = {
        lawslane: s.vMain, admin: s.vAdmin, capdeal: s.vCd, wittaya: s.vWit, business: s.vBiz,
    };
    const sites: SiteRow[] = SITE_KEYS.map((site) => {
        const direct = triple((i) => m.rows.filter((r) => r.site === site).reduce((x, r) => x + r.amounts[i], 0));
        const share = triple((i) => (visits[site] && vols[i].visitsAll > 0 ? visits[site]![i] / vols[i].visitsAll : 0));
        const withShared = triple((i) => direct[i] + m.shared[i] * share[i]);
        const revenue = triple((i) => siteRevenue(a, run, site, i));
        return { site, direct, share, withShared, revenue, profit: triple((i) => revenue[i] - withShared[i]) };
    });
    const total = triple((i) => sites.reduce((x, r) => x + r.withShared[i], 0));
    const revenue = triple((i) => sites.reduce((x, r) => x + r.revenue[i], 0));
    const users = triple((i) => vols[i].users);
    const paying = triple((i) => vols[i].paying);
    return {
        sites, shared: m.shared, total, revenue,
        profit: triple((i) => revenue[i] - total[i]),
        grossMargin: IDX.map((i) => (revenue[i] > 0 ? (revenue[i] - total[i]) / revenue[i] : null)),
        users, paying,
        costPerUser: triple((i) => (users[i] > 0 ? total[i] / users[i] : 0)),
        costPerPaying: triple((i) => (paying[i] > 0 ? total[i] / paying[i] : 0)),
    };
}

// ---------------------------------------------------------------------------
// ค่าธรรมเนียม
// ---------------------------------------------------------------------------

/** Stripe subscription: (ราคา × (บัตร + Billing) + ค่าคงที่) × (1 + VAT) */
export function stripeSubscriptionFee(a: CostAssumptions, amount: number): number {
    if (!(amount > 0)) return 0;
    const g = a.general;
    return (amount * (g.cardPct + g.billingPct) + g.cardFixed) * (1 + g.vatOnFees);
}

/** Beam: ยอด × อัตรา × (1 + VAT) · ไม่มีค่าคงที่ (ค่าขั้นต่ำต่อรายการยังไม่ทราบ) */
export function beamFee(a: CostAssumptions, amount: number, rate: number): number {
    if (!(amount > 0)) return 0;
    return amount * rate * (1 + a.general.vatOnFees);
}

// ---------------------------------------------------------------------------
// ผลต่อแพลน
// ---------------------------------------------------------------------------

/** แพลนที่มีในโมเดล (code `lawyer.top` = "Firm" ในไฟล์) */
export type CostTier =
    | 'capdeal.lite' | 'capdeal.pro' | 'capdeal.scale'
    | 'lawyer.pro' | 'lawyer.top'
    | 'wittaya.premium' | 'wittaya.pro'
    | 'lawslane.plus'
    | 'business.starter' | 'business.pro';

export function tierFullCost(a: CostAssumptions, tier: CostTier, u = unitCosts(a)): number {
    const q = a.quotas;
    const cd = (n: number) => n * u.cdDraft + Math.max(10, n * q.cdScanX) * (u.cdScan + u.rag);
    switch (tier) {
        case 'capdeal.lite': return cd(q.cdLite);
        case 'capdeal.pro': return cd(q.cdPro);
        case 'capdeal.scale': return cd(q.cdScale);
        case 'lawyer.pro': return q.lawPro * u.lawCredit;
        case 'lawyer.top': return q.lawFirm * u.lawCredit;
        case 'wittaya.premium':
        case 'wittaya.pro': return q.witHeavy * u.witSet;
        case 'lawslane.plus': return q.custPlus * u.custCredit;
        case 'business.starter': return q.bizStarter * (u.bizReview + u.rag) + q.bizEsignStarter * u.sms;
        case 'business.pro': return q.bizPro * (u.bizReview + u.rag) + q.bizEsignPro * u.sms;
    }
}

/** ต้นทุนแพลนฟรีเมื่อใช้เต็มโควตา (แถว Free ในหน้า Margin — ไม่มีรายได้ ไม่ปันส่วนกลาง) */
export type FreeTier = 'lawyer.free' | 'lawslane.free' | 'capdeal.free' | 'wittaya.free';

export function freeTierCost(a: CostAssumptions, tier: FreeTier, u = unitCosts(a)): number {
    const q = a.quotas;
    switch (tier) {
        case 'lawyer.free': return 0;
        case 'lawslane.free': return q.custFree * u.custCredit;
        case 'capdeal.free': return q.cdFree * u.cdDraft + Math.max(10, q.cdFree * q.cdScanX) * (u.cdScan + u.rag);
        case 'wittaya.free': return q.witFree * u.witSet;
    }
}

export function costTierFor(product: string, planId: string): CostTier | null {
    const key = `${product}.${planId}`;
    return (Object.keys(TIER_LABELS) as string[]).includes(key) ? (key as CostTier) : null;
}

export const TIER_LABELS: Record<CostTier, Label> = {
    'lawyer.pro': ['ทนาย Pro', 'Lawyer Pro'],
    'lawyer.top': ['ทนาย บริษัท (Firm)', 'Lawyer Firm'],
    'lawslane.plus': ['ลูกค้า AI Plus', 'Customer AI Plus'],
    'capdeal.lite': ['CapDeal Lite', 'CapDeal Lite'],
    'capdeal.pro': ['CapDeal Pro', 'CapDeal Pro'],
    'capdeal.scale': ['CapDeal Scale', 'CapDeal Scale'],
    'wittaya.premium': ['Wittaya Premium', 'Wittaya Premium'],
    'wittaya.pro': ['Wittaya Pro', 'Wittaya Pro'],
    'business.starter': ['Business Starter (ร่าง)', 'Business Starter (draft)'],
    'business.pro': ['Business Pro (ร่าง)', 'Business Pro (draft)'],
};

/** ราคาต่อเดือนของแต่ละแพลน (Business มาจากสมมติฐาน) */
export function tierMonthlyPrice(a: CostAssumptions, tier: CostTier, prices: PlanPrices): number {
    switch (tier) {
        case 'lawyer.pro': return prices.lawPro;
        case 'lawyer.top': return prices.lawFirm;
        case 'lawslane.plus': return prices.custPlus;
        case 'capdeal.lite': return prices.cdLite;
        case 'capdeal.pro': return prices.cdPro;
        case 'capdeal.scale': return prices.cdScale;
        case 'wittaya.premium': return prices.witPremium;
        case 'wittaya.pro': return prices.witPro;
        case 'business.starter': return a.business.starterPrice;
        case 'business.pro': return a.business.proPrice;
    }
}

/** ตาราง Margin ต่อแพลน (รายเดือน) ทุกแพลนที่มีในโมเดล */
export function marginTable(a: CostAssumptions, run: RunContext = DEFAULT_RUN_CONTEXT, scenario?: number) {
    return (Object.keys(TIER_LABELS) as CostTier[]).map((tier) => {
        const price = tierMonthlyPrice(a, tier, run.prices);
        return { tier, price, e: planEconomics(a, tier, price, 'monthly', scenario) };
    });
}

export type CostTakeaways = {
    shared: number;
    infraPerPaying: number;
    paying: number;
    /** แพลนที่ margin เต็มโควตาต่ำสุด (เฉพาะแพลนที่ตั้งราคาแล้ว) */
    lowestMargin: { tier: CostTier; margin: number } | null;
    /** สัดส่วนค่า AI ในค่ารันรวม */
    aiShare: number;
    total: number;
};

/** ข้อสังเกตอัตโนมัติสำหรับแท็บภาพรวม (สถานการณ์ 1/2/3) */
export function costTakeaways(a: CostAssumptions, run: RunContext = DEFAULT_RUN_CONTEXT, scenario = a.general.marginScenario): CostTakeaways {
    const i = scenarioIndex(scenario);
    const t = scenarioTotals(a, i);
    const m = monthlyRun(a, run);
    let lowest: CostTakeaways['lowestMargin'] = null;
    for (const r of marginTable(a, run, scenario)) {
        if (r.price > 0 && r.e.marginFull !== null && (!lowest || r.e.marginFull < lowest.margin)) {
            lowest = { tier: r.tier, margin: r.e.marginFull };
        }
    }
    return {
        shared: t.shared, infraPerPaying: t.infraPerPaying, paying: t.paying,
        lowestMargin: lowest,
        aiShare: m.total[i] > 0 ? m.ai[i] / m.total[i] : 0,
        total: m.total[i],
    };
}

export type PlanEconomics = {
    /** รายได้ต่อเดือน (รายปีหาร 12) */
    revenue: number;
    fullCost: number;
    avgCost: number;
    /** ค่าธรรมเนียมรับเงินต่อเดือน (รายปี: ครั้งเดียวต่อปีหาร 12) */
    fee: number;
    infra: number;
    profitFull: number;
    marginFull: number | null;
    profitAvg: number;
    marginAvg: number | null;
    /** ราคาต่ำสุด (ต่อรอบบิล) ที่ทำให้ margin เต็มโควตาถึงเป้า · null = คิดไม่ได้ (อัตรารวมเกิน 100%) */
    minPrice: number | null;
};

/** สถานการณ์ index 0..2 จาก 1/2/3 */
export function scenarioIndex(n: number): 0 | 1 | 2 {
    return n === 1 ? 0 : n === 3 ? 2 : 1;
}

/**
 * กำไรต่อบัญชีต่อเดือน = หน้า "Margin ต่อแพลน"
 * @param price ราคาต่อรอบบิล (บาท) · null/0 = ยังไม่ตั้งราคา (รายได้ 0)
 * @param scenario 1/2/3 — ไม่ใส่ใช้ general.marginScenario
 */
export function planEconomics(
    a: CostAssumptions, tier: CostTier, price: number | null, interval: 'monthly' | 'yearly', scenario?: number,
): PlanEconomics {
    const u = unitCosts(a);
    const fullCost = tierFullCost(a, tier, u);
    const avgCost = fullCost * a.general.avgUsage;
    // แพลนเสียเงินทุกตัวรับค่าส่วนกลางเสมอ (ตามไฟล์: แถว Plus ที่ยังไม่ตั้งราคาก็ปัน)
    const infra = scenarioTotals(a, scenarioIndex(scenario ?? a.general.marginScenario)).infraPerPaying;
    const months = interval === 'yearly' ? 12 : 1;
    const p = price && price > 0 ? price : 0;
    const revenue = p / months;
    const fee = stripeSubscriptionFee(a, p) / months;
    const profitFull = revenue - fullCost - fee - infra;
    const profitAvg = revenue - avgCost - fee - infra;
    const g = a.general;
    const denom = 1 - (g.cardPct + g.billingPct) * (1 + g.vatOnFees) - g.targetMargin;
    const minPrice = denom > 0 ? (months * (fullCost + infra) + g.cardFixed * (1 + g.vatOnFees)) / denom : null;
    return {
        revenue, fullCost, avgCost, fee, infra, profitFull, profitAvg,
        marginFull: revenue > 0 ? profitFull / revenue : null,
        marginAvg: revenue > 0 ? profitAvg / revenue : null,
        minPrice,
    };
}

export type OneTimeEconomics = {
    feeCard: number;
    feePromptpay: number;
    cost: number;
    /** กำไรเมื่อจ่ายด้วยบัตร premium (แพงสุดในกรณีปกติ) */
    profitCard: number;
    marginCard: number | null;
    profitPromptpay: number;
    minPrice: number | null;
};

/** การจ่ายครั้งเดียวผ่าน Beam (เครดิต AI, E-Book) */
export function oneTimeEconomics(a: CostAssumptions, price: number, cost = 0): OneTimeEconomics {
    const p = price > 0 ? price : 0;
    const feeCard = beamFee(a, p, a.beam.premiumPct);
    const feePromptpay = beamFee(a, p, a.beam.promptpayPct);
    const profitCard = p - cost - feeCard;
    const denom = 1 - a.beam.premiumPct * (1 + a.general.vatOnFees) - a.general.targetMargin;
    return {
        feeCard, feePromptpay, cost,
        profitCard, marginCard: p > 0 ? profitCard / p : null,
        profitPromptpay: p - cost - feePromptpay,
        minPrice: cost > 0 && denom > 0 ? cost / denom : null,
    };
}

/** แพ็กเครดิต AI: ต้นทุน = เครดิต × ต้นทุนเครดิตทนายแพงสุด (ระวังไว้ก่อน ตามแถว "เครดิตเสริม" ในไฟล์) */
export function creditPackEconomics(a: CostAssumptions, credits: number, price: number): OneTimeEconomics {
    return oneTimeEconomics(a, price, credits * unitCosts(a).lawCreditMax);
}

export type InterpreterEconomics = {
    bookingValue: number;
    gp: number;
    feeCard: number;
    feePromptpay: number;
    netCard: number;
    netPromptpay: number;
    netCardPctOfJob: number;
};

/** งานล่าม: กำไรแพลตฟอร์ม = GP − ค่าธรรมเนียม Beam ของยอดเต็ม */
export function interpreterEconomics(a: CostAssumptions, gpPercent: number): InterpreterEconomics {
    const v = a.interpreter.bookingValue;
    const gp = v * gpPercent / 100;
    const feeCard = beamFee(a, v, a.beam.premiumPct);
    const feePromptpay = beamFee(a, v, a.beam.promptpayPct);
    return {
        bookingValue: v, gp, feeCard, feePromptpay,
        netCard: gp - feeCard, netPromptpay: gp - feePromptpay,
        netCardPctOfJob: v > 0 ? (gp - feeCard) / v : 0,
    };
}
