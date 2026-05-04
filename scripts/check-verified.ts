
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkVerifiedLawyers() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    
    console.log("--- CHECKING verifiedLawyers COLLECTION ---");
    const snap = await db.collection('verifiedLawyers').get();
    console.log(`Found ${snap.size} verified lawyers`);
    
    snap.forEach(d => {
        const data = d.data();
        const fields = Object.keys(data).filter(k => k.toLowerCase().includes('url') || k.toLowerCase().includes('doc') || k.toLowerCase().includes('file'));
        if (fields.length > 0) {
            console.log(`ID: ${d.id}, Name: ${data.firstName} ${data.lastName}`);
            console.log(`  Doc Fields: ${fields.map(f => `${f}(${!!data[f]})`).join(', ')}`);
        }
    });
}

checkVerifiedLawyers().catch(console.error);
