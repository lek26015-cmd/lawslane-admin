
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import * as admin from 'firebase-admin';

async function checkDataStatus() {
    console.log("--- Checking Actual Data Statuses ---");

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    }

    const db = admin.firestore();
    const collections = ['appointments', 'chats', 'invoices'];

    for (const col of collections) {
        console.log(`\nCollection: ${col}`);
        const snap = await db.collection(col).limit(5).get();
        if (snap.empty) {
            console.log("  - No documents found.");
        } else {
            snap.docs.forEach(doc => {
                const data = doc.data();
                console.log(`  - ID: ${doc.id}, Status: ${data.status}, hasNewPayment: ${data.hasNewPayment}`);
                if (col === 'chats') {
                    console.log(`    pendingPaymentDetails: ${data.pendingPaymentDetails ? 'Exists' : 'None'}`);
                }
            });
        }
    }
}

checkDataStatus().catch(console.error);
