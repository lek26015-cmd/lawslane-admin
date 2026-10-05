import { stripAnswerFromQuestion } from './exam-utils';

/**
 * ตัวช่วยของระบบ "นำเข้าข้อสอบ (OCR)" ในหน้าแอดมิน — ใช้ได้ทั้งฝั่ง browser และ server
 * (ไม่มี secret และไม่แตะ Firestore)
 *
 * ยกตรรกะมาจาก pipeline เดิมแบบออฟไลน์ใน lawlanes-education/ข้อสอบเก่า/
 *   - ocr_pipeline.py      → split_questions / is_cover_page / clean_ocr_text
 *   - clean_and_prepare.py → ทิ้งข้อที่สั้นกว่า 20 ตัวอักษร, รูปแบบ document ใน Firestore
 * และเกณฑ์ตรวจภาษาจาก route exams/[id]/ocr-check ของ repo นี้
 *
 * ส่วนที่ "ไม่ได้" ยกมา: การแทนคำผิดตายตัวของ clean_and_prepare.py (เช่น ปัน→ปืน)
 * ออกแบบไว้แก้ขยะของ Tesseract โดยเฉพาะ และบางข้อทำข้อความถูกให้ผิด (แบ่งปัน → แบ่งปืน)
 *
 * บทเรียนจากข้อมูลจริง: ชุด em2Z3pQ1FdqgyTwugQAi (อนุญาโตตุลาการ 2557) ถูก pipeline เดิม
 * แตกเป็น 80 ข้อ ทั้งที่ข้อสอบจริงมี 3 ข้อ — ข้อ 3 แนบสัญญาแฟรนไชส์ที่มี "ข้อ๑." "ข้อ๕.๒" …
 * แต่ละข้อสัญญาเลยกลายเป็นข้อสอบ ตัวแยกข้อที่นี่จึงถือว่า "ข้อ ๑.๑" และเลขข้อที่วนกลับ
 * เป็นสัญญาณของเอกสารแนบ ไม่ใช่ข้อสอบใหม่
 */

/** เพดานจำนวนหน้าต่อการนำเข้า 1 ครั้ง — pipeline เดิมข้าม PDF ที่เกิน 20 หน้า (มักเป็นตำรา) */
export const MAX_IMPORT_PAGES = 40;
/** เพดานความยาวข้อความต่อหน้า กัน payload บวมจากข้อมูลผิดปกติ */
export const MAX_PAGE_TEXT_CHARS = 30000;
/** ข้อที่สั้นกว่านี้ถือว่าเป็นเศษ (ตามเกณฑ์ clean_and_prepare.py) */
export const MIN_QUESTION_CHARS = 20;
/** โจทย์ปรนัยสั้นได้ เช่น "ข้อใดถูกต้อง" */
export const MIN_MC_STEM_CHARS = 5;
/** จำนวนข้ออัตนัยต่อชุดที่เกินนี้ถือว่าน่าสงสัย (ข้อสอบนิติฯ จริงมัก 3-10 ข้อ) */
export const PLAUSIBLE_MAX_ESSAYS = 15;
/** เพดานข้อความต่อ 1 คำขอจัดโครงสร้างด้วย AI — ให้แต่ละ request จบใน maxDuration */
export const STRUCTURE_CHUNK_CHARS = 7000;
/** โฟลเดอร์ใน Firebase Storage ที่เก็บภาพหน้าข้อสอบจากการนำเข้า — route OCR รับเฉพาะ URL ใต้โฟลเดอร์นี้ */
export const EXAM_PAGE_PREFIX = 'exam-pages';

export interface ImportPageText {
    page: number;
    text: string;
}

export type ImportQuestionType = 'essay' | 'multiple_choice';

/** ข้อสอบ 1 ข้อระหว่างนำเข้า (ก่อนบันทึก) — แอดมินแก้ได้ในหน้า preview */
export interface ImportQuestion {
    /** เลขข้อตามต้นฉบับ (แปลงเป็นเลขอารบิกแล้ว) ใช้จับคู่เฉลยและเตือนเลขวนกลับ */
    number: string | null;
    /** ตัวคำถามล้วน (ตัดเลขข้อ ตัดเฉลยออกแล้ว) */
    questionText: string;
    /** เอกสารแนบของข้อนี้ เช่น สัญญา คำพิพากษา ข้อเท็จจริง — ข้อย่อยในนี้ไม่ใช่ข้อสอบ */
    attachmentTitle: string;
    attachmentText: string;
    type: ImportQuestionType;
    /** ตัวเลือกปรนัย (เฉพาะข้อความ ไม่มี ก. / (1)) */
    choices: string[];
    /** ปรนัย: "(n)" ตามที่เว็บนักศึกษาอ่าน — ว่างถ้าเอกสารไม่มีเฉลย */
    correctAnswer: string;
    /** อัตนัย: ธงคำตอบที่มีอยู่ในเอกสารเท่านั้น (ห้ามแต่ง) */
    modelAnswer: string;
    /** ข้อที่ให้ร่างเอกสารจริง เช่น คำฟ้อง พินัยกรรม — ชื่อชนิดใช้คำเดียวกับ docType ของ legal-doc */
    requiresForm: boolean;
    formType: string;
    sourcePage: number | null;
    /** หมายเหตุจากขั้นจัดโครงสร้าง (เช่น ตัดธงคำตอบที่ AI แต่งขึ้น) */
    notes: string[];
    include: boolean;
    /** เฉพาะผล AI ราย chunk: ข้อแรกของ chunk เป็นส่วนต่อจากข้อสุดท้ายของ chunk ก่อน */
    continuesPrevious?: boolean;
}

export interface AnswerKeyEntry {
    number: string;
    /** ปรนัย: ลำดับตัวเลือก 1-based */
    choice?: number | null;
    /** อัตนัย: ข้อความธงคำตอบ */
    answer?: string;
}

export interface StructureChunkResult {
    engine: 'ai' | 'rules';
    questions: ImportQuestion[];
    answerKey: AnswerKeyEntry[];
    warnings: string[];
    /** AI บอกว่าไฟล์นี้เป็นอะไร */
    documentKind?: 'exam' | 'answers_only' | 'mixed';
}

