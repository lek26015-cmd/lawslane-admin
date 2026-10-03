import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';
import { initAdmin } from '@/lib/firebase-admin';
import { canonicalSourceFile } from '@/lib/exam-import';

/**
 * ตรวจชุดข้อสอบซ้ำก่อนนำเข้า
 * POST /api/education/exams/import/check
 * Body: { title, session?, sourceFiles?: string[] }
 *
 * production เคยมีไฟล์เดียวกันถูกนำเข้า 2 ครั้ง (57777313.pdf กับ 57777313(1).pdf)
 * ได้ชุดเผยแพร่ซ้ำกัน 2 ชุด — จึงเทียบทั้ง title+session และชื่อไฟล์ (ตัด "(1)" ออก)
 */
export async function POST(request: NextRequest) {
    try {
        await requireAdmin('education.exams');
    } catch (e) {
        return authErrorResponse(e);
    }

    const body = await request.json().catch(() => null);
    const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 200) : '';
    const session = typeof body?.session === 'string' ? body.session.trim() : '';
    const files: string[] = Array.isArray(body?.sourceFiles)
        ? body.sourceFiles.filter((f: unknown): f is string => typeof f === 'string').slice(0, 10)
        : [];

    const app = await initAdmin();
    if (!app) return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });
    const db = admin.firestore();

    try {
        const found = new Map<string, admin.firestore.DocumentSnapshot>();

        if (title) {
            const byTitle = await db.collection('examSets').where('title', '==', title).limit(20).get();
            byTitle.docs
                .filter(d => !session || (d.get('session') || '') === session)
                .forEach(d => found.set(d.id, d));
        }

        const names = new Set<string>();
        for (const f of files) {
            const canonical = canonicalSourceFile(f);
            names.add(f.trim());
            names.add(canonical);
            names.add(canonical.replace(/(\.[^.]+)$/, '(1)$1'));
        }
        const nameList = [...names].filter(Boolean).slice(0, 30);
        if (nameList.length) {
            const byFile = await db.collection('examSets').where('sourceFile', 'in', nameList).limit(20).get();
            byFile.docs.forEach(d => found.set(d.id, d));
        }

        const duplicates = [...found.values()].map(d => ({
            id: d.id,
            title: d.get('title') || '',
            session: d.get('session') || '',
            sourceFile: d.get('sourceFile') || '',
            status: d.get('status') === 'draft' ? 'draft' : 'published',
            totalQuestions: d.get('totalQuestions') || 0,
        }));
        return NextResponse.json({ duplicates });
    } catch (error) {
        console.error('EXAM_IMPORT_CHECK_ERROR', error);
        return NextResponse.json({ error: 'ตรวจข้อสอบซ้ำไม่สำเร็จ' }, { status: 500 });
    }
}
