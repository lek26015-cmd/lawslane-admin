
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function searchRegistrationRequestsDeep() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    const uid = 'TQFMGZkOaEYJ1jqYqLAHjOsCFK12'; // Old lawyer
    
    console.log(`--- DEEP SEARCHING registrationRequests FOR UID: ${uid} ---`);
    const snap = await db.collection('registrationRequests').get();
    
    snap.forEach(d => {
        const str = JSON.stringify(d.data());
        if (str.includes(uid)) {
            console.log(`Found match in registrationRequests/${d.id}`);
            console.log(str);
        }
    });
}

searchRegistrationRequestsDeep().catch(console.error);
