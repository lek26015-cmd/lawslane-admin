/**
 * คำอธิบายทุกช่องที่แก้ได้ในหน้า "ราคาแพ็กเกจ" (ตั้งราคา + ต้นทุนระบบ) — ที่เดียว ใช้ทั้ง popover "ⓘ",
 * กล่องยืนยันก่อนบันทึก และเทสต์ (ทุกช่องต้องมีคำอธิบาย)
 *
 * แต่ละช่องมี 4 ส่วน: คืออะไร / ทำงานยังไง / ควรแก้เมื่อไร / แก้แล้วกระทบอะไร (+ ป้ายผลกับเว็บจริง 3 แบบ)
 *  - ช่องสมมติฐานต้นทุน: "กระทบอะไร" ไม่ได้เขียนมือ — หาจากโมเดลจริง (deriveAffects) โดยลองเปลี่ยนค่า
 *    แล้วดูว่าตัวเลขไหนในหน้าขยับ (ลองทั้งค่าปัจจุบันและค่าที่ขยายผู้ใช้ ×1000 เพื่อข้ามโควตาฟรี)
 *  - ช่องราคา/GP/จ่ายครั้งเดียว: เขียนมือ เพราะผลจริงอยู่นอกโมเดล (Stripe, ระบบจอง)
 *
 * pure — ไม่มี server-only ใช้ได้ทั้ง client และเทสต์
 */
import {
    DEFAULT_COST_ASSUMPTIONS,
    DEFAULT_RUN_CONTEXT,
    RUN_SITE_LABELS,
    SITE_KEYS,
    TIER_LABELS,
    creditPackEconomics,
    freeTierCost,
    interpreterEconomics,
    marginTable,
    monthlyRun,
    oneTimeEconomics,
    siteSummary,
    unitCosts,
    usageVolumes,
    type CostAssumptions,
    type FreeTier,
    type Label,
    type RunContext,
    type UnitCosts,
    type UsageVolumes,
} from './cost-model';

export type { Label };

/** ผลกับเว็บจริง */
export type LiveEffect = 'estimate' | 'stored' | 'live';

export const LIVE_EFFECT_LABELS: Record<LiveEffect, Label> = {
    estimate: ['แค่ตัวเลขประมาณ — ไม่กระทบเว็บ', 'Estimate only — no effect on the sites'],
    stored: ['เก็บไว้ ยังไม่ใช้จริง', 'Stored, not live yet'],
    live: ['มีผลจริงทันที', 'Live immediately'],
};

export type FieldDoc = {
    title: Label;
    what: Label;
    how: Label;
    when: Label;
    /** ตัวเลขในหน้าที่ขยับ */
    affects: Label[];
    live: LiveEffect;
    /** ผลกับเว็บจริงแบบละเอียด */
    liveDetail: Label;
};

export const SCENARIO_LABELS: Label[] = [['เริ่มต้น', 'Start'], ['เติบโต', 'Growth'], ['ขยาย', 'Scale']];

// ---------------------------------------------------------------------------
// ชื่อช่องสมมติฐาน (ใช้ทั้งตัวแก้สมมติฐานและ popover)
// ---------------------------------------------------------------------------

export const GENERAL_LABELS: Record<keyof CostAssumptions['general'], Label> = {
    fx: ['อัตราแลกเปลี่ยน (บาท/USD)', 'FX (THB/USD)'],
    targetMargin: ['เป้า gross margin (0–1)', 'Target gross margin (0–1)'],
    avgUsage: ['สัดส่วนใช้โควตาเฉลี่ยของผู้จ่ายเงิน (0–1)', 'Average quota usage (0–1)'],
    marginScenario: ['สถานการณ์ที่ใช้ปันค่าส่วนกลาง (1/2/3)', 'Scenario for infra share (1/2/3)'],
    cardPct: ['Stripe บัตรในประเทศ (สัดส่วน)', 'Stripe domestic card rate'],
    cardFixed: ['Stripe ค่าคงที่ต่อรายการ (บาท)', 'Stripe fixed fee (THB)'],
    billingPct: ['Stripe Billing (สัดส่วน)', 'Stripe Billing rate'],
    vatOnFees: ['VAT บนค่าธรรมเนียม (0 = ตรงกับไฟล์ Excel)', 'VAT on fees (0 = match the Excel file)'],
};
export const BEAM_LABELS: Record<keyof CostAssumptions['beam'], Label> = {
    cardPct: ['Beam บัตรทั่วไป', 'Beam card'],
    premiumPct: ['Beam บัตร premium (ใช้คิดกำไร)', 'Beam premium card (used for profit)'],
    intlPct: ['Beam บัตรต่างประเทศ', 'Beam international card'],
    amexPct: ['Beam Amex', 'Beam Amex'],
    ewalletPct: ['Beam e-wallet', 'Beam e-wallet'],
    promptpayPct: ['Beam PromptPay', 'Beam PromptPay'],
};
export const QUOTA_LABELS: Record<keyof CostAssumptions['quotas'], Label> = {
    lawPro: ['เครดิต AI ทนาย Pro / เดือน', 'Lawyer Pro AI credits / mo'],
    lawFirm: ['เครดิต AI ทนาย บริษัท (Firm) / เดือน', 'Lawyer Firm AI credits / mo'],
    custFree: ['เครดิต AI ลูกค้า Free / เดือน', 'Customer Free credits / mo'],
    custPlus: ['เครดิต AI ลูกค้า Plus / เดือน', 'Customer Plus credits / mo'],
    cdFree: ['CapDeal Free สัญญา / เดือน', 'CapDeal Free contracts / mo'],
    cdLite: ['CapDeal Lite สัญญา / เดือน', 'CapDeal Lite contracts / mo'],
    cdPro: ['CapDeal Pro สัญญา / เดือน', 'CapDeal Pro contracts / mo'],
    cdScale: ['CapDeal Scale สัญญา / เดือน', 'CapDeal Scale contracts / mo'],
    cdScanX: ['CapDeal AI สแกน = กี่เท่าของสัญญา (ขั้นต่ำ 10)', 'CapDeal scans per contract quota (min 10)'],
    witHeavy: ['Wittaya ไม่จำกัด: ใช้หนักสุดที่สมมติ (ชุด/เดือน)', 'Wittaya unlimited: assumed heavy use (sets/mo)'],
    witEssayPerSet: ['ข้อเขียนที่ AI ตรวจต่อชุด', 'AI-graded essays per set'],
    witFree: ['Wittaya Free ทำได้ (ชุด/เดือน)', 'Wittaya Free sets / mo'],
    bizStarter: ['Business Starter AI รีวิว / เดือน (ร่าง)', 'Business Starter AI reviews / mo (draft)'],
    bizPro: ['Business Pro AI รีวิว / เดือน (ร่าง)', 'Business Pro AI reviews / mo (draft)'],
    bizEsignStarter: ['Business Starter e-sign (SMS) / เดือน', 'Business Starter e-sign (SMS) / mo'],
    bizEsignPro: ['Business Pro e-sign (SMS) / เดือน', 'Business Pro e-sign (SMS) / mo'],
};
export const BUSINESS_LABELS: Record<keyof CostAssumptions['business'], Label> = {
    starterPrice: ['ราคา Business Starter (บาท/เดือน, ร่าง)', 'Business Starter price (THB/mo, draft)'],
    proPrice: ['ราคา Business Pro (บาท/เดือน, ร่าง)', 'Business Pro price (THB/mo, draft)'],
};
export const INFRA_LABELS: Record<keyof CostAssumptions['infra'], Label> = {
    pagesPerVisit: ['หน้าต่อการเข้าชม', 'Pages per visit'],
    fsReadsPerVisit: ['Firestore reads ต่อการเข้าชม', 'Firestore reads per visit'],
    fsWritesPerVisit: ['Firestore writes ต่อการเข้าชม', 'Firestore writes per visit'],
    reqSec: ['วินาทีต่อ request (SSR)', 'Seconds per request'],
    reqConcurrency: ['request พร้อมกันต่อ instance', 'Concurrent requests per instance'],
    instVcpu: ['vCPU ต่อ instance', 'vCPU per instance'],
    instGib: ['หน่วยความจำต่อ instance (GiB)', 'Memory per instance (GiB)'],
    mbPerPage: ['ข้อมูลส่งออกต่อหน้า (MB)', 'Egress per page (MB)'],
    vectors: ['จำนวน vector ในคลังกฎหมาย', 'Vectors in law index'],
    vecDims: ['มิติ vector', 'Vector dimensions'],
    embedTokens: ['token ที่ embed ต่อคำถาม', 'Embedded tokens per query'],
    emailsPerUser: ['อีเมลต่อผู้ใช้ active / เดือน', 'Emails per active user / mo'],
    vercelSeats: ['ที่นั่ง Vercel Pro', 'Vercel Pro seats'],
    domains: ['โดเมนที่จ่ายเอง', 'Paid domains'],
    invoiceSec: ['วินาทีที่ render ใบแจ้งหนี้ PDF 1 ใบ', 'Seconds to render one invoice PDF'],
    lalinCalls: ['Lalin: เรียก AI / เดือน', 'Lalin: AI calls / mo'],
    adminAiCalls: ['admin: เรียก AI (ร่างสัญญา/แปล) / เดือน', 'admin: AI calls (drafting/translation) / mo'],
};
export const SCENARIO_FIELD_LABELS: Record<keyof CostAssumptions['scenarios'], Label> = {
    lawFree: ['ทนาย Free', 'Lawyers Free'],
    lawPro: ['ทนาย Pro', 'Lawyers Pro'],
    lawFirm: ['ทนาย บริษัท (Firm)', 'Lawyers Firm'],
    custMau: ['ลูกค้า active / เดือน (รวม Plus)', 'Customers active / mo'],
    custPlus: ['ลูกค้า Plus', 'Customers Plus'],
    custFreeCredits: ['เครดิตเฉลี่ยที่ลูกค้า Free ใช้', 'Avg credits used by Free'],
    usage: ['สัดส่วนใช้โควตาของผู้จ่ายเงิน', 'Paid quota usage share'],
    findPerUser: ['ใช้ AI ค้นหาทนาย / ลูกค้า / เดือน', 'AI lawyer finder uses / customer / mo'],
    bookings: ['งานล่าม / เดือน', 'Interpreter jobs / mo'],
    invoices: ['ใบแจ้งหนี้ PDF / เดือน', 'Invoice PDFs / mo'],
    lineMain: ['LINE push ของ OA หลัก / เดือน', 'Main LINE OA pushes / mo'],
    slips: ['สลิปที่ตรวจด้วย SlipOK / เดือน', 'Slips checked by SlipOK / mo'],
    vMain: ['การเข้าชม lawslane.com', 'lawslane.com visits'],
    cdFree: ['CapDeal Free', 'CapDeal Free'],
    cdLite: ['CapDeal Lite', 'CapDeal Lite'],
    cdPro: ['CapDeal Pro', 'CapDeal Pro'],
    cdScale: ['CapDeal Scale', 'CapDeal Scale'],
    cdScansPerContract: ['AI สแกน/แชทต่อสัญญา', 'Scans per contract'],
    sms: ['SMS OTP ของ CapDeal / เดือน', 'CapDeal SMS OTP / mo'],
    lineCd: ['LINE push ของ OA CapDeal / เดือน', 'CapDeal LINE OA pushes / mo'],
    vCd: ['การเข้าชม CapDeal', 'CapDeal visits'],
    witFree: ['Wittaya Free active', 'Wittaya Free active'],
    witPremium: ['Wittaya Premium', 'Wittaya Premium'],
    witPro: ['Wittaya Pro', 'Wittaya Pro'],
    witSetsFree: ['ข้อสอบที่ทำ / ผู้ใช้ Free / เดือน', 'Sets / Free user / mo'],
    witSetsPaid: ['ข้อสอบที่ทำ / ผู้ใช้จ่ายเงิน / เดือน', 'Sets / paid user / mo'],
    vWit: ['การเข้าชม Wittaya', 'Wittaya visits'],
    bizStarter: ['Business Starter (ร่าง)', 'Business Starter (draft)'],
    bizPro: ['Business Pro (ร่าง)', 'Business Pro (draft)'],
    bizReviews: ['AI รีวิว / องค์กร (ร่าง)', 'AI reviews / org (draft)'],
    vBiz: ['การเข้าชม business + landing', 'Business + landing visits'],
    vAdmin: ['การเข้าชม admin', 'Admin visits'],
    fsGb: ['ขนาด Firestore (GiB)', 'Firestore size (GiB)'],
    gcsGb: ['Firebase Storage (GB)', 'Firebase Storage (GB)'],
    r2Gb: ['Cloudflare R2 (GB)', 'Cloudflare R2 (GB)'],
    imgStored: ['รูปใน Cloudflare Images', 'Cloudflare Images stored'],
};
/** ลำดับแสดงผลของสถานการณ์ (จัดกลุ่มตามเว็บแบบในไฟล์) */
export const SCENARIO_GROUPS: { title: Label; keys: (keyof CostAssumptions['scenarios'])[] }[] = [
    { title: ['lawslane.com', 'lawslane.com'], keys: ['lawFree', 'lawPro', 'lawFirm', 'custMau', 'custPlus', 'custFreeCredits', 'usage', 'findPerUser', 'bookings', 'invoices', 'lineMain', 'slips', 'vMain'] },
    { title: ['CapDeal', 'CapDeal'], keys: ['cdFree', 'cdLite', 'cdPro', 'cdScale', 'cdScansPerContract', 'sms', 'lineCd', 'vCd'] },
    { title: ['Wittaya', 'Wittaya'], keys: ['witFree', 'witPremium', 'witPro', 'witSetsFree', 'witSetsPaid', 'vWit'] },
    { title: ['Business / อื่น ๆ', 'Business / other'], keys: ['bizStarter', 'bizPro', 'bizReviews', 'vBiz', 'vAdmin', 'fsGb', 'gcsGb', 'r2Gb', 'imgStored'] },
];

