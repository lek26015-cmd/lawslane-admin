'use server';

import { randomUUID } from 'crypto';
import { initAdmin } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-guard';
import { uploadToCloudflareImages } from './upload-cloudflare-images';

/**
 * อัปโหลดสื่อประกอบคอร์ส/บทเรียน — ยกมาจาก api/education/upload (Module 4)
 *
 * แผนระบุว่าห้ามให้หน้าอยู่ admin แต่ API อยู่แอปเดิม จึงต้องมีทางอัปโหลดใน
 * repo นี้เอง เก็บกติกาความปลอดภัยเดิมไว้ครบ:
 *   - allowlist ตาม MIME เท่านั้น ไม่รับ image/svg+xml เพราะ SVG รันสคริปต์ได้
 *     ถ้าถูกเสิร์ฟกลับมาแบบ inline
 *   - นามสกุลไฟล์มาจาก MIME ที่ผ่าน allowlist แล้ว "ไม่ใช่" จากชื่อไฟล์ที่ผู้ใช้ส่งมา
 *     (file.name.split('.').pop() คืนทุกอย่างหลังจุดสุดท้ายรวมทั้ง '/' → ตั้งชื่อ
 *     ให้เขียน object ออกนอกโฟลเดอร์ที่ตั้งใจได้)
 *   - จำกัดขนาดตามชนิดไฟล์
 *
 * รูปภาพไป Cloudflare Images ส่วนวิดีโอ/เอกสารไป Firebase Storage
 */

const EXTENSION_BY_TYPE: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const MAX_BYTES: Record<string, number> = {
    video: 100 * 1024 * 1024,
    image: 10 * 1024 * 1024,
    document: 20 * 1024 * 1024,
};

export type EducationUploadResult =
    | { success: true; url: string; filename: string; size: number; type: string }
    | { success: false; error: string };

export async function uploadEducationMedia(
    formData: FormData,
    kind: 'video' | 'image' | 'document' = 'video',
): Promise<EducationUploadResult> {
    await requireAdmin('education.courses');

    const file = formData.get('file') as File | null;
    if (!file) return { success: false, error: 'ไม่พบไฟล์' };

    const limit = MAX_BYTES[kind] ?? MAX_BYTES.document;
    if (file.size > limit) {
        return { success: false, error: `ไฟล์ใหญ่เกิน ${Math.round(limit / 1024 / 1024)}MB` };
    }

    try {
        if (kind === 'image') {
            if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                return { success: false, error: 'ชนิดรูปภาพไม่รองรับ' };
            }
            const url = await uploadToCloudflareImages(formData);
            return { success: true, url, filename: file.name, size: file.size, type: file.type };
        }

        const extension = EXTENSION_BY_TYPE[file.type];
        if (!extension) return { success: false, error: 'ชนิดไฟล์ไม่รองรับ' };

        const app = await initAdmin();
        if (!app) return { success: false, error: 'Firebase Admin ยังไม่พร้อม' };

        const bucketName = (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '').replace(/"/g, '').trim();
        const bucket = bucketName ? app.storage().bucket(bucketName) : app.storage().bucket();

        const objectPath = `${kind}s/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
        const downloadToken = randomUUID();

        await bucket.file(objectPath).save(Buffer.from(await file.arrayBuffer()), {
            metadata: {
                contentType: file.type,
                metadata: {
                    originalName: file.name,
                    uploadedAt: new Date().toISOString(),
                    firebaseStorageDownloadTokens: downloadToken,
                },
            },
        });

        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`;
        return { success: true, url, filename: file.name, size: file.size, type: file.type };
    } catch (error) {
        console.error('uploadEducationMedia failed:', error);
        return { success: false, error: 'อัปโหลดไม่สำเร็จ' };
    }
}
