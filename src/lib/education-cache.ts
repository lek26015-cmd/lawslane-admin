import 'server-only';
import { revalidateTag } from 'next/cache';

/**
 * แท็ก cache ของรายการข้อสอบ (unstable_cache 30 นาทีใน /api/education/exams)
 * route ที่เขียน examSets ต้องเรียก invalidateExamListCache() ให้แอดมินเห็นผลทันที
 */
export const EXAM_LIST_CACHE_TAG = 'education-exams';

export function invalidateExamListCache() {
    try {
        // expire: 0 = หมดอายุทันที (ไม่ใช่ stale-while-revalidate) — คำขอถัดไปอ่าน Firestore ใหม่
        revalidateTag(EXAM_LIST_CACHE_TAG, { expire: 0 });
    } catch (e) {
        console.warn('invalidateExamListCache failed', e);
    }
}