/* ------------------------------------------------------------------ */
/* ตัวอักษรและการล้างข้อความ                                             */
/* ------------------------------------------------------------------ */

const THAI_CHAR = /[฀-๿]/g;
const LATIN_CHAR = /[A-Za-z]/g;
// ขยะที่พบบ่อยเวลาดึงข้อความจาก PDF ไทยที่ใช้ฟอนต์รุ่นเก่า:
//   - Latin-1 Supplement (¡ÃÐ·Ã...) จากฟอนต์ที่ map ไทยไว้ช่วง 0xA1-0xFB
//   - Private Use Area U+E000-U+F8FF จากฟอนต์ไทยแบบเก่าที่วางวรรณยุกต์ไว้ตำแหน่งพิเศษ
//   - U+FFFD ตัวที่ถอดรหัสไม่ได้
// ไม่นับ U+00A0 (nbsp) และ U+00B7 (·) ที่พบในเอกสารปกติ
const GARBAGE_CHAR = /[¡-¶¸-ÿ-�]/g;
const FOREIGN_SCRIPT = /[Ѐ-ӿ؀-ۿ぀-ヿ㐀-鿿가-힯]/g;

const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';

/** แปลงเลขไทยเป็นอารบิก ("๑๒" → "12") */
export function toArabicDigits(s: string): string {
    return s.replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d)));
}

function countMatches(text: string, re: RegExp): number {
    return text.match(re)?.length ?? 0;
}

/**
 * ปรับข้อความไทยให้อยู่ในรูปมาตรฐาน (ไม่เปลี่ยนเลขไทยเป็นอารบิก — คงตามต้นฉบับ)
 *  - NFC, ตัด zero-width, รวม "นิคหิต+สระอา" (ทํา) เป็นสระอำ (ทำ), "เเ" เป็น "แ"
 *  - ต่ออักษรไทยที่ถูกแยกทีละตัว (ก ร ะ ท ำ) แบบที่ clean_ocr_text ทำ
 *  - ตัดบรรทัดเลขหน้า เช่น "- ๒ -", "หน้า 3", "2/5"
 *  - ลบตัวหนา markdown (**) ที่โมเดลอาจใส่มา
 */
export function normalizeThaiText(input: string): string {
    if (!input) return '';
    let text = input
        .normalize('NFC')
        .replace(/[​-‍﻿]/g, '')
        .replace(/ํา/g, 'ำ')
        .replace(/เเ/g, 'แ')
        .replace(/\r\n?/g, '\n')
        .replace(/\*\*/g, '');

    const lines = text.split('\n').map(line => {
        let l = line.replace(/[ \t ]+/g, ' ').trim();
        const tokens = l.split(' ').filter(Boolean);
        const thaiSingles = tokens.filter(t => /^[฀-๿]$/.test(t)).length;
        if (tokens.length >= 6 && thaiSingles / tokens.length > 0.5) {
            l = l.replace(/(?<=[฀-๿]) (?=[฀-๿])/g, '');
        }
        return l;
    }).filter(l => !/^(?:-\s*)?(?:หน้า\s*)?[๐-๙0-9]{1,3}(?:\s*\/\s*[๐-๙0-9]{1,3})?(?:\s*-)?$/.test(l));

    text = lines.join('\n').replace(/\n{3,}/g, '\n\n');
    return text.trim();
}

/**
 * ตัดหัว/ท้ายกระดาษที่ซ้ำทุกหน้า (ชื่อวิชา รหัสวิชา ชื่อคณะ เลขหน้า)
 * ดูเฉพาะ 3 บรรทัดแรกและ 3 บรรทัดสุดท้ายของแต่ละหน้า ถ้าบรรทัดเดียวกัน (ไม่นับตัวเลข)
 * โผล่ในครึ่งหนึ่งของหน้าขึ้นไป (อย่างน้อย 2 หน้า) ถือเป็นหัว/ท้ายกระดาษ
 */
export function removeRepeatedHeaders(pages: ImportPageText[]): ImportPageText[] {
    if (pages.length < 2) return pages;
    const keyOf = (l: string) => l.replace(/[\s๐-๙0-9.\-/()]/g, '');
    const edgeKeys = pages.map(p => {
        const lines = p.text.split('\n').map(l => l.trim()).filter(Boolean);
        const edges = [...lines.slice(0, 3), ...lines.slice(-3)];
        return new Set(edges.map(keyOf).filter(k => k.length >= 4));
    });
    const counts = new Map<string, number>();
    for (const keys of edgeKeys) for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
    const threshold = Math.max(2, Math.ceil(pages.length * 0.5));
    const repeated = new Set([...counts].filter(([, n]) => n >= threshold).map(([k]) => k));
    if (repeated.size === 0) return pages;

    return pages.map(p => {
        const lines = p.text.split('\n');
        const nonEmptyIdx = lines.map((l, i) => (l.trim() ? i : -1)).filter(i => i >= 0);
        const edgeIdx = new Set([...nonEmptyIdx.slice(0, 3), ...nonEmptyIdx.slice(-3)]);
        const kept = lines.filter((l, i) => !(edgeIdx.has(i) && repeated.has(keyOf(l.trim()))));
        return { ...p, text: kept.join('\n') };
    });
}

