/**
 * Backfill ฟิลด์ที่หน้า /customers และ /lawyers ต้องใช้ (ดู src/app/customers/page.tsx,
 * src/app/lawyers/page.tsx):
 *   - `nameLower` บน users และ lawyerProfiles — คีย์ prefix-search
 *   - `registeredAt` บน users — รายการเรียงด้วย orderBy('registeredAt') ซึ่ง Firestore
 *     ข้ามเอกสารที่ไม่มีฟิลด์นี้ทิ้งเงียบ ๆ บัญชีจึงไม่ขึ้นในรายการเลย
 *
 * ทำไมต้องมี: Firestore ไม่มี full-text/substring search ในตัว วิธีที่ทำได้โดยไม่ต้องพึ่ง
 * search-index service ภายนอกคือ prefix-range query บน field ที่ normalize เป็นตัวพิมพ์เล็ก
 * ไว้ล่วงหน้า เอกสารเก่าที่ยังไม่มี field นี้จะไม่ถูกค้นเจอ (ไม่ error แค่ไม่ match) จนกว่าจะ
 * รันสคริปต์นี้ — ทั้งหลังบ้านและเว็บหลัก (Lawslane/ ทุกทางที่สร้าง users) เขียนสองฟิลด์นี้
 * ให้เองแล้ว สคริปต์นี้มีไว้เก็บเอกสารเก่า
 *
 * registeredAt เอามาจาก createdAt ของเอกสารก่อน ไม่มีก็ใช้เวลาสร้างบัญชีใน Firebase Auth
 * ไม่มีทั้งคู่ = ข้าม (ไม่เดาวันที่)
 *
 * วิธีใช้ (ดูผลก่อนเสมอ เหมือน scripts/set-admin-claim.ts):
 *   npx tsx scripts/backfill-lowercase-fields.ts                                    # 1. dry-run ทั้งหมด (ค่าเริ่มต้น ไม่เขียนอะไร)
 *   npx tsx scripts/backfill-lowercase-fields.ts --docId=<uid> --collection=users    # 2. ทดสอบ doc เดียวก่อน
 *   npx tsx scripts/backfill-lowercase-fields.ts --apply --collection=users          # 3. เขียนจริงทีละ collection
 *   npx tsx scripts/backfill-lowercase-fields.ts --apply --collection=lawyerProfiles
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
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

// ให้ตรงกับหน้า /customers ที่ค้นด้วย searchInput.trim().toLowerCase()
const toNameLower = (name: string) => name.trim().toLowerCase();

function toTimestamp(value: unknown): Timestamp | null {
  if (value instanceof Timestamp) return value;
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
  }
  return null;
}

async function registeredAtFor(uid: string, data: FirebaseFirestore.DocumentData) {
  const fromDoc = toTimestamp(data.createdAt);
  if (fromDoc) return { value: fromDoc, source: 'createdAt' };
  try {
    const user = await getAuth().getUser(uid);
    return { value: Timestamp.fromDate(new Date(user.metadata.creationTime)), source: 'auth' };
  } catch {
    return null;
  }
}

async function backfillCollection(db: Firestore, collectionName: 'users' | 'lawyerProfiles') {
  console.log(`\n=== ${collectionName} ===`);

  const docs = ONLY_DOC_ID
    ? await db.collection(collectionName).doc(ONLY_DOC_ID).get().then(d => (d.exists ? [d] : []))
    : await db.collection(collectionName).get().then(snap => snap.docs);

  let toUpdate = 0;
  let skipped = 0;
  let nameLowerCount = 0;
  let registeredAtCount = 0;
  let noDate = 0;
  let batch = db.batch();
  let inBatch = 0;

  for (const doc of docs) {
    const data = doc.data() || {};
    const update: Record<string, unknown> = {};
    const notes: string[] = [];

    const name: string | undefined = data.name;
    if (name && data.nameLower !== toNameLower(name)) {
      update.nameLower = toNameLower(name);
      notes.push(`nameLower: "${update.nameLower}"`);
      nameLowerCount++;
    }

    if (collectionName === 'users' && !data.registeredAt) {
      const reg = await registeredAtFor(doc.id, data);
      if (reg) {
        update.registeredAt = reg.value;
        notes.push(`registeredAt: ${reg.value.toDate().toISOString()} (จาก ${reg.source})`);
        registeredAtCount++;
      } else {
        notes.push('registeredAt: ไม่มี createdAt/บัญชี Auth — ข้าม');
        noDate++;
      }
    }

    if (Object.keys(update).length === 0) {
      // ทำไปแล้ว หรือไม่มีอะไรเปลี่ยน — ข้าม ทำให้สคริปต์รันซ้ำได้อย่างปลอดภัย (idempotent)
      skipped++;
      continue;
    }

    toUpdate++;
    console.log(`${APPLY ? '→' : '·'} ${doc.id}  [${data.role ?? '-'}] "${name ?? ''}"  ${notes.join('  ')}`);

    if (APPLY) {
      batch.update(doc.ref, update);
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
    `${collectionName}: ${APPLY ? 'อัปเดตแล้ว' : 'จะอัปเดต'} ${toUpdate} เอกสาร ` +
      `(nameLower ${nameLowerCount}` +
      (collectionName === 'users' ? `, registeredAt ${registeredAtCount}, หาวันที่ไม่ได้ ${noDate}` : '') +
      `), ข้าม ${skipped} เอกสาร (ครบแล้ว)`
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
