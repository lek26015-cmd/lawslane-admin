
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkAllRegistrationRequests() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    
    console.log("--- CHECKING registrationRequests COLLECTION ---");
    const snap = await db.collection('registrationRequests').get();
    console.log(`Found ${snap.size} registration requests`);
    
    snap.forEach(d => {
        const data = d.data();
        const fields = Object.keys(data).filter(k => k.toLowerCase().includes('url') || k.toLowerCase().includes('doc') || k.toLowerCase().includes('file'));
        console.log(`ID: ${d.id}, Type: ${data.registrationType || 'N/A'}, Company: ${data.companyName || data.name}, HasDocs: ${fields.length > 0}`);
        if (fields.length > 0) {
            console.log(`  Fields: ${fields.join(', ')}`);
        }
    });
}

checkAllRegistrationRequests().catch(console.error);