/** บรรทัดที่ขึ้นต้นแบบนี้คือจุดเริ่มย่อหน้า/ข้อย่อยใหม่ ห้ามต่อเข้ากับบรรทัดก่อน */
const BLOCK_START = /^(?:ข้อ\s*(?:ที่\s*)?[๐-๙0-9]|\(?[๐-๙0-9]{1,3}[.)]|\(?[ก-ฮ][.)]\s|[-–•*]\s|มาตรา\s|ธงคำตอบ|แนวคำตอบ|เฉลย|คำตอบ|หมายเหตุ|วินิจฉัย|ลงชื่อ|\()/;

/**
 * ต่อบรรทัดที่ OCR ตัดตามความกว้างกระดาษให้กลับเป็นย่อหน้า
 * ต่อเมื่อบรรทัดก่อนยาวเต็มบรรทัด (≥ 25 ตัว) และบรรทัดถัดไปไม่ใช่ข้อย่อย/หัวข้อใหม่
 * บรรทัดว่างคือการขึ้นย่อหน้าใหม่ที่ตั้งใจ จึงคงไว้
 */
export function joinBrokenLines(text: string): string {
    const out: string[] = [];
    for (const raw of text.split('\n')) {
        const line = raw.trim();
        const prev = out[out.length - 1];
        if (line && prev && prev.length >= 25 && !/[:：]$/.test(prev) && !BLOCK_START.test(line)) {
            const thaiJoin = /[฀-๿]$/.test(prev) && /^[฀-๿]/.test(line);
            out[out.length - 1] = prev + (thaiJoin ? '' : ' ') + line;
        } else {
            out.push(line);
        }
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ------------------------------------------------------------------ */
/* ตรวจคุณภาพข้อความ                                                    */
/* ------------------------------------------------------------------ */

export interface TextLayerAssessment {
    usable: boolean;
    /** สัดส่วนอักษรไทยต่ออักษรทั้งหมด (ไทย + ละติน + ขยะ) */
    thaiRatio: number;
    reason: string;
}

/**
 * ตัดสินว่าข้อความที่ดึงจาก text layer ของ PDF (pdfjs getTextContent) ใช้แทน OCR ได้ไหม
 *
 * PDF ไทยที่สร้างจากฟอนต์รุ่นเก่ามักดึงออกมาเป็นขยะ (ต้นเหตุเดียวกับที่ pdf-loader.ts
 * เช็ค Thai ratio) จึงตั้งเกณฑ์แบบระวัง: ข้อสอบในระบบเป็นภาษาไทย ถ้าหน้าไหน
 * อักษรไทยไม่ถึง 40% มีอักขระขยะเกิน 3% หรือลำดับสระ/วรรณยุกต์เพี้ยน ให้ส่งไป OCR แทน —
 * OCR เกินจำเป็นเสียแค่เวลา แต่ใช้ข้อความขยะทำให้ข้อสอบผิดทั้งหน้า
 */
export function assessTextLayer(raw: string): TextLayerAssessment {
    const text = (raw || '').replace(/\s+/g, '');
    const thai = countMatches(text, THAI_CHAR);
    const latin = countMatches(text, LATIN_CHAR);
    const garbage = countMatches(text, GARBAGE_CHAR);
    const letters = thai + latin + garbage;
    const thaiRatio = letters > 0 ? thai / letters : 0;

    if (letters < 30) return { usable: false, thaiRatio, reason: 'ไม่มีข้อความในไฟล์ (น่าจะเป็นภาพสแกน)' };
    if (garbage / letters > 0.03) return { usable: false, thaiRatio, reason: 'ข้อความในไฟล์เป็นอักขระเพี้ยน (ฟอนต์ไทยรุ่นเก่า)' };
    if (thaiRatio < 0.4) return { usable: false, thaiRatio, reason: 'อักษรไทยน้อยผิดปกติ' };
    if (countBrokenThai(raw) > Math.max(3, thai * 0.01)) {
        return { usable: false, thaiRatio, reason: 'ลำดับสระ/วรรณยุกต์ในไฟล์เพี้ยน' };
    }
    return { usable: true, thaiRatio, reason: 'ใช้ข้อความในไฟล์ได้' };
}

/** สระบน/ล่าง/วรรณยุกต์ที่ไม่ได้ตามหลังพยัญชนะ หรือวรรณยุกต์ซ้อนกัน — อาการของฟอนต์/OCR เพี้ยน */
function countBrokenThai(text: string): number {
    const orphanMarks = countMatches(text, /(?<![ก-ฮัิ-ฺ็-๎])[ัิ-ฺ็-๎]/g);
    const stackedTones = countMatches(text, /[่-๋]{2,}/g);
    const loneLeadingVowel = countMatches(text, /[เ-ไ](?![ก-ฮ])/g);
    return orphanMarks + stackedTones + loneLeadingVowel;
}

/**
 * ตรวจ "ภาษาประหลาด" ในข้อความข้อสอบ — ยกเกณฑ์จาก route ocr-check แล้วเพิ่มกรณีที่พบจริง
 * คืนรายการปัญหาเป็นภาษาไทย (ว่าง = ปกติ)
 */
export function detectTextIssues(text: string, minChars = MIN_QUESTION_CHARS): string[] {
    const issues: string[] = [];
    if (!text || text.trim().length < minChars) {
        issues.push('เนื้อหาสั้นเกินไปหรือว่างเปล่า');
        if (!text) return issues;
    }

    const garbage = countMatches(text, GARBAGE_CHAR);
    if (garbage > 0) issues.push(`พบอักขระเพี้ยน (ถอดรหัสฟอนต์ผิด) ${garbage} ตัว`);

    const foreign = countMatches(text, FOREIGN_SCRIPT);
    if (foreign > 0) issues.push(`พบอักษรภาษาอื่นปน (จีน/ญี่ปุ่น/รัสเซีย ฯลฯ) ${foreign} ตัว`);

    // 1. (ocr-check) อักษรละตินสั้นๆ แทรกกลางข้อความไทย
    const latinInThai = text.match(/(?<=[฀-๿])\s+[a-zA-Z]{1,4}\s+(?=[฀-๿])/g);
    if (latinInThai && latinInThai.length >= 2) issues.push(`พบอักขระ Latin แทรก ${latinInThai.length} จุด`);

    // 2. (ocr-check) ลำดับอักษรละตินสั้นๆ ต่อกันแบบไม่มีความหมาย — ต้องเจอ ≥ 2 จุด
    //    เพราะวลีอังกฤษจริงสั้นๆ ("in the law") ก็เข้าเงื่อนไขได้ 1 จุด
    const garbageRuns = text.match(/\b[a-zA-Z]{1,3}[\s,.'"-]+[a-zA-Z]{1,3}[\s,.'"-]+[a-zA-Z]{1,3}\b/g);
    if (garbageRuns && garbageRuns.length >= 2) issues.push(`พบลำดับอักขระผิดปกติ ${garbageRuns.length} จุด`);

    // 3. (ocr-check) สัดส่วนภาษาไทย — ข้ามถ้าส่วนอังกฤษเป็นคำยาวจริง (ศัพท์กฎหมายอังกฤษ)
    const thai = countMatches(text, THAI_CHAR);
    const latin = countMatches(text, LATIN_CHAR);
    if (thai + latin > 20 && latin > 0) {
        const ratio = thai / (thai + latin);
        const latinWords = text.match(/[A-Za-z]+/g) ?? [];
        const avgLen = latinWords.reduce((s, w) => s + w.length, 0) / Math.max(1, latinWords.length);
        if (ratio < 0.85 && avgLen < 4) issues.push(`สัดส่วนภาษาไทย ${Math.round(ratio * 100)}% (ต่ำกว่า 85%)`);
    }

    // 5. (ocr-check) เลขไทยปนอักษรละติน เช่น ๑a๒
    const digitMix = text.match(/[๐-๙]\s*[a-zA-Z]\s*[๐-๙]/g);
    if (digitMix) issues.push(`พบเลขไทยปนอักษร Latin ${digitMix.length} จุด`);

    const broken = countBrokenThai(text);
    if (broken >= 2) issues.push(`ลำดับสระ/วรรณยุกต์เพี้ยน ${broken} จุด`);

    // อักขระเดียวกันซ้ำยาว (ยกเว้น . _ - ที่เป็นช่องเว้นให้กรอกในแบบฟอร์ม)
    const repeats = text.match(/([^\s._\-…·])\1{4,}/g);
    if (repeats) issues.push(`พบอักขระซ้ำผิดปกติ ${repeats.length} จุด`);

    return issues;
}

/* ------------------------------------------------------------------ */
/* ส่วนประกอบของข้อ: เลขข้อ ตัวเลือก แบบฟอร์ม เฉลย                         */
/* ------------------------------------------------------------------ */

/** ตัดเลขข้อหน้าคำถาม (ข้อ ๑. / ข้อที่ 1 / 1. / ๑) ) — เว็บนักศึกษาใส่เลขข้อให้เองจาก orderIndex */
export function stripQuestionNumber(text: string): string {
    return (text || '')
        .replace(/^\s*(?:ข้อ\s*(?:ที่\s*)?[๐-๙0-9]{1,3}(?![.][๐-๙0-9])\s*[.):]?|\(?[๐-๙0-9]{1,3}[.)](?![๐-๙0-9]))\s*/u, '')
        .trim();
}

const CHOICE_LABELS: Record<string, number> = {
    'ก': 1, 'ข': 2, 'ค': 3, 'ง': 4, 'จ': 5,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
    '๑': 1, '๒': 2, '๓': 3, '๔': 4, '๕': 5,
    'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5,
};

/** แปลงป้ายตัวเลือก ("ค", "(3)", "๓") เป็นลำดับ 1-based */
export function choiceLabelToIndex(label: string): number | null {
    const m = (label || '').trim().replace(/[().\s]/g, '').toLowerCase();
    return CHOICE_LABELS[m] ?? null;
}

const CHOICE_LINE = /^\s*(?:\(([ก-จ1-5๑-๕a-eA-E])\)|([ก-จ])[.)]|([1-5๑-๕])\)|([a-eA-E])[.)])\s*(.+)$/;

/**
 * แยกตัวเลือกปรนัยท้ายคำถาม: ก. ข. ค. ง. / (1) (2) (3) (4) / 1) 2) 3) 4)
 * ต้องเรียงจากตัวแรกต่อเนื่อง ≥ 3 ตัว และอยู่ท้ายข้อ — กันข้อย่อยของอัตนัยถูกจับเป็นตัวเลือก
 */
export function parseChoices(text: string): { stem: string; choices: string[] } | null {
    const lines = (text || '').split('\n');
    let start = -1;
    const choices: string[] = [];
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(CHOICE_LINE);
        const label = m ? (m[1] ?? m[2] ?? m[3] ?? m[4]) : null;
        const idx = label ? choiceLabelToIndex(label) : null;
        if (m && idx === choices.length + 1) {
            if (start < 0) start = i;
            choices.push(m[5].trim());
        } else if (start >= 0 && lines[i].trim() && choices.length > 0) {
            if (m) return null; // ป้ายไม่เรียงลำดับ → ไม่ใช่ตัวเลือก
            choices[choices.length - 1] += ' ' + lines[i].trim(); // ตัวเลือกยาวหลายบรรทัด
        }
    }
    if (start >= 0 && choices.length >= 3) {
        return { stem: lines.slice(0, start).join('\n').trim(), choices };
    }

    // ตัวเลือกอยู่บรรทัดเดียวกัน: "ก. xxx ข. yyy ค. zzz ง. www"
    const inline = text.match(/(?:^|\s)ก[.)]\s*([\s\S]+?)\s+ข[.)]\s*([\s\S]+?)\s+ค[.)]\s*([\s\S]+?)(?:\s+ง[.)]\s*([\s\S]+?))?(?:\s+จ[.)]\s*([\s\S]+?))?\s*$/);
    if (inline) {
        const stem = text.slice(0, inline.index ?? 0).trim();
        const opts = inline.slice(1).filter((x): x is string => !!x).map(x => x.trim());
        if (stem && opts.length >= 3) return { stem, choices: opts };
    }
    return null;
}

