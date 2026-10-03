import 'server-only';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiModelName } from './gemini-model';
import { callTyphoonOCR } from './typhoon';
import { EXAM_PAGE_PREFIX } from './exam-import';

/**
 * OCR หน้าข้อสอบกฎหมายฝั่ง server — ใช้ร่วมกันระหว่าง re-OCR ในหน้า review
 * และระบบนำเข้าข้อสอบ (ocr-page)
 */

/** prompt ถอดความข้อสอบกฎหมาย (เดิมอยู่ใน questions/[id]/re-ocr) */
export const EXAM_TRANSCRIBE_PROMPT = `คุณเป็นผู้เชี่ยวชาญด้านกฎหมายไทย กรุณาอ่านข้อสอบกฎหมายจากภาพนี้อย่างละเอียดและแม่นยำ

กฎ:
1. ถอดความเป็นข้อความภาษาไทยที่ถูกต้อง ครบถ้วน
2. รักษาเลขมาตรา ชื่อกฎหมาย และคำศัพท์ทางกฎหมายให้ถูกต้อง
3. ใช้ตัวเลขไทย (๑, ๒, ๓) ตามต้นฉบับถ้าภาพใช้ตัวเลขไทย
4. ห้ามเพิ่มข้อความที่ไม่มีในภาพ
5. ห้ามแปลหรือสรุป — ถอดความตามต้นฉบับเท่านั้น
6. คงรูปแบบการจัดย่อหน้าตามต้นฉบับ
7. ถ้ามีหลายข้อในหน้าเดียว ให้แยกข้อให้ชัดเจน
8. ตอบเป็นข้อความล้วน ไม่ใส่ markdown (ห้ามใช้ ** หรือ #) และไม่ต้องมีคำนำหรือคำอธิบายใดๆ

กรุณาถอดข้อความจากภาพ:`;

/** รูปแบบภาพที่ยอมรับให้ OCR */
export const OCR_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** ภาพหน้าละไม่ควรเกินนี้ (หน้าเว็บบีบเป็น JPEG ~2000px ได้ราว 0.3-1.5MB) */
export const MAX_OCR_IMAGE_BYTES = 12 * 1024 * 1024;

/** bucket ของ Firebase Storage ที่เก็บภาพหน้าข้อสอบ (โปรเจกต์ Firebase เดียวกับทุกเว็บ) */
export function examPageBucket(): string | null {
    return process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || null;
}

/** path ใน bucket ต้องอยู่ใต้ exam-pages/ และห้ามมี ".." */
export function isExamPagePath(path: unknown): path is string {
    return typeof path === 'string' && path.startsWith(`${EXAM_PAGE_PREFIX}/`) && !path.includes('..') && !path.includes('//');
}

