/**
 * เทสต์การส่งไป Google Sheet (cost-sheet-sync) — ไม่เรียก Google จริง ใช้ fetch ปลอม + key ที่สร้างในเทสต์
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVerify, generateKeyPairSync } from 'node:crypto';
import { DEFAULT_COST_ASSUMPTIONS, DEFAULT_RUN_CONTEXT } from '../cost-model';
import { buildCostSheetBatch, COST_SHEET_TABS } from '../cost-sheet-map';
import {
    CostSheetError,
    costSheetErrorMessage,
    exportCostSheet,
    readCostSheetConfig,
    signServiceAccountJwt,
} from '../cost-sheet-sync';
import fixture from '../cost-sheet-fixture.json';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const SHEET_ID = 'TEST_sheet_id_0123456789abcdef';
const EMAIL = 'sheets-bot@example-project.iam.gserviceaccount.com';

test('config: ไม่มี env = ปิด และบอกชื่อ env ที่ขาด (ไม่มีค่า)', () => {
    const c = readCostSheetConfig({});
    assert.equal(c.ok, false);
    if (!c.ok) {
        assert.ok(c.missing.includes('COST_SHEET_ID'));
        assert.ok(c.missing.some((m) => m.includes('GOOGLE_SHEETS_CLIENT_EMAIL')));
        assert.equal(c.autoExport, false);
    }
});

test('config: ใช้ GOOGLE_SHEETS_* ก่อน · ไม่มีใช้ FIREBASE_* · ตั้งครึ่งเดียว = ขาด', () => {
    const sheets = readCostSheetConfig({
        COST_SHEET_ID: SHEET_ID, GOOGLE_SHEETS_CLIENT_EMAIL: EMAIL, GOOGLE_SHEETS_PRIVATE_KEY: PEM.replace(/\n/g, '\\n'),
        FIREBASE_CLIENT_EMAIL: 'fb@x.iam.gserviceaccount.com', FIREBASE_PRIVATE_KEY: 'other', COST_SHEET_AUTO_EXPORT: 'true',
    });
    assert.ok(sheets.ok);
    if (sheets.ok) {
        assert.equal(sheets.credentialSource, 'sheets');
        assert.equal(sheets.clientEmail, EMAIL);
        assert.equal(sheets.privateKey, PEM.trim()); // \n ตัวอักษร → ขึ้นบรรทัดจริง
        assert.equal(sheets.autoExport, true);
    }
    const fb = readCostSheetConfig({ COST_SHEET_ID: SHEET_ID, FIREBASE_CLIENT_EMAIL: 'fb@x.iam.gserviceaccount.com', FIREBASE_PRIVATE_KEY: PEM });
    assert.ok(fb.ok && fb.credentialSource === 'firebase');
    const half = readCostSheetConfig({ COST_SHEET_ID: SHEET_ID, GOOGLE_SHEETS_CLIENT_EMAIL: EMAIL, FIREBASE_CLIENT_EMAIL: 'fb', FIREBASE_PRIVATE_KEY: PEM });
    assert.ok(!half.ok && half.missing.includes('GOOGLE_SHEETS_PRIVATE_KEY'));
    const badId = readCostSheetConfig({ COST_SHEET_ID: 'https://docs.google.com/x', FIREBASE_CLIENT_EMAIL: 'fb', FIREBASE_PRIVATE_KEY: PEM });
    assert.ok(!badId.ok && badId.missing[0].startsWith('COST_SHEET_ID'));
});

test('JWT เซ็นด้วย RS256 ตรวจได้ด้วย public key และขอ scope spreadsheets', () => {
    const jwt = signServiceAccountJwt(EMAIL, PEM, 1_800_000_000);
    const [h, c, s] = jwt.split('.');
    const claims = JSON.parse(Buffer.from(c, 'base64url').toString());
    assert.equal(claims.iss, EMAIL);
    assert.equal(claims.scope, 'https://www.googleapis.com/auth/spreadsheets');
    assert.equal(claims.aud, 'https://oauth2.googleapis.com/token');
    assert.equal(claims.exp - claims.iat, 3600);
    assert.ok(createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, Buffer.from(s, 'base64url')));
});

test('key เสีย → ข้อความไทย ไม่มีเนื้อ key', () => {
    const bad = '-----BEGIN PRIVATE KEY-----\nSECRETSECRET\n-----END PRIVATE KEY-----';
    assert.throws(() => signServiceAccountJwt(EMAIL, bad, 1), (e: unknown) => {
        assert.ok(e instanceof CostSheetError);
        assert.ok(!(e as Error).message.includes('SECRET'));
        return true;
    });
});

/** ตาราง Sheet แบบสูตรจาก fixture (ช่องเป้าหมาย + ป้ายแถว) ในรูปที่ batchGet คืน */
function valueRanges(mutate?: (rows: Record<string, unknown[][]>) => void) {
    const rows: Record<string, unknown[][]> = {};
    for (const t of Object.values(COST_SHEET_TABS)) rows[t] = [];
    const put = (ref: string, v: unknown) => {
        const m = /^'(.+)'!([A-Z]+)(\d+)$/.exec(ref)!;
        const r = Number(m[3]) - 1;
        rows[m[1]][r] = rows[m[1]][r] ?? [];
        rows[m[1]][r][m[2].charCodeAt(0) - 65] = v;
    };
    for (const [ref, c] of Object.entries(fixture.cells)) put(ref, (c as { v: unknown }).v);
    for (const [ref, l] of Object.entries(fixture.labels)) put(ref, l);
    mutate?.(rows);
    return { valueRanges: Object.values(COST_SHEET_TABS).map((t) => ({ values: rows[t] })) };
}

