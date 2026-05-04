
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugChatData() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    
    const chatId = '2e81d82e-c5d2-46a1-9a23-b9b45dfb6b21';
    console.log(`--- INSPECTING CHAT ${chatId} ---`);
    const doc = await db.collection('chats').doc(chatId).get();
    if (doc.exists) {
        const data = doc.data()!;
        console.log("Status:", data.status);
        console.log("Keys:", Object.keys(data));
        console.log("Installments:", data.installments ? data.installments.length : 0);
        if (data.installments) {
            data.installments.forEach((inst: any, i: number) => {
                console.log(`  Inst ${i}:`, inst);
            });
        }
        console.log("Pending Details:", data.pendingPaymentDetails);
        
        // Check for any field that ends in _url or contains slip
        const interestingFields = Object.entries(data).filter(([k, v]) => 
            k.toLowerCase().includes('slip') || k.toLowerCase().includes('url') || k.toLowerCase().includes('proof')
        );
        console.log("Interesting Fields:", interestingFields);
    } else {
        console.log("Chat not found");
    }
}

debugChatData().catch(console.error);
