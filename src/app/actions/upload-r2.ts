'use server';

import { r2 } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * @deprecated THIS ACTION UPLOADS TO PUBLIC R2 STORAGE.
 * DO NOT USE THIS FOR SENSITIVE DOCUMENTS (ID CARDS, LICENSES, ETC.).
 * Use uploadFileAction from '@/app/actions/upload-storage' instead for secure storage.
 */
export async function uploadToR2(formData: FormData, folder: string = 'uploads') {
    const file = formData.get('file') as File;
    if (!file) {
        throw new Error('No file provided');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${folder}/${timestamp}_${safeName}`;

    try {
        console.log(`[Server Action] Uploading to R2: ${key}`);

        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: file.type,
        }));

        // Construct Public URL
        const baseUrl = process.env.R2_PUBLIC_URL || '';
        const publicUrl = `${baseUrl}/${key}`;

        console.log(`[Server Action] Upload success: ${publicUrl}`);

        return publicUrl;

    } catch (error) {
        console.error("R2 Upload Error:", error);
        throw new Error('Failed to upload to R2');
    }
}
