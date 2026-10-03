import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';
import { MAX_PAGE_TEXT_CHARS, STRUCTURE_CHUNK_CHARS, type ImportPageText } from '@/lib/exam-import';
import { structureExamChunk } from '@/lib/exam-structure';

// จัดโครงสร้างทีละกลุ่มหน้า — หน้าเว็บเรียกทีละคำขอพร้อมแถบความคืบหน้า
export const maxDuration = 60;

/**
 * แยกข้อความ OCR ของกลุ่มหน้าเป็นรายข้อ (AI + ตรวจทานด้วยกฎ) — ไม่เขียนอะไรลง Firestore
 * POST /api/education/exams/import/structure
 * Body: { pages: [{ page, text }], context?: { lastQuestionNumber, inAttachment, tail, title } }
 */
export async function POST(request: NextRequest) {
    try {
        await requireAdmin('education.exams');
    } catch (e) {
        return authErrorResponse(e);
    }

    const body = await request.json().catch(() => null);
    const rawPages: unknown[] = Array.isArray(body?.pages) ? body.pages : [];
    const pages: ImportPageText[] = rawPages
        .map(p => p as Record<string, unknown>)
        .filter(p => Number.isInteger(p?.page) && typeof p?.text === 'string')
        .map(p => ({ page: p.page as number, text: (p.text as string).slice(0, MAX_PAGE_TEXT_CHARS) }));

    if (pages.length === 0) {
        return NextResponse.json({ error: 'ไม่มีข้อความให้จัดโครงสร้าง' }, { status: 400 });
    }
    // เพดานต่อคำขอ: หน้าเดียวยาวได้ แต่หลายหน้ารวมกันต้องไม่เกิน 2 เท่าของขนาด chunk
    const totalChars = pages.reduce((s, p) => s + p.text.length, 0);
    if (pages.length > 1 && totalChars > STRUCTURE_CHUNK_CHARS * 2) {
        return NextResponse.json({ error: 'ข้อความต่อคำขอยาวเกินไป — แบ่งส่งทีละน้อยหน้า' }, { status: 413 });
    }

    const ctx = (body?.context && typeof body.context === 'object') ? body.context as Record<string, unknown> : {};
    try {
        const result = await structureExamChunk(pages, {
            lastQuestionNumber: typeof ctx.lastQuestionNumber === 'string' ? ctx.lastQuestionNumber.slice(0, 5) : null,
            inAttachment: ctx.inAttachment === true,
            tail: typeof ctx.tail === 'string' ? ctx.tail.slice(-400) : '',
            title: typeof ctx.title === 'string' ? ctx.title.slice(0, 200) : '',
        });
        return NextResponse.json(result);
    } catch (error) {
        console.error('EXAM_STRUCTURE_ERROR', error);
        return NextResponse.json({ error: 'จัดโครงสร้างข้อสอบไม่สำเร็จ' }, { status: 500 });
    }
}
