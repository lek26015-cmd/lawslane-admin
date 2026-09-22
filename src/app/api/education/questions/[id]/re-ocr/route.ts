import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');

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
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `คุณเป็นผู้เชี่ยวชาญด้านกฎหมายไทย กรุณาอ่านข้อสอบกฎหมายจากภาพนี้อย่างละเอียดและแม่นยำ

กฎ:
1. ถอดความเป็นข้อความภาษาไทยที่ถูกต้อง ครบถ้วน
2. รักษาเลขมาตรา ชื่อกฎหมาย และคำศัพท์ทางกฎหมายให้ถูกต้อง
3. ใช้ตัวเลขไทย (๑, ๒, ๓) ตามต้นฉบับถ้าภาพใช้ตัวเลขไทย
4. ห้ามเพิ่มข้อความที่ไม่มีในภาพ
5. ห้ามแปลหรือสรุป — ถอดความตามต้นฉบับเท่านั้น
6. คงรูปแบบการจัดย่อหน้าตามต้นฉบับ
7. ถ้ามีหลายข้อในหน้าเดียว ให้แยกข้อให้ชัดเจน

กรุณาถอดข้อความจากภาพ:`;

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
        return NextResponse.json({ error: 'Re-OCR failed', details: String(error) }, { status: 500 });
    }
}
