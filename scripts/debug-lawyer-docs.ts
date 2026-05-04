
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugLawyerDocs() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    
    console.log("--- FETCHING RECENT LAWYERS ---");
    const snap = await db.collection('lawyerProfiles').orderBy('joinedAt', 'desc').limit(5).get();
    snap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}, Name: ${data.name}`);
        console.log("  licenseUrl:", data.licenseUrl);
        console.log("  idCardUrl:", data.idCardUrl);
        console.log("  Other keys:", Object.keys(data).filter(k => k.toLowerCase().includes('url') || k.toLowerCase().includes('doc') || k.toLowerCase().includes('file')));
        console.log("-------------------");
    });
}

debugLawyerDocs().catch(console.error);
