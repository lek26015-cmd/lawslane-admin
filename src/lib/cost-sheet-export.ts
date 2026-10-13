import 'server-only';
import type * as admin from 'firebase-admin';
import { mergeCostAssumptions } from './cost-model';
import { buildCostSheetBatch, costSheetUrl, runContextFromPlans } from './cost-sheet-map';
import {
    CostSheetError,
    EXPORT_COOLDOWN_MS,
    costSheetErrorMessage,
    exportCostSheet,
    readCostSheetConfig,
} from './cost-sheet-sync';
import {
    DEFAULT_INTERPRETER_GP_PERCENT,
    PLAN_PRICING_LOGS_COLLECTION,
    PRICING_DOC_IDS,
    SUBSCRIPTION_PRODUCTS,
    firestoreDocStore,
    firestorePricingStore,
    mergeWithDefaults,
    planPricingCollection,
} from './plan-pricing';
import fixture from './cost-sheet-fixture.json';

/**
 * ส่งสมมติฐานต้นทุน + ราคาแพลนจริง + GP ล่าม ไป Google Sheet (ฝั่ง server เท่านั้น)
 *
 * - สถานะการส่งล่าสุดเก็บที่ `{PLAN_PRICING_COLLECTION}/costSheetExport` (rules ปิด อ่านผ่าน Admin SDK เท่านั้น)
 *   ใช้ทั้งแสดง "ส่งล่าสุดเมื่อ/โดย" และกันกดถี่ (ต้องห่างกัน 30 วินาที — นับจากครั้งที่เริ่มส่ง)
 * - ส่งสำเร็จ → log ที่ planPricingLogs `{product:'cost_sheet', kind:'export', cellCount, actorUid, at}` (ไม่เก็บค่า)
 * - ผู้เรียกต้องผ่าน requireSuperAdmin() มาแล้ว
 */

export type CostSheetStatus = {
    configured: boolean;
    /** ชื่อ env ที่ยังขาด (ไม่มีค่า) */
    missing: string[];
    /** ลิงก์เปิด Sheet (มีเมื่อตั้ง COST_SHEET_ID ถูกรูปแบบ) */
    sheetUrl: string | null;
    autoExport: boolean;
    credentialSource: 'sheets' | 'firebase' | null;
    lastExport: { at: string; actorUid: string; cellCount: number } | null;
    lastError: { at: string; message: string } | null;
};

export type CostSheetExportResult =
    | { ok: true; cellCount: number; at: string; sheetUrl: string }
    | { ok: false; error: string };

type StatusDoc = {
    lastAttemptAt?: string;
    lastExportAt?: string;
    lastActorUid?: string;
    lastCellCount?: number;
    lastErrorAt?: string | null;
    lastError?: string | null;
};

const statusRef = (db: admin.firestore.Firestore) => db.collection(planPricingCollection()).doc(PRICING_DOC_IDS.costSheetExport);

export async function readCostSheetStatus(db: admin.firestore.Firestore): Promise<CostSheetStatus> {
    const cfg = readCostSheetConfig();
    const sheetIdOk = cfg.ok || !cfg.missing.some((m) => m.startsWith('COST_SHEET_ID'));
    const raw = process.env.COST_SHEET_ID?.trim();
    const snap = await statusRef(db).get();
    const d = (snap.data() ?? {}) as StatusDoc;
    return {
        configured: cfg.ok,
        missing: cfg.ok ? [] : cfg.missing,
        sheetUrl: sheetIdOk && raw ? costSheetUrl(raw) : null,
        autoExport: cfg.autoExport,
        credentialSource: cfg.ok ? cfg.credentialSource : null,
        lastExport: d.lastExportAt && d.lastActorUid
            ? { at: d.lastExportAt, actorUid: d.lastActorUid, cellCount: d.lastCellCount ?? 0 }
            : null,
        lastError: d.lastError && d.lastErrorAt && (!d.lastExportAt || d.lastErrorAt > d.lastExportAt)
            ? { at: d.lastErrorAt, message: d.lastError }
            : null,
    };
}

/** อ่านค่าที่ใช้ส่ง: สมมติฐานที่บันทึกแล้ว + ราคาจริง (ไม่ใช่ร่าง) + GP ที่ระบบจองใช้ */
async function loadInputs(db: admin.firestore.Firestore) {
    const store = firestorePricingStore(db);
    const docs = firestoreDocStore(db);
    const products = await Promise.all(SUBSCRIPTION_PRODUCTS.map(async (product) => ({
        product,
        plans: mergeWithDefaults(product, await store.read(product)),
    })));
    const [cost, gpSnap] = await Promise.all([
        docs.read(PRICING_DOC_IDS.costModel),
        db.collection('settings').doc('interpreterFees').get(),
    ]);
    const gp = gpSnap.data()?.gpPercent;
    return {
        model: mergeCostAssumptions(cost?.assumptions),
        run: runContextFromPlans(products, typeof gp === 'number' ? gp : DEFAULT_INTERPRETER_GP_PERCENT),
    };
}