/** ราคาบริการ + หน่วย + แหล่งที่มา (หน้า "ราคาบริการ") · unconfirmed = ⚠ ในไฟล์ */
export const SERVICE_PRICE_INFO: Record<keyof CostAssumptions['servicePrices'], {
    vendor: string; label: Label; unit: Label; source: string; note?: Label; unconfirmed?: boolean;
}> = {
    crCpu: { vendor: 'App Hosting (Cloud Run)', label: ['CPU', 'CPU'], unit: ['USD / vCPU-วินาที', 'USD / vCPU-second'], source: 'firebase.google.com/docs/app-hosting/costs', note: ['ฟรี 180,000 vCPU-วินาที/เดือน (ใช้ร่วมทุก backend)', 'Free 180,000 vCPU-s/mo (shared by all backends)'] },
    crMem: { vendor: 'App Hosting (Cloud Run)', label: ['หน่วยความจำ', 'Memory'], unit: ['USD / GiB-วินาที', 'USD / GiB-second'], source: 'firebase.google.com/docs/app-hosting/costs', note: ['ฟรี 360,000 GiB-วินาที/เดือน', 'Free 360,000 GiB-s/mo'] },
    crReq: { vendor: 'App Hosting (Cloud Run)', label: ['request', 'Requests'], unit: ['USD / ล้าน request', 'USD / M requests'], source: 'firebase.google.com/docs/app-hosting/costs', note: ['ฟรี 2 ล้าน request/เดือน', 'Free 2M requests/mo'] },
    egress: { vendor: 'App Hosting', label: ['ข้อมูลส่งออก', 'Egress'], unit: ['USD / GiB', 'USD / GiB'], source: 'firebase.google.com/docs/app-hosting/costs', note: ['ฟรี 10 GiB/เดือน; ไม่ผ่าน cache $0.20', 'Free 10 GiB/mo; uncached $0.20'] },
    fsRead: { vendor: 'Firestore', label: ['อ่าน', 'Reads'], unit: ['USD / 100k reads', 'USD / 100k reads'], source: 'cloud.google.com/firestore/pricing', note: ['ฟรี 50k/วัน ≈ 1.5 ล้าน/เดือน · ราคาต่างกันตาม region ควรตรวจ', 'Free 50k/day ≈ 1.5M/mo · varies by region, verify'] },
    fsWrite: { vendor: 'Firestore', label: ['เขียน', 'Writes'], unit: ['USD / 100k writes', 'USD / 100k writes'], source: 'cloud.google.com/firestore/pricing', note: ['ฟรี 20k/วัน ≈ 600k/เดือน', 'Free 20k/day ≈ 600k/mo'] },
    fsGb: { vendor: 'Firestore', label: ['พื้นที่', 'Storage'], unit: ['USD / GiB-เดือน', 'USD / GiB-month'], source: 'cloud.google.com/firestore/pricing', note: ['ฟรี 1 GiB', 'Free 1 GiB'] },
    gcs: { vendor: 'Firebase Storage', label: ['พื้นที่', 'Storage'], unit: ['USD / GB-เดือน', 'USD / GB-month'], source: 'cloud.google.com/storage/pricing', note: ['ฟรี 5 GB', 'Free 5 GB'] },
    sms: { vendor: 'Firebase Auth', label: ['SMS OTP ไทย', 'SMS OTP (Thailand)'], unit: ['USD / SMS', 'USD / SMS'], source: 'ประมาณการ — ช่วง $0.01–0.46 ตามประเทศ', note: ['ยังไม่ยืนยันราคาไทย ตรวจใน Cloud Console', 'Thai price not confirmed; check Cloud Console'], unconfirmed: true },
    cfBase: { vendor: 'Cloudflare', label: ['Workers Paid', 'Workers Paid'], unit: ['USD / เดือน', 'USD / month'], source: 'developers.cloudflare.com/workers/platform/pricing', note: ['รวม 10M requests, 30M CPU-ms, D1, Queues 1M ops', 'Includes 10M requests, 30M CPU-ms, D1, Queues 1M ops'] },
    vecQ: { vendor: 'Vectorize', label: ['queried dimensions', 'Queried dimensions'], unit: ['USD / ล้าน dims', 'USD / M dims'], source: 'developers.cloudflare.com/vectorize/platform/pricing', note: ['รวม 50 ล้าน/เดือน · คิด (คำถาม + vector ที่เก็บ) × มิติ', 'Includes 50M/mo · (queries + stored vectors) × dims'] },
    vecS: { vendor: 'Vectorize', label: ['stored dimensions', 'Stored dimensions'], unit: ['USD / 100 ล้าน dims', 'USD / 100M dims'], source: 'developers.cloudflare.com/vectorize/platform/pricing', note: ['รวม 10 ล้าน', 'Includes 10M'] },
    neuron: { vendor: 'Workers AI', label: ['neurons', 'Neurons'], unit: ['USD / 1,000 neurons', 'USD / 1k neurons'], source: 'developers.cloudflare.com/workers-ai/platform/pricing', note: ['ฟรี 10,000/วัน', 'Free 10,000/day'] },
    bgeNeurons: { vendor: 'Workers AI', label: ['bge-m3 neurons ต่อล้าน token', 'bge-m3 neurons per M tokens'], unit: ['neurons / ล้าน token', 'neurons / M tokens'], source: 'developers.cloudflare.com/workers-ai/platform/pricing', note: ['เท่ากับ $0.012 / ล้าน token', 'Equals $0.012 / M tokens'] },
    r2: { vendor: 'Cloudflare R2', label: ['พื้นที่', 'Storage'], unit: ['USD / GB-เดือน', 'USD / GB-month'], source: 'developers.cloudflare.com/r2/pricing', note: ['ฟรี 10 GB · ไม่มีค่า egress', 'Free 10 GB · no egress fees'] },
    browserHour: { vendor: 'Browser Rendering', label: ['ชั่วโมง', 'Hours'], unit: ['USD / ชั่วโมง', 'USD / hour'], source: 'developers.cloudflare.com/browser-rendering/pricing', note: ['รวม 10 ชั่วโมง/เดือน', 'Includes 10 hours/mo'] },
    imgStored: { vendor: 'Cloudflare Images', label: ['เก็บรูป', 'Stored images'], unit: ['USD / 100k รูป', 'USD / 100k images'], source: 'developers.cloudflare.com/images/pricing', note: ['จากความรู้เดิม — ควรตรวจ', 'From prior knowledge — verify'], unconfirmed: true },
    imgDeliv: { vendor: 'Cloudflare Images', label: ['ส่งรูป', 'Delivered images'], unit: ['USD / 100k ครั้ง', 'USD / 100k deliveries'], source: 'developers.cloudflare.com/images/pricing', note: ['จากความรู้เดิม — ควรตรวจ', 'From prior knowledge — verify'], unconfirmed: true },
    vercel: { vendor: 'Vercel', label: ['Pro ต่อที่นั่ง', 'Pro per seat'], unit: ['USD / เดือน', 'USD / month'], source: 'vercel.com/docs/accounts/plans/pro', note: ['Hobby ห้ามใช้เชิงพาณิชย์', 'Hobby is non-commercial only'] },
    resendPro: { vendor: 'Resend', label: ['Pro (50k ฉบับ)', 'Pro (50k emails)'], unit: ['USD / เดือน', 'USD / month'], source: 'resend.com/pricing', note: ['ฟรี 3,000/เดือน (100/วัน)', 'Free 3,000/mo (100/day)'] },
    resendOver: { vendor: 'Resend', label: ['เกินโควตา', 'Overage'], unit: ['USD / 1,000 ฉบับ', 'USD / 1,000 emails'], source: 'resend.com/pricing' },
    upstash: { vendor: 'Upstash Redis', label: ['คำสั่ง', 'Commands'], unit: ['USD / 100k คำสั่ง', 'USD / 100k commands'], source: 'upstash.com/pricing/redis', note: ['ฟรี 500k คำสั่ง/เดือน', 'Free 500k commands/mo'] },
    lineBasicThb: { vendor: 'LINE OA (ไทย)', label: ['Basic 15,000 ข้อความ', 'Basic 15,000 messages'], unit: ['บาท / เดือน', 'THB / month'], source: 'LINE OA ราคาไทย (ตรวจ 2026-09-09)', note: ['ฟรี 300 ข้อความ · ยังไม่รวม VAT', 'Free 300 messages · excl. VAT'] },
    lineProThb: { vendor: 'LINE OA (ไทย)', label: ['Pro 35,000 ข้อความ', 'Pro 35,000 messages'], unit: ['บาท / เดือน', 'THB / month'], source: 'LINE OA ราคาไทย', note: ['ยังไม่รวม VAT', 'Excl. VAT'] },
    lineOverThb: { vendor: 'LINE OA (ไทย)', label: ['ข้อความเกิน (Pro)', 'Extra messages (Pro)'], unit: ['บาท / ข้อความ', 'THB / message'], source: 'เอกสารอบรม (ไม่ใช่ทางการ)', note: ['ควรตรวจ', 'Verify'], unconfirmed: true },
    slipokThb: { vendor: 'SlipOK', label: ['500 สลิป', '500 slips'], unit: ['บาท / เดือน', 'THB / month'], source: 'แพ็กเกจผ่าน AIS (ไม่ใช่หน้าราคาทางการ)', note: ['เกิน 0.42 บาท/สลิป', '0.42 THB per extra slip'] },
    slipokOverThb: { vendor: 'SlipOK', label: ['สลิปเกิน', 'Extra slips'], unit: ['บาท / สลิป', 'THB / slip'], source: 'แพ็กเกจผ่าน AIS' },
    domainThb: { vendor: 'โดเมน .com', label: ['ต่อปี', 'Per year'], unit: ['บาท / ปี', 'THB / year'], source: 'ประมาณ', note: ['สไลด์เดิมใช้ ฿345.25/ปี', 'Older slides used ฿345.25/yr'] },
};

