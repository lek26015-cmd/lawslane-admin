
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugRegistrationRequests() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    
    console.log("--- SEARCHING registrationRequests COLLECTION ---");
    const snap = await db.collection('registrationRequests').orderBy('createdAt', 'desc').limit(5).get();
    console.log(`Found ${snap.size} documents in registrationRequests`);
    snap.forEach(d => {
        const data = d.data();
        console.log(`ID: ${d.id}, Name: ${data.name}, Status: ${data.status}`);
        console.log(`  licenseUrl: ${data.licenseUrl}`);
        console.log(`  idCardUrl: ${data.idCardUrl}`);
        console.log(`  Other fields: ${Object.keys(data).filter(k => k.toLowerCase().includes('url') || k.toLowerCase().includes('doc'))}`);
        console.log("-------------------");
    });
}

debugRegistrationRequests().catch(console.error);
