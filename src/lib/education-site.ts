/**
 * ที่อยู่เว็บนักเรียน (repo lawlanes-education) — ใช้ทำลิงก์ "เปิดหน้านักเรียน" จากหลังบ้าน
 * ค่าเริ่มต้น wittaya.lawslane.com — education.lawslane.com ไม่มี DNS แล้ว (ลิงก์เดิมเปิดไม่ขึ้น)
 */
export const EDUCATION_SITE_URL = (
    process.env.NEXT_PUBLIC_EDUCATION_SITE_URL || 'https://wittaya.lawslane.com'
).replace(/\/+$/, '');

export function studentExamUrl(examId: string): string {
    return `${EDUCATION_SITE_URL}/exams/${encodeURIComponent(examId)}`;
}
