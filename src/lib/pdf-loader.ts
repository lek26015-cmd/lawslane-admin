import { createRequire } from 'module';
import { callTyphoonOCR } from './typhoon';

const require = createRequire(import.meta.url);

// Polyfills removed as we downgraded to pdf-parse v1.1.1 which doesn't need them

// Typhoon รับไฟล์เป็น base64 ซึ่งพองขึ้นราว 33% และ Vercel จำกัด payload ของ
// serverless function ไว้ที่ 4.5MB — เกินกว่านี้ยิงไปก็ถูกปฏิเสธ เสียเวลาเปล่า
const MAX_OCR_PDF_BYTES = 3 * 1024 * 1024;

async function tryOcrFallback(buffer: Buffer): Promise<string> {
    try {
        if (!process.env.TYPHOON_API_KEY) {
            console.warn('OCR Fallback: ไม่ได้ตั้ง TYPHOON_API_KEY — ข้าม OCR');
            return '';
        }

        if (buffer.length > MAX_OCR_PDF_BYTES) {
            const mb = (buffer.length / 1024 / 1024).toFixed(1);
            console.warn(`OCR Fallback: ไฟล์ใหญ่ ${mb}MB เกินเพดาน ${MAX_OCR_PDF_BYTES / 1024 / 1024}MB — ข้าม OCR`);
            return '';
        }

        // ส่ง PDF เข้า Typhoon ตรงๆ ไม่ต้อง rasterise เอง — การแปลง PDF เป็นภาพฝั่ง
        // server ด้วย internals ของ pdf-parse คือต้นเหตุ "fake worker" error บน Vercel
        // ที่ทำให้ฟังก์ชันนี้เคยถูกปิดทิ้งไว้เป็น return "" เฉยๆ
        const text = await callTyphoonOCR(buffer);

        if (!text) {
            console.warn('OCR Fallback: Typhoon ไม่คืนข้อความ');
        }

        return text;
    } catch (e) {
        console.error('OCR Fallback failed with exception:', e);
        return '';
    }
}

export async function parsePdfFromBuffer(buffer: Buffer): Promise<string> {
    try {
        // pdf-parse v1.1.1 is a simple function
        const pdf = require('pdf-parse');

        // Use standard API
        const data = await pdf(buffer);
        let text = data.text || '';

        // Check for "Mojibake" (garbled text) or empty content
        const totalChars = text.length;
        const thaiChars = text.match(/[฀-๿]/g)?.length || 0;
        const thaiRatio = totalChars > 0 ? thaiChars / totalChars : 0;

        const isGarbage = totalChars > 50 && thaiRatio < 0.05;
        const isTooShort = text.trim().length < 50;

        if (isTooShort || isGarbage) {
            console.log(`Text extraction problematic (Length: ${totalChars}, Thai Ratio: ${thaiRatio.toFixed(2)}). Attempting Typhoon OCR...`);

            const ocrText = await tryOcrFallback(buffer);

            if (ocrText && ocrText.length > 50) {
                console.log(`Typhoon OCR successful: ${ocrText.length} characters.`);
                text = ocrText;
            } else {
                console.warn('Typhoon OCR failed or returned empty.');
                // If OCR also fails, we return empty so the API can show the explicit error message about scanned docs
                if (isGarbage) text = ''; // If garbage, better to return empty than garbage
            }
        }

        return text;
    } catch (error) {
        console.error('Error parsing PDF buffer:', error);
        return '';
    }
}