type Call = { url: string; init?: { method?: string; headers?: Record<string, string>; body?: string } };

function fakeFetch(opts: { writeStatus?: number; tokenStatus?: number; grid?: ReturnType<typeof valueRanges> } = {}) {
    const calls: Call[] = [];
    const fetchImpl = async (url: string, init?: Call['init']) => {
        calls.push({ url, init });
        const reply = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body });
        if (url.startsWith('https://oauth2.googleapis.com/token')) {
            return reply(opts.tokenStatus ?? 200, opts.tokenStatus ? { error: 'invalid_grant', error_description: 'leaky detail' } : { access_token: 'ya29.TEST' });
        }
        if (url.includes('values:batchGet')) return reply(200, opts.grid ?? valueRanges());
        if (url.includes('values:batchUpdate')) {
            const n = JSON.parse(init!.body!).data.length;
            return reply(opts.writeStatus ?? 200, opts.writeStatus ? { error: { message: 'leaky detail' } } : { totalUpdatedCells: n });
        }
        return reply(404, {});
    };
    return { calls, fetchImpl };
}

const cfg = { ok: true as const, sheetId: SHEET_ID, clientEmail: EMAIL, privateKey: PEM, credentialSource: 'sheets' as const, autoExport: false };
const writes = () => buildCostSheetBatch(DEFAULT_COST_ASSUMPTIONS, DEFAULT_RUN_CONTEXT);
const deps = (fetchImpl: ReturnType<typeof fakeFetch>['fetchImpl']) => ({
    fetchImpl, now: () => new Date('2026-10-13T00:00:00Z'), labels: fixture.labels as Record<string, string>,
});

test('ส่งสำเร็จ: token → อ่านแบบสูตร → batchUpdate RAW ครบทุกช่อง', async () => {
    const f = fakeFetch();
    const r = await exportCostSheet(cfg, writes(), deps(f.fetchImpl));
    assert.equal(r.cellCount, 276);
    assert.equal(f.calls.length, 3);
    const read = f.calls[1];
    assert.ok(read.url.includes('valueRenderOption=FORMULA'));
    assert.equal(read.init?.headers?.Authorization, 'Bearer ya29.TEST');
    const write = f.calls[2];
    assert.equal(write.init?.method, 'POST');
    assert.ok(write.url.includes(`/spreadsheets/${SHEET_ID}/values:batchUpdate`));
    const body = JSON.parse(write.init!.body!);
    assert.equal(body.valueInputOption, 'RAW');
    assert.equal(body.data.length, 276);
});

test('โครง Sheet เปลี่ยน (ช่องกลายเป็นสูตร) → ไม่เขียนเลย', async () => {
    const f = fakeFetch({ grid: valueRanges((rows) => { rows['ราคาบริการ'][4][2] = '=C6*10'; }) });
    await assert.rejects(exportCostSheet(cfg, writes(), deps(f.fetchImpl)), (e: unknown) => {
        assert.ok(e instanceof CostSheetError && e.code === 'layout');
        assert.ok((e as Error).message.includes("'ราคาบริการ'!C5 เป็นสูตร"));
        return true;
    });
    assert.ok(!f.calls.some((c) => c.url.includes('batchUpdate')));
});

test('ข้อผิดพลาดจาก Google เป็นข้อความไทย ไม่มีรายละเอียดจาก Google / key / token', async () => {
    const forbidden = fakeFetch({ writeStatus: 403 });
    const e1 = await exportCostSheet(cfg, writes(), deps(forbidden.fetchImpl)).catch((e) => e);
    const m1 = costSheetErrorMessage(e1);
    assert.ok(m1.includes('แชร์ Sheet ให้อีเมล service account'));
    const tokenFail = fakeFetch({ tokenStatus: 400 });
    const e2 = await exportCostSheet(cfg, writes(), deps(tokenFail.fetchImpl)).catch((e) => e);
    const m2 = costSheetErrorMessage(e2);
    assert.ok(m2.includes('ยืนยันตัวตนกับ Google ไม่สำเร็จ'));
    for (const m of [m1, m2]) {
        assert.ok(!m.includes('leaky') && !m.includes('ya29') && !m.includes('PRIVATE KEY') && !m.includes(SHEET_ID));
    }
    assert.equal(costSheetErrorMessage(new Error('internal stack detail')), 'ส่งไป Google Sheet ไม่สำเร็จ (ข้อผิดพลาดที่เซิร์ฟเวอร์)');
    const offline = await exportCostSheet(cfg, writes(), deps(async () => { throw new Error('ECONNRESET'); })).catch((e) => e);
    assert.ok(costSheetErrorMessage(offline).includes('ติดต่อ Google ไม่ได้'));
});
