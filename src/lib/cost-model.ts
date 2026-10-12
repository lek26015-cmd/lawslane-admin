/**
 * โมเดลต้นทุน/กำไรต่อแพ็กเกจ — พอร์ตจาก LAWSLANE-ต้นทุน-2026-10.xlsx (จัดทำ 2026-10-11)
 *
 * ค่าเริ่มต้นทุกตัว = ช่องตัวเลขสีน้ำเงินในไฟล์ (หน้า สมมติฐาน / ราคาบริการ / ต้นทุนต่อหน่วย)
 * Super Admin แก้ได้ที่หน้า "ราคาแพ็กเกจ" → เก็บที่ `{PLAN_PRICING_COLLECTION}/costModel`
 *
 * สิ่งที่พอร์ต:
 *   - ต้นทุนต่อหน่วย (ต่อการเรียก AI, ต่อเครดิต, RAG)            = หน้า "ต้นทุนต่อหน่วย"
 *   - ปริมาณใช้งานที่ใช้คิดค่าส่วนกลาง                          = หน้า "ปริมาณใช้งาน"
 *   - ค่าส่วนกลางรายเดือน (Firebase/Cloudflare/Vercel/อีเมล ฯลฯ) = หน้า "ค่ารันรายเดือน" แถว 4–16
 *   - กำไร/margin/ราคาต่ำสุดต่อแพลน                             = หน้า "Margin ต่อแพลน"
 * ต่างจากไฟล์ (ตาม PLAN-08):
 *   - ค่าธรรมเนียม Stripe คูณ (1 + VAT) ด้วย (ไฟล์ไม่รวม VAT) — ตั้ง vatOnFees = 0 จะได้ตัวเลขตรงไฟล์
 *   - งานล่าม/การจ่ายครั้งเดียว คิดค่าธรรมเนียม Beam แทน Stripe Connect
 * ไม่ได้พอร์ต: แถวต้นทุนตรงรายเว็บที่ไม่กระทบกำไรต่อแพลน (LINE OA, SlipOK, ใบแจ้งหนี้ PDF, SMS,
 *   Lalin, AI ของ admin, แพลน Business ร่าง) และหน้า "สรุปต่อเว็บ"
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
        witHeavy: 150, witEssayPerSet: 4,
    },
    interpreter: { bookingValue: 2000 },
    infra: {
        pagesPerVisit: 4, fsReadsPerVisit: 30, fsWritesPerVisit: 2, reqSec: 0.3, reqConcurrency: 8,
        instVcpu: 1, instGib: 0.5, mbPerPage: 0.5, vectors: 1_000_000, vecDims: 1024, embedTokens: 150,
        emailsPerUser: 2, vercelSeats: 1, domains: 2,
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
    },
    servicePrices: {
        crCpu: 0.000024, crMem: 0.0000025, crReq: 0.4, egress: 0.15,
        fsRead: 0.06, fsWrite: 0.18, fsGb: 0.18, gcs: 0.026,
        cfBase: 5, vecQ: 0.01, vecS: 0.05, neuron: 0.011, bgeNeurons: 1075, r2: 0.015,
        imgStored: 5, imgDeliv: 1, vercel: 20, resendPro: 20, resendOver: 0.9, upstash: 0.2, domainThb: 450,
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
    return {
        lawCredit: creditMix > 0 ? costMix / creditMix : 0,
        lawCreditMax: max,
        lawCreditsPerCall: mixSum > 0 ? creditMix / mixSum : 0,
        custCredit: a.aiCalls.cust.credits > 0 ? aiCallCost(a, a.aiCalls.cust) / a.aiCalls.cust.credits : 0,
        rag: a.general.fx * (inf.embedTokens * sp.bgeNeurons / 1_000_000 * sp.neuron / 1000 + inf.vecDims / 1_000_000 * sp.vecQ),
        cdScan: aiCallCost(a, a.aiCalls.cdScan),
        cdDraft: aiCallCost(a, a.aiCalls.cdDraft),
        witSet: aiCallCost(a, a.aiCalls.witEssay) * a.quotas.witEssayPerSet,
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
    const s = a.scenarios;
    const q = a.quotas;
    const inf = a.infra;
    const sp = a.servicePrices;
    const fx = a.general.fx;
    const u = unitCosts(a);
    const at = (t: Triple) => t[i];

    // หน้า "ปริมาณใช้งาน"
    const lawCredits = (at(s.lawPro) * q.lawPro + at(s.lawFirm) * q.lawFirm) * at(s.usage);
    const lawCalls = u.lawCreditsPerCall > 0 ? lawCredits / u.lawCreditsPerCall : 0;
    const custCredits = (at(s.custMau) - at(s.custPlus)) * at(s.custFreeCredits) + at(s.custPlus) * q.custPlus * at(s.usage);
    const cdContracts = (at(s.cdLite) * q.cdLite + at(s.cdPro) * q.cdPro + at(s.cdScale) * q.cdScale) * at(s.usage)
        + at(s.cdFree) * q.cdFree * 0.5;
    const cdScans = cdContracts * at(s.cdScansPerContract);
    const bizReviews = (at(s.bizStarter) + at(s.bizPro)) * at(s.bizReviews);
    const rag = lawCalls + custCredits + cdScans + bizReviews;
    const vAppHosting = at(s.vMain) + at(s.vCd) + at(s.vBiz);
    const vAll = vAppHosting + at(s.vWit) + at(s.vAdmin);
    const pv = vAppHosting * inf.pagesPerVisit;
    const vcpuSec = pv * inf.reqSec / inf.reqConcurrency * inf.instVcpu;
    const gibSec = pv * inf.reqSec / inf.reqConcurrency * inf.instGib;
    const egressGb = pv * inf.mbPerPage / 1024;
    const fsReads = vAll * inf.fsReadsPerVisit;
    const fsWrites = vAll * inf.fsWritesPerVisit;
    const users = at(s.lawFree) + at(s.lawPro) + at(s.lawFirm) + at(s.custMau) + at(s.cdFree) + at(s.cdLite) + at(s.cdPro)
        + at(s.cdScale) + at(s.witFree) + at(s.witPremium) + at(s.witPro) + at(s.bizStarter) + at(s.bizPro);
    const paying = at(s.lawPro) + at(s.lawFirm) + at(s.custPlus) + at(s.cdLite) + at(s.cdPro) + at(s.cdScale)
        + at(s.witPremium) + at(s.witPro) + at(s.bizStarter) + at(s.bizPro);
    const emails = users * inf.emailsPerUser;
    const upstash = (lawCalls + custCredits) * 2 + at(s.vMain) * inf.pagesPerVisit;
    const imgDeliv = vAll * inf.pagesPerVisit * 2;

    // หน้า "ค่ารันรายเดือน" ส่วนกลาง (โควตาฟรีเป็นค่าคงที่ตามไฟล์)
    const rows = [
        fx * (Math.max(0, vcpuSec - 180_000) * sp.crCpu + Math.max(0, gibSec - 360_000) * sp.crMem
            + Math.max(0, pv - 2_000_000) / 1_000_000 * sp.crReq),
        fx * Math.max(0, egressGb - 10) * sp.egress,
        fx * (Math.max(0, fsReads - 1_500_000) / 100_000 * sp.fsRead + Math.max(0, fsWrites - 600_000) / 100_000 * sp.fsWrite
            + Math.max(0, at(s.fsGb) - 1) * sp.fsGb),
        fx * Math.max(0, at(s.gcsGb) - 5) * sp.gcs,
        fx * sp.cfBase,
        fx * (Math.max(0, (rag + inf.vectors) * inf.vecDims / 1_000_000 - 50) * sp.vecQ
            + Math.max(0, inf.vectors * inf.vecDims / 1_000_000 - 10) / 100 * sp.vecS),
        fx * Math.max(0, rag * inf.embedTokens * sp.bgeNeurons / 1_000_000 - 300_000) / 1000 * sp.neuron,
        fx * Math.max(0, at(s.r2Gb) - 10) * sp.r2,
        fx * (Math.ceil(at(s.imgStored) / 100_000) * sp.imgStored + imgDeliv / 100_000 * sp.imgDeliv),
        fx * sp.vercel * inf.vercelSeats,
        fx * (emails <= 3000 ? 0 : sp.resendPro + Math.max(0, emails - 50_000) / 1000 * sp.resendOver),
        fx * Math.max(0, upstash - 500_000) / 100_000 * sp.upstash,
        inf.domains * sp.domainThb / 12,
    ];
    const sharedComputed = rows.reduce((x, y) => x + y, 0);
    const override = a.sharedOverride[i];
    const shared = typeof override === 'number' ? override : sharedComputed;
    return { shared, sharedComputed, paying, infraPerPaying: paying > 0 ? shared / paying : 0 };
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
    | 'lawslane.plus';

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
    }
}

export function costTierFor(product: string, planId: string): CostTier | null {
    const key = `${product}.${planId}`;
    const all: CostTier[] = ['capdeal.lite', 'capdeal.pro', 'capdeal.scale', 'lawyer.pro', 'lawyer.top', 'wittaya.premium', 'wittaya.pro', 'lawslane.plus'];
    return (all as string[]).includes(key) ? (key as CostTier) : null;
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
