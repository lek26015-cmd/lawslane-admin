'use server';

import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { requireSuperAdmin, AuthError } from '@/lib/auth-guard';
import { isDesignatedSuperAdmin } from '@/lib/super-admin';
import { ALL_PERMISSIONS, type Permission } from '@/lib/permissions';

/**
 * แก้/ถอนสิทธิ์แอดมินคนอื่น — คู่กับหน้า settings/administrators
 *
 * เดิมหน้าแก้ไข/ลบแอดมินเขียนแค่ Firestore (`updateDoc`) หรือไม่เขียนอะไรเลย (ปุ่มลบเป็นแค่
 * toast) ทำให้ custom claim ที่ auth-guard เชื่อจริงไม่เปลี่ยนตาม ต้องรันสคริปต์ CLI
 * (scripts/set-admin-claim.ts) แยกต่างหากถึงจะมีผล — สอง action นี้ทำสิ่งเดียวกับสคริปต์นั้น
 * แต่เรียกจาก UI ได้ทันที
 */

type ActionResult = { success: true } | { success: false; message: string };

export async function updateAdminPermissions(
  targetUid: string,
  input: { adminPermissions: string[]; superAdmin: boolean }
): Promise<ActionResult> {
  let caller;
  try {
    caller = await requireSuperAdmin();
  } catch (e) {
    if (e instanceof AuthError) {
      return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ — ต้องเป็น Super Admin เท่านั้น' };
    }
    throw e;
  }

  const { uid: callerUid, token: callerToken, adminApp } = caller;
  const auth = getAuth(adminApp);
  const db = getFirestore(adminApp);

  if (!targetUid) {
    return { success: false, message: 'ไม่พบผู้ใช้เป้าหมาย' };
  }

  let targetRecord;
  try {
    targetRecord = await auth.getUser(targetUid);
  } catch {
    return { success: false, message: 'ไม่พบบัญชีผู้ใช้นี้ใน Firebase Auth' };
  }

  // บัญชี super admin ที่ bootstrap ไว้แก้ผ่านหน้านี้ไม่ได้เด็ดขาด — ต้องมีทางเข้าที่แก้อะไร
  // ไม่ได้เสมอ ไว้กู้สถานการณ์ถ้า super admin คนอื่นตั้งค่าพลาดจนล็อกทุกคนออก
  if (isDesignatedSuperAdmin({ uid: targetUid, email: targetRecord.email })) {
    return { success: false, message: 'ไม่สามารถแก้ไขบัญชี Super Admin หลักของระบบผ่านหน้านี้ได้' };
  }

  // กันตัวเองลดสิทธิ์ตัวเองจนหลุดออกจากหน้าที่กำลังใช้แก้สิทธิ์อยู่
  if (targetUid === callerUid && !input.superAdmin) {
    return { success: false, message: 'ไม่สามารถลดสิทธิ์ตัวเองผ่านหน้านี้ได้ — ให้ Super Admin คนอื่นทำแทน' };
  }

  const invalid = input.adminPermissions.filter((p) => !ALL_PERMISSIONS.includes(p as Permission));
  if (invalid.length > 0) {
    return { success: false, message: `พบรหัสสิทธิ์ที่ไม่รู้จัก: ${invalid.join(', ')}` };
  }

  const existingClaims = targetRecord.customClaims ?? {};
  const claims: Record<string, unknown> = {
    ...existingClaims,
    admin: true,
    role: 'admin',
    superAdmin: input.superAdmin,
    su: input.superAdmin,
    // super admin ไม่ต้องแบก array (ข้ามทุกด่านอยู่แล้ว) — กัน claim ชนเพดาน 1000 bytes
    ...(input.superAdmin ? { p: undefined } : { p: input.adminPermissions }),
  };

  const size = Buffer.byteLength(JSON.stringify(claims), 'utf8');
  if (size > 900) {
    return {
      success: false,
      message: `สิทธิ์ที่เลือกมีขนาดใหญ่เกินไป (${size} bytes, เพดาน ~900 bytes) กรุณาลดจำนวนสิทธิ์ลง`,
    };
  }

  try {
    await auth.setCustomUserClaims(targetUid, claims);
    // claim ฝังอยู่ใน session cookie ตอน mint แล้ว — ต้องบังคับให้ล็อกอินใหม่ถึงจะมีผลทันที
    await auth.revokeRefreshTokens(targetUid);

    await db.collection('users').doc(targetUid).update({
      adminPermissions: input.superAdmin ? [] : input.adminPermissions,
      superAdmin: input.superAdmin,
      role: 'admin',
    });

    await db.collection('adminAuditLog').add({
      action: 'update_permissions',
      actorUid: callerUid,
      actorEmail: callerToken.email ?? null,
      targetUid,
      previousClaims: existingClaims,
      newPermissions: input.adminPermissions,
      newSuperAdmin: input.superAdmin,
      at: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('updateAdminPermissions failed:', error);
    return { success: false, message: error.message || 'บันทึกสิทธิ์ไม่สำเร็จ' };
  }
}

export async function revokeAdminAccess(targetUid: string): Promise<ActionResult> {
  let caller;
  try {
    caller = await requireSuperAdmin();
  } catch (e) {
    if (e instanceof AuthError) {
      return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ — ต้องเป็น Super Admin เท่านั้น' };
    }
    throw e;
  }

  const { uid: callerUid, token: callerToken, adminApp } = caller;
  const auth = getAuth(adminApp);
  const db = getFirestore(adminApp);

  if (!targetUid) {
    return { success: false, message: 'ไม่พบผู้ใช้เป้าหมาย' };
  }

  let targetRecord;
  try {
    targetRecord = await auth.getUser(targetUid);
  } catch {
    return { success: false, message: 'ไม่พบบัญชีผู้ใช้นี้ใน Firebase Auth' };
  }

  if (isDesignatedSuperAdmin({ uid: targetUid, email: targetRecord.email })) {
    return { success: false, message: 'ไม่สามารถถอนสิทธิ์บัญชี Super Admin หลักของระบบได้' };
  }

  if (targetUid === callerUid) {
    return { success: false, message: 'ไม่สามารถถอนสิทธิ์ตัวเองได้ — ให้ Super Admin คนอื่นทำแทน' };
  }

  const existingClaims = targetRecord.customClaims ?? {};

  try {
    await auth.setCustomUserClaims(targetUid, {
      ...existingClaims,
      admin: false,
      role: null,
      superAdmin: false,
      su: false,
      p: [],
    });
    await auth.revokeRefreshTokens(targetUid);

    // ค่าพักหลังถอนสิทธิ์: กลับเป็น 'customer' ธรรมดา (ตรงกับ UserProfile.role ปกติ)
    // ไม่ลบ Auth user/Firestore doc — บัญชีนี้อาจเป็นทนาย/ลูกค้าจริงด้วยพร้อมกัน
    await db.collection('users').doc(targetUid).update({
      role: 'customer',
      adminPermissions: [],
      superAdmin: false,
    });

    await db.collection('adminAuditLog').add({
      action: 'revoke_admin_access',
      actorUid: callerUid,
      actorEmail: callerToken.email ?? null,
      targetUid,
      previousClaims: existingClaims,
      at: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('revokeAdminAccess failed:', error);
    return { success: false, message: error.message || 'ถอนสิทธิ์ไม่สำเร็จ' };
  }
}