/** URL ดาวน์โหลดแบบ Firebase (มี token) — ใช้แสดงภาพในหน้า review และเก็บใน pageImages */
export function examPageDownloadUrl(path: string, token: string): string {
    return `https://firebasestorage.googleapis.com/v0/b/${examPageBucket()}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/**
 * แยก path ออกจาก URL ภาพหน้าข้อสอบ — คืน null ถ้าไม่ใช่ไฟล์ใน bucket ของเราใต้ exam-pages/
 * (เดิมใช้ R2 แต่บัญชี R2 ถูกระงับ 2026-10-03 จึงย้ายมา Firebase Storage)
 */
export function examPagePathFromUrl(raw: string): string | null {
    const bucket = examPageBucket();
    if (!bucket || typeof raw !== 'string') return null;
    try {
        const url = new URL(raw);
        if (url.protocol !== 'https:' || url.hostname !== 'firebasestorage.googleapis.com') return null;
        const m = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
        if (!m || m[1] !== bucket) return null;
        const path = decodeURIComponent(m[2]);
        return isExamPagePath(path) ? path : null;
    } catch {
        return null;
    }
}

export function isExamPageImageUrl(raw: string): boolean {
    return examPagePathFromUrl(raw) !== null;
}

/** แปลง error ของ Gemini เป็นข้อความไทยที่แอดมินเข้าใจและแก้ได้ */
export function describeGeminiError(error: unknown): string {
    const msg = String((error as Error)?.message ?? error);
    if (/API_KEY_INVALID|API key not valid|API key expired/i.test(msg)) {
        return 'คีย์ Gemini (GOOGLE_GENAI_API_KEY) ไม่ถูกต้องหรือหมดอายุ — ต้องตั้งคีย์ใหม่ใน Vercel';
    }
    if (/PERMISSION_DENIED|\b403\b/i.test(msg)) {
        return 'คีย์ Gemini ไม่มีสิทธิ์ใช้งานโมเดลนี้ (403)';
    }
    if (/not found|\b404\b/i.test(msg)) {
        return `ไม่พบโมเดล Gemini "${getGeminiModelName()}" — ตรวจค่า GEMINI_MODEL`;
    }
    if (/RESOURCE_EXHAUSTED|quota|\b429\b/i.test(msg)) {
        return 'โควตา Gemini เต็ม (429) — รอสักครู่แล้วลองใหม่';
    }
    if (/SAFETY|blocked/i.test(msg)) {
        return 'Gemini ปฏิเสธการอ่านภาพนี้ (safety filter)';
    }
    if (/timeout|aborted|ETIMEDOUT/i.test(msg)) {
        return 'Gemini ตอบช้าเกินกำหนด';
    }
    return `Gemini ผิดพลาด: ${msg.slice(0, 200)}`;
}

export interface OcrResult {
    text: string;
    engine: 'gemini' | 'typhoon';
    model: string;
    /** มีค่าเมื่อ Gemini ล้มแล้วใช้ Typhoon แทน */
    warning?: string;
}

export class OcrError extends Error {}

/**
 * OCR ภาพ 1 หน้า: ลอง Gemini vision ก่อน ถ้าล้มค่อยใช้ Typhoon OCR สำรอง
 * budgetMs = เวลาทั้งหมดที่ยอมให้ใช้ (route ตั้ง maxDuration = 60 วินาที)
 */
export async function ocrExamPageImage(image: Buffer, mimeType: string, budgetMs = 55000): Promise<OcrResult> {
    const startedAt = Date.now();
    const modelName = getGeminiModelName();
    let geminiError: string;

    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        geminiError = 'ยังไม่ได้ตั้งค่า GOOGLE_GENAI_API_KEY';
    } else {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel(
                { model: modelName, generationConfig: { temperature: 0.1 } },
                { timeout: Math.max(5000, Math.min(40000, budgetMs - 10000)) },
            );
            const result = await model.generateContent([
                EXAM_TRANSCRIBE_PROMPT,
                { inlineData: { mimeType, data: image.toString('base64') } },
            ]);
            const text = result.response.text().trim();
            if (text) return { text, engine: 'gemini', model: modelName };
            geminiError = 'Gemini คืนข้อความว่าง';
        } catch (e) {
            console.error('EXAM_OCR_GEMINI_ERROR', e);
            geminiError = describeGeminiError(e);
        }
    }

    const remaining = budgetMs - (Date.now() - startedAt);
    if (!process.env.TYPHOON_API_KEY) {
        throw new OcrError(`${geminiError} และไม่ได้ตั้ง TYPHOON_API_KEY สำรองไว้`);
    }
    if (remaining < 8000) {
        throw new OcrError(`${geminiError} (เหลือเวลาไม่พอลอง Typhoon สำรอง — กดลองใหม่)`);
    }

    const text = (await callTyphoonOCR(image, { mimeType, timeoutMs: remaining - 2000 })).trim();
    if (!text) {
        throw new OcrError(`${geminiError} และ Typhoon OCR สำรองก็อ่านไม่สำเร็จ`);
    }
    return { text, engine: 'typhoon', model: 'typhoon-ocr', warning: geminiError };
}
