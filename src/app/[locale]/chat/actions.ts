'use server';

import { r2 } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export async function uploadFileAction(formData: FormData, idToken: string, chatId: string) {
    const file = formData.get('file') as File;
    if (!file) {
        throw new Error('No file provided');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `uploads/${chatId}/${timestamp}_${safeName}`;

    try {
        console.log(`[Server Action] Uploading to R2: ${key}`);

        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: file.type,
        }));

        // Construct Public URL
        // User must provide R2_PUBLIC_URL in .env (e.g., https://pub-xxx.r2.dev)
        const baseUrl = process.env.R2_PUBLIC_URL || '';
        const publicUrl = `${baseUrl}/${key}`;

        console.log(`[Server Action] Upload success: ${publicUrl}`);

        return {
            name: file.name,
            bucket: process.env.R2_BUCKET_NAME || 'r2-bucket',
            fullPath: publicUrl,
            isLocal: false
        };

    } catch (error) {
        console.error("R2 Upload Error:", error);
        throw new Error('Failed to upload to R2');
    }
}