/** ชนิดเอกสารกฎหมาย — ใช้คำเดียวกับ docType ของ legal-doc ใน lawlanes-education */
export const FORM_TYPES = [
    'คำฟ้องอุทธรณ์', 'คำฟ้องฎีกา', 'คำฟ้อง', 'คำให้การ', 'คำร้องขอ', 'คำร้อง', 'คำแถลงการณ์', 'คำแถลง',
    'คำอุทธรณ์', 'อุทธรณ์', 'ฎีกา', 'คำคัดค้าน', 'หมายเรียก', 'บัญชีระบุพยาน', 'หนังสือบอกกล่าว', 'คำบอกกล่าว',
    'หนังสือมอบอำนาจ', 'พินัยกรรม', 'ตั๋วแลกเงิน', 'ตั๋วสัญญาใช้เงิน', 'เช็ค', 'สัญญา', 'คำขอ', 'คำพิพากษา',
];

/**
 * ข้อที่สั่งให้ผู้สอบร่างเอกสารจริง (ข้อสอบว่าความภาคปฏิบัติ) — คืนชนิดเอกสาร หรือ null
 * ต้องมีคำสั่ง "ร่าง/เรียง/จัดทำ/เขียน" นำหน้า เพราะคำอย่าง "สัญญา" "คำฟ้อง" โผล่ในข้อเท็จจริงได้ทั่วไป
 */
