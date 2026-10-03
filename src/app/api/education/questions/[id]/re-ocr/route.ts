import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';
import { getGeminiModelName } from '@/lib/gemini-model';
import { EXAM_TRANSCRIBE_PROMPT, describeGeminiError } from '@/lib/exam-ocr';

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
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        const mimeType = imageResponse.headers.get('content-type') || 'image/png';

        // Use Gemini Vision to re-OCR
        // สร้าง client ตอนเรียก (อ่าน env ปัจจุบัน) และใช้โมเดลจาก GEMINI_MODEL — 2.0-flash กำลังถูกปลดระวาง
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');
        const model = genAI.getGenerativeModel({ model: getGeminiModelName() });

        const prompt = EXAM_TRANSCRIBE_PROMPT;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType,
                    data: base64Image,
                },
            },
        ]);

        const newText = result.response.text();

        return NextResponse.json({
            questionId,
            newText: newText.trim(),
            source: 'gemini-vision',
        });
    } catch (error) {
        console.error('Error re-OCR:', error);
        return NextResponse.json({ error: 'Re-OCR failed', details: describeGeminiError(error) }, { status: 500 });
    }
}
