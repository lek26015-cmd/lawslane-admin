
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkUsersForDocs() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    
    console.log("--- SEARCHING ALL USERS FOR DOCUMENTS ---");
    const snap = await db.collection('users').get();
    
    snap.forEach(d => {
        const data = d.data();
        const fields = Object.keys(data).filter(k => k.toLowerCase().includes('url') || k.toLowerCase().includes('doc') || k.toLowerCase().includes('card') || k.toLowerCase().includes('license'));
        const hasVal = fields.some(f => data[f]);
        if (hasVal) {
            console.log(`User ID: ${d.id}, Name: ${data.name}, Role: ${data.role}`);
            console.log(`  Found fields with values: ${fields.filter(f => data[f]).map(f => `${f}(${data[f]})`).join(', ')}`);
        }
    });
}

checkUsersForDocs().catch(console.error);
