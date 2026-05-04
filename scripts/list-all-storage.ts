
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function listAllStorageFiles() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ 
            credential: cert(cloudConfig),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
        });
    }

    const bucket = getStorage().bucket();
    console.log("--- ALL STORAGE FILES (First 100) ---");
    const [files] = await bucket.getFiles({ maxResults: 100 });
    files.forEach(f => console.log(f.name));
}

listAllStorageFiles().catch(console.error);
