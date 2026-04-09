'use server';

import { uploadToStorage } from '@/lib/storage';

export async function uploadFileAction(formData: FormData, folder: string = 'uploads') {
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
