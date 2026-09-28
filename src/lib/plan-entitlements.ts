/**
 * แพ็กเกจและสิทธิ์ของลูกค้า CapDeal / Wittaya — แอดมินกำหนดจากหลังบ้าน
 *
 * เก็บใน Firestore 2 ที่ (เขียนได้เฉพาะ Admin SDK ผ่าน plan-entitlement-actions):
 *   - `planEntitlements/{product}`        { plans: { [planId]: {...สิทธิ์} }, updatedAt, updatedBy }
 *   - `users/{uid}.planGrants.{product}`  { planId, expiresAt|null, grantedAt }
 *     (หมายเหตุ/ผู้มอบอยู่ที่ `planGrantRecords/{product}_{uid}` เพราะลูกค้าอ่านเอกสาร users ของตัวเองได้)
 *
 * ⚠️ โครงข้อมูลต้องตรงกับฝั่งที่อ่านไปบังคับใช้:
 *   - lawslane-capdeal/src/lib/entitlement.ts     (ใช้แพ็กเกจที่สูงกว่าระหว่าง Stripe กับที่มอบ)
 *   - lawlanes-education/src/lib/plan-entitlement.ts
 * ค่าเริ่มต้นด้านล่างต้องตรงกับค่าเริ่มต้นในสอง repo นั้น (ใช้เมื่อยังไม่มีเอกสาร)
 */

export type PlanProduct = 'capdeal' | 'wittaya';

export type EntitlementField =
    | { key: string; type: 'number'; label: [string, string]; help?: [string, string]; nullable?: { label: [string, string] } }
    | { key: string; type: 'boolean'; label: [string, string]; help?: [string, string] };

export type PlanValues = Record<string, number | boolean | null>;

export type ProductCatalog = {
    product: PlanProduct;
    name: string;
    permission: 'capdeal.plans' | 'education.plans';
    /** เรียงจากต่ำไปสูง */
    plans: { id: string; name: string }[];
    fields: EntitlementField[];
    defaults: Record<string, PlanValues>;
    /** แพ็กเกจที่ได้เมื่อไม่มีสิทธิ์ใด — มอบแพ็กเกจนี้ = ไม่มีความหมาย */
    basePlan: string;
    grantNote: [string, string];
};

export const PLAN_CATALOG: Record<PlanProduct, ProductCatalog> = {
    capdeal: {
        product: 'capdeal',
        name: 'CapDeal',
        permission: 'capdeal.plans',
        plans: [
            { id: 'free', name: 'Free' },
            { id: 'lite', name: 'Lite' },
            { id: 'pro', name: 'Pro' },
            { id: 'scale', name: 'Scale' },
        ],
        fields: [
            { key: 'dealsPerMonth', type: 'number', label: ['สร้างสัญญา (ฉบับ/เดือน)', 'Contracts per month'] },
            {
                key: 'scansPerMonth', type: 'number',
                label: ['AI อ่านแคปแชท (ครั้ง/เดือน)', 'AI chat scans per month'],
                help: ['อัตโนมัติ = สัญญา × 3 ขั้นต่ำ 10', 'Auto = contracts × 3, min 10'],
                nullable: { label: ['อัตโนมัติ', 'Auto'] },
            },
            { key: 'attachments', type: 'boolean', label: ['แนบเอกสารท้ายสัญญา', 'Contract attachments'] },
            { key: 'hideWatermark', type: 'boolean', label: ['ไม่มีลายน้ำ Lawslane', 'No Lawslane watermark'] },
        ],
        defaults: {
            free: { dealsPerMonth: 2, scansPerMonth: null, attachments: false, hideWatermark: false },
            lite: { dealsPerMonth: 30, scansPerMonth: null, attachments: true, hideWatermark: true },
            pro: { dealsPerMonth: 100, scansPerMonth: null, attachments: true, hideWatermark: true },
            scale: { dealsPerMonth: 1000, scansPerMonth: null, attachments: true, hideWatermark: true },
        },
        basePlan: 'free',
        grantNote: [
            'ลูกค้าจะได้แพ็กเกจที่สูงกว่าระหว่างที่จ่ายผ่าน Stripe กับที่มอบให้ — การมอบไม่ยกเลิกหรือเปลี่ยนการเก็บเงินใน Stripe',
            'The customer gets the higher of their Stripe plan and the granted plan. Granting never cancels or changes Stripe billing.',
        ],
    },
    wittaya: {
        product: 'wittaya',
        name: 'Wittaya',
        permission: 'education.plans',
        plans: [
            { id: 'free', name: 'Free' },
            { id: 'premium', name: 'Premium' },
            { id: 'pro', name: 'Pro' },
        ],
        fields: [
            {
                key: 'examsPerDay', type: 'number',
                label: ['ทำข้อสอบ (ชุด/วัน)', 'Exams per day'],
                help: ['รีเซ็ตเที่ยงคืนเวลาไทย', 'Resets at midnight Bangkok time'],
                nullable: { label: ['ไม่จำกัด', 'Unlimited'] },
            },
            { key: 'aiGrading', type: 'boolean', label: ['AI ตรวจข้อเขียน', 'AI essay grading'] },
            { key: 'weaknessAnalysis', type: 'boolean', label: ['AI วิเคราะห์จุดอ่อน', 'AI weakness analysis'] },
        ],
        // ค่าเริ่มต้น = พฤติกรรมเดิมก่อนมีระบบนี้ (free จำกัดแค่ 3 ชุด/วัน)
        defaults: {
            free: { examsPerDay: 3, aiGrading: true, weaknessAnalysis: true },
            premium: { examsPerDay: null, aiGrading: true, weaknessAnalysis: true },
            pro: { examsPerDay: null, aiGrading: true, weaknessAnalysis: true },
        },
        basePlan: 'free',
        grantNote: [
            'Wittaya ยังไม่มีระบบชำระเงิน — การมอบแพ็กเกจที่นี่เป็นทางเดียวที่ลูกค้าจะได้แพ็กเกจสูงกว่า Free',
            'Wittaya has no payment flow yet — granting here is the only way a customer gets above Free.',
        ],
    },
};