export function detectFormRequirement(text: string): string | null {
    const types = FORM_TYPES.join('|');
    const m = (text || '').match(new RegExp(`(?:ร่าง|เรียง|จัดทำ|เขียน)\\s*(${types})`));
    if (m) return m[1];
    if (/แบบพิมพ์|แบบฟอร์ม/.test(text || '')) {
        const t = (text || '').match(new RegExp(`(${types})`));
        return t ? t[1] : 'แบบพิมพ์ศาล';
    }
    return null;
}

/** หัวข้อส่วนเฉลยที่อยู่ต้นบรรทัด */
const ANSWER_HEADING = /^[ \t]*(?:ธงคำตอบ|แนวคำตอบ|แนวการตอบ|เฉลย|คำตอบ|answer key|answers?)[ \t:：]*(?:\n|$)/im;

/**
 * อ่านตารางเฉลยท้ายไฟล์ เช่น "เฉลย 1. ค 2. ก 3. (4)" หรือ "ข้อ ๑ ตอบ ข"
 * ต้องอยู่ใต้หัวข้อเฉลยและเจออย่างน้อย 2 คู่
 */
export function parseAnswerKey(text: string): { key: AnswerKeyEntry[]; start: number } | null {
    const heading = ANSWER_HEADING.exec(text || '');
    if (!heading) return null;
    const section = text.slice(heading.index);
    const pairs = [...section.matchAll(/(?:ข้อ\s*)?([๐-๙0-9]{1,3})\s*[.)]?\s*(?:ตอบ\s*)?\(?([ก-จ1-5๑-๕])\)?(?=[\s,;]|$)/g)];
    const key: AnswerKeyEntry[] = [];
    for (const p of pairs) {
        const choice = choiceLabelToIndex(p[2]);
        if (choice) key.push({ number: toArabicDigits(p[1]), choice });
    }
    return key.length >= 2 ? { key, start: heading.index } : null;
}

/** หน้าปกข้อสอบ (ไม่ใช่ตัวคำถาม) — ยกจาก is_cover_page ใน ocr_pipeline.py */
export function isCoverPage(text: string): boolean {
    const keywords = ['คณะนิติศาสตร์', 'มหาวิทยาลัย', 'การสอบ', 'ประจำภาค',
        'ประจำปี', 'คำสั่ง', 'ข้อสอบอัตนัย', 'ข้อสอบทั้งหมด',
        'เวลา', 'คะแนน', 'ผู้ออกข้อสอบ'];
    const count = keywords.filter(kw => text.includes(kw)).length;
    return count >= 3 && text.length < 1500;
}

/* ------------------------------------------------------------------ */
/* แยกข้อแบบกฎ (สำรองเมื่อ AI ใช้ไม่ได้)                                   */
/* ------------------------------------------------------------------ */

/**
 * หัวข้อ "ข้อ ๑." / "ข้อที่ 2" / "ข้อ ๑๐)" — ต่างจาก pattern เดิมของ Python 3 จุด:
 *  1. ต้องอยู่ต้นบรรทัด (ของเดิมตัดทุก "ข้อ X" แม้อยู่กลางประโยค)
 *  2. รับเลขไทย ๐ ด้วย (ของเดิมใช้ [๑-๙] ทำให้ "ข้อ ๑๐" ถูกอ่านเป็น "ข้อ ๑")
 *  3. ไม่นับเลขย่อย "ข้อ ๑.๑" — นั่นคือข้อสัญญา/ข้อย่อยของเอกสารแนบ
 */
const QUESTION_MARKER_SOURCE = String.raw`^[ \t>#_*-]*ข้อ\s*(?:ที่\s*)?([๐-๙0-9]{1,3})(?![.][๐-๙0-9])(?=[\s.):\]]|$)`;
// สร้างใหม่ทุกครั้ง — regex แบบ /g เก็บ lastIndex ข้ามการเรียก (matchAll ก็สืบทอดค่านั้น) ทำให้ข้ามข้อแรกได้
const questionMarker = () => new RegExp(QUESTION_MARKER_SOURCE, 'gm');

function pageAt(offsets: { start: number; page: number }[], index: number): number | null {
    let page: number | null = null;
    for (const o of offsets) {
        if (o.start <= index) page = o.page;
        else break;
    }
    return page;
}

function emptyQuestion(partial: Partial<ImportQuestion>): ImportQuestion {
    return {
        number: null, questionText: '', attachmentTitle: '', attachmentText: '',
        type: 'essay', choices: [], correctAnswer: '', modelAnswer: '',
        requiresForm: false, formType: '', sourcePage: null, notes: [], include: true,
        ...partial,
    };
}

/** ประกอบข้อจากข้อความดิบ 1 ช่วง: ตัดเลขข้อ, แยกเฉลย, แยกตัวเลือก, ตรวจแบบฟอร์ม */
function buildQuestion(raw: string, number: string | null, sourcePage: number | null): ImportQuestion {
    const { question, extractedAnswer } = stripAnswerFromQuestion(raw.trim());
    let text = joinBrokenLines(stripQuestionNumber(question));
    const q = emptyQuestion({ number, sourcePage });

    const mc = parseChoices(text);
    if (mc) {
        q.type = 'multiple_choice';
        q.choices = mc.choices;
        text = mc.stem;
        const ans = extractedAnswer.match(/\(?([ก-จ1-5๑-๕])\)?/);
        const idx = ans ? choiceLabelToIndex(ans[1]) : null;
        if (idx && idx <= mc.choices.length) q.correctAnswer = `(${idx})`;
    } else {
        q.modelAnswer = extractedAnswer.replace(/^(?:ธงคำตอบ|แนวคำตอบ|เฉลย|คำตอบ)\s*[:：]?\s*/, '').trim();
    }
    q.questionText = text;
    const form = detectFormRequirement(text);
    if (form) { q.requiresForm = true; q.formType = form; }
    q.include = text.length >= (q.type === 'multiple_choice' ? MIN_MC_STEM_CHARS : MIN_QUESTION_CHARS);
    return q;
}

