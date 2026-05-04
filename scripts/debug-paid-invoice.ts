
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugPaidInvoice() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    
    console.log("--- INSPECTING PAID INVOICE Yv5XWWZBsf5LTBUit2gg ---");
    const doc = await db.collection('invoices').doc('Yv5XWWZBsf5LTBUit2gg').get();
    if (doc.exists) {
        console.log(JSON.stringify(doc.data(), null, 2));
    } else {
        console.log("Invoice not found");
    }

    console.log("\n--- INSPECTING RECENT PAID INVOICES ---");
    const paidInvs = await db.collection('invoices').where('status', '==', 'paid').limit(3).get();
    paidInvs.forEach(d => {
        console.log(`ID: ${d.id}`);
        console.log(JSON.stringify(d.data(), null, 2));
    });
}

debugPaidInvoice().catch(console.error);
