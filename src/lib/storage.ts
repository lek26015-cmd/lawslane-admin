import { initAdmin } from './firebase-admin';
import { v4 as uuidv4 } from 'uuid';

export async function uploadToStorage(
    file: Buffer,
    fileName: string,
    mimeType: string,
    folder: string = 'uploads'
) {
    const admin = await initAdmin();
    if (!admin) {
        throw new Error('Firebase Admin initialization failed');
    }

    const bucket = admin.storage().bucket();
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const destination = `${folder}/${timestamp}_${uuidv4().substring(0, 8)}_${safeName}`;

    const fileRef = bucket.file(destination);

    await fileRef.save(file, {
        metadata: {
            contentType: mimeType,
        },
    });

    // We return the storage path/full path, NOT a public URL
    // To view this, we'll need to generate a signed URL or use the admin SDK
    return destination;
}

export async function getSignedUrl(path: string, expiresMinutes: number = 60) {
    const admin = await initAdmin();
    if (!admin) {
        throw new Error('Firebase Admin initialization failed');
    }

    const bucket = admin.storage().bucket();
    const file = bucket.file(path);

    const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresMinutes * 60 * 1000,
    });

    return url;
}