/**
 * แยกข้อด้วยกฎล้วน (พอร์ตจาก split_questions ใน ocr_pipeline.py + กันเอกสารแนบ)
 *
 * เลขข้อวนกลับ = เริ่มเอกสารแนบ: เมื่อเจอ "ข้อ ๑" หลังข้อ ๓ จะรวมทุกอย่างต่อจากนั้นเข้ากับ
 * ข้อ ๓ จนกว่าจะเจอเลขข้อถัดไปของข้อสอบจริง (๔) ที่ไม่ใช่เลขต่อเนื่องของเอกสารแนบเอง
 */
export function splitExamPagesByRules(pagesIn: ImportPageText[]): StructureChunkResult {
    const pages = removeRepeatedHeaders(
        [...pagesIn].sort((a, b) => a.page - b.page).map(p => ({ page: p.page, text: normalizeThaiText(p.text || '') })),
    );
    const offsets: { start: number; page: number }[] = [];
    let combined = '';
    const warnings: string[] = [];

    pages.forEach((p, idx) => {
        let text = p.text;
        if (!text) return;
        // หน้าแรกที่เป็นหน้าปก: ของเดิมทิ้งทั้งหน้า แต่ข้อสอบสั้นๆ มักพิมพ์ "ข้อ ๑" ต่อท้าย
        // หัวกระดาษในหน้าเดียวกัน จึงเก็บส่วนตั้งแต่ข้อแรกไว้ถ้ามี
        if (idx === 0 && isCoverPage(text)) {
            const first = questionMarker().exec(text);
            if (!first) return;
            text = text.slice(first.index);
        }
        if (combined) combined += '\n\n';
        offsets.push({ start: combined.length, page: p.page });
        combined += text;
    });

    if (!combined.trim()) return { engine: 'rules', questions: [], answerKey: [], warnings: ['ไม่มีข้อความให้แยกข้อ'] };

    // ตารางเฉลยท้ายไฟล์ — ตัดออกก่อนแยกข้อ ไม่ให้ "1. ค" กลายเป็นข้อสอบ
    let answerKey: AnswerKeyEntry[] = [];
    const keyFound = parseAnswerKey(combined);
    if (keyFound) {
        const tail = combined.slice(keyFound.start);
        if (!questionMarker().test(tail.replace(/^[^\n]*\n/, '')) || tail.length < 2000) {
            answerKey = keyFound.key;
            combined = combined.slice(0, keyFound.start);
        }
    }

    const matches = Array.from(combined.matchAll(questionMarker()));
    if (matches.length === 0) {
        warnings.push('ไม่พบเลขข้อ (ข้อ ๑, ข้อ ๒ …) — รวมทั้งหมดเป็นข้อเดียว กรุณาแบ่งข้อเอง');
        return { engine: 'rules', questions: [buildQuestion(combined, null, offsets[0]?.page ?? null)], answerKey, warnings };
    }

    const questions: ImportQuestion[] = [];
    const preamble = combined.slice(0, matches[0].index).trim();
    if (preamble) {
        const q = buildQuestion(preamble, null, offsets[0]?.page ?? null);
        q.include = false;
        q.notes.push('คำชี้แจงก่อนข้อแรก (ไม่นับเป็นข้อสอบ)');
        questions.push(q);
    }

    let realLast = 0;
    let attachLast = 0;
    let inAttachment = false;
    matches.forEach((m, i) => {
        const start = m.index ?? 0;
        const end = i + 1 < matches.length ? (matches[i + 1].index ?? combined.length) : combined.length;
        const segment = combined.slice(start, end);
        const num = parseInt(toArabicDigits(m[1]), 10);
        const prev = questions[questions.length - 1];

        const continuesAttachment = inAttachment && num === attachLast + 1;
        // ยอมให้เลขกระโดด 1 ข้อ (OCR อ่านหัวข้อหาย) ถ้ายังไม่ได้อยู่ในเอกสารแนบ
        const isNextReal = !continuesAttachment
            && (num === realLast + 1 || (!inAttachment && num > realLast && num <= realLast + 2));
        if (isNextReal && num !== realLast + 1 && realLast > 0) {
            warnings.push(`เลขข้อกระโดดจากข้อ ${realLast} ไปข้อ ${num} — อาจอ่านหัวข้อบางข้อไม่ออก`);
        }
        if (prev && !prev.notes.includes('คำชี้แจงก่อนข้อแรก (ไม่นับเป็นข้อสอบ)') && realLast > 0 && !isNextReal) {
            // เลขวนกลับหรือกระโดด → เป็นข้อย่อยของเอกสารแนบในข้อก่อนหน้า
            if (!inAttachment) {
                inAttachment = true;
                warnings.push(`เลขข้อวนกลับ (ข้อ ${num} หลังข้อ ${realLast}) — รวมไว้ในข้อ ${realLast} เป็นเอกสารแนบ กรุณาตรวจ`);
                prev.notes.push('มีข้อย่อยที่เลขวนกลับรวมอยู่ (น่าจะเป็นเอกสารแนบ เช่น สัญญา) — ตรวจทาน');
            }
            attachLast = num;
            prev.questionText = `${prev.questionText}\n${joinBrokenLines(segment.trim())}`;
            return;
        }
        inAttachment = false;
        attachLast = 0;
        realLast = num;
        questions.push(buildQuestion(segment, String(num), pageAt(offsets, start)));
    });

    return { engine: 'rules', questions, answerKey, warnings };
}

/* ------------------------------------------------------------------ */
/* รวมผลทุก chunk + ตรวจสุดท้าย                                          */
/* ------------------------------------------------------------------ */

/** ข้อความที่เว็บนักศึกษาแสดง — เว็บนั้นแสดงแค่ questionText จึงต่อเอกสารแนบไว้ท้ายข้อ */
export function composeQuestionText(q: Pick<ImportQuestion, 'questionText' | 'attachmentTitle' | 'attachmentText'>): string {
    const body = q.questionText.trim();
    const att = q.attachmentText.trim();
    if (!att) return body;
    const title = q.attachmentTitle.trim() || 'เอกสารประกอบ';
    return `${body}\n\n──────────\nเอกสารแนบ: ${title}\n──────────\n${att}`;
}

