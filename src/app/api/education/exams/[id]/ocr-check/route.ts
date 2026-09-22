import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';

interface OcrIssue {
    questionId: string;
    order: number;
    riskLevel: 'high' | 'medium' | 'low' | 'ok';
    issues: string[];
    hasAnswer: boolean;
    isAiGenerated: boolean;
    textPreview: string;
}

/**
 * Analyze OCR quality for all questions in an exam
 * GET /api/education/exams/[id]/ocr-check
 */
export async function GET(
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

        const { id } = await params;
        const app = await initAdmin();
        if (!app) return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });

        const db = admin.firestore();
        const examDoc = await db.collection('examSets').doc(id).get();
        if (!examDoc.exists) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

        const qSnap = await examDoc.ref.collection('questions')
            .orderBy('orderIndex', 'asc')
            .get();

        const results: OcrIssue[] = qSnap.docs.map((qDoc, idx) => {
            const q = qDoc.data();
            const text = q.questionText || '';
            const issues: string[] = [];

            // === OCR Quality Checks ===

            // 1. Detect random Latin characters in Thai text
            const latinInThai = text.match(/(?<=[\u0E00-\u0E7F])\s+[a-zA-Z]{1,4}\s+(?=[\u0E00-\u0E7F])/g);
            if (latinInThai && latinInThai.length >= 2) {
                issues.push(`พบอักขระ Latin แทรก ${latinInThai.length} จุด`);
            }

            // 2. Detect nonsensical character sequences
            const garbagePatterns = text.match(/[a-zA-Z]{1,3}[\s,.'"-]+[a-zA-Z]{1,3}[\s,.'"-]+[a-zA-Z]{1,3}/g);
            if (garbagePatterns && garbagePatterns.length >= 1) {
                issues.push(`พบลำดับอักขระผิดปกติ ${garbagePatterns.length} จุด`);
            }

            // 3. Check Thai character ratio
            const thaiChars = (text.match(/[\u0E00-\u0E7F]/g) || []).length;
            const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
            const totalChars = thaiChars + latinChars;
            if (totalChars > 20 && latinChars > 0) {
                const thaiRatio = thaiChars / totalChars;
                if (thaiRatio < 0.85) {
                    issues.push(`สัดส่วนภาษาไทย ${Math.round(thaiRatio * 100)}% (ต่ำกว่า 85%)`);
                }
            }

            // 4. Detect suspiciously short lines (OCR fragmentation)
            const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
            const shortLines = lines.filter((l: string) => l.trim().length < 8 && l.trim().length > 0);
            if (shortLines.length >= 3) {
                issues.push(`พบบรรทัดสั้นผิดปกติ ${shortLines.length} บรรทัด`);
            }

            // 5. Check for common OCR mistakes in Thai legal text
            const ocrMistakes = text.match(/[๐-๙]\s*[a-zA-Z]\s*[๐-๙]/g);
            if (ocrMistakes && ocrMistakes.length >= 1) {
                issues.push(`พบเลขไทยปนอักษร Latin ${ocrMistakes.length} จุด`);
            }

            // 6. Empty or very short text
            if (text.trim().length < 20) {
                issues.push('เนื้อหาสั้นเกินไปหรือว่างเปล่า');
            }

            // Determine risk level
            let riskLevel: OcrIssue['riskLevel'] = 'ok';
            if (issues.length >= 3) riskLevel = 'high';
            else if (issues.length >= 1) riskLevel = 'medium';

            return {
                questionId: qDoc.id,
                order: q.orderIndex ?? idx + 1,
                riskLevel,
                issues,
                hasAnswer: !!(q.modelAnswer || q.correctAnswer),
                isAiGenerated: !!q.isAiGenerated,
                textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            };
        });

        const issueCount = results.filter(r => r.riskLevel !== 'ok').length;
        const noAnswerCount = results.filter(r => !r.hasAnswer).length;

        return NextResponse.json({
            examId: id,
            totalQuestions: results.length,
            issueCount,
            noAnswerCount,
            questions: results,
        });
    } catch (error) {
        console.error('Error checking OCR:', error);
        return NextResponse.json({ error: 'Failed to check OCR' }, { status: 500 });
    }
}
