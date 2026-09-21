/**
 * Backfill `nameLower` บน users และ lawyerProfiles สำหรับ prefix-search ในหน้า
 * /customers และ /lawyers (ดู src/app/customers/page.tsx, src/app/lawyers/page.tsx)
 *
 * ทำไมต้องมี: Firestore ไม่มี full-text/substring search ในตัว วิธีที่ทำได้โดยไม่ต้องพึ่ง
 * search-index service ภายนอกคือ prefix-range query บน field ที่ normalize เป็นตัวพิมพ์เล็ก
 * ไว้ล่วงหน้า เอกสารเก่าที่ยังไม่มี field นี้จะไม่ถูกค้นเจอ (ไม่ error แค่ไม่ match) จนกว่าจะ
 * รันสคริปต์นี้ — บัญชีที่สร้าง/แก้ไขผ่านหน้า /customers, /lawyers (ในแอปนี้) หลังจากนี้จะได้
 * field นี้อัตโนมัติแล้ว แต่บัญชีที่สมัครผ่านเว็บหลัก (Lawslane/) ยังไม่ sync field นี้ —
 * เป็นงานแยกที่ต้องตามไปทำใน repo นั้น
 *
 * วิธีใช้ (ดูผลก่อนเสมอ เหมือน scripts/set-admin-claim.ts):
 *   npx tsx scripts/backfill-lowercase-fields.ts                                    # 1. dry-run ทั้งหมด (ค่าเริ่มต้น ไม่เขียนอะไร)
 *   npx tsx scripts/backfill-lowercase-fields.ts --docId=<uid> --collection=users    # 2. ทดสอบ doc เดียวก่อน
 *   npx tsx scripts/backfill-lowercase-fields.ts --apply --collection=users          # 3. เขียนจริงทีละ collection
 *   npx tsx scripts/backfill-lowercase-fields.ts --apply --collection=lawyerProfiles
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const ONLY_DOC_ID = process.argv.find(a => a.startsWith('--docId='))?.split('=')[1];
const ONLY_COLLECTION = process.argv.find(a => a.startsWith('--collection='))?.split('=')[1] as
  | 'users'
  | 'lawyerProfiles'
  | undefined;

const ALL_COLLECTIONS: Array<'users' | 'lawyerProfiles'> = ['users', 'lawyerProfiles'];

// ต่ำกว่าเพดานจริงของ Firestore batch (500) ไว้กันชนพอดี
const BATCH_LIMIT = 400;

async function backfillCollection(db: Firestore, collectionName: 'users' | 'lawyerProfiles') {
  console.log(`\n=== ${collectionName} ===`);

  const docs = ONLY_DOC_ID
    ? await db.collection(collectionName).doc(ONLY_DOC_ID).get().then(d => (d.exists ? [d] : []))
    : await db.collection(collectionName).get().then(snap => snap.docs);

  let toUpdate = 0;
  let skipped = 0;
  let batch = db.batch();
  let inBatch = 0;

  for (const doc of docs) {
    const data = doc.data();
    const name: string | undefined = data?.name;
    if (!name) {
      skipped++;
      continue;
    }
    const nameLower = name.toLowerCase();
    if (data?.nameLower === nameLower) {
      // ทำไปแล้ว หรือไม่มีอะไรเปลี่ยน — ข้าม ทำให้สคริปต์รันซ้ำได้อย่างปลอดภัย (idempotent)
      skipped++;
      continue;
    }

    toUpdate++;
    console.log(`${APPLY ? '→' : '·'} ${doc.id}  "${name}" → nameLower: "${nameLower}"`);

    if (APPLY) {
      batch.update(doc.ref, { nameLower });
      inBatch++;
      if (inBatch >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        inBatch = 0;
      }
    }
  }

  if (APPLY && inBatch > 0) {
    await batch.commit();
  }

  console.log(
    `${collectionName}: ${APPLY ? 'อัปเดตแล้ว' : 'จะอัปเดต'} ${toUpdate} เอกสาร, ข้าม ${skipped} เอกสาร (ไม่มีชื่อ/ทำไปแล้ว)`
  );
}

async function main() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  const db = getFirestore();

  console.log(`project : ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  console.log(`mode    : ${APPLY ? '🔴 APPLY (เขียนจริง)' : '🟢 DRY-RUN (ไม่เขียนอะไร)'}`);
  if (ONLY_DOC_ID) console.log(`เฉพาะ docId: ${ONLY_DOC_ID}`);
  if (ONLY_COLLECTION) console.log(`เฉพาะ collection: ${ONLY_COLLECTION}`);
  console.log();

  const targets = ONLY_COLLECTION ? [ONLY_COLLECTION] : ALL_COLLECTIONS;
  for (const collectionName of targets) {
    await backfillCollection(db, collectionName);
  }

  if (!APPLY) {
    console.log('\nรันซ้ำด้วย --apply เมื่อตรวจผลด้านบนแล้วถูกต้อง (แนะนำทดสอบด้วย --docId=<uid> ก่อนรันเต็ม collection)');
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