/**
 * ปัญหาของข้อที่ต้องแก้ก่อนเผยแพร่ (เก็บลง ocrIssues) — ภาษาผิดปกติ + โครงสร้างไม่ครบ
 * หน้า review คำนวณใหม่ทุกครั้งที่แก้ข้อความ (review-data PATCH)
 */
export function computeQuestionIssues(q: {
    questionText: string;
    type: string;
    choices?: unknown;
    correctAnswer?: string;
}): string[] {
    const isMc = q.type === 'multiple_choice' || q.type === 'MULTIPLE_CHOICE';
    // โจทย์ปรนัยสั้นได้ ("ข้อใดถูกต้อง") จึงใช้เกณฑ์ความยาวต่ำกว่าอัตนัย
    const issues = detectTextIssues(q.questionText, isMc ? MIN_MC_STEM_CHARS : MIN_QUESTION_CHARS);
    if (isMc) {
        const choices = Array.isArray(q.choices) ? q.choices : [];
        if (choices.length < 2) issues.push('ปรนัยแต่ไม่มีตัวเลือก');
        else if (choices.some(c => detectTextIssues(String(c), 1).length > 0)) {
            issues.push('ตัวเลือกมีภาษาผิดปกติ');
        }
        // รูปแบบเดิมในระบบมีทั้ง "(2)" และ "(2) ข้อความตัวเลือก" — เว็บนักศึกษาอ่านแค่เลขในวงเล็บ
        const m = (q.correctAnswer || '').match(/\((\d+)\)/);
        if (!m || parseInt(m[1], 10) < 1 || parseInt(m[1], 10) > choices.length) {
            // เว็บนักศึกษาให้คะแนนโดยถือตัวเลือกที่ 1 เป็นคำตอบถ้าไม่มี correctAnswer
            issues.push('ยังไม่มีคำตอบที่ถูกของข้อปรนัย');
        }
    }
    // เว็บนักศึกษาตัดข้อความตั้งแต่หัวข้อ "ธงคำตอบ/คำตอบ/วินิจฉัย" ทิ้ง (stripAnswerFromQuestion)
    if (stripAnswerFromQuestion(q.questionText).extractedAnswer) {
        issues.push('ในคำถามมีหัวข้อเฉลย/คำตอบ — เว็บนักศึกษาจะตัดข้อความส่วนหลังทิ้ง');
    }
    return issues;
}

/**
 * รวมผลจัดโครงสร้างทุก chunk ตามลำดับหน้า: ต่อข้อที่ข้าม chunk, จับคู่ตารางเฉลยกับเลขข้อ,
 * เตือนเลขข้อวนกลับ/จำนวนข้อผิดปกติ/ไฟล์ที่เป็นเฉลยล้วน
 */
export function finalizeImportQuestions(chunks: StructureChunkResult[]): { questions: ImportQuestion[]; warnings: string[] } {
    const questions: ImportQuestion[] = [];
    const warnings: string[] = [];
    const answerKey: AnswerKeyEntry[] = [];

    for (const chunk of chunks) {
        warnings.push(...chunk.warnings);
        answerKey.push(...chunk.answerKey);
        if (chunk.documentKind === 'answers_only') {
            warnings.push('AI ระบุว่าบางหน้าเป็นเฉลยอย่างเดียว (ไม่มีโจทย์) — ตรวจว่าเลือกไฟล์ถูกต้อง');
        }
        chunk.questions.forEach((q, i) => {
            const prev = questions[questions.length - 1];
            if (i === 0 && q.continuesPrevious && prev) {
                if (q.attachmentText || prev.attachmentText) {
                    prev.attachmentText = [prev.attachmentText, q.attachmentText || q.questionText].filter(Boolean).join('\n');
                    if (!prev.attachmentTitle) prev.attachmentTitle = q.attachmentTitle;
                } else {
                    prev.questionText = [prev.questionText, q.questionText].filter(Boolean).join('\n');
                }
                if (q.choices.length && !prev.choices.length) { prev.choices = q.choices; prev.type = q.type; }
                if (q.modelAnswer) prev.modelAnswer = [prev.modelAnswer, q.modelAnswer].filter(Boolean).join('\n');
                if (q.correctAnswer && !prev.correctAnswer) prev.correctAnswer = q.correctAnswer;
                if (q.requiresForm && !prev.requiresForm) { prev.requiresForm = true; prev.formType = q.formType; }
                prev.notes.push(...q.notes);
                return;
            }
            questions.push({ ...q, continuesPrevious: undefined });
        });
    }

    // จับคู่ตารางเฉลยกับข้อ (ใช้เฉพาะเฉลยที่อยู่ในเอกสาร ไม่แต่งเพิ่ม)
    const unmatched: string[] = [];
    for (const entry of answerKey) {
        const targets = questions.filter(q => q.include && q.number === entry.number);
        if (targets.length !== 1) { unmatched.push(entry.number); continue; }
        const q = targets[0];
        if (q.type === 'multiple_choice' && entry.choice && entry.choice <= q.choices.length) {
            if (!q.correctAnswer) q.correctAnswer = `(${entry.choice})`;
        } else if (q.type === 'essay' && entry.answer && !q.modelAnswer) {
            q.modelAnswer = entry.answer;
        } else {
            unmatched.push(entry.number);
        }
    }
    if (unmatched.length) {
        warnings.push(`จับคู่เฉลยกับข้อไม่ได้ ${unmatched.length} รายการ (ข้อ ${unmatched.slice(0, 10).join(', ')}) — ใส่เฉลยเองในหน้าตรวจ`);
    }

    // เลขข้อวนกลับ = มักเป็นข้อย่อยของเอกสารแนบที่ถูกแยกเป็นข้อ
    let last = 0;
    for (const q of questions) {
        if (!q.include || !q.number) continue;
        const n = parseInt(q.number, 10);
        if (!Number.isNaN(n) && n <= last) {
            warnings.push(`เลขข้อวนกลับ (ข้อ ${n} หลังข้อ ${last}) — อาจเป็นข้อของเอกสารแนบ ไม่ใช่ข้อสอบใหม่ ควรรวมเข้าข้อก่อนหน้า`);
            q.notes.push('เลขข้อวนกลับ — อาจเป็นส่วนของเอกสารแนบ');
        }
        if (!Number.isNaN(n)) last = n;
    }

    const included = questions.filter(q => q.include);
    const essays = included.filter(q => q.type === 'essay').length;
    if (essays > PLAUSIBLE_MAX_ESSAYS) {
        warnings.push(`ได้ข้ออัตนัย ${essays} ข้อ ซึ่งมากผิดปกติ (ปกติไม่เกิน ${PLAUSIBLE_MAX_ESSAYS}) — อาจแยกข้อสัญญา/เอกสารแนบเป็นข้อสอบ`);
    }
    const answerOnly = included.filter(q =>
        q.questionText.trim().length < (q.type === 'multiple_choice' ? MIN_MC_STEM_CHARS : MIN_QUESTION_CHARS)
        && (q.modelAnswer || q.correctAnswer)).length;
    if (included.length > 0 && answerOnly / included.length > 0.5) {
        warnings.push('ส่วนใหญ่มีแต่เฉลยไม่มีโจทย์ — ไฟล์นี้อาจเป็นเฉลยอย่างเดียว');
    }
    if (included.length === 0) warnings.push('ไม่พบข้อสอบที่จะบันทึก');

    return { questions, warnings: Array.from(new Set(warnings)) };
}

