
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkSubcollections() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    
    // Check one known lawyer
    const lawyerId = 'l0qejRbWCQNWQNelAIy9JCc2tNv1';
    console.log(`--- CHECKING SUBCOLLECTIONS FOR ${lawyerId} ---`);
    const docRef = db.collection('lawyerProfiles').doc(lawyerId);
    const subcols = await docRef.listCollections();
    console.log(`Found ${subcols.length} subcollections`);
    subcols.forEach(c => console.log(`  - ${c.id}`));
    
    // Also check chats for that lawyer
    console.log(`--- CHECKING CHATS FOR ${lawyerId} ---`);
    const chats = await db.collection('chats').where('lawyerId', '==', lawyerId).get();
    console.log(`Found ${chats.size} chats`);
}

checkSubcollections().catch(console.error);
