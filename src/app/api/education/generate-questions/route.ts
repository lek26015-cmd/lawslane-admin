import { NextRequest, NextResponse } from 'next/server';
import { generateQuestions } from '@/lib/ai-question-generator';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';

// POST /api/education/generate-questions - Generate questions with AI
export async function POST(request: NextRequest) {
    try {
        // ยกมาจาก lawlanes-education ตอนรวมหลังบ้าน (Module 5)
        // ด่านเดิมเป็น session cookie ของระบบ email/password แยกของ education
        // repo นี้ใช้ Firebase custom claim ผ่าน requireAdmin() ของ auth-guard
        try {
            await requireAdmin('education.exams');
        } catch (e) {
            return authErrorResponse(e);
        }

        const body = await request.json();
        const { topic, category, difficulty, questionType, count } = body;

        if (!topic) {
            return NextResponse.json(
                { error: 'Missing required field: topic' },
                { status: 400 }
            );
        }

        const questions = await generateQuestions({
            topic,
            category,
            difficulty,
            questionType,
            count: count || 5
        });

        if (questions.length === 0) {
            return NextResponse.json(
                { error: 'Failed to generate questions. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ questions });

    } catch (error) {
        console.error('Error generating questions:', error);
        return NextResponse.json(
            { error: 'Failed to generate questions' },
            { status: 500 }
        );
    }
}
