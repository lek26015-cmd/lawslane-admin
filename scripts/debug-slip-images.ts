
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugSlipImages() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    
    console.log("--- SEARCHING slipImages COLLECTION ---");
    const snap = await db.collection('slipImages').orderBy('createdAt', 'desc').limit(10).get();
    console.log(`Found ${snap.size} documents in slipImages`);
    snap.forEach(d => {
        const data = d.data();
        console.log(`ID: ${d.id}, ChatId: ${data.chatId || data.room_id || 'None'}, Amount: ${data.amount}`);
        console.log(`  Url: ${data.url || data.slipUrl}`);
    });
}

debugSlipImages().catch(console.error);
