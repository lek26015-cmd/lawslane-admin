'use server';

import { uploadToStorage } from '@/lib/storage';
import { requireAdmin, requireUser } from '@/lib/auth-guard';

/**
 * อัปโหลดไฟล์ลง Firebase Storage (bucket production ที่ใช้ร่วมกัน)
 *
 * เดิมไม่มีด่าน และรับ `folder` จากผู้เรียกตรงๆ → ใครก็อัปไฟล์ขนาดเท่าไรก็ได้ลง
 * โฟลเดอร์ไหนก็ได้ของ bucket (รวมโฟลเดอร์เอกสารลับของคนอื่น)
 * ตอนนี้:
 *   - แอดมิน: ใช้ได้ทุกโฟลเดอร์เหมือนเดิม (หน้าแก้ลูกค้า/ทนาย/ฟอร์ม/landing page)
 *   - ผู้ใช้ทั่วไป: ได้แค่ `lawyer-profile-images/{uid ของตัวเอง}` (หน้า lawyer-signup)
 */
export async function uploadFileAction(formData: FormData, folder: string = 'uploads') {
    const { uid } = await requireUser();
    const isAdmin = await requireAdmin().then(() => true, () => false);
    // ห้ามมี '..' / path ว่าง / ขึ้นต้นด้วย '/' ไม่ว่าจะเป็นใคร
    if (!/^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/.test(folder)) {
        throw new Error('Invalid folder');
    }
    if (!isAdmin && folder !== `lawyer-profile-images/${uid}`) {
        throw new Error('Forbidden: folder not allowed');
    }

    const file = formData.get('file') as File;
    if (!file) {
        throw new Error('No file provided');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    try {
        console.log(`[Server Action] Uploading to Firebase Storage: ${file.name}`);
        
        const storagePath = await uploadToStorage(
            buffer,
            file.name,
            file.type,
            folder
        );

        console.log(`[Server Action] Upload success: ${storagePath}`);

        return { 
            success: true, 
            path: storagePath,
            // For legal/sensitive docs, we store the path.
            // For profile images, we might want to store a public URL if they are meant to be public,
            // but for now let's keep everything private for maximum security.
        };

    } catch (error) {
        console.error("Storage Upload Error:", error);
        throw new Error('Failed to upload to storage');
    }
}
