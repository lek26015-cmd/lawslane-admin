/**
 * คุยกับ Google Sheets API เพื่อส่งต้นทุนไป Sheet (ทางเดียว admin → Sheet)
 *
 * - ยืนยันตัวตนด้วย service account: เซ็น JWT (RS256) ด้วย node:crypto แล้วแลก access token — ไม่เพิ่ม dependency
 * - env: COST_SHEET_ID · GOOGLE_SHEETS_CLIENT_EMAIL + GOOGLE_SHEETS_PRIVATE_KEY
 *        (ไม่ตั้งทั้งคู่ = ใช้ FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY ของ Firebase Admin แทน)
 * - เขียนด้วย spreadsheets.values.batchUpdate valueInputOption=RAW (ตัวเลขเป็นตัวเลข ไม่ตีความเป็นสูตร)
 * - ก่อนเขียนอ่าน Sheet แบบสูตรมาตรวจ (checkSheetLayout) — มีช่องสูตร/แถวเลื่อน = ไม่เขียนเลยสักช่อง
 * - ข้อความผิดพลาดเป็นภาษาไทยและไม่เคยมี key / token / เนื้อหาตอบกลับจาก Google
 *
 * ไม่มี 'server-only' เพื่อให้เทสต์ได้ (fetch ฉีดเข้ามา) แต่ใช้ node:crypto — import จากฝั่ง server เท่านั้น
 */
import { createSign } from 'node:crypto';
import {
    PREFLIGHT_RANGES,
    checkSheetLayout,
    toBatchUpdateBody,
    type CostSheetTab,
    type CostSheetWrite,
    type SheetGrid,
} from './cost-sheet-map';

export const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

/** ต้องรออย่างน้อยเท่านี้ระหว่างการส่งแต่ละครั้ง */
export const EXPORT_COOLDOWN_MS = 30_000;

export type CostSheetEnv = Record<string, string | undefined>;

export type CostSheetConfig =
    | {
        ok: true;
        sheetId: string;
        clientEmail: string;
        privateKey: string;
        /** sheets = GOOGLE_SHEETS_* · firebase = ใช้ service account ของ Firebase Admin */
        credentialSource: 'sheets' | 'firebase';
        autoExport: boolean;
    }
    | { ok: false; missing: string[]; autoExport: boolean };

const SHEET_ID_RE = /^[A-Za-z0-9_-]{20,128}$/;

/** env บางที่เก็บ private key เป็น "\n" ตัวอักษร (Vercel) → แปลงเป็นขึ้นบรรทัดจริง */
function normalizeKey(k: string): string {
    return k.replace(/\\n/g, '\n').trim();
}

/** อ่านการตั้งค่าจาก env — คืนแค่ชื่อ env ที่ขาด ไม่คืนค่าใด ๆ */
export function readCostSheetConfig(env: CostSheetEnv = process.env): CostSheetConfig {
    const autoExport = env.COST_SHEET_AUTO_EXPORT?.trim() === 'true';
    const missing: string[] = [];
    const sheetId = env.COST_SHEET_ID?.trim() ?? '';
    if (!sheetId) missing.push('COST_SHEET_ID');
    else if (!SHEET_ID_RE.test(sheetId)) missing.push('COST_SHEET_ID (รูปแบบไม่ถูกต้อง)');

    const gEmail = env.GOOGLE_SHEETS_CLIENT_EMAIL?.trim();
    const gKey = env.GOOGLE_SHEETS_PRIVATE_KEY?.trim();
    let clientEmail = '';
    let privateKey = '';
    let credentialSource: 'sheets' | 'firebase' = 'sheets';
    if (gEmail || gKey) {
        // ตั้งชุด Sheets ไว้แค่ครึ่งเดียว = ตั้งผิด ไม่เอาไปปนกับชุด Firebase
        if (!gEmail) missing.push('GOOGLE_SHEETS_CLIENT_EMAIL');
        if (!gKey) missing.push('GOOGLE_SHEETS_PRIVATE_KEY');
        clientEmail = gEmail ?? '';
        privateKey = gKey ?? '';
    } else {
        credentialSource = 'firebase';
        clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim() ?? '';
        privateKey = env.FIREBASE_PRIVATE_KEY?.trim() ?? '';
        if (!clientEmail || !privateKey) missing.push('GOOGLE_SHEETS_CLIENT_EMAIL + GOOGLE_SHEETS_PRIVATE_KEY (หรือ FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)');
    }
    if (missing.length) return { ok: false, missing, autoExport };
    return { ok: true, sheetId, clientEmail, privateKey: normalizeKey(privateKey), credentialSource, autoExport };
}