export const MODEL_INFO: Record<string, { source: string; usedFor: Label; unconfirmed?: boolean }> = {
    'gemini-2.5-flash': { source: 'ai.google.dev/gemini-api/docs/pricing', usedFor: ['AI ทนาย/ลูกค้า, CapDeal, admin (โมเดลหลัก)', 'Lawyer/customer AI, CapDeal, admin (main model)'] },
    'gemini-2.5-flash-lite': { source: 'ai.google.dev/gemini-api/docs/pricing', usedFor: ['-', '-'] },
    'gemini-3.5-flash-lite': { source: 'ai.google.dev/gemini-api/docs/pricing', usedFor: ['fallback ของ AI ทนาย', 'Lawyer AI fallback'] },
    'gemini-3.1-flash-lite': { source: 'ai.google.dev/gemini-api/docs/pricing', usedFor: ['Lalin', 'Lalin'] },
    'gemini-2.0-flash': { source: 'ปลดระวางแล้ว — คิดเท่า 2.5-flash-lite', usedFor: ['Wittaya ตรวจข้อสอบ ⚠ ควรย้ายโมเดล', 'Wittaya grading ⚠ should migrate'], unconfirmed: true },
    typhoon: { source: 'ไม่พบหน้าราคาทางการ', usedFor: ['OCR ข้อสอบ, ข้อความไทย — ตอนนี้ถือว่าฟรีแบบจำกัด rate', 'Exam OCR, Thai text — treated as free (rate-limited)'], unconfirmed: true },
};

export const AI_CALL_LABELS: Record<keyof CostAssumptions['aiCalls'], Label> = {
    lawAsk: ['ทนาย: ถามกฎหมาย', 'Lawyer: ask'],
    lawStatute: ['ทนาย: ค้นตัวบท', 'Lawyer: statute'],
    lawJudgment: ['ทนาย: ค้นฎีกา', 'Lawyer: judgment'],
    lawAttach: ['ทนาย: วิเคราะห์ไฟล์แนบ', 'Lawyer: attachment'],
    lawDraft: ['ทนาย: ร่างเอกสาร', 'Lawyer: draft'],
    lawContract: ['ทนาย: ตรวจสัญญา', 'Lawyer: contract'],
    cust: ['ลูกค้า: ถาม AI', 'Customer: ask'],
    custFind: ['ลูกค้า: AI ค้นหาทนาย', 'Customer: AI lawyer finder'],
    cdScan: ['CapDeal: AI สแกน/แชท', 'CapDeal: scan/chat'],
    cdDraft: ['CapDeal: ร่าง/วิเคราะห์สัญญา', 'CapDeal: draft contract'],
    witEssay: ['Wittaya: ตรวจข้อเขียน 1 ข้อ', 'Wittaya: grade 1 essay'],
    bizReview: ['Business: AI รีวิวสัญญา (ร่าง)', 'Business: AI contract review (draft)'],
    admin: ['admin: ร่างสัญญา/แปล', 'admin: drafting/translation'],
    ocrPage: ['admin: OCR ข้อสอบ 1 หน้า', 'admin: exam OCR, 1 page'],
    lalin: ['Lalin: briefing / แชท', 'Lalin: briefing / chat'],
};
export const AI_FIELD_LABELS: Record<'model' | 'inputTokens' | 'cachedShare' | 'outputTokens' | 'credits' | 'mix', Label> = {
    model: ['โมเดล', 'Model'],
    inputTokens: ['input token', 'Input tokens'],
    cachedShare: ['สัดส่วน cached', 'Cached share'],
    outputTokens: ['output token', 'Output tokens'],
    credits: ['เครดิตที่หัก', 'Credits charged'],
    mix: ['สัดส่วนการใช้ (mix)', 'Usage mix'],
};

export const UNIT_LABELS: Record<keyof UnitCosts, Label> = {
    lawCredit: ['ต้นทุนเฉลี่ยต่อ 1 เครดิต AI ทนาย (ถ่วงตาม mix)', 'Avg cost per lawyer AI credit (mix-weighted)'],
    lawCreditMax: ['ต้นทุนสูงสุดต่อ 1 เครดิต AI ทนาย', 'Max cost per lawyer AI credit'],
    lawCreditsPerCall: ['เครดิตเฉลี่ยต่อการเรียก 1 ครั้ง (ทนาย)', 'Avg credits per lawyer call'],
    custCredit: ['ต้นทุนต่อ 1 เครดิต AI ลูกค้า', 'Cost per customer AI credit'],
    rag: ['RAG ต่อคำถาม (embed + ค้น Vectorize)', 'RAG per question (embed + Vectorize)'],
    cdScan: ['CapDeal: AI สแกน 1 ครั้ง', 'CapDeal: one AI scan'],
    cdDraft: ['CapDeal: ร่างสัญญา 1 ฉบับ', 'CapDeal: one contract draft'],
    witSet: ['Wittaya: ตรวจข้อสอบ 1 ชุด', 'Wittaya: grade one set'],
    witEssay: ['Wittaya: ตรวจข้อเขียน 1 ข้อ', 'Wittaya: grade one essay'],
    custFind: ['AI ค้นหาทนาย 1 ครั้ง', 'One AI lawyer search'],
    bizReview: ['Business: AI รีวิว 1 ครั้ง', 'Business: one AI review'],
    admin: ['admin: เรียก AI 1 ครั้ง', 'admin: one AI call'],
    lalin: ['Lalin: เรียก AI 1 ครั้ง', 'Lalin: one AI call'],
    ocrPage: ['OCR ข้อสอบ 1 หน้า', 'Exam OCR, 1 page'],
    examOcrSet: ['OCR ข้อสอบ 1 ชุด (20 หน้า) — ค่าใช้ครั้งเดียว', 'Exam OCR, 1 set (20 pages) — one-off'],
    sms: ['SMS OTP 1 ข้อความ', 'One SMS OTP'],
    invoice: ['ใบแจ้งหนี้ PDF 1 ใบ (เมื่อเกิน 10 ชม.ฟรี)', 'One invoice PDF (beyond 10 free hours)'],
    pay100: ['ค่าธรรมเนียมบัตรต่อยอด ฿100 (ไม่รวมค่าคงที่)', 'Card fee per ฿100 (excl. fixed fee)'],
};

export const VOLUME_LABELS: Record<keyof UsageVolumes, { label: Label; formula: Label }> = {
    lawCredits: { label: ['เครดิต AI ทนายที่ใช้', 'Lawyer AI credits used'], formula: ['(Pro × โควตา + Firm × โควตา) × สัดส่วนใช้', '(Pro × quota + Firm × quota) × usage'] },
    lawCalls: { label: ['ครั้งที่ทนายเรียก AI', 'Lawyer AI calls'], formula: ['เครดิต ÷ เครดิตเฉลี่ยต่อครั้ง', 'Credits ÷ avg credits per call'] },
    custCredits: { label: ['เครดิต AI ลูกค้าที่ใช้', 'Customer AI credits used'], formula: ['Free × เฉลี่ย + Plus × โควตา × สัดส่วนใช้', 'Free × avg + Plus × quota × usage'] },
    find: { label: ['AI ค้นหาทนาย', 'AI lawyer searches'], formula: ['ลูกค้า active × ครั้งต่อคน', 'Active customers × uses per person'] },
    cdContracts: { label: ['สัญญา CapDeal ที่สร้าง', 'CapDeal contracts created'], formula: ['จ่ายเงิน × โควตา × สัดส่วนใช้ + Free × ครึ่งโควตา', 'Paid × quota × usage + Free × half quota'] },
    cdScans: { label: ['AI สแกน CapDeal', 'CapDeal AI scans'], formula: ['สัญญา × สแกนต่อสัญญา', 'Contracts × scans per contract'] },
    witEssays: { label: ['ข้อเขียนที่ AI ตรวจ (Wittaya)', 'Essays graded (Wittaya)'], formula: ['(Free × ชุด + จ่ายเงิน × ชุด) × ข้อต่อชุด', '(Free × sets + paid × sets) × essays per set'] },
    bizReviews: { label: ['AI รีวิว Business', 'Business AI reviews'], formula: ['องค์กร × รีวิวต่อองค์กร', 'Orgs × reviews per org'] },
    rag: { label: ['คำถามที่ยิง RAG', 'RAG queries'], formula: ['AI ทนาย + ลูกค้า + CapDeal + Business', 'Lawyer + customer + CapDeal + Business AI'] },
    visitsAppHosting: { label: ['การเข้าชมเว็บบน App Hosting', 'Visits on App Hosting'], formula: ['lawslane + capdeal + business', 'lawslane + capdeal + business'] },
    visitsAll: { label: ['การเข้าชมทุกเว็บ', 'Visits, all sites'], formula: ['App Hosting + Wittaya + admin', 'App Hosting + Wittaya + admin'] },
    pageViews: { label: ['page view บน App Hosting', 'Page views on App Hosting'], formula: ['การเข้าชม × หน้าต่อครั้ง', 'Visits × pages per visit'] },
    vcpuSec: { label: ['vCPU-วินาที (App Hosting)', 'vCPU-seconds (App Hosting)'], formula: ['page view × เวลา ÷ concurrency × vCPU', 'Page views × time ÷ concurrency × vCPU'] },
    gibSec: { label: ['GiB-วินาที (App Hosting)', 'GiB-seconds (App Hosting)'], formula: ['page view × เวลา ÷ concurrency × GiB', 'Page views × time ÷ concurrency × GiB'] },
    egressGb: { label: ['ข้อมูลส่งออก GiB', 'Egress GiB'], formula: ['page view × MB ต่อหน้า ÷ 1024', 'Page views × MB per page ÷ 1024'] },
    fsReads: { label: ['Firestore reads', 'Firestore reads'], formula: ['การเข้าชมทุกเว็บ × reads ต่อครั้ง', 'All visits × reads per visit'] },
    fsWrites: { label: ['Firestore writes', 'Firestore writes'], formula: ['การเข้าชมทุกเว็บ × writes ต่อครั้ง', 'All visits × writes per visit'] },
    users: { label: ['ผู้ใช้ active รวม', 'Active users'], formula: ['ผลรวมผู้ใช้ทุกกลุ่ม', 'Sum of all user groups'] },
    paying: { label: ['บัญชีที่จ่ายเงิน', 'Paying accounts'], formula: ['ทุกแพลนเสียเงิน (รวม Business ร่าง)', 'All paid plans (incl. Business draft)'] },
    emails: { label: ['อีเมลที่ส่ง', 'Emails sent'], formula: ['ผู้ใช้ × อีเมลต่อคน', 'Users × emails per user'] },
    upstash: { label: ['คำสั่ง Upstash (rate limit)', 'Upstash commands (rate limit)'], formula: ['AI × 2 + page view หลัก', 'AI × 2 + main page views'] },
    imgDelivered: { label: ['รูปที่ส่งผ่าน Cloudflare Images', 'Images delivered'], formula: ['การเข้าชม × หน้า × 2 รูป', 'Visits × pages × 2 images'] },
};

export const FREE_TIER_LABELS: Record<FreeTier, Label> = {
    'lawyer.free': ['ทนาย Free', 'Lawyer Free'],
    'lawslane.free': ['ลูกค้า AI Free', 'Customer AI Free'],
    'capdeal.free': ['CapDeal Free', 'CapDeal Free'],
    'wittaya.free': ['Wittaya Free', 'Wittaya Free'],
};

// ---------------------------------------------------------------------------
// รายการช่องสมมติฐานทุกช่อง (path แบบ a.b.c)
// ---------------------------------------------------------------------------

/** path ของทุกช่องที่แก้ได้ในสมมติฐาน คั่นด้วย / (ชื่อโมเดลมีจุด) เช่น general/fx, scenarios/lawPro/1, models/gemini-2.5-flash/input */
export function assumptionLeafPaths(a: CostAssumptions = DEFAULT_COST_ASSUMPTIONS): string[] {
    const out: string[] = [];
    const walk = (v: unknown, path: string) => {
        if (Array.isArray(v)) {
            v.forEach((x, i) => walk(x, `${path}/${i}`));
            return;
        }
        if (v !== null && typeof v === 'object') {
            for (const k of Object.keys(v)) walk((v as any)[k], path ? `${path}/${k}` : k);
            return;
        }
        out.push(path);
    };
    walk(a, '');
    return out.filter((p) => {
        const [g, k, f] = p.split('/');
        return g !== 'aiCalls' || aiCallFieldEditable(k as keyof CostAssumptions['aiCalls'], f as AiField);
    });
}

