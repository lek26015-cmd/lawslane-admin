'use server';

import { initAdmin } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads a file to Firebase Storage securely.
 * This should be used for sensitive documents like ID cards and licenses.
 * 
 * @param formData The form data containing the 'file' field
 * @param folder The destination folder in the storage bucket
 * @returns The storage path (not a public URL)
 */
export async function uploadToFirebaseSecure(formData: FormData, folder: string = 'uploads') {
    const file = formData.get('file') as File;
    if (!file) {
        throw new Error('No file provided');
    }

    const app = await initAdmin();
    if (!app) {
        throw new Error('Firebase Admin initialization failed');
    }

    const bucketName = (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '').replace(/"/g, '').trim();
    const bucket = bucketName ? app.storage().bucket(bucketName) : app.storage().bucket();
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        console.log(`[Secure Upload] Buffer prepared: ${buffer.length} bytes. Type: ${file.type}`);
        
        const timestamp = Date.now();
        const extension = file.name.split('.').pop() || 'bin';
        const filename = `${uuidv4()}_${timestamp}.${extension}`;
        const destination = `${folder}/${filename}`;

        const fileRef = bucket.file(destination);
        
        console.log(`[Secure Upload] Uploading to Firebase Storage: ${destination}`);
        
        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type || 'application/octet-stream',
            },
            public: false,
        });

        console.log(`[Secure Upload] Success: ${destination}`);
        return destination;

    } catch (error: any) {
        console.error("Firebase Secure Upload Error:", error);
        throw new Error(`Failed to upload file securely: ${error.message}`);
    }
}

/**
 * Saves a base64 slip image directly to Firestore 'slipImages' collection.
 * This avoids using Firebase Storage completely.
 */
export async function saveBase64SlipAction(base64Data: string): Promise<string> {
    const app = await initAdmin();
    if (!app) {
        throw new Error('Firebase Admin initialization failed');
    }
    const db = app.firestore();
    
    try {
        const docRef = await db.collection('slipImages').add({
            base64Data,
            createdAt: new Date().toISOString(),
        });
        // We prepend 'base64_slip_' so the viewer knows how to handle it
        return `base64_slip_${docRef.id}`;
    } catch (error: any) {
        console.error("Firebase Secure Base64 Save Error:", error);
        throw new Error(`Failed to save slip: ${error.message}`);
    }
}

/**
 * Uploads a file to Firebase Storage publicly.
 * This should be used for profile pictures and assets that need to be publicly visible.
 * 
 * @param formData The form data containing the 'file' field
 * @param folder The destination folder in the storage bucket
 * @returns The public HTTPS URL
 */
export async function uploadToFirebasePublic(formData: FormData, folder: string = 'public'): Promise<string> {
    const file = formData.get('file') as File;
    if (!file) {
        throw new Error('No file provided');
    }

    const app = await initAdmin();
    if (!app) {
        throw new Error('Firebase Admin initialization failed');
    }

    const bucketName = (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '').replace(/"/g, '').trim();
    console.log(`[Firebase Public] Using bucket name: "${bucketName}"`);

    // Use the bucket name from env or fall back to default bucket from initAdmin
    const bucket = bucketName ? app.storage().bucket(bucketName) : app.storage().bucket();
    console.log(`[Firebase Public] Resolved bucket: "${bucket.name}"`);
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const timestamp = Date.now();
        const extension = file.name.split('.').pop() || 'png';
        const filename = `${uuidv4()}_${timestamp}.${extension}`;
        const destination = `${folder}/${filename}`;

        const fileRef = bucket.file(destination);
        
        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type || 'image/jpeg',
            },
            public: true,
        });

        // Construct the public URL for Google Cloud Storage
        return `https://storage.googleapis.com/${bucket.name}/${destination}`;
    } catch (error: any) {
        console.error("Firebase Public Upload Error:", error);
        throw new Error(`Failed to upload public file: ${error.message}`);
    }
}
