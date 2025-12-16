import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { callTyphoonOCR } from './typhoon';

const require = createRequire(import.meta.url);

// Polyfills removed as we downgraded to pdf-parse v1.1.1 which doesn't need them

async function tryOcrFallback(buffer: Buffer): Promise<string> {
    try {
        console.log("OCR Fallback: Image extraction via pdf-parse internals is unstable in Vercel.");
        console.log("OCR Fallback: Skipping image extraction to prevent worker errors.");

        // NOTE: The previous implementation used undocumented internals of pdf-parse (new PDFParse)
        // which causes "fake worker" errors in serverless environments.
        // For now, we return empty to avoid crashing. 
        // TODO: Implement a robust server-side PDF-to-Image solution (e.g. using a dedicated API or stable library).

        return "";

    } catch (e) {
        console.error("OCR Fallback failed with exception:", e);
        return "";
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
        const thaiChars = text.match(/[\u0E00-\u0E7F]/g)?.length || 0;
        const thaiRatio = totalChars > 0 ? thaiChars / totalChars : 0;

        const isGarbage = totalChars > 50 && thaiRatio < 0.05;
        const isTooShort = text.trim().length < 50;

        if (isTooShort || isGarbage) {
            console.log(`Text extraction problematic (Length: ${totalChars}, Thai Ratio: ${thaiRatio.toFixed(2)}). Attempting Typhoon OCR (Auto-Extraction)...`);

            const ocrText = await tryOcrFallback(buffer);

            if (ocrText && ocrText.length > 50) {
                console.log("Typhoon OCR successful via Image Extraction.");
                text = ocrText;
            } else {
                console.warn("Typhoon OCR failed or returned empty.");
                // If OCR also fails, we return empty so the API can show the explicit error message about scanned docs
                if (isGarbage) text = ""; // If garbage, better to return empty than garbage
            }
        }

        return text;
    } catch (error) {
        console.error('Error parsing PDF buffer:', error);
        return '';
    }
}
// ... rest of file
