'use server';

import { revalidatePath } from 'next/cache';
import { initAdmin } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-guard';
import type { Course } from '@/lib/education-types';

/**
 * จัดการคอร์สเรียน — ยกมาจาก lawlanes-education/src/app/api/education/courses
 * ตอนรวมหลังบ้าน (Module 4)
 *
 * เดิมเป็น API route ที่ตรวจสิทธิ์ด้วย session cookie ของ education (ระบบ
 * email/password แยกต่างหาก) ตอนนี้ใช้ requireAdmin('education.courses')
 * ซึ่งอ่านจาก Firebase custom claim เหมือนหน้าอื่นในหลังบ้านรวม
 *
 * แผนระบุชัดว่าห้ามให้ "หน้าอยู่ admin แต่ API อยู่แอปเดิม" — หน้าคอร์สจึงเรียก
 * action พวกนี้ตรงๆ ด้วย Admin SDK ไม่ยิงข้ามโดเมนกลับไปหา education
 */

const COLLECTION = 'courses';

async function db() {
    const adminApp = await initAdmin();
    if (!adminApp) throw new Error('Firebase Admin not initialized');
    return adminApp.firestore();
}

function toCourse(doc: FirebaseFirestore.DocumentSnapshot): Course {
    const data = doc.data() ?? {};
    return {
        id: doc.id,
        ...data,
        // Timestamp ของ Firestore ข้าม boundary ของ server action ไม่ได้
        createdAt: data.createdAt?.toDate?.().toISOString() ?? data.createdAt ?? null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() ?? data.updatedAt ?? null,
    } as Course;
}

export async function listCoursesAction(): Promise<Course[]> {
    await requireAdmin('education.courses');
    const snap = await (await db()).collection(COLLECTION).orderBy('createdAt', 'desc').get();
    return snap.docs.map(toCourse);
}

export async function getCourseAction(id: string): Promise<Course | null> {
    await requireAdmin('education.courses');
    const doc = await (await db()).collection(COLLECTION).doc(id).get();
    return doc.exists ? toCourse(doc) : null;
}

export async function createCourseAction(data: Partial<Course>) {
    await requireAdmin('education.courses');
    try {
        const now = new Date();
        const { id: _ignored, ...rest } = data as Partial<Course> & { id?: string };
        const ref = await (await db()).collection(COLLECTION).add({
            ...rest,
            createdAt: now,
            updatedAt: now,
        });
        revalidatePath('/education/courses');
        return { success: true as const, id: ref.id };
    } catch (error) {
        console.error('createCourseAction failed:', error);
        return { success: false as const, error: String(error) };
    }
}

export async function updateCourseAction(id: string, updates: Partial<Course>) {
    await requireAdmin('education.courses');
    try {
        const { id: _ignored, ...rest } = updates as Partial<Course> & { id?: string };
        await (await db()).collection(COLLECTION).doc(id).update({
            ...rest,
            updatedAt: new Date(),
        });
        revalidatePath('/education/courses');
        revalidatePath(`/education/courses/${id}/edit`);
        return { success: true as const };
    } catch (error) {
        console.error('updateCourseAction failed:', error);
        return { success: false as const, error: String(error) };
    }
}

export async function deleteCourseAction(id: string) {
    await requireAdmin('education.courses');
    try {
        await (await db()).collection(COLLECTION).doc(id).delete();
        revalidatePath('/education/courses');
        return { success: true as const };
    } catch (error) {
        console.error('deleteCourseAction failed:', error);
        return { success: false as const, error: String(error) };
    }
}

/**
 * รายการชุดข้อสอบแบบย่อ — ใช้โดย CourseExamLinker ตอนผูกข้อสอบเข้ากับคอร์ส
 *
 * หน้าจัดการข้อสอบเต็มรูปแบบยังอยู่ที่ education จนกว่าจะถึง Module 5
 * ตัวนี้อ่านอย่างเดียว พอให้ตัวเชื่อมทำงานได้โดยไม่ต้องยิงข้ามโดเมน
 */
export async function listExamsForLinkingAction(): Promise<{ id: string; title: string; description?: string }[]> {
    await requireAdmin('education.courses');
    const snap = await (await db()).collection('examSets').orderBy('title').limit(500).get();
    return snap.docs.map(d => ({
        id: d.id,
        title: d.data().title ?? '(ไม่มีชื่อ)',
        description: d.data().description ?? '',
    }));
}
