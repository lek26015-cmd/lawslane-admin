/**
 * ที่อยู่เว็บนักเรียน (repo lawlanes-education) — ใช้ทำลิงก์ "เปิดหน้านักเรียน" จากหลังบ้าน
 * ค่าเริ่มต้นตรงกับ SITE_URL ของ lawlanes-education (education.lawslane.com)
 */
export const EDUCATION_SITE_URL = (
    process.env.NEXT_PUBLIC_EDUCATION_SITE_URL || 'https://education.lawslane.com'
).replace(/\/+$/, '');

export function studentExamUrl(examId: string): string {
    return `${EDUCATION_SITE_URL}/exams/${encodeURIComponent(examId)}`;
}
