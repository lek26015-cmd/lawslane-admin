/**
 * type ของหน้าหลังบ้านบริการล่าม — รูปร่างมาจากเว็บหลัก (Lawslane/src/lib/interpreter-types.ts)
 * เงินทุกตัวเป็นสตางค์
 */

export const INTERPRETER_SERVICE_LABELS: Record<string, string> = {
    court: 'ล่ามในศาล',
    police: 'ล่ามที่สถานีตำรวจ',
    lawyer_meeting: 'ล่ามคุยกับทนาย',
    business_meeting: 'ล่ามประชุมธุรกิจ',
    doc_translation: 'แปลเอกสาร',
    certified_translation: 'แปลพร้อมรับรองคำแปล',
};

export const INTERPRETER_LANGUAGE_LABELS: Record<string, string> = {
    th: 'ไทย', en: 'อังกฤษ', zh: 'จีน', ja: 'ญี่ปุ่น', ko: 'เกาหลี', fr: 'ฝรั่งเศส', de: 'เยอรมัน',
    ru: 'รัสเซีย', ar: 'อาหรับ', my: 'เมียนมา', km: 'เขมร', lo: 'ลาว', vi: 'เวียดนาม', hi: 'ฮินดี',
};

export const INTERPRETER_BOOKING_STATUS_LABELS: Record<string, string> = {
    pending_payment: 'รอตรวจสลิป',
    paid: 'ชำระแล้ว รอล่ามรับ',
    accepted: 'ล่ามรับงานแล้ว',
    completed: 'เสร็จสิ้น',
    declined: 'ล่ามปฏิเสธ',
    cancelled: 'ยกเลิก',
    expired: 'หมดเวลา',
    refund_pending: 'รอคืนเงิน',
    refunded: 'คืนเงินแล้ว',
};

export const INTERPRETER_STATUS_LABELS: Record<string, string> = {
    pending: 'รออนุมัติ',
    approved: 'อนุมัติแล้ว',
    rejected: 'ไม่ผ่าน',
    suspended: 'ระงับ',
};

export const formatSatang = (satang: number) =>
    (satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const RATE_UNIT_LABELS: Record<string, string> = {
    hour: 'ต่อชั่วโมง', session: 'เหมาต่อครั้ง', day: 'เหมาวัน', page: 'ต่อหน้า', case: 'เหมาทั้งคดี', offer: 'ใบเสนอราคา',
};

export interface AdminRateItem {
    id: string;
    name: string;
    description: string;
    unit: string;
    price: number;
    minQty: number;
    sessionHours: number;
}

export interface AdminChatMessage {
    id: string;
    senderRole: string;
    text: string;
    /** ข้อความเดิมก่อนระบบซ่อนข้อมูลติดต่อ — แอดมินเห็นได้เท่านั้น */
    originalText: string | null;
    offerId: string | null;
    createdAt: string | null;
}

export interface AdminInterpreterRow {
    id: string;
    name: string;
    imageUrl: string;
    status: string;
    languageCodes: string[];
    services: string[];
    /** ราคาต่ำสุดในเรทการ์ด (บาท) */
    minPrice: number | null;
    verified: boolean;
    createdAt: string | null;
}

export interface AdminInterpreterDetail {
    id: string;
    name: string;
    imageUrl: string;
    status: string;
    description: string;
    languages: { code: string; level: string }[];
    services: string[];
    specialties: string[];
    serviceProvinces: string[];
    remoteAvailable: boolean;
    rateCard: AdminRateItem[];
    verifiedCredentials: string[];
    rejectionReason: string;
    createdAt: string | null;
    approvedAt: string | null;
    phone: string;
    email: string;
    lineId: string;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
    idCardUrl: string | null;
    certificateUrls: string[];
}

export interface InterpreterQuoteSnapshot {
    itemName?: string;
    unitType: string;
    units: number;
    unitRate: number;
    grossAmount: number;
    gpPercent: number;
    gpAmount: number;
    netToInterpreter: number;
}

export interface AdminInterpreterBooking {
    id: string;
    customerId: string;
    interpreterId: string;
    interpreterName: string;
    kind: 'interpretation' | 'translation';
    serviceType: string;
    languagePair: { from: string; to: string };
    startAt: string | null;
    endAt: string | null;
    durationHours: number | null;
    days: number | null;
    mode: 'onsite' | 'remote' | null;
    province: string | null;
    address: string | null;
    pageCount: number | null;
    dueDate: string | null;
    notes: string | null;
    lawyerId: string | null;
    quote: InterpreterQuoteSnapshot;
    status: string;
    payoutStatus: string;
    payoutId: string | null;
    slipUrl: string | null;
    slipVerified: boolean;
    hasNewPayment: boolean;
    cancelledBy: string | null;
    cancelReason: string | null;
    documentPaths: string[];
    createdAt: string | null;
}

export interface InterpreterPayoutGroup {
    interpreterId: string;
    interpreterName: string;
    bookingIds: string[];
    totalGross: number;
    totalGp: number;
    totalNet: number;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
}
