
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function searchEverywhere() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    const email = 'kurees.law@gmail.com';
    const uid = 'TQFMGZkOaEYJ1jqYqLAHjOsCFK12';
    
    const collections = await db.listCollections();
    console.log(`Searching for email: ${email} or UID: ${uid} in ${collections.length} collections...`);
    
    for (const col of collections) {
        // Search by email
        const snap1 = await col.where('email', '==', email).get();
        if (snap1.size > 0) {
            console.log(`Found in ${col.id} (by email):`);
            snap1.forEach(d => console.log(`  - ${d.id}: ${JSON.stringify(d.data())}`));
        }
        
        // Search by userId
        const snap2 = await col.where('userId', '==', uid).get();
        if (snap2.size > 0) {
            console.log(`Found in ${col.id} (by userId):`);
            snap2.forEach(d => console.log(`  - ${d.id}: ${JSON.stringify(d.data())}`));
        }
        
        // Search by id (document ID)
        const doc = await col.doc(uid).get();
        if (doc.exists && col.id !== 'lawyerProfiles' && col.id !== 'users') {
            console.log(`Found in ${col.id} (as doc ID):`);
            console.log(`  - ${doc.id}: ${JSON.stringify(doc.data())}`);
        }
    }
}

searchEverywhere().catch(console.error);
