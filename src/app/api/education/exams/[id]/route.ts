import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';
import { initAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { stripAnswerFromQuestion, formatExamText } from '@/lib/exam-utils';
import { anonymizeExamTexts } from '@/lib/name-anonymizer';
import { invalidateExamListCache } from '@/lib/education-cache';
import { categoryFromSubjectCode } from '@/lib/exam-import';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
    // route ชุดนี้ใน repo หลังบ้านถูกเรียกจากหน้าแอดมินเท่านั้น (ฝั่งเว็บนักเรียน
    // ใช้สำเนาของตัวเองใน lawlanes-education) จึงใส่ด่านให้ครบ — ของเดิมเป็น GET
    // สาธารณะเพราะออกแบบไว้ให้เว็บนักเรียนเรียก
    try {
        await requireAdmin('education.exams');
    } catch (e) {
        return authErrorResponse(e);
    }
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const includeQuestions = searchParams.get('questions') === 'true';

        const app = await initAdmin();
        if (!app) return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });

        const db = admin.firestore();
        const doc = await db.collection('examSets').doc(id).get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        const data = doc.data()!;
        const result: any = {
            id: doc.id,
            title: data.title || '',
            description: data.description || data.instructions || '',
            durationMinutes: data.timeLimitMinutes || 180,
            passingScore: typeof data.passingScore === 'number' ? data.passingScore : 50,
            // หน้าแก้ไขอ่าน status/coverUrl จากตรงนี้ — ชุดที่ไม่มี status ถือว่าเผยแพร่แล้ว
            status: data.status === 'draft' ? 'draft' : 'published',
            coverUrl: data.coverImage || '',
            totalQuestions: data.totalQuestions || data.essayCount || 0,
            category: data.subjectCode || data.category || 'other',
            difficulty: data.difficulty || 'medium',
            subjectCode: data.subjectCode || '',
            session: data.session || '',
            examLevel: data.examLevel || '',
            pageImages: data.pageImages || [],
            hasImages: data.hasImages || false,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
        };

        if (includeQuestions) {
            const qSnap = await doc.ref.collection('questions')
                .orderBy('orderIndex', 'asc')
                .get();

            result.questions = qSnap.docs.map((qDoc, idx) => {
                const q = qDoc.data();
                const rawType = q.type === 'multiple_choice' || q.type === 'MULTIPLE_CHOICE';
                
                let options: string[] | undefined;
                let correctOptionIndex: number | undefined;
                let hasRealChoices = false;
                
                if (rawType && Array.isArray(q.choices) && q.choices.length > 0) {
                    options = q.choices.map((c: any) => typeof c === 'string' ? c : c.text || c);
                    hasRealChoices = true;
                    if (q.correctAnswer) {
                        const match = q.correctAnswer.match(/\((\d+)\)/);
                        if (match) correctOptionIndex = parseInt(match[1]) - 1;
                    }
                }

                const finalType = (rawType && hasRealChoices) ? 'MULTIPLE_CHOICE' : 'ESSAY';
                
                // Strip embedded answers from question text
                const rawText = q.questionText || '';
                const { question: cleanText } = stripAnswerFromQuestion(rawText);

                return {
                    id: qDoc.id,
                    examId: id,
                    text: formatExamText(cleanText),
                    type: finalType,
                    options: finalType === 'MULTIPLE_CHOICE' ? options : undefined,
                    correctOptionIndex: finalType === 'MULTIPLE_CHOICE' ? correctOptionIndex : undefined,
                    // Don't send answer to client during exam taking
                    explanation: q.explanation || '',
                    order: q.orderIndex ?? idx + 1,
                    subject: q.tags?.[0] || '',
                    tags: q.tags || [],
                };
            });
            result.totalQuestions = result.questions.length;
        }

        // Batch anonymize question texts
        if (result.questions) {
            const allTexts = result.questions.map((q: any) => q.text);
            const anonymized = anonymizeExamTexts(allTexts, id);
            result.questions = result.questions.map((q: any, i: number) => ({
                ...q,
                text: anonymized[i],
            }));
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching exam:', error);
        return NextResponse.json({ error: 'Failed to fetch exam' }, { status: 500 });
    }
}

const ALLOWED_CATEGORIES = new Set(['year1', 'year2', 'year3', 'year4', 'other', 'license', 'prosecutor', 'judge', 'university']);
const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

