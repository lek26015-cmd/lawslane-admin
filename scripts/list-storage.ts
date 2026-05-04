
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function listStorageFiles() {
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
    console.log("--- STORAGE FILES (lawyer_documents/) ---");
    const [files] = await bucket.getFiles({ prefix: 'lawyer_documents/', maxResults: 50 });
    files.forEach(f => console.log(f.name));
    
    console.log("--- STORAGE FILES (payments/) ---");
    const [pFiles] = await bucket.getFiles({ prefix: 'payments/', maxResults: 50 });
    pFiles.forEach(f => console.log(f.name));
}

listStorageFiles().catch(console.error);
