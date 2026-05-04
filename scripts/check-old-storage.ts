
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkOldLawyerStorage() {
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
    const uid = 'TQFMGZkOaEYJ1jqYqLAHjOsCFK12';
    console.log(`--- CHECKING STORAGE FOR UID: ${uid} ---`);
    const [files] = await bucket.getFiles({ maxResults: 1000 });
    
    files.forEach(f => {
        if (f.name.includes(uid)) {
            console.log(`Found file: ${f.name}`);
        }
    });
}

checkOldLawyerStorage().catch(console.error);
