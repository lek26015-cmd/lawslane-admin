
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function dumpLawyer() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    const doc = await db.collection('lawyerProfiles').doc('TQFMGZkOaEYJ1jqYqLAHjOsCFK12').get();
    console.log(JSON.stringify(doc.data(), null, 2));
}

dumpLawyer().catch(console.error);
