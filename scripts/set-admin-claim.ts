/**
 * ย้ายสิทธิ์แอดมินจาก Firestore → Firebase custom claim
 *
 * ทำไมต้องมี: `src/lib/auth-guard.ts` เชื่อเฉพาะ custom claim (เพราะ firestore.rules
 * ให้ผู้ใช้เขียน users/{uid} ของตัวเองได้) แต่ก่อนหน้านี้ **ไม่มีเครื่องมือตั้ง claim เลย** —
 * `scripts/set-admin.ts` เขียนแค่ Firestore doc ส่วน `scripts/set-admin-claim.js`
 * ที่ auth-guard อ้างถึงไม่เคยมีอยู่จริง แอดมินเดิมจึงผ่านด่านได้ด้วย
 * LEGACY_SUPER_ADMIN_UIDS เท่านั้น
 *
 * วิธีใช้ (ดูผลก่อนเสมอ):
 *   npx tsx scripts/audit-admin-claims.ts          # 1. สำรวจ
 *   npx tsx scripts/set-admin-claim.ts             # 2. dry-run (ค่าเริ่มต้น ไม่เขียนอะไร)
 *   npx tsx scripts/set-admin-claim.ts --apply     # 3. เขียนจริง
 *   npx tsx scripts/set-admin-claim.ts --apply --uid=<uid>   # ทีละคน
 *
 * หลัง --apply: claim ใหม่จะยังไม่มีผลกับ session cookie ที่ mint ไปแล้ว (อายุ 5 วัน)
 * สคริปต์จึง revokeRefreshTokens ให้ → พนักงานต้องล็อกอินใหม่ แจ้งล่วงหน้าด้วย
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { ALL_PERMISSIONS } from '../src/lib/permissions';
import { LEGACY_SUPER_ADMIN_UIDS } from '../src/lib/super-admin';

dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const ONLY_UID = process.argv.find(a => a.startsWith('--uid='))?.split('=')[1];

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
    const auth = getAuth();
    const db = getFirestore();

    console.log(`project : ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
    console.log(`mode    : ${APPLY ? '🔴 APPLY (เขียนจริง)' : '🟢 DRY-RUN (ไม่เขียนอะไร)'}`);
    if (ONLY_UID) console.log(`เฉพาะ uid: ${ONLY_UID}`);
    console.log();

    const snap = await db.collection('users').where('role', '==', 'admin').get();
    const targets = snap.docs.filter(d => !ONLY_UID || d.id === ONLY_UID);

    // UID เก่าที่อาจไม่มี doc ใน Firestore ก็ต้องได้ claim ด้วย
    const seen = new Set(targets.map(d => d.id));
    const extra = LEGACY_SUPER_ADMIN_UIDS.filter(u => !seen.has(u) && (!ONLY_UID || u === ONLY_UID));

    if (targets.length === 0 && extra.length === 0) {
        console.log('ไม่พบบัญชีที่ต้องย้าย');
        return;
    }

    let ok = 0, failed = 0;

    const plan = [
        ...targets.map(d => ({ uid: d.id, data: d.data() as any })),
        ...extra.map(uid => ({ uid, data: { superAdmin: true, email: '(ไม่มี doc ใน Firestore)' } as any })),
    ];

    for (const { uid, data } of plan) {
        const isSuper =
            data.superAdmin === true ||
            LEGACY_SUPER_ADMIN_UIDS.includes(uid);

        // adminPermissions เดิม: null/ไม่มี = ไม่จำกัด → ให้สิทธิ์ครบทุกรหัส
        // อย่ายก super ให้เอง ใครเป็น super ต้องมาจาก superAdmin: true เท่านั้น
        const legacyPerms: string[] | null | undefined = data.adminPermissions;
        const perms = Array.isArray(legacyPerms) && legacyPerms.length > 0
            ? legacyPerms
            : [...ALL_PERMISSIONS];

        const claims: Record<string, unknown> = {
            admin: true,
            role: 'admin',        // เข้ากันได้กับโค้ดเดิมที่ยังอ่าน role
            superAdmin: isSuper,  // เดิม
            su: isSuper,          // ใหม่ — ตัวที่ auth-guard อ่าน
        };
        // super admin ข้ามทุกด่านอยู่แล้ว ไม่ต้องแบก array (กัน claim ชนเพดาน 1000 bytes)
        if (!isSuper) claims.p = perms;

        const size = Buffer.byteLength(JSON.stringify(claims), 'utf8');
        const label = `${uid}  ${data.email ?? ''}`;

        if (size > 900) {
            console.error(`❌ ${label}\n   claim ใหญ่ ${size} bytes (เพดาน 1000) — ตัดสิทธิ์ลงก่อน`);
            failed++;
            continue;
        }

        console.log(`${APPLY ? '→' : '·'} ${label}`);
        console.log(`   ${isSuper ? 'SUPER ADMIN' : `${perms.length} สิทธิ์`}  (${size} bytes)`);
        if (!isSuper) console.log(`   ${perms.join(', ')}`);

        if (APPLY) {
            try {
                const existing = (await auth.getUser(uid)).customClaims ?? {};
                await auth.setCustomUserClaims(uid, { ...existing, ...claims });
                // claim ฝังอยู่ใน session cookie ตอน mint — ต้องบังคับให้ล็อกอินใหม่
                await auth.revokeRefreshTokens(uid);
                ok++;
            } catch (e: any) {
                console.error(`   ❌ ${e.message}`);
                failed++;
            }
        }
    }

    console.log();
    if (APPLY) {
        console.log(`สำเร็จ ${ok} · ล้มเหลว ${failed}`);
        console.log('⚠️  ทุกคนต้องล็อกอินใหม่ (revokeRefreshTokens แล้ว)');
        console.log('ตรวจซ้ำ: npx tsx scripts/audit-admin-claims.ts');
    } else {
        console.log(`จะเขียน ${plan.length - failed} บัญชี — รันซ้ำด้วย --apply เมื่อตรวจแล้วถูกต้อง`);
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