type AiField = keyof typeof AI_FIELD_LABELS;
const LAW_CALLS = ['lawAsk', 'lawStatute', 'lawJudgment', 'lawAttach', 'lawDraft', 'lawContract'];

/** mix ใช้แค่แถวทนาย · เครดิตใช้แค่แถวทนายและลูกค้า (แถวอื่นไม่คิดเครดิต — ช่องจึงไม่แสดง) */
export function aiCallFieldEditable(k: keyof CostAssumptions['aiCalls'], f: AiField): boolean {
    if (f === 'mix') return LAW_CALLS.includes(k);
    if (f === 'credits') return LAW_CALLS.includes(k) || k === 'cust';
    return true;
}

/** สถานการณ์เก็บเป็น triple — ช่องในหน้าแก้ทีละคอลัมน์ แต่คำอธิบายใช้ร่วมกันทั้งแถว */
const rowPath = (path: string) => (path.startsWith('scenarios/') ? path.replace(/\/\d$/, '') : path);

export function assumptionTitle(path: string): Label {
    const [g, k, f] = path.split('/');
    const pick = (m: Record<string, Label>, key: string): Label => m[key] ?? [key, key];
    switch (g) {
        case 'general': return pick(GENERAL_LABELS, k);
        case 'beam': return pick(BEAM_LABELS, k);
        case 'quotas': return pick(QUOTA_LABELS, k);
        case 'business': return pick(BUSINESS_LABELS, k);
        case 'interpreter': return ['มูลค่างานล่ามเฉลี่ยต่อครั้ง (บาท)', 'Average interpreter job value (THB)'];
        case 'infra': return pick(INFRA_LABELS, k);
        case 'scenarios': {
            const l = pick(SCENARIO_FIELD_LABELS, k);
            return f === undefined ? l : [`${l[0]} · ${SCENARIO_LABELS[Number(f)]?.[0] ?? f}`, `${l[1]} · ${SCENARIO_LABELS[Number(f)]?.[1] ?? f}`];
        }
        case 'servicePrices': {
            const s = SERVICE_PRICE_INFO[k as keyof CostAssumptions['servicePrices']];
            return s ? [`${s.vendor} · ${s.label[0]} (${s.unit[0]})`, `${s.vendor} · ${s.label[1]} (${s.unit[1]})`] : [k, k];
        }
        case 'models': return [`${k} · ${f} (USD / ล้าน token)`, `${k} · ${f} (USD / M tokens)`];
        case 'aiCalls': {
            const c = pick(AI_CALL_LABELS, k);
            const fl = pick(AI_FIELD_LABELS, f);
            return [`${c[0]} · ${fl[0]}`, `${c[1]} · ${fl[1]}`];
        }
        case 'sharedOverride': {
            const s = SCENARIO_LABELS[Number(k)] ?? [k, k];
            return [`ใช้ยอดค่าส่วนกลางจริงแทน · ${s[0]}`, `Real shared bill override · ${s[1]}`];
        }
        default: return [path, path];
    }
}

type Doc3 = { what: Label; how: Label; when: Label };

/** คำอธิบายรายกลุ่ม (ช่องในกลุ่มใช้ร่วมกัน) */
const GROUP_DOCS: Record<string, Doc3> = {
    general: {
        what: ['ค่าพื้นฐานที่ใช้ทั้งโมเดล', 'Base values used across the model'],
        how: ['คูณเข้ากับต้นทุนหรือค่าธรรมเนียมในทุกตาราง', 'Multiplied into costs or fees in every table'],
        when: ['เมื่อค่าจริงเปลี่ยน', 'When the real-world value changes'],
    },
    beam: {
        what: ['อัตราค่าธรรมเนียมของ Beam (ก่อน VAT) ตามช่องทางจ่าย', 'Beam fee rates (before VAT) per payment method'],
        how: ['ยอดจ่ายครั้งเดียว × อัตรา × (1 + VAT) · กำไรคิดจากบัตร premium (แพงสุดในกรณีปกติ) และ PromptPay', 'One-time amount × rate × (1 + VAT) · profit uses premium card (worst normal case) and PromptPay'],
        when: ['เมื่อสัญญากับ Beam เปลี่ยน หรือ PromptPay เริ่มเก็บค่าธรรมเนียม', 'When the Beam contract changes or PromptPay starts charging'],
    },
    quotas: {
        what: ['โควตาที่แต่ละแพลนได้ต่อเดือน (ควรตรงกับโค้ดของเว็บ)', 'Monthly quota per plan (should match the site code)'],
        how: ['ต้นทุนเต็มโควตา = โควตา × ต้นทุนต่อหน่วย · ปริมาณใช้งาน = โควตา × สัดส่วนใช้', 'Full-quota cost = quota × unit cost · usage = quota × usage share'],
        when: ['เมื่อแก้โควตาในโค้ดของเว็บ (ช่องนี้ไม่เปลี่ยนโควตาจริง)', 'After the quota changes in the site code (this field does not change the real quota)'],
    },
    business: {
        what: ['ราคาแพลน Business ในแผนร่าง (ยังไม่มีระบบขาย)', 'Business plan prices from the draft plan (not sold yet)'],
        how: ['ใช้คิดรายได้ ค่าธรรมเนียม และ margin ของ Business (ร่าง)', 'Used for Business (draft) revenue, fees and margin'],
        when: ['เมื่อแผน Business เปลี่ยน', 'When the Business draft changes'],
    },
    interpreter: {
        what: ['มูลค่างานล่ามเฉลี่ยต่อครั้ง', 'Average interpreter job value'],
        how: ['GP = มูลค่า × GP% · ค่าธรรมเนียม Beam คิดจากยอดเต็ม', 'GP = value × GP% · Beam fee is on the full amount'],
        when: ['เมื่อมียอดจองจริงพอเอามาเฉลี่ย', 'Once there are enough real bookings to average'],
    },
    infra: {
        what: ['สมมติฐานการใช้ระบบต่อการเข้าชม/ต่อผู้ใช้ (เว็บ ฐานข้อมูล อีเมล AI ฝั่งระบบ)', 'Per-visit / per-user system usage assumptions (web, database, email, system-side AI)'],
        how: ['คูณกับจำนวนการเข้าชมหรือผู้ใช้ในแต่ละสถานการณ์ → ปริมาณใช้งาน → ค่ารันรายเดือน', 'Multiplied by visits or users per scenario → usage → monthly run cost'],
        when: ['เมื่อดู metrics จริงใน Firebase/Cloudflare แล้วต่างจากที่สมมติ', 'When real metrics in Firebase/Cloudflare differ from the assumption'],
    },
    scenarios: {
        what: ['จำนวนผู้ใช้และปริมาณต่อเดือนใน 3 สถานการณ์ (เริ่มต้น / เติบโต / ขยาย)', 'Users and monthly volumes in 3 scenarios (start / growth / scale)'],
        how: ['ปริมาณใช้งาน = จำนวน × โควตา/ค่าต่อหัว → ค่ารันรายเดือน → สรุปต่อเว็บ · บัญชีจ่ายเงินใช้หารค่าส่วนกลาง', 'Usage = counts × quotas/per-head → monthly run → per-site · paying accounts divide the shared cost'],
        when: ['ทุกเดือนหรือทุกไตรมาส ให้ใกล้ตัวเลขจริง / เป้าที่คาด', 'Monthly or quarterly, toward real numbers or targets'],
    },
    servicePrices: {
        what: ['ราคาประกาศ (list price) ของผู้ให้บริการ — USD เว้นแต่ระบุ', 'Vendor list prices — USD unless noted'],
        how: ['(ปริมาณ − โควตาฟรี) × ราคา × อัตราแลกเปลี่ยน → แถวในค่ารันรายเดือน', '(usage − free tier) × price × FX → monthly run rows'],
        when: ['เมื่อผู้ให้บริการเปลี่ยนราคา หรือตรวจแล้วต่าง (โดยเฉพาะแถว ⚠)', 'When the vendor changes prices or a check shows otherwise (especially ⚠ rows)'],
    },
    models: {
        what: ['ราคาโมเดล AI ต่อล้าน token (input / cached input / output รวม thinking)', 'AI model prices per M tokens (input / cached / output incl. thinking)'],
        how: ['ต้นทุนต่อการเรียก = token × ราคา ÷ 1 ล้าน × อัตราแลกเปลี่ยน', 'Cost per call = tokens × price ÷ 1M × FX'],
        when: ['เมื่อ Google/ผู้ให้บริการเปลี่ยนราคา', 'When Google or the provider changes prices'],
    },
    'aiCalls.model': {
        what: ['โมเดลที่งาน AI นี้ใช้', 'Which model this AI task uses'],
        how: ['ดึงราคาจากตารางราคาโมเดล', 'Price comes from the model price table'],
        when: ['เมื่อเปลี่ยนโมเดลในโค้ด', 'When the code switches models'],
    },
    'aiCalls.inputTokens': {
        what: ['token ที่ส่งเข้า AI ต่อครั้ง (prompt + RAG + ไฟล์)', 'Tokens sent per call (prompt + RAG + files)'],
        how: ['ยิ่งมาก ต้นทุนต่อครั้งยิ่งสูง', 'More tokens, higher cost per call'],
        when: ['เมื่อมีค่าเฉลี่ยจริงจาก aiUsageLogs', 'Once real averages from aiUsageLogs exist'],
    },
    'aiCalls.cachedShare': {
        what: ['สัดส่วน input ที่ได้ราคา cache (0–1)', 'Share of input billed at cached price (0–1)'],
        how: ['ส่วนที่ cache ใช้ราคา cached ที่ถูกกว่า', 'Cached part uses the cheaper cached price'],
        when: ['เมื่อรู้อัตรา cache hit จริง', 'When the real cache-hit rate is known'],
    },
    'aiCalls.outputTokens': {
        what: ['token ที่ AI ตอบต่อครั้ง (รวม thinking)', 'Tokens generated per call (incl. thinking)'],
        how: ['ราคา output แพงกว่า input หลายเท่า', 'Output is priced several times higher than input'],
        when: ['เมื่อมีค่าเฉลี่ยจริงจาก aiUsageLogs', 'Once real averages from aiUsageLogs exist'],
    },
    'aiCalls.credits': {
        what: ['เครดิตที่หักจากผู้ใช้ต่อครั้ง', 'Credits deducted from the user per call'],
        how: ['ต้นทุนต่อเครดิต = ต้นทุนต่อครั้ง ÷ เครดิต', 'Cost per credit = cost per call ÷ credits'],
        when: ['เมื่อแก้อัตราหักเครดิตในโค้ด (ช่องนี้ไม่เปลี่ยนของจริง)', 'After the code changes credit charging (this field does not)'],
    },
    'aiCalls.mix': {
        what: ['สัดส่วนที่ทนายใช้งานแต่ละแบบ', 'How often lawyers use each task type'],
        how: ['ใช้ถ่วงน้ำหนักต้นทุนเฉลี่ยต่อเครดิตทนาย', 'Weights the average cost per lawyer credit'],
        when: ['เมื่อมีสถิติการใช้จริง', 'When real usage stats exist'],
    },
    sharedOverride: {
        what: ['ยอดค่าส่วนกลางจริงจากบิล (บาท/เดือน) ใช้แทนค่าที่คำนวณ', 'Real shared-infra bill (THB/mo) replacing the estimate'],
        how: ['ถ้าใส่ ระบบใช้ยอดนี้แทนผลรวมแถวส่วนกลาง (ปันต่อเว็บและต่อบัญชีจากยอดนี้) · เว้นว่าง = ใช้ค่าที่คำนวณ', 'If set, replaces the sum of shared rows (per-site and per-account share use it) · blank = estimate'],
        when: ['ทุกเดือนหลังได้บิล Google Cloud / Cloudflare / Vercel / Resend / Upstash', 'Monthly, after the Google Cloud / Cloudflare / Vercel / Resend / Upstash bills arrive'],
    },
};

