'use server';

import { requireSuperAdmin, AuthError } from '@/lib/auth-guard';
import {
    readCostSheetStatus,
    runCostSheetExport,
    type CostSheetExportResult,
    type CostSheetStatus,
} from '@/lib/cost-sheet-export';

/**
 * ส่งต้นทุนไป Google Sheet (Super Admin เท่านั้น) — ทางเดียว admin → Sheet
 * ลิงก์ Sheet มาจาก env COST_SHEET_ID ฝั่ง server (ไม่ใช้ NEXT_PUBLIC) และส่งกลับในผลของ action เท่านั้น
 */

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
    if (e instanceof AuthError) return { ok: false, error: 'ไม่มีสิทธิ์ดำเนินการ — ต้องเป็น Super Admin เท่านั้น' };
    console.error('COST_SHEET_ACTION_ERROR');
    return { ok: false, error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' };
}

export async function getCostSheetStatusAction(): Promise<Result<CostSheetStatus>> {
    try {
        const { adminApp } = await requireSuperAdmin();
        return { ok: true, data: await readCostSheetStatus(adminApp.firestore()) };
    } catch (e) {
        return fail(e);
    }
}

export async function exportCostSheetAction(): Promise<Result<CostSheetExportResult>> {
    try {
        const { uid, adminApp } = await requireSuperAdmin();
        return { ok: true, data: await runCostSheetExport(adminApp.firestore(), uid) };
    } catch (e) {
        return fail(e);
    }
}