// ---------------------------------------------------------------------------
// ข้อผิดพลาด (ข้อความปลอดภัย แสดงให้แอดมินได้)
// ---------------------------------------------------------------------------

export class CostSheetError extends Error {
    constructor(message: string, readonly code: string) {
        super(message);
        this.name = 'CostSheetError';
    }
}

const MSG = {
    key: 'อ่าน private key ของ service account ไม่ได้ — ตรวจ GOOGLE_SHEETS_PRIVATE_KEY (ต้องเป็น PEM เต็ม รวมบรรทัด BEGIN/END)',
    auth: 'ยืนยันตัวตนกับ Google ไม่สำเร็จ — ตรวจอีเมลและ private key ของ service account (key อาจถูกลบหรือหมดอายุ)',
    forbidden: 'service account ไม่มีสิทธิ์แก้ Sheet — แชร์ Sheet ให้อีเมล service account เป็น "ผู้แก้ไข" และเปิด Google Sheets API ในโปรเจกต์ GCP',
    notFound: 'ไม่พบ Sheet หรือแท็บที่ต้องเขียน — ตรวจ COST_SHEET_ID และชื่อแท็บ (สมมติฐาน / ราคาบริการ / ต้นทุนต่อหน่วย)',
    rate: 'Google จำกัดจำนวนคำขอชั่วคราว — รอสักครู่แล้วลองใหม่',
    network: 'ติดต่อ Google ไม่ได้ — ลองใหม่อีกครั้ง',
    server: 'Google Sheets ตอบกลับผิดพลาด — ลองใหม่อีกครั้ง',
};

function httpError(status: number, step: 'token' | 'read' | 'write'): CostSheetError {
    if (step === 'token') return new CostSheetError(MSG.auth, `token_${status}`);
    if (status === 401) return new CostSheetError(MSG.auth, `${step}_401`);
    if (status === 403) return new CostSheetError(MSG.forbidden, `${step}_403`);
    if (status === 404 || status === 400) return new CostSheetError(MSG.notFound, `${step}_${status}`);
    if (status === 429) return new CostSheetError(MSG.rate, `${step}_429`);
    return new CostSheetError(MSG.server, `${step}_${status}`);
}

type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) =>
    Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

async function call(fetchImpl: FetchLike, step: 'token' | 'read' | 'write', url: string, init: Parameters<FetchLike>[1]) {
    let res;
    try {
        res = await fetchImpl(url, init);
    } catch {
        throw new CostSheetError(MSG.network, `${step}_network`);
    }
    if (!res.ok) throw httpError(res.status, step);
    try {
        return await res.json();
    } catch {
        throw new CostSheetError(MSG.server, `${step}_json`);
    }
}

// ---------------------------------------------------------------------------
// JWT → access token
// ---------------------------------------------------------------------------

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** JWT สำหรับแลก token (อายุ 1 ชั่วโมง ตามข้อกำหนดของ Google) */
export function signServiceAccountJwt(clientEmail: string, privateKey: string, nowSec: number): string {
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = b64url(JSON.stringify({ iss: clientEmail, scope: SHEETS_SCOPE, aud: TOKEN_URL, iat: nowSec, exp: nowSec + 3600 }));
    const input = `${header}.${claims}`;
    let sig: Buffer;
    try {
        sig = createSign('RSA-SHA256').update(input).sign(privateKey);
    } catch {
        throw new CostSheetError(MSG.key, 'key_invalid');
    }
    return `${input}.${b64url(sig)}`;
}

