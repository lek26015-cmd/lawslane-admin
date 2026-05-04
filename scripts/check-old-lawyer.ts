
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkOldLawyerSubcollections() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    
    // An old lawyer UID
    const lawyerId = 'TQFMGZkOaEYJ1jqYqLAHjOsCFK12';
    console.log(`--- CHECKING SUBCOLLECTIONS FOR OLD LAWYER ${lawyerId} ---`);
    const docRef = db.collection('lawyerProfiles').doc(lawyerId);
    const subcols = await docRef.listCollections();
    console.log(`Found ${subcols.length} subcollections`);
    subcols.forEach(c => console.log(`  - ${c.id}`));

    if (subcols.length > 0) {
        for (const col of subcols) {
            const docs = await col.get();
            console.log(`  Collection ${col.id} has ${docs.size} docs`);
            docs.forEach(d => console.log(`    - ${d.id}: ${JSON.stringify(d.data())}`));
        }
    }
}

checkOldLawyerSubcollections().catch(console.error);
