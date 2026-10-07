/**
 * ชื่อโมเดล Gemini ที่ใช้ทุกจุดในงาน education (OCR / สร้างเฉลย / สร้างคำถาม)
 *
 * เดิมฝัง 'gemini-2.0-flash' ไว้ทีละไฟล์ ซึ่งกำลังถูก Google ปลดระวาง —
 * รวมไว้ที่เดียวและเปลี่ยนได้ผ่าน env GEMINI_MODEL โดยไม่ต้องแก้โค้ด
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

export function getGeminiModelName(): string {
    return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}