export async function runCostSheetExport(db: admin.firestore.Firestore, actorUid: string): Promise<CostSheetExportResult> {
    const cfg = readCostSheetConfig();
    if (!cfg.ok) return { ok: false, error: `ยังตั้งค่า Google Sheet ไม่ครบ: ${cfg.missing.join(', ')}` };
    const ref = statusRef(db);
    const now = new Date();

    // จองสิทธิ์ส่ง (transaction กันกดซ้อน/ถี่)
    try {
        await db.runTransaction(async (tx) => {
            const d = ((await tx.get(ref)).data() ?? {}) as StatusDoc;
            const last = d.lastAttemptAt ? Date.parse(d.lastAttemptAt) : NaN;
            if (Number.isFinite(last) && now.getTime() - last < EXPORT_COOLDOWN_MS) {
                const wait = Math.ceil((EXPORT_COOLDOWN_MS - (now.getTime() - last)) / 1000);
                throw new CostSheetError(`เพิ่งส่งไปเมื่อไม่ถึง 30 วินาทีก่อน — รออีก ${wait} วินาทีแล้วลองใหม่`, 'cooldown');
            }
            tx.set(ref, { lastAttemptAt: now.toISOString() }, { merge: true });
        });
    } catch (e) {
        if (e instanceof CostSheetError) return { ok: false, error: e.message };
        console.error('COST_SHEET_EXPORT', { actorUid, step: 'claim' });
        return { ok: false, error: 'ส่งไป Google Sheet ไม่สำเร็จ (อ่านสถานะไม่ได้)' };
    }

    try {
        const { model, run } = await loadInputs(db);
        const writes = buildCostSheetBatch(model, run);
        const { cellCount } = await exportCostSheet(cfg, writes, {
            fetchImpl: (url, init) => fetch(url, { ...init, cache: 'no-store' }),
            now: () => new Date(),
            labels: fixture.labels as Record<string, string>,
        });
        const at = new Date().toISOString();
        const batch = db.batch();
        batch.set(ref, { lastExportAt: at, lastActorUid: actorUid, lastCellCount: cellCount, lastError: null, lastErrorAt: null }, { merge: true });
        batch.set(db.collection(PLAN_PRICING_LOGS_COLLECTION).doc(), { product: 'cost_sheet', kind: 'export', cellCount, actorUid, at });
        await batch.commit();
        return { ok: true, cellCount, at, sheetUrl: costSheetUrl(cfg.sheetId) };
    } catch (e) {
        const message = costSheetErrorMessage(e);
        // log แค่รหัส ไม่ log ข้อความจาก Google หรือ key
        console.error('COST_SHEET_EXPORT', { actorUid, code: e instanceof CostSheetError ? e.code : 'unknown' });
        await ref.set({ lastError: message, lastErrorAt: new Date().toISOString() }, { merge: true }).catch(() => undefined);
        return { ok: false, error: message };
    }
}

export type SheetNotice = { ok: boolean; message: string };

/**
 * ส่งอัตโนมัติหลังบันทึกสำเร็จ (เปิดด้วย COST_SHEET_AUTO_EXPORT=true) — ไม่โยน error เด็ดขาด
 * ผลการบันทึกไม่ขึ้นกับ Sheet: ส่งไม่สำเร็จคืนข้อความเตือนให้หน้าเว็บขึ้น toast
 * @returns null = ไม่ได้เปิดส่งอัตโนมัติ
 */
export async function autoExportAfterSave(db: admin.firestore.Firestore, actorUid: string): Promise<SheetNotice | null> {
    try {
        const cfg = readCostSheetConfig();
        if (!cfg.autoExport) return null;
        const r = await runCostSheetExport(db, actorUid);
        return r.ok
            ? { ok: true, message: `อัปเดต Google Sheet แล้ว (${r.cellCount} ช่อง)` }
            : { ok: false, message: `บันทึกแล้ว แต่ส่งไป Google Sheet ไม่สำเร็จ: ${r.error}` };
    } catch {
        return { ok: false, message: 'บันทึกแล้ว แต่ส่งไป Google Sheet ไม่สำเร็จ' };
    }
}
