/**
 * ส่วนของระบบนำเข้าข้อสอบที่ทำงานในเบราว์เซอร์เท่านั้น: แปลง PDF / ภาพ เป็นภาพหน้า JPEG
 * พร้อมดึง text layer ของ PDF (ถ้ามี) — ทำฝั่งเบราว์เซอร์เพื่อไม่ส่งไฟล์ใหญ่ผ่าน Vercel function
 *
 * ไฟล์ runtime ของ pdfjs (worker / wasm / ฟอนต์) อยู่ที่ /pdfjs/ — คัดลอกจาก node_modules
 * ด้วย scripts/copy-pdfjs-assets.mjs ตอน predev/prebuild
 */

/** ความกว้างเป้าหมายของภาพหน้า PDF (px) — ชัดพอให้ OCR อ่านตัวไทยเล็กๆ ได้ */
const PDF_TARGET_WIDTH = 2000;
/** ภาพที่อัปโหลดมาเองย่อไม่เกินนี้ (ไม่ขยายภาพเล็ก) */
const IMAGE_MAX_WIDTH = 2400;
const IMAGE_MAX_HEIGHT = 3400;
const JPEG_QUALITY = 0.85;

export const ACCEPTED_IMPORT_TYPES = '.pdf,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';

export interface PreparedPage {
    /** ชื่อไฟล์ต้นทาง + หน้าในไฟล์นั้น ไว้แสดงผล */
    sourceName: string;
    sourcePage: number;
    blob: Blob;
    previewUrl: string;
    /** ข้อความจาก text layer ของ PDF (ภาพ = ว่าง) */
    textLayer: string;
}

export function isPdfFile(file: File): boolean {
    return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export function isHeicFile(file: File): boolean {
    return /image\/hei[cf]/.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('แปลงภาพเป็น JPEG ไม่สำเร็จ'))), 'image/jpeg', JPEG_QUALITY);
    });
}

function whiteCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('เบราว์เซอร์นี้ใช้ canvas ไม่ได้');
    // พื้นขาว — ภาพ PNG โปร่งใสจะกลายเป็นพื้นดำเมื่อแปลงเป็น JPEG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return { canvas, ctx };
}

async function loadPdfjs() {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
    return pdfjs;
}

/**
 * แปลง PDF ทุกหน้าเป็นภาพ JPEG กว้าง ~2000px และดึงข้อความจาก text layer
 * onProgress(หน้าที่ทำเสร็จ, จำนวนหน้าทั้งหมด)
 */
export async function preparePdf(
    file: File,
    maxPages: number,
    onProgress?: (done: number, total: number) => void,
): Promise<PreparedPage[]> {
    const pdfjs = await loadPdfjs();
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({
        data,
        wasmUrl: '/pdfjs/wasm/',
        standardFontDataUrl: '/pdfjs/standard_fonts/',
    }).promise;

    try {
        if (doc.numPages > maxPages) {
            throw new Error(`${file.name} มี ${doc.numPages} หน้า เกินเพดาน ${maxPages} หน้าต่อการนำเข้า`);
        }
        const pages: PreparedPage[] = [];
        for (let n = 1; n <= doc.numPages; n++) {
            const page = await doc.getPage(n);

            // text layer: ต่อชิ้นข้อความ และขึ้นบรรทัดใหม่ตาม hasEOL
            const content = await page.getTextContent();
            let textLayer = '';
            for (const item of content.items) {
                if ('str' in item) {
                    textLayer += item.str;
                    if (item.hasEOL) textLayer += '\n';
                }
            }

            const base = page.getViewport({ scale: 1 });
            const scale = Math.min(4, Math.max(1, PDF_TARGET_WIDTH / base.width));
            const viewport = page.getViewport({ scale });
            const { canvas, ctx } = whiteCanvas(viewport.width, viewport.height);
            await page.render({ canvas, canvasContext: ctx, viewport }).promise;
            const blob = await canvasToJpeg(canvas);
            page.cleanup();

            pages.push({
                sourceName: file.name,
                sourcePage: n,
                blob,
                previewUrl: URL.createObjectURL(blob),
                textLayer: textLayer.trim(),
            });
            onProgress?.(n, doc.numPages);
        }
        return pages;
    } finally {
        await doc.loadingTask.destroy();
    }
}

/** แปลงไฟล์ภาพ 1 ไฟล์เป็น JPEG (หมุนตาม EXIF, ย่อถ้าใหญ่เกิน) */
export async function prepareImage(file: File): Promise<PreparedPage> {
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
        if (isHeicFile(file)) {
            throw new Error(`${file.name}: เบราว์เซอร์นี้เปิดไฟล์ HEIC ไม่ได้ — ใช้ Safari หรือแปลงเป็น JPG ก่อน`);
        }
        throw new Error(`${file.name}: เปิดไฟล์ภาพไม่ได้`);
    }
    const ratio = Math.min(1, IMAGE_MAX_WIDTH / bitmap.width, IMAGE_MAX_HEIGHT / bitmap.height);
    const { canvas, ctx } = whiteCanvas(bitmap.width * ratio, bitmap.height * ratio);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await canvasToJpeg(canvas);
    return { sourceName: file.name, sourcePage: 1, blob, previewUrl: URL.createObjectURL(blob), textLayer: '' };
}

/** อัปโหลดภาพหน้าขึ้น Firebase Storage ผ่าน server ทีละหน้า — คืน URL ภาพ */
export async function uploadExamPage(blob: Blob, batchId: string, page: number): Promise<string> {
    const form = new FormData();
    form.append('file', blob, `p${page}.jpg`);
    form.append('batchId', batchId);
    form.append('page', String(page));
    const res = await fetch('/api/education/exams/upload-page', { method: 'POST', body: form });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.url) {
        throw new Error(body.error || `อัปโหลดภาพหน้า ${page} ไม่สำเร็จ (${res.status})`);
    }
    return body.url as string;
}