export const PLAN_PRODUCTS = Object.keys(PLAN_CATALOG) as PlanProduct[];

export function isPlanProduct(v: unknown): v is PlanProduct {
    return typeof v === 'string' && v in PLAN_CATALOG;
}

/**
 * ตรวจ/ทำความสะอาดค่าที่แอดมินส่งมา — คืนเฉพาะแพ็กเกจและฟิลด์ที่รู้จัก
 * ค่าผิดชนิดโยน error (ไม่แอบเติมค่าเริ่มต้นให้ แอดมินจะได้รู้ว่าบันทึกไม่ผ่าน)
 */
export function sanitizePlans(product: PlanProduct, input: unknown): Record<string, PlanValues> {
    const catalog = PLAN_CATALOG[product];
    const src = (input ?? {}) as Record<string, Record<string, unknown>>;
    const out: Record<string, PlanValues> = {};
    for (const plan of catalog.plans) {
        const values: PlanValues = {};
        for (const field of catalog.fields) {
            const v = src[plan.id]?.[field.key];
            if (field.type === 'boolean') {
                if (typeof v !== 'boolean') throw new Error(`${plan.name}: ${field.label[0]} ต้องเป็นเปิด/ปิด`);
                values[field.key] = v;
            } else if (v === null && field.nullable) {
                values[field.key] = null;
            } else {
                if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 1_000_000) {
                    throw new Error(`${plan.name}: ${field.label[0]} ต้องเป็นจำนวนเต็ม 0–1,000,000`);
                }
                values[field.key] = v;
            }
        }
        out[plan.id] = values;
    }
    return out;
}

/** ค่าที่ใช้จริง = ค่าที่บันทึกไว้ทับค่าเริ่มต้น (ฟิลด์ที่ไม่มี/ผิดชนิดใช้ค่าเริ่มต้น) */
export function mergeWithDefaults(product: PlanProduct, stored: unknown): Record<string, PlanValues> {
    const catalog = PLAN_CATALOG[product];
    const src = (stored ?? {}) as Record<string, Record<string, unknown>>;
    const out: Record<string, PlanValues> = {};
    for (const plan of catalog.plans) {
        const values: PlanValues = { ...catalog.defaults[plan.id] };
        for (const field of catalog.fields) {
            const v = src[plan.id]?.[field.key];
            if (field.type === 'boolean' ? typeof v === 'boolean'
                : (v === null && field.nullable) || (typeof v === 'number' && Number.isFinite(v) && v >= 0)) {
                values[field.key] = v as number | boolean | null;
            }
        }
        out[plan.id] = values;
    }
    return out;
}