async function accessToken(cfg: Extract<CostSheetConfig, { ok: true }>, fetchImpl: FetchLike, now: Date): Promise<string> {
    const assertion = signServiceAccountJwt(cfg.clientEmail, cfg.privateKey, Math.floor(now.getTime() / 1000));
    const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString();
    const json = await call(fetchImpl, 'token', TOKEN_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    if (typeof json?.access_token !== 'string') throw new CostSheetError(MSG.auth, 'token_missing');
    return json.access_token;
}

// ---------------------------------------------------------------------------
// อ่าน (ตรวจ) แล้วเขียน
// ---------------------------------------------------------------------------

async function readGrid(fetchImpl: FetchLike, token: string, sheetId: string): Promise<SheetGrid> {
    const tabs = Object.keys(PREFLIGHT_RANGES) as CostSheetTab[];
    const qs = new URLSearchParams({ valueRenderOption: 'FORMULA', majorDimension: 'ROWS' });
    for (const t of tabs) qs.append('ranges', PREFLIGHT_RANGES[t]);
    const json = await call(fetchImpl, 'read', `${SHEETS_API}/${encodeURIComponent(sheetId)}/values:batchGet?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const ranges: { values?: unknown[][] }[] = Array.isArray(json?.valueRanges) ? json.valueRanges : [];
    const grid = {} as SheetGrid;
    tabs.forEach((t, i) => { grid[t] = ranges[i]?.values ?? []; });
    return grid;
}

export type ExportDeps = { fetchImpl: FetchLike; now: () => Date; labels: Record<string, string> };

/**
 * ส่งชุดค่าไป Sheet: token → อ่านแบบสูตรตรวจโครง → batchUpdate
 * @returns จำนวนช่องที่ Google ยืนยันว่าเขียนแล้ว
 */
export async function exportCostSheet(
    cfg: Extract<CostSheetConfig, { ok: true }>, writes: CostSheetWrite[], deps: ExportDeps,
): Promise<{ cellCount: number }> {
    if (writes.length === 0) throw new CostSheetError('ไม่มีช่องที่จะส่ง', 'empty');
    const token = await accessToken(cfg, deps.fetchImpl, deps.now());
    const grid = await readGrid(deps.fetchImpl, token, cfg.sheetId);
    const problems = checkSheetLayout(grid, writes, deps.labels);
    if (problems.length) {
        const shown = problems.slice(0, 5).join(' · ') + (problems.length > 5 ? ` · และอีก ${problems.length - 5} จุด` : '');
        throw new CostSheetError(`โครง Sheet ไม่ตรงกับที่ระบบรู้จัก จึงไม่ได้เขียนเลยสักช่อง (กันเขียนทับสูตร/แถวผิด): ${shown}`, 'layout');
    }
    const json = await call(deps.fetchImpl, 'write', `${SHEETS_API}/${encodeURIComponent(cfg.sheetId)}/values:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(toBatchUpdateBody(writes)),
    });
    const cellCount = typeof json?.totalUpdatedCells === 'number' ? json.totalUpdatedCells : writes.length;
    return { cellCount };
}

/** ข้อความผิดพลาดที่แสดงได้ (ไม่รู้จัก = ข้อความกลาง ไม่ส่งรายละเอียดภายในออกไป) */
export function costSheetErrorMessage(e: unknown): string {
    if (e instanceof CostSheetError) return e.message;
    return 'ส่งไป Google Sheet ไม่สำเร็จ (ข้อผิดพลาดที่เซิร์ฟเวอร์)';
}
