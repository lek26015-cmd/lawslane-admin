
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function searchForSlips() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    
    const collections = ['slips', 'payments', 'payment_proofs', 'transactions', 'evidence'];
    for (const col of collections) {
        const snap = await db.collection(col).limit(5).get();
        console.log(`Collection '${col}': ${snap.size} docs`);
        snap.forEach(d => {
            console.log(`  ID: ${d.id}, Data Keys: ${Object.keys(d.data())}`);
        });
    }
    
    // Also check messages for one chat
    const chatId = '2e81d82e-c5d2-46a1-9a23-b9b45dfb6b21';
    console.log(`--- CHECKING MESSAGES FOR CHAT ${chatId} ---`);
    const msgSnap = await db.collection('chats').doc(chatId).collection('messages').orderBy('timestamp', 'desc').limit(10).get();
    msgSnap.forEach(d => {
        const data = d.data();
        console.log(`  Msg ID: ${d.id}, Type: ${data.type || 'text'}, Text: ${data.text?.slice(0, 30)}`);
        if (data.metadata?.attachments || data.attachments || data.fileUrl || data.url) {
            console.log("    HAS ATTACHMENT:", data.metadata?.attachments || data.attachments || data.fileUrl || data.url);
        }
    });
}

searchForSlips().catch(console.error);
