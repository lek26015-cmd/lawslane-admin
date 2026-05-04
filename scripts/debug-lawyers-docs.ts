
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugLawyers() {
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    if (!getApps().length) {
        initializeApp({
            credential: cert({
                clientEmail,
                privateKey,
                projectId,
            })
        });
    }

    const db = getFirestore();
    const lawyersSnap = await db.collection('lawyerProfiles').limit(10).get();
    
    console.log(`Found ${lawyersSnap.size} lawyers`);
    lawyersSnap.forEach(doc => {
        const data = doc.data();
        console.log(`Lawyer ID: ${doc.id}`);
        console.log(`Name: ${data.name}`);
        console.log(`License URL: ${data.licenseUrl}`);
        console.log(`ID Card URL: ${data.idCardUrl}`);
        console.log('---');
    });
}

debugLawyers().catch(console.error);
