import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';
import { ocrExamPageImage, OcrError, describeGeminiError } from '@/lib/exam-ocr';

export const maxDuration = 60;

/**
 * Re-OCR a question using Gemini Vision
 * POST /api/education/questions/[id]/re-ocr
 * Body: { examId, pageImageUrl }
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // ยกมาจาก lawlanes-education ตอนรวมหลังบ้าน (Module 5)
        // ด่านเดิมเป็น session cookie ของระบบ email/password แยกของ education
        // repo นี้ใช้ Firebase custom claim ผ่าน requireAdmin() ของ auth-guard
        try {
            await requireAdmin('education.exams');
        } catch (e) {
            return authErrorResponse(e);
        }

        const { id: questionId } = await params;
        const { examId, pageImageUrl } = await request.json();

        if (!pageImageUrl) {
            return NextResponse.json({ error: 'pageImageUrl is required' }, { status: 400 });
        }

        // Fetch the image
        const imageResponse = await fetch(pageImageUrl);
        if (!imageResponse.ok) {
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 });
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const mimeType = imageResponse.headers.get('content-type') || 'image/png';

        // ใช้ตัวช่วยกลาง: Gemini ก่อน ล้มแล้วสำรองด้วย Typhoon พร้อม timeout กันฟังก์ชันหมดเวลา
        const result = await ocrExamPageImage(Buffer.from(imageBuffer), mimeType);

        return NextResponse.json({
            questionId,
            newText: result.text,
            source: result.engine === 'gemini' ? 'gemini-vision' : 'typhoon-ocr',
            warning: result.warning,
        });
    } catch (error) {
        console.error('Error re-OCR:', error);
        return NextResponse.json({ error: 'Re-OCR failed', details: error instanceof OcrError ? error.message : describeGeminiError(error) }, { status: 500 });
    }
}
