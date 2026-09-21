/**
 * ตรวจสภาพสิทธิ์แอดมินทั้งระบบ — อ่านอย่างเดียว ไม่เขียนอะไรทั้งสิ้น
 *
 * รันก่อน set-admin-claim.ts เสมอ เพื่อรู้ว่ามีแอดมินกี่คน ใครมี custom claim แล้ว
 * และใครยังผ่านด่านได้ด้วย LEGACY_SUPER_ADMIN_UIDS เท่านั้น
 *
 *   npx tsx scripts/audit-admin-claims.ts
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { LEGACY_SUPER_ADMIN_UIDS } from '../src/lib/super-admin';

dotenv.config({ path: '.env.local' });

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

    console.log(`project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}\n`);

    // 1) ใครบ้างที่ Firestore บอกว่าเป็นแอดมิน
    const snap = await db.collection('users').where('role', '==', 'admin').get();
    const firestoreAdmins = new Map<string, any>();
    snap.forEach(d => firestoreAdmins.set(d.id, d.data()));

    // 2) ใครบ้างที่มี custom claim อยู่แล้ว (ต้องไล่ทุกบัญชี — ไม่มี query สำหรับ claim)
    const claimAdmins = new Map<string, any>();
    let pageToken: string | undefined;
    let total = 0;
    do {
        const res = await auth.listUsers(1000, pageToken);
        total += res.users.length;
        for (const u of res.users) {
            const c = u.customClaims ?? {};
            if (c.admin === true || c.role === 'admin' || c.superAdmin === true || c.su === true) {
                claimAdmins.set(u.uid, { email: u.email, claims: c });
            }
        }
        pageToken = res.pageToken;
    } while (pageToken);

    const uids = new Set([...firestoreAdmins.keys(), ...claimAdmins.keys(), ...LEGACY_SUPER_ADMIN_UIDS]);

    console.log(`บัญชีทั้งหมดใน Auth: ${total}`);
    console.log(`Firestore role==='admin': ${firestoreAdmins.size}`);
    console.log(`มี custom claim แอดมิน:   ${claimAdmins.size}\n`);
    console.log('uid'.padEnd(30), 'claim'.padEnd(8), 'fs?'.padEnd(5), 'legacy?'.padEnd(8), 'email');
    console.log("(claim: new = ย้ายแล้ว มี su/p · old = มี claim แต่ยังไม่มี su/p · NO = ไม่มีเลย)");
    console.log('-'.repeat(110));

    let needsClaim = 0;
    for (const uid of uids) {
        const fs = firestoreAdmins.get(uid);
        const cl = claimAdmins.get(uid);
        const legacy = LEGACY_SUPER_ADMIN_UIDS.includes(uid);
        let email = cl?.email ?? fs?.email ?? '';
        if (!email) {
            try { email = (await auth.getUser(uid)).email ?? '(ไม่มีอีเมล)'; }
            catch { email = '(ไม่มีบัญชีใน Auth)'; }
        }
        // "ย้ายแล้ว" = มี claim รูปแบบใหม่ (su:true สำหรับ super, หรือมี array p)
        const c = cl?.claims ?? {};
        const migrated = c.su === true || Array.isArray(c.p);
        if (!migrated) needsClaim++;
        console.log(
            uid.padEnd(30),
            (migrated ? 'new' : cl ? 'old' : 'NO').padEnd(8),
            (fs ? 'yes' : '-').padEnd(5),
            (legacy ? 'yes' : '-').padEnd(8),
            email,
        );
        if (cl) console.log(' '.repeat(30), 'claims:', JSON.stringify(cl.claims));
        if (fs) console.log(' '.repeat(30), 'adminPermissions:', JSON.stringify(fs.adminPermissions ?? null), '| superAdmin:', fs.superAdmin ?? false);
    }

    console.log('\n' + '-'.repeat(110));
    console.log(`ยังไม่ได้ย้ายเป็น claim รูปแบบใหม่: ${needsClaim} บัญชี`);
    if (needsClaim > 0) {
        console.log('→ npx tsx scripts/set-admin-claim.ts        (ดูผลก่อน)');
        console.log('→ npx tsx scripts/set-admin-claim.ts --apply');
        console.log('⚠️  บัญชีที่ยังไม่มี p ใน claim จะถูกนับเป็น "ไม่จำกัดสิทธิ์" ตามตาข่ายใน auth-guard');
        console.log('⚠️  ห้ามถอด LEGACY_SUPER_ADMIN_UIDS ออกจาก src/lib/auth-guard.ts จนกว่าตัวเลขนี้จะเป็น 0');
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
