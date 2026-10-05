'use server';

import { initAdmin } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-guard';
import {
    extractLawyersFromImageData,
    importLawyersCore,
    type ExtractedLawyer,
    type ImportResult,
} from '@/lib/registry-core';

export type { ExtractedLawyer, ImportResult };

// ตัวอ่าน/นำเข้าจริงอยู่ที่ src/lib/registry-core.ts (ใช้ร่วมกับ cron ดึงประกาศสภาทนายความ)
// ไฟล์นี้เป็นแค่ทางเข้าสำหรับหน้าหลังบ้าน — ตรวจสิทธิ์แอดมินก่อนทุกครั้ง

/**
 * Extract lawyer data from an uploaded image using Gemini Vision.
 */
export async function extractLawyersFromImage(base64Image: string, mimeType: string): Promise<ExtractedLawyer[]> {
    await requireAdmin('users.registry');
    return extractLawyersFromImageData(base64Image, mimeType);
}

/**
 * Import extracted lawyers into the verifiedLawyers Firestore collection.
 */
export async function importLawyersToRegistry(lawyers: ExtractedLawyer[]): Promise<ImportResult> {
    await requireAdmin('users.registry');
    const admin = await initAdmin();
    if (!admin) throw new Error('Server error: Admin SDK not initialized');
    return importLawyersCore(admin.firestore(), lawyers);
}