/** ช่องที่มีคำอธิบายเฉพาะ (ทับคำอธิบายกลุ่ม) */
const FIELD_DOCS: Record<string, Partial<Doc3>> = {
    'general/fx': {
        what: ['อัตราแลกเปลี่ยนบาทต่อ 1 USD', 'Baht per 1 USD'],
        how: ['แปลงราคา USD ทุกรายการ (AI, Cloud) เป็นบาท', 'Converts every USD price (AI, cloud) to baht'],
        when: ['เดือนละครั้ง หรือเมื่อค่าเงินขยับมาก', 'Monthly, or when the rate moves a lot'],
    },
    'general/targetMargin': {
        what: ['กำไรขั้นต้นที่อยากได้ (0.8 = 80%)', 'Desired gross margin (0.8 = 80%)'],
        how: ['ใช้คำนวณ "ราคาต่ำสุดตามเป้า" ของทุกแพลนและของจ่ายครั้งเดียว', 'Used for the "min price for target" of every plan and one-time item'],
        when: ['เมื่อเปลี่ยนนโยบายราคา', 'When pricing policy changes'],
    },
    'general/avgUsage': {
        what: ['ลูกค้าจ่ายเงินใช้โควตาเฉลี่ยกี่ส่วน (0–1)', 'Average share of quota paying users consume (0–1)'],
        how: ['ต้นทุนเฉลี่ย = ต้นทุนเต็มโควตา × ค่านี้ → กำไร "ใช้เฉลี่ย"', 'Average cost = full-quota cost × this → "average use" profit'],
        when: ['เมื่อมีสถิติการใช้จริง', 'When real usage stats exist'],
    },
    'general/marginScenario': {
        what: ['สถานการณ์ที่ใช้ปันค่าส่วนกลางให้แต่ละบัญชี', 'Scenario used to share infra across paying accounts'],
        how: ['ค่าส่วนกลางต่อบัญชี = ค่าส่วนกลาง ÷ บัญชีจ่ายเงิน ของสถานการณ์นี้ · เปลี่ยนจากตัวเลือกด้านบนได้', 'Infra per account = shared ÷ paying accounts of this scenario · also set from the selector at the top'],
        when: ['เลือกสถานการณ์ที่ใกล้ความจริงที่สุด', 'Pick the scenario closest to reality'],
    },
    'general/vatOnFees': {
        what: ['VAT ที่จ่ายบนค่าธรรมเนียม Stripe/Beam', 'VAT paid on Stripe/Beam fees'],
        how: ['ค่าธรรมเนียม × (1 + VAT) · ตั้ง 0 เพื่อเทียบตัวเลขกับไฟล์ Excel', 'Fee × (1 + VAT) · set 0 to compare with the Excel file'],
        when: ['เมื่ออัตรา VAT เปลี่ยน', 'When the VAT rate changes'],
    },
    'general/cardPct': { what: ['ค่าธรรมเนียมบัตรในประเทศของ Stripe (สัดส่วนของยอด)', 'Stripe domestic card fee (share of amount)'], when: ['เมื่อ Stripe เปลี่ยนราคา', 'When Stripe changes pricing'] },
    'general/cardFixed': { what: ['ค่าธรรมเนียมคงที่ต่อรายการของ Stripe (บาท)', 'Stripe fixed fee per charge (THB)'], when: ['เมื่อ Stripe เปลี่ยนราคา', 'When Stripe changes pricing'] },
    'general/billingPct': { what: ['ค่า Stripe Billing สำหรับแพลนรายเดือน', 'Stripe Billing fee for subscriptions'], when: ['เมื่อ Stripe เปลี่ยนราคา', 'When Stripe changes pricing'] },
    'beam/premiumPct': { how: ['ใช้คิดกำไรกรณีบัตร premium ของแพ็กเครดิต E-Book และงานล่าม', 'Used for premium-card profit on credit packs, E-Book and interpreter jobs'] },
    'beam/promptpayPct': { how: ['ใช้คิดกำไรกรณีจ่าย PromptPay (ตอนนี้ฟรี)', 'Used for PromptPay profit (currently free)'] },
    'beam/cardPct': { how: ['เก็บไว้อ้างอิง — ตอนนี้ยังไม่มีตัวเลขไหนใช้ (กำไรคิดจากบัตร premium)', 'Reference only — no figure uses it yet (profit uses premium card)'] },
    'beam/intlPct': { how: ['เก็บไว้อ้างอิง — ตอนนี้ยังไม่มีตัวเลขไหนใช้', 'Reference only — no figure uses it yet'] },
    'beam/amexPct': { how: ['เก็บไว้อ้างอิง — ตอนนี้ยังไม่มีตัวเลขไหนใช้', 'Reference only — no figure uses it yet'] },
    'beam/ewalletPct': { how: ['เก็บไว้อ้างอิง — ตอนนี้ยังไม่มีตัวเลขไหนใช้', 'Reference only — no figure uses it yet'] },
};

/** ช่องที่ตั้งใจให้ไม่กระทบตัวเลขใด (เก็บไว้อ้างอิง) — ใช้ในเทสต์ */
export const REFERENCE_ONLY_PATHS = ['beam/cardPct', 'beam/intlPct', 'beam/amexPct', 'beam/ewalletPct'];

function groupKey(path: string): string {
    const parts = path.split('/');
    if (parts[0] === 'aiCalls') return `aiCalls.${parts[2]}`;
    return parts[0];
}

/** คำอธิบาย 3 ส่วน (คืออะไร/ทำงานยังไง/ควรแก้เมื่อไร) ของช่องสมมติฐาน · null = ไม่รู้จัก */
export function assumptionDoc3(path: string): Doc3 | null {
    const g = GROUP_DOCS[groupKey(path)];
    if (!g) return null;
    const f = FIELD_DOCS[rowPath(path)] ?? {};
    const sp = path.startsWith('servicePrices/') ? SERVICE_PRICE_INFO[path.split('/')[1] as keyof CostAssumptions['servicePrices']] : null;
    const what: Label = f.what ?? (sp ? [`${g.what[0]} · ${sp.source}`, `${g.what[1]} · ${sp.source}`] : g.what);
    return { what, how: f.how ?? g.how, when: f.when ?? g.when };
}

// ---------------------------------------------------------------------------
// หาว่าตัวเลขไหนขยับ (จากโมเดลจริง)
// ---------------------------------------------------------------------------

type Section = 'unit' | 'volume' | 'run' | 'site' | 'margin' | 'oneTime' | 'interpreter';

export const SECTION_LABELS: Record<Section, Label> = {
    unit: ['ต้นทุนระบบ › ต้นทุนต่อหน่วย', 'System costs › Unit costs'],
    volume: ['ต้นทุนระบบ › ปริมาณใช้งาน', 'System costs › Usage volumes'],
    run: ['ต้นทุนระบบ › ค่ารันรายเดือน', 'System costs › Monthly run cost'],
    site: ['ต้นทุนระบบ › สรุปต่อเว็บ (+ ภาพรวม)', 'System costs › Per-site summary (+ overview)'],
    margin: ['กำไรใต้ช่องราคา + ต้นทุนระบบ › Margin ต่อแพลน', 'Profit under each price + System costs › Plan margins'],
    oneTime: ['ตั้งราคา › จ่ายครั้งเดียว (แพ็กเครดิต AI / E-Book)', 'Set prices › One-time (AI credit packs / E-Book)'],
    interpreter: ['ตั้งราคา › GP ล่าม (เหลือจริงต่องาน)', 'Set prices › Interpreter GP (net per job)'],
};

type Snap = Map<string, { section: Section; item: Label; value: number }>;

function snapshot(a: CostAssumptions, run: RunContext): Snap {
    const out: Snap = new Map();
    const put = (key: string, section: Section, item: Label, value: number) => out.set(key, { section, item, value });
    const u = unitCosts(a);
    for (const k of Object.keys(u) as (keyof UnitCosts)[]) put(`unit.${k}`, 'unit', UNIT_LABELS[k], u[k]);
    for (const i of [0, 1, 2] as const) {
        const v = usageVolumes(a, i, u);
        for (const k of Object.keys(v) as (keyof UsageVolumes)[]) put(`vol.${k}.${i}`, 'volume', VOLUME_LABELS[k].label, v[k]);
    }
    const m = monthlyRun(a, run);
    for (const r of m.rows) {
        const site = RUN_SITE_LABELS[r.site];
        r.amounts.forEach((x, i) => put(`run.${r.key}.${i}`, 'run', [`${r.service[0]} (${site[0]})`, `${r.service[1]} (${site[1]})`], x));
    }
    m.shared.forEach((x, i) => put(`run.sharedUsed.${i}`, 'run', ['ส่วนกลางที่ใช้', 'Shared used'], x));
    const s = siteSummary(a, run, m);
    for (const r of s.sites) {
        r.withShared.forEach((x, i) => put(`site.${r.site}.cost.${i}`, 'site', RUN_SITE_LABELS[r.site], x));
        r.revenue.forEach((x, i) => put(`site.${r.site}.rev.${i}`, 'site', RUN_SITE_LABELS[r.site], x));
    }
    for (const r of marginTable(a, run)) {
        const e = r.e;
        [e.fullCost, e.avgCost, e.fee, e.infra, e.profitFull, e.profitAvg, e.minPrice ?? -1]
            .forEach((x, j) => put(`margin.${r.tier}.${j}`, 'margin', TIER_LABELS[r.tier], x));
    }
    for (const t of Object.keys(FREE_TIER_LABELS) as FreeTier[]) put(`margin.${t}`, 'margin', FREE_TIER_LABELS[t], freeTierCost(a, t, u));
    const cp = creditPackEconomics(a, 100, 99);
    [cp.cost, cp.feeCard, cp.feePromptpay, cp.minPrice ?? -1].forEach((x, j) => put(`one.credit.${j}`, 'oneTime', ['แพ็กเครดิต AI', 'AI credit packs'], x));
    const eb = oneTimeEconomics(a, 199);
    [eb.feeCard, eb.feePromptpay, eb.profitCard].forEach((x, j) => put(`one.ebook.${j}`, 'oneTime', ['E-Book', 'E-Book'], x));
    const ie = interpreterEconomics(a, run.gpPercent);
    [ie.gp, ie.feeCard, ie.feePromptpay].forEach((x, j) => put(`interp.${j}`, 'interpreter', ['GP ล่าม', 'Interpreter GP'], x));
    return out;
}

const differs = (x: number, y: number) => Math.abs(x - y) > 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));

const SECTION_ORDER: Section[] = ['unit', 'volume', 'run', 'site', 'margin', 'oneTime', 'interpreter'];

/** รวมรายการที่ขยับเป็นบรรทัดสรุปต่อส่วน */
function summarize(changed: Map<Section, Label[]>, maxItems = 5): Label[] {
    const out: Label[] = [];
    for (const sec of SECTION_ORDER) {
        const items = changed.get(sec);
        if (!items?.length) continue;
        const uniq: Label[] = [];
        const seen = new Set<string>();
        for (const it of items) if (!seen.has(it[0])) { seen.add(it[0]); uniq.push(it); }
        const shown = uniq.slice(0, maxItems);
        const more = uniq.length - shown.length;
        out.push([
            `${SECTION_LABELS[sec][0]}: ${shown.map((x) => x[0]).join(', ')}${more > 0 ? ` และอีก ${more} รายการ` : ''}`,
            `${SECTION_LABELS[sec][1]}: ${shown.map((x) => x[1]).join(', ')}${more > 0 ? ` and ${more} more` : ''}`,
        ]);
    }
    return out;
}

function diffSnaps(before: Snap, after: Snap, into: Map<Section, Label[]>) {
    for (const [k, b] of before) {
        const x = after.get(k);
        if (x && differs(b.value, x.value)) {
            const list = into.get(b.section) ?? [];
            list.push(b.item);
            into.set(b.section, list);
        }
    }
}

/** ตัวเลขที่ต่างกันระหว่างสมมติฐาน 2 ชุด (ใช้ในกล่องยืนยันก่อนบันทึก) */
export function diffAffects(before: CostAssumptions, after: CostAssumptions, run: RunContext = DEFAULT_RUN_CONTEXT): Label[] {
    const changed = new Map<Section, Label[]>();
    diffSnaps(snapshot(before, run), snapshot(after, run), changed);
    return summarize(changed);
}

