
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkPendingLawyers() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    
    console.log("--- PENDING LAWYERS WITH DOCUMENTS ---");
    const snap = await db.collection('lawyerProfiles').where('status', '==', 'pending').get();
    console.log(`Found ${snap.size} pending lawyers`);
    
    snap.forEach(d => {
        const data = d.data();
        const hasDocs = Object.keys(data).some(k => (k.toLowerCase().includes('url') || k.toLowerCase().includes('doc')) && data[k]);
        console.log(`ID: ${d.id}, Name: ${data.name}, HasDocs: ${hasDocs}`);
        if (hasDocs) {
            console.log(`  Fields: ${Object.keys(data).filter(k => (k.toLowerCase().includes('url') || k.toLowerCase().includes('doc')) && data[k])}`);
        }
    });
}

checkPendingLawyers().catch(console.error);
