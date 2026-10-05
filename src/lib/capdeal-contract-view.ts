/**
 * แปลงเอกสาร `contracts/{id}` เป็นข้อมูลที่หลังบ้านแสดงได้ — ส่งเฉพาะฟิลด์ที่ต้องใช้
 *
 * เดิม /api/capdeal/contracts ส่ง `...data` ทั้งก้อนไปถึง browser ของแอดมิน รวมเลขบัตรประชาชน
 * ภาพลายเซ็น (base64) shareToken และ sharePin แบบ plaintext ของระบบเก่า — ตอนนี้:
 *   - เลขบัตรประชาชน / เบอร์ที่ยืนยัน OTP เหลือ 4 ตัวท้าย
 *   - ลายเซ็นเหลือแค่ "ลงนามแล้วหรือยัง + เวลา" ไม่ส่งภาพ
 *   - token / PIN / hash ของลิงก์แชร์ไม่ส่งเลย (ส่งแค่ว่ามีลิงก์แชร์ / ตั้ง PIN ไว้ไหม)
 *
 * โครงข้อมูลต้นทาง: lawslane-capdeal/src/services/contractService.ts (ContractData)
 * สัญญาจ้างทนายจากเว็บหลักอยู่ collection เดียวกันแต่ไม่มี employer/contractor (มี clientName/lawyerName)
 */

export type AdminContractParty = {
    name: string;
    email: string | null;
    address: string | null;
    idCardLast4: string | null;
    phoneLast4: string | null;
    signed: boolean;
    signedAt: string | null;
};

export type AdminContractSummary = {
    id: string;
    title: string;
    task: string;
    price: number;
    status: string;
    createdAt: string;
    ownerId: string;
};

export type AdminContractDetail = AdminContractSummary & {
    category: string | null;
    updatedAt: string | null;
    deadline: string;
    deposit: number | null;
    paymentTerms: string | null;
    notes: string | null;
    content: string | null;
    companyId: string | null;
    employer: AdminContractParty;
    contractor: AdminContractParty;
    attachments: { name: string; url: string; type: string }[];
    hasShareLink: boolean;
    isPinProtected: boolean;
    signedTermsHash: string | null;
    source: 'capdeal' | 'lawyer';
};

function toIso(v: any): string | null {
    const d: Date | null = v?.toDate?.() ?? (typeof v === 'string' || typeof v === 'number' ? new Date(v) : null);
    return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
}

function str(v: unknown): string | null {
    return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function last4(v: unknown): string | null {
    const digits = typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\D/g, '') : '';
    return digits.length >= 4 ? digits.slice(-4) : null;
}

function party(raw: any, fallbackName: unknown): AdminContractParty {
    return {
        name: str(raw?.name) ?? str(fallbackName) ?? '',
        email: str(raw?.email),
        address: str(raw?.address),
        idCardLast4: last4(raw?.id_card),
        phoneLast4: last4(raw?.verifiedPhoneNumber),
        signed: Boolean(raw?.signature || raw?.signedAt),
        signedAt: toIso(raw?.signedAt),
    };
}

export function toContractSummary(id: string, data: any): AdminContractSummary {
    return {
        id,
        title: str(data?.title) ?? '',
        task: str(data?.task) ?? '',
        price: Number(data?.price ?? 0) || 0,
        status: str(data?.status) ?? 'draft',
        createdAt: toIso(data?.createdAt) ?? new Date(0).toISOString(),
        ownerId: str(data?.ownerId) ?? str(data?.userId) ?? '',
    };
}

export function toContractDetail(id: string, data: any): AdminContractDetail {
    const attachments = Array.isArray(data?.attachments)
        ? data.attachments
            .filter((a: any) => typeof a?.url === 'string' && /^https:\/\//i.test(a.url))
            .map((a: any) => ({ name: str(a.name) ?? 'ไฟล์แนบ', url: a.url as string, type: str(a.type) ?? '' }))
        : [];
    return {
        ...toContractSummary(id, data),
        category: str(data?.category),
        updatedAt: toIso(data?.updatedAt),
        deadline: str(data?.deadline) ?? '',
        deposit: typeof data?.deposit === 'number' && data.deposit > 0 ? data.deposit : null,
        paymentTerms: str(data?.paymentTerms),
        notes: str(data?.notes),
        content: str(data?.content),
        companyId: str(data?.companyId),
        employer: party(data?.employer, data?.clientName),
        contractor: party(data?.contractor, data?.lawyerName),
        attachments,
        hasShareLink: Boolean(data?.shareToken),
        isPinProtected: Boolean(data?.isPinProtected || data?.sharePinHash || data?.sharePin),
        signedTermsHash: str(data?.signedTermsHash),
        source: data?.employer || data?.contractor ? 'capdeal' : 'lawyer',
    };
}
