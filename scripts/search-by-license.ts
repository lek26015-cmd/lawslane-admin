
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function searchByLicense() {
    const cloudConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!getApps().length) {
        initializeApp({ credential: cert(cloudConfig) });
    }

    const db = getFirestore();
    const license = '4331/2568';
    
    const collections = await db.listCollections();
    console.log(`Searching for license: ${license} in ${collections.length} collections...`);
    
    for (const col of collections) {
        const snap = await col.where('licenseNumber', '==', license).get();
        if (snap.size > 0) {
            console.log(`Found in ${col.id}:`);
            snap.forEach(d => console.log(`  - ${d.id}: ${JSON.stringify(d.data())}`));
        }
        
        // Also search for fields containing the license string
        const snap2 = await col.orderBy('__name__').limit(100).get(); // Sample search
        snap2.forEach(d => {
            const str = JSON.stringify(d.data());
            if (str.includes(license)) {
                console.log(`Potential match in ${col.id}/${d.id}`);
            }
        });
    }
}

searchByLicense().catch(console.error);