/**
 * แก้ข้อมูลชุดข้อสอบ / เผยแพร่ (หน้า /education/exams/[id]/edit) — เดิม route ไม่มี PUT จึงได้ 405
 * PUT /api/education/exams/[id]
 * Body: { title?, description?, durationMinutes?, passingScore?, category?, difficulty?, coverUrl?, status?, subjectCode?, session? }
 *
 * เผยแพร่ (status → published) ไม่ได้ถ้ายังมีข้อที่ ocrIssues ไม่ว่าง (ภาษาผิดปกติ / ปรนัยไม่มีเฉลย)
 * — ข้อสอบจากระบบนำเข้า OCR ต้องผ่านหน้าตรวจก่อน ห้ามขึ้นเว็บนักศึกษาทั้งที่ยังเพี้ยน
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    let uid: string;
    try {
        ({ uid } = await requireAdmin('education.exams'));
    } catch (e) {
        return authErrorResponse(e);
    }

    try {
        const { id } = await params;
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
        }

        const app = await initAdmin();
        if (!app) return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });
        const db = admin.firestore();
        const ref = db.collection('examSets').doc(id);
        const snap = await ref.get();
        if (!snap.exists) return NextResponse.json({ error: 'ไม่พบข้อสอบ' }, { status: 404 });

        const updates: Record<string, unknown> = {};
        if (typeof body.title === 'string') {
            const title = body.title.trim().slice(0, 200);
            if (!title) return NextResponse.json({ error: 'กรุณากรอกชื่อข้อสอบ' }, { status: 400 });
            updates.title = title;
        }
        if (typeof body.description === 'string') updates.description = body.description.slice(0, 5000);
        if (body.durationMinutes !== undefined) {
            const n = Number(body.durationMinutes);
            if (Number.isFinite(n)) updates.timeLimitMinutes = Math.min(600, Math.max(1, Math.round(n)));
        }
        if (body.passingScore !== undefined) {
            const n = Number(body.passingScore);
            if (Number.isFinite(n)) updates.passingScore = Math.min(100, Math.max(0, Math.round(n)));
        }
        if (typeof body.subjectCode === 'string') {
            updates.subjectCode = body.subjectCode.trim().toUpperCase().slice(0, 20);
            const cat = categoryFromSubjectCode(updates.subjectCode as string);
            if (cat) updates.category = cat;
        }
        // หน้าแก้ไขส่ง category ที่อ่านจาก GET กลับมา (ซึ่งอาจเป็นรหัสวิชา) — รับเฉพาะค่าที่รู้จัก
        // ไม่งั้นจะเขียนค่าแปลกทับ category ที่หน้า list ใช้จัดกลุ่มชั้นปี
        if (typeof body.category === 'string' && ALLOWED_CATEGORIES.has(body.category) && !updates.category) {
            updates.category = body.category;
        }
        if (ALLOWED_DIFFICULTIES.has(body.difficulty)) updates.difficulty = body.difficulty;
        if (typeof body.session === 'string') updates.session = body.session.trim().slice(0, 100);
        if (typeof body.coverUrl === 'string') {
            updates.coverImage = /^https:\/\//.test(body.coverUrl) ? body.coverUrl.slice(0, 1000) : '';
        }

        if (body.status === 'draft' || body.status === 'published') {
            if (body.status === 'published') {
                const qSnap = await ref.collection('questions').select('ocrIssues').get();
                if (qSnap.empty) {
                    return NextResponse.json({ error: 'ยังไม่มีคำถามในชุดนี้ — เผยแพร่ไม่ได้' }, { status: 409 });
                }
                const flagged = qSnap.docs.filter(d => {
                    const issues = d.get('ocrIssues');
                    return Array.isArray(issues) && issues.length > 0;
                }).length;
                if (flagged > 0) {
                    return NextResponse.json({
                        error: `ยังมี ${flagged} ข้อที่ภาษาผิดปกติหรือข้อมูลไม่ครบ — แก้ในหน้าตรวจ OCR ก่อนเผยแพร่`,
                        flaggedQuestions: flagged,
                    }, { status: 409 });
                }
                updates.publishedAt = admin.firestore.FieldValue.serverTimestamp();
                updates.publishedBy = uid;
            }
            updates.status = body.status;
        }

        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        await ref.update(updates);
        invalidateExamListCache();

        return NextResponse.json({ id, success: true, updated: Object.keys(updates) });
    } catch (error) {
        console.error('Error updating exam:', error);
        return NextResponse.json({ error: 'บันทึกการแก้ไขไม่สำเร็จ' }, { status: 500 });
    }
}

/**
 * ลบชุดข้อสอบพร้อมคำถามทั้งหมด (หน้า /education/exams) — เดิม route ไม่มี DELETE จึงได้ 405
 * DELETE /api/education/exams/[id]
 *
 * ไม่ลบถ้ามีคอร์สผูกชุดนี้ไว้ใน linkedExamIds (ลิงก์ในคอร์สจะขาด) — ให้ถอดออกจากคอร์สก่อน
 * ภาพหน้าข้อสอบใน R2 ไม่ได้ลบตามไปด้วย
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin('education.exams');
    } catch (e) {
        return authErrorResponse(e);
    }

    try {
        const { id } = await params;
        const app = await initAdmin();
        if (!app) return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });
        const db = admin.firestore();
        const ref = db.collection('examSets').doc(id);
        const snap = await ref.get();
        if (!snap.exists) return NextResponse.json({ error: 'ไม่พบข้อสอบ' }, { status: 404 });

        const linked = await db.collection('courses').where('linkedExamIds', 'array-contains', id).limit(5).get();
        if (!linked.empty) {
            const titles = linked.docs.map(d => d.get('title') || d.id).join(', ');
            return NextResponse.json({
                error: `ชุดข้อสอบนี้ผูกอยู่กับคอร์ส: ${titles} — ถอดออกจากคอร์สก่อนลบ`,
            }, { status: 409 });
        }

        // ลบ subcollection questions ทีละ batch (Firestore ไม่ลบ subcollection ตามให้เอง)
        let deleted = 0;
        for (;;) {
            const qSnap = await ref.collection('questions').limit(450).get();
            if (qSnap.empty) break;
            const batch = db.batch();
            qSnap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            deleted += qSnap.size;
        }
        await ref.delete();
        invalidateExamListCache();

        return NextResponse.json({ success: true, deletedQuestions: deleted });
    } catch (error) {
        console.error('Error deleting exam:', error);
        return NextResponse.json({ error: 'ลบข้อสอบไม่สำเร็จ' }, { status: 500 });
    }
}
