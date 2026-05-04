
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function findAnyHiddenUrls() {
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
    
    console.log(`--- SCANNING USERS AND LAWYERPROFILES FOR ANY URLS (UID: ${uid}) ---`);
    
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
        const data = userDoc.data() || {};
        Object.entries(data).forEach(([k, v]) => {
            if (typeof v === 'string' && (v.startsWith('http') || v.includes('/'))) {
                console.log(`[users] ${k}: ${v}`);
            }
        });
    }

    const lawyerDoc = await db.collection('lawyerProfiles').doc(uid).get();
    if (lawyerDoc.exists) {
        const data = lawyerDoc.data() || {};
        Object.entries(data).forEach(([k, v]) => {
            if (typeof v === 'string' && (v.startsWith('http') || v.includes('/'))) {
                console.log(`[lawyerProfiles] ${k}: ${v}`);
            }
        });
    }
}

findAnyHiddenUrls().catch(console.error);
