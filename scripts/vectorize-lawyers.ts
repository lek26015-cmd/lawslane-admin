import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { collection, getDocs, query, where } from 'firebase/firestore';

const WORKER_URL = 'https://lawslane-rag-api.lawlanes-app.workers.dev';

async function ingestLawyer(id: string, text: string, lawyerId: string) {
    try {
        const response = await fetch(`${WORKER_URL}/ingest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Lawslane-Vectorizer/1.0'
            },
            body: JSON.stringify({
                text,
                metadata: {
                    type: 'lawyer',
                    lawyerId,
                    text: text.slice(0, 500), // Store truncated text for preview
                },
                id
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to ingest: ${response.status} ${response.statusText} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Ingest error for ${lawyerId}:`, error);
        return null;
    }
}

async function main() {
    console.log("🔧 Initializing Firebase...");
    console.log("Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

    // Dynamic import to ensure env vars are loaded first
    const { initializeFirebase } = await import('../src/firebase');
    const { firestore } = initializeFirebase();
    if (!firestore) throw new Error("Firestore is not initialized.");

    console.log("📋 Fetching approved lawyer profiles...");
    const lawyersRef = collection(firestore, 'lawyerProfiles');
    const q = query(lawyersRef, where('status', '==', 'approved'));
    const snapshot = await getDocs(q);

    console.log(`Found ${snapshot.size} approved lawyers.`);

    let successCount = 0;
    let errorCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const lawyerId = doc.id;

        // Build a rich text paragraph combining all profile fields
        const parts: string[] = [];

        if (data.name) parts.push(`ชื่อ: ${data.name}`);
        if (data.specialty && data.specialty.length > 0) {
            parts.push(`ความเชี่ยวชาญ: ${data.specialty.join(', ')}`);
        }
        if (data.experience) parts.push(`ประสบการณ์: ${data.experience}`);
        if (data.education) parts.push(`การศึกษา: ${data.education}`);
        if (data.description) parts.push(`รายละเอียด: ${data.description}`);
        if (data.serviceProvinces && data.serviceProvinces.length > 0) {
            parts.push(`พื้นที่ให้บริการ: ${data.serviceProvinces.join(', ')}`);
        }

        // Include English versions if available (helps with multilingual matching)
        if (data.experienceEn) parts.push(`Experience: ${data.experienceEn}`);
        if (data.educationEn) parts.push(`Education: ${data.educationEn}`);
        if (data.descriptionEn) parts.push(`Description: ${data.descriptionEn}`);

        const fullText = parts.join('\n');

        if (fullText.trim().length < 20) {
            console.warn(`⚠️  Skipping ${data.name || lawyerId} — profile too sparse.`);
            continue;
        }

        // Deterministic ID to prevent duplicates
        const vectorId = `lawyer-${lawyerId}`;

        console.log(`  → Vectorizing: ${data.name || lawyerId} (${vectorId})`);
        const result = await ingestLawyer(vectorId, fullText, lawyerId);

        if (result) {
            successCount++;
            console.log(`    ✅ Indexed successfully.`);
        } else {
            errorCount++;
            console.log(`    ❌ Failed to index.`);
        }

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 300));
    }

    console.log(`\n🏁 Vectorization complete!`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total: ${snapshot.size}`);

    process.exit(0);
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
