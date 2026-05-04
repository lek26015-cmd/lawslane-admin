
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkUserDocs() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    
    console.log("--- SEARCHING users COLLECTION FOR LAWYER DOCS ---");
    const snap = await db.collection('users').where('role', '==', 'lawyer').get();
    console.log(`Found ${snap.size} users with role lawyer`);
    
    snap.forEach(d => {
        const data = d.data();
        const fields = Object.keys(data).filter(k => k.toLowerCase().includes('url') || k.toLowerCase().includes('doc'));
        if (fields.length > 0) {
            console.log(`ID: ${d.id}, Name: ${data.name}`);
            console.log(`  Fields: ${fields.map(f => `${f}(${!!data[f]})`).join(', ')}`);
        }
    });
}

checkUserDocs().catch(console.error);
