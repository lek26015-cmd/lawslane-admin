#!/usr/bin/env node
/**
 * คัดลอกไฟล์ runtime ของ pdfjs-dist ไปไว้ใต้ public/pdfjs/ (หน้า "นำเข้าข้อสอบ (OCR)" ใช้)
 *
 * - pdf.worker.min.mjs : worker ที่แปลง PDF ในเบราว์เซอร์
 * - wasm/              : ตัวถอดรหัสภาพ JBIG2 / JPEG2000 ที่ PDF สแกนเก่าๆ ใช้บ่อย
 * - standard_fonts/    : ฟอนต์มาตรฐานสำหรับ PDF ที่ไม่ฝังฟอนต์
 *
 * เสิร์ฟจาก origin เดียวกัน (ไม่ต้องพึ่ง CDN / ไม่ต้องแก้ CSP) และตรงเวอร์ชันกับแพ็กเกจเสมอ
 * เพราะรันใหม่ทุกครั้งก่อน dev/build — public/pdfjs/ อยู่ใน .gitignore ไม่ต้อง commit
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'node_modules', 'pdfjs-dist');
const DEST = path.join(ROOT, 'public', 'pdfjs');

if (!fs.existsSync(SRC)) {
    console.warn('copy-pdfjs-assets: ไม่พบ node_modules/pdfjs-dist — ข้าม (รัน npm install ก่อน)');
    process.exit(0);
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });
fs.copyFileSync(path.join(SRC, 'build', 'pdf.worker.min.mjs'), path.join(DEST, 'pdf.worker.min.mjs'));
for (const dir of ['wasm', 'standard_fonts']) {
    fs.cpSync(path.join(SRC, dir), path.join(DEST, dir), { recursive: true });
}
const { version } = JSON.parse(fs.readFileSync(path.join(SRC, 'package.json'), 'utf-8'));
console.log(`copy-pdfjs-assets: pdfjs-dist ${version} → public/pdfjs/`);