/** แบ่งหน้าเป็นกลุ่มสำหรับเรียก AI ทีละคำขอ (ไม่แบ่งกลางหน้า) */
export function chunkPagesForStructuring(pages: ImportPageText[], maxChars = STRUCTURE_CHUNK_CHARS): ImportPageText[][] {
    const chunks: ImportPageText[][] = [];
    let current: ImportPageText[] = [];
    let size = 0;
    for (const p of pages) {
        if (current.length && size + p.text.length > maxChars) {
            chunks.push(current);
            current = [];
            size = 0;
        }
        current.push(p);
        size += p.text.length;
    }
    if (current.length) chunks.push(current);
    return chunks;
}

/** ชั้นปีจากรหัสวิชา LAW2001 → year2 (หน้า list จะเดาเองจากชื่อวิชาถ้าไม่มีค่า) */
export function categoryFromSubjectCode(code: string): string | null {
    const m = (code || '').toUpperCase().match(/^LAW([1-4])\d{3}/);
    return m ? `year${m[1]}` : null;
}

/** ตัดคำต่อท้ายชื่อไฟล์ที่เกิดจากดาวน์โหลดซ้ำ "57777313(1).pdf" → "57777313.pdf" */
export function canonicalSourceFile(name: string): string {
    return (name || '').trim().replace(/\s*\(\d+\)(?=\.[^.]+$)/, '').replace(/\s+copy(?=\.[^.]+$)/i, '');
}

/** ทำความสะอาดข้อ 1 ข้อจากผู้เรียก (ใช้ทั้งก่อนแสดงผลและก่อนบันทึก) */
export function sanitizeImportQuestion(raw: unknown): ImportQuestion | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const str = (v: unknown, max: number) => (typeof v === 'string' ? v : '').slice(0, max);
    const type: ImportQuestionType = r.type === 'multiple_choice' ? 'multiple_choice' : 'essay';
    const choices = type === 'multiple_choice' && Array.isArray(r.choices)
        ? r.choices.filter((c): c is string => typeof c === 'string').map(c => normalizeThaiText(c).slice(0, 2000)).filter(Boolean).slice(0, 8)
        : [];
    let correctAnswer = str(r.correctAnswer, 500).trim();
    const m = correctAnswer.match(/^\(?(\d+)\)?/);
    correctAnswer = m && type === 'multiple_choice' && parseInt(m[1], 10) >= 1 && parseInt(m[1], 10) <= choices.length ? `(${parseInt(m[1], 10)})` : '';
    const page = typeof r.sourcePage === 'number' && Number.isInteger(r.sourcePage) && r.sourcePage > 0 ? r.sourcePage : null;
    const number = typeof r.number === 'string' && /^\d{1,3}$/.test(toArabicDigits(r.number.trim())) ? toArabicDigits(r.number.trim()) : null;
    const formType = str(r.formType, 60).trim();
    return {
        number,
        questionText: stripQuestionNumber(normalizeThaiText(str(r.questionText, 20000))),
        attachmentTitle: normalizeThaiText(str(r.attachmentTitle, 200)),
        attachmentText: normalizeThaiText(str(r.attachmentText, 40000)),
        type,
        choices,
        correctAnswer,
        modelAnswer: type === 'essay' ? normalizeThaiText(str(r.modelAnswer, 20000)) : '',
        requiresForm: r.requiresForm === true,
        formType: r.requiresForm === true ? (formType || 'เอกสาร') : '',
        sourcePage: page,
        notes: Array.isArray(r.notes) ? r.notes.filter((n): n is string => typeof n === 'string').map(n => n.slice(0, 300)).slice(0, 10) : [],
        include: r.include !== false,
        continuesPrevious: r.continuesPrevious === true ? true : undefined,
    };
}

/**
 * คำนวณ ocrIssues ใหม่หลังแอดมินแก้ข้อในหน้าตรวจ — คืน undefined ถ้าข้อนั้นไม่ได้มาจากระบบนำเข้า
 * (ไม่มีฟิลด์ ocrIssues) เพื่อไม่ไปติดธงให้ข้อสอบเก่าที่เผยแพร่อยู่แล้ว
 */
export function recomputeOcrIssues(
    existing: Record<string, unknown>,
    updates: Record<string, unknown>,
): string[] | undefined {
    if (!Array.isArray(existing.ocrIssues)) return undefined;
    const merged = { ...existing, ...updates };
    return computeQuestionIssues({
        questionText: typeof merged.questionText === 'string' ? merged.questionText : '',
        type: typeof merged.type === 'string' ? merged.type : 'essay',
        choices: merged.choices,
        correctAnswer: typeof merged.correctAnswer === 'string' ? merged.correctAnswer : '',
    });
}