function getAt(obj: any, parts: string[]): any {
    return parts.reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setAt(obj: any, parts: string[], value: unknown): any {
    const clone = Array.isArray(obj) ? [...obj] : { ...obj };
    const [h, ...rest] = parts;
    clone[h] = rest.length ? setAt(clone[h], rest, value) : value;
    return clone;
}

/** ค่าที่ลองเปลี่ยน: ชื่อโมเดลสลับเป็นโมเดลราคาต่างกัน · สถานการณ์ปันส่วนกลางสลับ · ตัวเลขอื่นลดครึ่ง (0 → 1) */
function perturb(path: string, v: unknown, a: CostAssumptions): unknown {
    if (path.endsWith('/model')) {
        const cur = a.models[v as string];
        return Object.keys(a.models).find((m) => {
            const x = a.models[m];
            return cur && (x.input !== cur.input || x.output !== cur.output);
        }) ?? v;
    }
    if (path === 'general/marginScenario') return v === 1 ? 3 : 1;
    if (path.startsWith('sharedOverride/')) return typeof v === 'number' ? v * 0.5 : 100_000;
    return typeof v === 'number' && v > 0 ? v * 0.5 : 1;
}

/** ฐานที่ขยายผู้ใช้/ปริมาณ ×1000 ให้เกินโควตาฟรีทุกตัว (เพื่อเห็นผลของราคาบริการแม้ตอนนี้ยังอยู่ในโควตาฟรี) */
function stressed(a: CostAssumptions): CostAssumptions {
    const scenarios = { ...a.scenarios };
    for (const k of Object.keys(scenarios) as (keyof CostAssumptions['scenarios'])[]) {
        if (k === 'usage' || k === 'custFreeCredits' || k === 'cdScansPerContract' || k === 'findPerUser') continue;
        scenarios[k] = scenarios[k].map((x) => Math.max(x, 1) * 1000) as CostAssumptions['scenarios'][typeof k];
    }
    return { ...a, scenarios };
}

/**
 * ตัวเลขในหน้าที่ขยับเมื่อแก้ช่องนี้ — ลองเปลี่ยนค่าจริงในโมเดล ทั้งบนค่าปัจจุบันและฐานที่ขยายปริมาณ
 * (ช่องสถานการณ์ = ทั้งแถว 3 คอลัมน์)
 */
export function deriveAffects(path: string, a: CostAssumptions = DEFAULT_COST_ASSUMPTIONS, run: RunContext = DEFAULT_RUN_CONTEXT): Label[] {
    const changed = new Map<Section, Label[]>();
    const keep = path.startsWith('sharedOverride/');
    const plain: CostAssumptions = keep ? a : { ...a, sharedOverride: [null, null, null] };
    const paths = path.startsWith('scenarios/') && path.split('/').length === 2 ? [0, 1, 2].map((i) => `${path}/${i}`) : [path];
    for (const base of [plain, stressed(plain)]) {
        const before = snapshot(base, run);
        let mod = base;
        for (const p of paths) {
            const parts = p.split('/');
            mod = setAt(mod, parts, perturb(p, getAt(base, parts), base));
        }
        diffSnaps(before, snapshot(mod, run), changed);
    }
    return summarize(changed);
}

/** คำอธิบายเต็มของช่องสมมติฐาน (affects หาจากโมเดล) */
export function assumptionFieldDoc(path: string, a: CostAssumptions = DEFAULT_COST_ASSUMPTIONS, run: RunContext = DEFAULT_RUN_CONTEXT): FieldDoc | null {
    const d = assumptionDoc3(path);
    if (!d) return null;
    const affects = deriveAffects(rowPath(path), a, run);
    return {
        title: assumptionTitle(rowPath(path)),
        ...d,
        affects: affects.length ? affects : [['ตอนนี้ยังไม่มีตัวเลขไหนในหน้าใช้ค่านี้ (เก็บไว้อ้างอิง)', 'No figure on the page uses this yet (reference only)']],
        live: 'estimate',
        liveDetail: ['ใช้คิดตัวเลขในหน้านี้เท่านั้น ไม่เปลี่ยนราคา ไม่เปลี่ยนโควตา ไม่มีผลกับลูกค้า', 'Only used for estimates on this page — no price, quota or customer is affected'],
    };
}

/** กลุ่มสมมติฐาน (หัวข้อในตัวแก้) → คำอธิบายรวมของกลุ่ม (คิดจากค่าเริ่มต้นครั้งเดียวแล้วจำไว้) */
const groupDocCache = new Map<string, FieldDoc | null>();

export function assumptionGroupDoc(group: string): FieldDoc | null {
    if (!groupDocCache.has(group)) groupDocCache.set(group, buildGroupDoc(group));
    return groupDocCache.get(group) ?? null;
}

function buildGroupDoc(group: string): FieldDoc | null {
    const g = GROUP_DOCS[group];
    if (!g) return null;
    const sample = assumptionLeafPaths().filter((p) => groupKey(p) === group || p.startsWith(`${group}/`));
    const changed = new Map<Section, Label[]>();
    for (const p of sample) {
        for (const l of deriveAffects(rowPath(p))) {
            const sec = (Object.keys(SECTION_LABELS) as Section[]).find((s) => l[0].startsWith(SECTION_LABELS[s][0]));
            if (sec) changed.set(sec, [...(changed.get(sec) ?? []), SECTION_LABELS[sec]]);
        }
    }
    const secs = SECTION_ORDER.filter((s) => changed.has(s)).map((s) => SECTION_LABELS[s]);
    return {
        title: [group, group], ...g,
        affects: secs.length ? secs : [['ไม่มี', 'None']],
        live: 'estimate',
        liveDetail: ['ใช้คิดตัวเลขในหน้านี้เท่านั้น ไม่มีผลกับลูกค้า', 'Only used for estimates on this page — no customer is affected'],
    };
}

// ---------------------------------------------------------------------------
// สินค้า/ราคาในแท็บ "ตั้งราคา": บริการนี้คืออะไร + ราคานี้แสดงที่ไหน
// (ตรวจจาก origin/main ของ Lawslane 909cf9a, lawslane-capdeal 828dd31, lawlanes-education 2c6915d — 2026-10-13)
// ---------------------------------------------------------------------------

export const SITE_URLS = {
    lawslane: 'https://www.lawslane.com',
    capdeal: 'https://capdeal.lawslane.com',
    wittaya: 'https://wittaya.lawslane.com',
} as const;

export type ShownAt = { label: Label; url: string; note?: Label };

export type ProductDoc = {
    title: Label;
    /** บริการนี้คืออะไร (ลูกค้าได้อะไร) */
    about: Label;
    /** หน้าที่แสดงหรือเก็บเงินราคานี้ */
    shownAt: ShownAt[];
    /** true = ยังไม่แสดงบนเว็บที่ไหนเลย */
    notShownYet?: boolean;
};

const HARDCODED: Label = ['ตอนนี้ยังเป็นราคาที่เขียนไว้ในโค้ด ไม่ได้อ่านจากหน้านี้', 'Currently a price hard-coded in the site, not read from this page'];
const CENTRAL: Label = ['อ่านราคาจากหน้านี้ (planPricing) · ไม่มีเอกสารใช้ราคาเดิมในโค้ด', 'Reads the price from this page (planPricing) · falls back to the coded price'];

const capdealShown: ShownAt[] = [
    { label: ['หน้าราคาแพ็กเกจ CapDeal', 'CapDeal pricing page'], url: `${SITE_URLS.capdeal}/th/pricing`, note: CENTRAL },
    { label: ['หน้าแรก CapDeal (การ์ดราคา)', 'CapDeal home (price cards)'], url: `${SITE_URLS.capdeal}/th`, note: CENTRAL },
    { label: ['ชำระเงิน (ส่งต่อไป Stripe Checkout)', 'Checkout (redirects to Stripe)'], url: `${SITE_URLS.capdeal}/th/checkout`, note: ['เก็บเงินตาม Price ID ใน planPricing/capdeal', 'Charges the Price ID stored in planPricing/capdeal'] },
];
const lawyerShown: ShownAt[] = [
    { label: ['แดชบอร์ดทนาย › แพลน (ต้องล็อกอินเป็นทนาย)', 'Lawyer dashboard › Plan (lawyer login)'], url: `${SITE_URLS.lawslane}/th/lawyer-dashboard/plan`, note: ['แสดงยอดจาก planPricing/lawyer แล้วเก็บเงินผ่าน Stripe Checkout', 'Shows the amount from planPricing/lawyer and charges via Stripe Checkout'] },
];
const wittayaShown: ShownAt[] = [
    { label: ['หน้าราคา Wittaya', 'Wittaya pricing page'], url: `${SITE_URLS.wittaya}/pricing`, note: HARDCODED },
];

export const PRODUCT_DOCS: Record<string, ProductDoc> = {
    'capdeal.lite': {
        title: ['CapDeal Lite', 'CapDeal Lite'],
        about: ['ให้ AI อ่านแคปแชท (LINE/Messenger) แล้วทำสัญญาพร้อม PDF ได้ 30 ฉบับ/เดือน และ AI สแกน 90 ครั้ง ไม่มีลายน้ำ แนบเอกสารท้ายสัญญาได้', 'AI turns chat screenshots (LINE/Messenger) into contracts with PDF: 30 contracts/mo, 90 AI scans, no watermark, attachments allowed'],
        shownAt: capdealShown,
    },
    'capdeal.pro': {
        title: ['CapDeal Pro', 'CapDeal Pro'],
        about: ['เหมือน Lite แต่ทำสัญญาได้ 100 ฉบับ/เดือน และ AI สแกน 300 ครั้ง สำหรับคนที่ทำสัญญาบ่อย/หลายคู่สัญญา', 'Like Lite with 100 contracts/mo and 300 AI scans, for frequent users with many counterparties'],
        shownAt: capdealShown,
    },
    'capdeal.scale': {
        title: ['CapDeal Scale', 'CapDeal Scale'],
        about: ['สำหรับทีม/องค์กร ทำสัญญาได้ 1,000 ฉบับ/เดือน และ AI สแกน 3,000 ครั้ง', 'For teams/organisations: 1,000 contracts/mo and 3,000 AI scans'],
        shownAt: capdealShown,
    },
    'lawyer.pro': {
        title: ['ทนาย Pro', 'Lawyer Pro'],
        about: ['ทนายได้ผู้ช่วย AI งานคดี 300 เครดิต/เดือน (ถามกฎหมาย/ค้นตัวบท/ฎีกา 1 เครดิต, ร่างเอกสาร/ตรวจสัญญา 2 เครดิต) พร้อมจัดการคดีและใบแจ้งหนี้', 'Lawyers get a legal AI assistant with 300 credits/mo (ask/statute/judgment 1 credit, draft/contract review 2) plus case and invoice tools'],
        shownAt: lawyerShown,
    },
    'lawyer.top': {
        title: ['ทนาย บริษัท (Firm)', 'Lawyer Firm'],
        about: ['ทุกอย่างใน Pro พร้อมเครดิต AI 1,000 เครดิต/เดือน ป้ายทนายแนะนำ และอยู่ลำดับสูงในรายชื่อทนาย', 'Everything in Pro with 1,000 AI credits/mo, a recommended badge and higher listing rank'],
        shownAt: lawyerShown,
    },
    'wittaya.premium': {
        title: ['Wittaya Premium', 'Wittaya Premium'],
        about: ['ทำข้อสอบได้ไม่จำกัด (Free ได้ 3 ชุด/วัน) ไม่มีโฆษณา และให้ AI ตรวจข้อเขียน · ยังไม่มีระบบรับเงิน แอดมินให้สิทธิ์เองเท่านั้น', 'Unlimited practice exams (Free: 3/day), no ads, AI essay grading · no payment yet; admins grant it manually'],
        shownAt: [...wittayaShown, { label: ['กล่องชวนอัปเกรด (paywall) ในหน้าทำข้อสอบ', 'Upgrade paywall on exam pages'], url: `${SITE_URLS.wittaya}/pricing`, note: ['paywall แสดง "฿199/เดือน" ที่เขียนไว้ในโค้ด (ไม่มีหน้าแยก ลิงก์นี้คือหน้าราคา)', 'The paywall shows a hard-coded "฿199/month" (no own page; link goes to pricing)'] }],
    },
    'wittaya.pro': {
        title: ['Wittaya Pro', 'Wittaya Pro'],
        about: ['ทุกอย่างใน Premium พร้อมดาวน์โหลด E-Book รวมข้อสอบฟรี 3 เล่ม/สัปดาห์ · ยังไม่มีระบบรับเงิน แอดมินให้สิทธิ์เองเท่านั้น', 'Everything in Premium plus 3 free exam E-Books per week · no payment yet; admins grant it manually'],
        shownAt: wittayaShown,
    },
    'lawslane.plus': {
        title: ['ลูกค้า AI Plus', 'Customer AI Plus'],
        about: ['แพ็กเกจ AI กฎหมายสำหรับลูกค้าทั่วไป: Plus ได้ 200 เครดิต/เดือน (Free ได้ 20) · ยังไม่มีระบบรับเงินและยังไม่ตั้งราคา', 'Legal AI for the public: Plus gets 200 credits/mo (Free gets 20) · no payment or price yet'],
        shownAt: [],
        notShownYet: true,
    },
    aiCredits: {
        title: ['แพ็กเครดิต AI', 'AI credit packs'],
        about: ['เครดิต AI แบบซื้อครั้งเดียว (ผ่าน Beam) เติมเข้ากระเป๋าเครดิตเสริม ไม่หมดอายุรายเดือน ใช้ต่อเมื่อเครดิตรายเดือนหมด · ยังไม่มีปุ่มซื้อบนเว็บ', 'One-time AI credits (via Beam) added to an extra wallet that does not reset monthly, used after monthly credits run out · no buy button yet'],
        shownAt: [],
        notShownYet: true,
    },
    ebook: {
        title: ['E-Book และค่าส่งหนังสือ', 'E-Book & book shipping'],
        about: ['E-Book รวมข้อสอบเป็นไฟล์ดาวน์โหลดใส่ลายน้ำ (สมาชิก Wittaya Pro โหลดฟรี 3 เล่ม/สัปดาห์) และหนังสือเล่มที่ส่งตามที่อยู่ · ตอนนี้ยังไม่เก็บค่าส่ง', 'Watermarked downloadable exam E-Books (Wittaya Pro: 3 free per week) and printed books shipped to an address · no shipping fee charged yet'],
        shownAt: [
            { label: ['ร้านหนังสือ Wittaya', 'Wittaya bookstore'], url: `${SITE_URLS.wittaya}/books`, note: ['ราคาแต่ละเล่มมาจากข้อมูลหนังสือ (books.price) ไม่ได้อ่านจากหน้านี้', 'Each book price comes from its book record (books.price), not this page'] },
            { label: ['ชำระเงิน (โอน + แนบสลิป)', 'Checkout (bank transfer + slip)'], url: `${SITE_URLS.wittaya}/checkout`, note: ['ยอดรวมจากราคาหนังสือในตะกร้า ยังไม่รวมค่าส่ง', 'Total from cart book prices; no shipping fee yet'] },
            { label: ['ดาวน์โหลด E-Book (ข้อความ "199 บาท")', 'E-Book download ("199 baht" message)'], url: `${SITE_URLS.wittaya}/books`, note: HARDCODED },
        ],
    },
    interpreterGp: {
        title: ['GP งานล่าม', 'Interpreter GP'],
        about: ['ส่วนแบ่งที่แพลตฟอร์มหักจากค่าจ้างล่ามแต่ละงาน (ค่าเริ่มต้น 15%, ตั้งได้ 0–50%) ล่ามได้ยอดเต็ม − GP · ลูกค้าจ่ายตามเรทที่ล่ามตั้งเอง', 'The platform cut on each interpreter job (default 15%, 0–50%); the interpreter gets the gross minus GP · customers pay the interpreter’s own rates'],
        shownAt: [
            { label: ['แดชบอร์ดล่าม (ล่ามเห็น % GP)', 'Interpreter dashboard (shows GP %)'], url: `${SITE_URLS.lawslane}/th/interpreter-dashboard`, note: ['อ่านค่า GP จากหน้านี้ (settings/interpreterFees)', 'Reads GP from this page (settings/interpreterFees)'] },
            { label: ['รายชื่อล่าม → โปรไฟล์ → จองล่าม', 'Interpreters → profile → booking'], url: `${SITE_URLS.lawslane}/th/interpreters`, note: ['ลูกค้าเห็นเรทของล่าม (ไม่เห็น GP) · ระบบหัก GP ตอนคิดยอดจอง', 'Customers see the interpreter rates (not GP) · GP is deducted when the booking is quoted'] },
        ],
    },
};

// ---------------------------------------------------------------------------
// ช่องในแท็บ "ตั้งราคา" (ไม่ใช่สมมติฐาน) — คำอธิบาย + ผลจริง (เขียนมือ)
// ---------------------------------------------------------------------------

const PRICE_AFFECTS: Label[] = [
    ['ตัวเลขกำไร/ราคาต่ำสุดใต้ช่องราคา (ทันทีที่พิมพ์)', 'Profit / min price under the field (as you type)'],
    ['หลังบันทึก: ต้นทุนระบบ › Margin ต่อแพลน, สรุปต่อเว็บ (รายได้/กำไร), ค่ารันรายเดือน (แถวค่าธรรมเนียมรับเงิน), ภาพรวม', 'After saving: System costs › Plan margins, per-site revenue/profit, monthly run (payment fee rows), overview'],
];

const stripeDoc = (product: string, plan: string): FieldDoc => ({
    title: PRODUCT_DOCS[`${product}.${plan}`].title,
    what: ['ราคาที่ลูกค้าจ่ายต่อเดือน/ต่อปี (บาท) · ช่องว่าง = ไม่ขายรอบบิลนั้น', 'Price customers pay per month/year (THB) · blank = interval not sold'],
    how: ['บันทึกแล้วระบบสร้าง Price ใหม่ใน Stripe เก็บใน planPricing แล้วเว็บอ่านไปแสดงและเก็บเงิน', 'Saving creates a new Stripe Price, stores it in planPricing, and the site reads it to display and charge'],
    when: ['เมื่อเปลี่ยนนโยบายราคา หรือราคาต่ำกว่า "ราคาต่ำสุดตามเป้า"', 'When pricing policy changes or the price is below the "min price for target"'],
    affects: PRICE_AFFECTS,
    live: 'live',
    liveDetail: ['บันทึกผ่าน Stripe: สร้าง Price ใหม่ · คนสมัครใหม่จ่ายราคาใหม่ทันที · สมาชิกเดิมจ่ายราคาเดิมจนกว่าจะเปลี่ยนแพลน · Price เก่าถูกปิดขาย · อัปเดตหน้า Customer Portal', 'Stripe save: new Price · new sign-ups pay it immediately · existing subscribers keep the old price until they change plan · old Price archived · Customer Portal updated'],
});

const storedPriceDoc = (product: string, plan: string): FieldDoc => ({
    title: PRODUCT_DOCS[`${product}.${plan}`].title,
    what: ['ราคาที่ตั้งใจจะขาย (บาท) บันทึกไว้ก่อนเปิดระบบรับเงิน', 'Intended price (THB), stored before payments open'],
    how: ['เก็บลง Firestore เท่านั้น ไม่สร้างอะไรใน Stripe · ใช้คิดกำไรในหน้านี้', 'Stored in Firestore only; nothing created in Stripe · used for the margins on this page'],
    when: ['เมื่อวางแผนราคาก่อนเปิดขาย', 'When planning prices before launch'],
    affects: PRICE_AFFECTS,
    live: 'stored',
    liveDetail: ['เว็บยังไม่อ่านค่านี้ — ลูกค้ายังไม่เห็นและไม่มีการเก็บเงิน', 'Sites do not read it yet — customers neither see nor pay it'],
});

const draftDoc = (product: 'capdeal' | 'lawyer'): FieldDoc => ({
    title: [`ราคาร่าง ${product === 'capdeal' ? 'CapDeal' : 'ทนาย'}`, `${product === 'capdeal' ? 'CapDeal' : 'Lawyer'} draft prices`],
    what: ['ราคาที่จดไว้ระหว่างยังบันทึกผ่าน Stripe ไม่ได้', 'Prices noted while Stripe saving is locked'],
    how: ['เก็บในฟิลด์ draft · เมื่อเปิดบันทึกผ่าน Stripe ช่องราคาเติมจากร่าง แล้วกดบันทึกจริงอีกครั้ง', 'Stored in the draft field · once Stripe saving opens, the fields prefill from it and you save for real'],
    when: ['ตอนตัดสินใจราคาใหม่แล้วแต่ Stripe ยังไม่พร้อม', 'When a new price is decided but Stripe is not ready'],
    affects: [['ตัวเลขกำไรใต้ช่องราคา (ร่างที่พิมพ์อยู่)', 'Profit figures under the fields (the typed draft)']],
    live: 'stored',
    liveDetail: ['ไม่มีผลกับเว็บ — เว็บยังแสดงและเก็บเงินราคาเดิม', 'No effect — the site keeps showing and charging the current price'],
});

export const PRICE_FIELD_DOCS: Record<string, FieldDoc> = {
    'price.capdeal.lite': stripeDoc('capdeal', 'lite'),
    'price.capdeal.pro': stripeDoc('capdeal', 'pro'),
    'price.capdeal.scale': stripeDoc('capdeal', 'scale'),
    'price.lawyer.pro': stripeDoc('lawyer', 'pro'),
    'price.lawyer.top': stripeDoc('lawyer', 'top'),
    'price.wittaya.premium': storedPriceDoc('wittaya', 'premium'),
    'price.wittaya.pro': storedPriceDoc('wittaya', 'pro'),
    'price.lawslane.plus': storedPriceDoc('lawslane', 'plus'),
    'draft.capdeal': draftDoc('capdeal'),
    'draft.lawyer': draftDoc('lawyer'),
    creditPacks: {
        title: ['แพ็กเครดิต AI', 'AI credit packs'],
        what: ['ชุดเครดิตที่ขายครั้งเดียว: รหัสแพ็ก จำนวนเครดิต ราคา', 'One-time credit bundles: pack ID, credits, price'],
        how: ['ต้นทุน = เครดิต × ต้นทุนเครดิตทนายแพงสุด · ค่าธรรมเนียม Beam บัตร premium / PromptPay', 'Cost = credits × max lawyer credit cost · Beam premium card / PromptPay fee'],
        when: ['ก่อนเปิดปุ่มซื้อเครดิต หรือเมื่อต้นทุน AI เปลี่ยน', 'Before the buy-credits button launches, or when AI costs change'],
        affects: [['ต้นทุน/กำไร/ราคาต่ำสุดในการ์ดแพ็กเครดิต', 'Cost / profit / min price on the credit pack card']],
        live: 'stored',
        liveDetail: ['เว็บยังไม่อ่านค่านี้ (ยังไม่มีระบบขายเครดิต)', 'Not read by the site yet (no credit sales flow)'],
    },
    'ebook.standardPrice': {
        title: ['ราคา E-Book มาตรฐาน', 'Standard E-Book price'],
        what: ['ราคามาตรฐานต่อเล่มของ E-Book (บาท)', 'Standard price per E-Book (THB)'],
        how: ['ใช้คิดค่าธรรมเนียม Beam และกำไรในการ์ด', 'Used for the Beam fee and profit on the card'],
        when: ['ก่อนย้าย Wittaya มาอ่านราคาจากระบบกลาง', 'Before Wittaya switches to the central price'],
        affects: [['ค่าธรรมเนียม/กำไรในการ์ด E-Book', 'Fee / profit on the E-Book card']],
        live: 'stored',
        liveDetail: ['Wittaya ยังใช้ราคาในข้อมูลหนังสือและข้อความ ฿199 ในโค้ด', 'Wittaya still uses each book record and the coded ฿199 message'],
    },
    'ebook.shipping': {
        title: ['ค่าส่งหนังสือเล่ม', 'Book shipping'],
        what: ['ค่าส่งพื้นฐาน / ต่อเล่มที่เพิ่ม / ส่งฟรีเมื่อยอดถึง (0 = ไม่เก็บ)', 'Base fee / per extra item / free over (0 = none)'],
        how: ['ค่าส่งไม่ใช่รายได้ แต่ค่าธรรมเนียม Beam คิดจากยอดรวมค่าส่ง', 'Shipping is not revenue, but the Beam fee is charged on the total incl. shipping'],
        when: ['เมื่อเริ่มเก็บค่าส่งจริง', 'When shipping starts being charged'],
        affects: [['ตัวเลขในการ์ด E-Book', 'Figures on the E-Book card']],
        live: 'stored',
        liveDetail: ['Wittaya ยังไม่เก็บค่าส่ง และยังไม่อ่านค่านี้', 'Wittaya charges no shipping yet and does not read this'],
    },
    'interpreter.gpPercent': {
        title: ['GP งานล่าม (%)', 'Interpreter GP (%)'],
        what: ['เปอร์เซ็นต์ที่แพลตฟอร์มหักจากค่าจ้างล่ามแต่ละงาน (0–50)', 'Percent the platform keeps from each interpreter job (0–50)'],
        how: ['GP = ยอดงาน × % (ปัดลง) · ล่ามได้ยอด − GP · กำไรจริง = GP − ค่าธรรมเนียม Beam ของยอดเต็ม', 'GP = job amount × % (floored) · interpreter gets amount − GP · net = GP − Beam fee on the full amount'],
        when: ['เมื่อเปลี่ยนนโยบายส่วนแบ่งกับล่าม (ควรแจ้งล่ามก่อน)', 'When the revenue-share policy changes (tell interpreters first)'],
        affects: [
            ['ตั้งราคา › GP ล่าม (เหลือจริงต่องาน)', 'Set prices › Interpreter GP (net per job)'],
            ['ต้นทุนระบบ › สรุปต่อเว็บ (รายได้ lawslane.com) และภาพรวม', 'System costs › per-site summary (lawslane.com revenue) and overview'],
        ],
        live: 'live',
        liveDetail: ['มีผลทันทีกับการจองล่ามใหม่ทุกงาน งานที่จองแล้วใช้ GP ตอนจอง · ล่ามเห็น % ใหม่ในแดชบอร์ด', 'Applies immediately to every new booking; existing bookings keep their GP · interpreters see the new % on their dashboard'],
    },
};

/** ทุก key ของช่องในแท็บตั้งราคา (ใช้ในเทสต์) */
export const PRICE_FIELD_KEYS = Object.keys(PRICE_FIELD_DOCS);

/** ราคาแพลนรายเดือน → key ใน PRICE_FIELD_DOCS / PRODUCT_DOCS */
export function priceFieldKey(product: string, planId: string) {
    return `price.${product}.${planId}`;
}

// ---------------------------------------------------------------------------
// คำอธิบายแท็บย่อยของ "ต้นทุนระบบ"
// ---------------------------------------------------------------------------

export type CostSection = 'overview' | 'sites' | 'margins' | 'run' | 'volumes' | 'units' | 'vendors' | 'notes';

export const COST_SECTION_DOCS: Record<CostSection, { title: Label; intro: Label; what: Label; how: Label; when: Label; affects: Label[] }> = {
    overview: {
        title: ['ภาพรวม', 'Overview'],
        intro: ['ตัวเลขทั้งหมดเป็นการประมาณ: ราคาประกาศของผู้ให้บริการ × สมมติฐานการใช้งาน ไม่ใช่บิลจริง ใช้ดูว่าต้นทุนมาจากไหนและแต่ละแพลนเหลือกำไรแค่ไหน', 'Everything here is an estimate: vendor list prices × usage assumptions, not real bills. Use it to see where costs come from and how much each plan keeps.'],
        what: ['สรุปโมเดลต้นทุนทั้งหมดใน 3 สถานการณ์', 'Summary of the whole cost model in 3 scenarios'],
        how: ['สมมติฐาน + ราคาบริการ → ต้นทุนต่อหน่วย → ปริมาณใช้งาน → ค่ารันรายเดือน → สรุปต่อเว็บ / Margin ต่อแพลน', 'Assumptions + vendor prices → unit costs → usage → monthly run → per-site / plan margins'],
        when: ['ดูทุกเดือนหลังอัปเดตอัตราแลกเปลี่ยนและยอดบิลจริง', 'Check monthly after updating FX and real bills'],
        affects: [['อ่านอย่างเดียว — เปลี่ยนตามสมมติฐานและราคาที่บันทึก', 'Read-only — follows assumptions and saved prices']],
    },
    sites: {
        title: ['สรุปต่อเว็บ', 'Per site'],
        intro: ['ต้นทุนตรงของแต่ละเว็บ บวกค่าส่วนกลาง (Firebase, Cloudflare, Vercel, อีเมล ฯลฯ) ที่ปันตามสัดส่วนการเข้าชม แล้วเทียบกับรายได้ประมาณ — docs, Lalin และสิทธิคนทำงานไม่ถูกปันส่วนกลาง', 'Each site’s direct cost plus shared infra (Firebase, Cloudflare, Vercel, email…) allocated by traffic share, against estimated revenue — docs, Lalin and Sitthi get no shared allocation.'],
        what: ['ต้นทุนรวม รายได้ และกำไรขั้นต้นต่อเว็บต่อเดือน', 'Monthly cost, revenue and gross profit per site'],
        how: ['ปันส่วนกลาง = ส่วนกลาง × การเข้าชมเว็บนั้น ÷ การเข้าชมทุกเว็บ · รายได้ = ราคาแพลน × จำนวนบัญชี (+ GP ล่าม)', 'Shared share = shared × site visits ÷ all visits · revenue = plan price × accounts (+ interpreter GP)'],
        when: ['ใช้ตัดสินใจว่าเว็บไหนคุ้ม/ควรลดต้นทุน', 'To decide which site pays off or needs cost cuts'],
        affects: [['อ่านอย่างเดียว', 'Read-only']],
    },
    margins: {
        title: ['Margin ต่อแพลน', 'Plan margins'],
        intro: ['กำไรต่อบัญชีต่อเดือนของแต่ละแพลน เมื่อลูกค้าใช้เต็มโควตาและใช้เฉลี่ย พร้อมราคาต่ำสุดที่ยังได้กำไรตามเป้า แก้ราคาได้ที่แท็บ "ตั้งราคา"', 'Profit per account per month for each plan at full and average usage, with the minimum price that meets the target. Edit prices in "Set prices".'],
        what: ['ตารางกำไรต่อแพลน (เหมือนตัวเลขใต้ช่องราคา)', 'Profit per plan (same as under each price field)'],
        how: ['กำไร = ราคา − ต้นทุน AI − ค่าธรรมเนียม − ค่าส่วนกลางต่อบัญชี', 'Profit = price − AI cost − fees − infra per account'],
        when: ['ก่อนเปลี่ยนราคา', 'Before changing prices'],
        affects: [['อ่านอย่างเดียว', 'Read-only']],
    },
    run: {
        title: ['ค่ารันรายเดือน', 'Monthly run cost'],
        intro: ['ทุกบริการที่ต้องจ่ายต่อเดือนต่อสถานการณ์ แยกส่วนกลางกับต้นทุนตรงรายเว็บ ส่วนใหญ่ฟรีจนกว่าจะใช้เกินโควตาฟรีของผู้ให้บริการ', 'Every monthly service charge per scenario, split into shared and per-site direct costs. Most are free until usage passes the vendor free tier.'],
        what: ['ค่ารันระบบรายเดือน (บาท) ทุกแถว', 'Monthly run cost (THB), every row'],
        how: ['(ปริมาณ − โควตาฟรี) × ราคาบริการ × อัตราแลกเปลี่ยน', '(usage − free tier) × vendor price × FX'],
        when: ['เทียบกับบิลจริงทุกเดือน แล้วใส่ "ใช้ยอดจริงแทน"', 'Compare with real bills monthly, then set the real-bill override'],
        affects: [['อ่านอย่างเดียว', 'Read-only']],
    },
    volumes: {
        title: ['ปริมาณใช้งาน', 'Usage volumes'],
        intro: ['ปริมาณงานต่อเดือนที่คำนวณจากจำนวนผู้ใช้ในแต่ละสถานการณ์ เช่น เครดิต AI ที่ใช้ การเข้าชม อีเมล — เป็นตัวคูณของค่ารันรายเดือน', 'Monthly workload derived from users per scenario — AI credits, visits, emails — that drives the monthly run cost.'],
        what: ['ปริมาณใช้งานที่คำนวณได้', 'Computed volumes'],
        how: ['จำนวนผู้ใช้ × โควตา × สัดส่วนใช้ / ค่าต่อหัว', 'Users × quota × usage / per-head values'],
        when: ['เทียบกับ metrics จริง ถ้าต่างมากให้แก้สมมติฐาน', 'Compare with real metrics; adjust assumptions if far off'],
        affects: [['อ่านอย่างเดียว', 'Read-only']],
    },
    units: {
        title: ['ต้นทุนต่อหน่วย', 'Unit costs'],
        intro: ['ต้นทุนของงาน 1 ครั้ง เช่น ถาม AI 1 ครั้ง ร่างสัญญา 1 ฉบับ จาก token ที่ประมาณ × ราคาโมเดล — token เป็นค่าประมาณจนกว่าจะมีค่าเฉลี่ยจริงจาก aiUsageLogs', 'Cost of one action — one AI question, one contract — from estimated tokens × model price. Tokens are estimates until real aiUsageLogs averages exist.'],
        what: ['ต้นทุนต่อการเรียก AI และต้นทุนต่อหน่วยสรุป', 'Cost per AI call and summary unit costs'],
        how: ['(input × (1 − cache) × ราคา input + input × cache × ราคา cached + output × ราคา output) ÷ 1 ล้าน × อัตราแลกเปลี่ยน', '(input × (1 − cache) × input price + input × cache × cached price + output × output price) ÷ 1M × FX'],
        when: ['เมื่อมี token จริง หรือเปลี่ยนโมเดล', 'When real token counts exist or models change'],
        affects: [['อ่านอย่างเดียว — แก้ token/โมเดลใน "สมมติฐานต้นทุน"', 'Read-only — edit tokens/models in "Cost assumptions"']],
    },
    vendors: {
        title: ['ราคาบริการ', 'Vendor prices'],
        intro: ['ราคาประกาศของผู้ให้บริการที่ใช้คิด พร้อมแหล่งที่มา แถวสีเหลือง ⚠ คือราคาที่ยังไม่ยืนยัน ควรตรวจกับหน้าราคาหรือบิลจริง', 'Vendor list prices used, with sources. Yellow ⚠ rows are unconfirmed — verify against the vendor page or a real bill.'],
        what: ['ตารางราคาบริการและราคาโมเดล AI', 'Vendor and AI model price tables'],
        how: ['ใช้คูณกับปริมาณใช้งานส่วนที่เกินโควตาฟรี', 'Multiplied by usage above the free tier'],
        when: ['ตรวจทุกไตรมาส หรือเมื่อผู้ให้บริการประกาศราคาใหม่', 'Quarterly or when a vendor announces new prices'],
        affects: [['แก้ได้ใน "สมมติฐานต้นทุน" › ราคาบริการ', 'Edit in "Cost assumptions" › vendor prices']],
    },
    notes: {
        title: ['หมายเหตุ', 'Notes'],
        intro: ['ข้อจำกัดของตัวเลขและสิ่งที่ควรยืนยัน อ่านก่อนเอาตัวเลขไปใช้ตัดสินใจ', 'Limitations and things to verify. Read before acting on the numbers.'],
        what: ['ข้อจำกัดของโมเดล', 'Model caveats'],
        how: ['-', '-'],
        when: ['อ่านครั้งแรกและเมื่อระบบเปลี่ยน', 'On first read and when the system changes'],
        affects: [['อ่านอย่างเดียว', 'Read-only']],
    },
};
