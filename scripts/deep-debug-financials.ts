
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugRecentFinancials() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    
    console.log("--- FETCHING RECENT APPOINTMENTS ---");
    const appSnap = await db.collection('appointments').orderBy('createdAt', 'desc').limit(5).get();
    appSnap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}, Status: ${data.status}`);
        // Find any field that contains "http" or ".png" or ".jpg"
        const potentialSlips = Object.entries(data).filter(([k, v]) => 
            typeof v === 'string' && (v.includes('http') || v.includes('.png') || v.includes('.jpg') || v.includes('.jpeg'))
        );
        console.log("Potential Slip Fields:", potentialSlips);
        console.log("Full Data Keys:", Object.keys(data));
        console.log("Pending Details:", data.pendingPaymentDetails ? Object.keys(data.pendingPaymentDetails) : 'None');
        console.log("-------------------");
    });

    console.log("\n--- FETCHING RECENT INVOICES ---");
    const invSnap = await db.collection('invoices').orderBy('createdAt', 'desc').limit(5).get();
    invSnap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}, Status: ${data.status}`);
        const potentialSlips = Object.entries(data).filter(([k, v]) => 
            typeof v === 'string' && (v.includes('http') || v.includes('.png') || v.includes('.jpg') || v.includes('.jpeg'))
        );
        console.log("Potential Slip Fields:", potentialSlips);
        console.log("-------------------");
    });

    console.log("\n--- FETCHING RECENT CHATS WITH PAYMENTS ---");
    const chatSnap = await db.collection('chats').where('status', 'in', ['active', 'closed', 'pending_payment']).limit(5).get();
    chatSnap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}, Status: ${data.status}`);
        const potentialSlips = Object.entries(data).filter(([k, v]) => 
            typeof v === 'string' && (v.includes('http') || v.includes('.png') || v.includes('.jpg') || v.includes('.jpeg'))
        );
        console.log("Potential Slip Fields:", potentialSlips);
        if (data.installments) {
            console.log("Installments Count:", data.installments.length);
            data.installments.forEach((inst: any, i: number) => {
                console.log(`  Inst ${i}: Status=${inst.status}, hasSlip=${!!inst.slipUrl}`);
            });
        }
        console.log("-------------------");
    });
}

debugRecentFinancials().catch(console.error);
