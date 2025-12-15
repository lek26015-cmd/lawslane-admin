import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { callTyphoonOCR } from './typhoon';

const require = createRequire(import.meta.url);

async function tryOcrFallback(buffer: Buffer): Promise<string> {
    try {
        const pdfRequire = require('pdf-parse');
        // @ts-ignore
        const parser = new pdfRequire.PDFParse(new Uint8Array(buffer));

        // Extract images
        // @ts-ignore
        const imageResult = await parser.getImage({ imageBuffer: true, imageThreshold: 50 });

        let ocrText = "";
        let imagesFound = 0;

        if (imageResult && imageResult.pages) {
            for (const page of imageResult.pages) {
                if (page.images) {
                    for (const img of page.images) {
                        if (img.data) {
                            imagesFound++;
                            console.log(`OCR: Processing image ${img.name} (${img.width}x${img.height})...`);
                            // Assuming callTyphoonOCR is defined elsewhere or imported
                            const imgBuffer = Buffer.from(img.data);
                            const text = await callTyphoonOCR(imgBuffer);
                            if (text) {
                                ocrText += `\n\n--- [OCR Image ${imagesFound}] ---\n${text}`;
                            }
                        }
                    }
                }
            }
        }

        if (imagesFound === 0) {
            console.warn("OCR Fallback: No embedded images found in PDF.");
            return "";
        }

        return ocrText;

    } catch (e) {
        console.error("OCR Fallback failed:", e);
        return "";
    }
}

export async function parsePdfFromBuffer(buffer: Buffer): Promise<string> {
    try {
        const pdfRequire = require('pdf-parse');
        // @ts-ignore
        const parser = new pdfRequire.PDFParse(new Uint8Array(buffer));
        // @ts-ignore
        const data = await parser.getText();
        let text = data?.text || '';

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
                text = "";
            }
        }

        return text;
    } catch (error) {
        console.error('Error parsing PDF buffer:', error);
        return '';
    }
}
// ... rest of file
