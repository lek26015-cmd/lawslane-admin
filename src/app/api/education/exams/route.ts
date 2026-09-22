import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';
import { initAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { unstable_cache } from 'next/cache';

const CACHE_TTL_SECONDS = 30 * 60; // 30 minutes

// Last known-good result, kept in memory only, purely as a fallback if a
// Firestore fetch throws (e.g. transient outage) — never touches disk. The
// previous implementation also cached to a file under src/lib/, which is
// read-only on Vercel (writes silently failed) and, worse, that file was
// committed to git, so a stale snapshot could get served on every cold start
// regardless of what's actually in Firestore. See LAWSLANE-PLAN-01 2.10.
let lastGoodExams: any[] | null = null;

// Subject code to year mapping (kept from original)
function mapYear(code: string): string {
    if (!code) return 'other';
    const num = parseInt(code.replace(/\D/g, '').substring(0, 4));
    if (num >= 1001 && num <= 1004) return 'year1';
    if (num >= 2001 && num <= 2032) return 'year2';
    if (num >= 3001 && num <= 3035) return 'year3';
    if (num >= 4001 && num <= 4999) return 'year4';
    return 'other';
}

function mapSubjectGroup(code: string): string {
    if (!code) return 'อื่นๆ';
    const SUBJECTS: Record<string, string> = {
        'LAW1001': 'หลักกฎหมายมหาชน',
        'LAW1002': 'หลักกฎหมายเอกชน',
        'LAW1003': 'กฎหมายแพ่งและพาณิชย์ (นิติกรรม-สัญญา)',
        'LAW1004': 'กฎหมายลักษณะทรัพย์',
        'LAW2001': 'กฎหมายอาญา 1 (ภาคทั่วไป)',
        'LAW2002': 'กฎหมายอาญา 2 (ภาคความผิด)',
        'LAW2003': 'กฎหมายแพ่ง (หนี้)',
        'LAW2004': 'กฎหมายแพ่ง (เอกเทศสัญญา 1)',
        'LAW2005': 'กฎหมายแพ่ง (เอกเทศสัญญา 2)',
        'LAW2006': 'กฎหมายแพ่ง (ครอบครัว)',
        'LAW2007': 'กฎหมายแพ่ง (มรดก)',
        'LAW2008': 'กฎหมายรัฐธรรมนูญ',
        'LAW2009': 'กฎหมายแพ่ง (ค้ำประกัน-จำนอง)',
        'LAW2010': 'กฎหมายแพ่ง (ตั๋วเงิน-บัญชี)',
        'LAW2011': 'กฎหมายแพ่ง (หุ้นส่วน-บริษัท)',
        'LAW2012': 'กฎหมายแพ่ง (ประกันภัย)',
        'LAW2013': 'กฎหมายมหาชน (ปกครอง)',
        'LAW2015': 'กฎหมายวิธีพิจารณาความอาญา',
        'LAW2032': 'กฎหมายแรงงาน',
        'LAW3001': 'วิ.แพ่ง 1',
        'LAW3002': 'วิ.แพ่ง 2',
        'LAW3003': 'วิ.อาญา 1',
        'LAW3004': 'วิ.อาญา 2',
        'LAW3005': 'กฎหมายลักษณะพยาน',
        'LAW3006': 'กฎหมายปกครอง',
        'LAW3007': 'กฎหมายระหว่างประเทศ (แผนกคดีเมือง)',
        'LAW3008': 'กฎหมายระหว่างประเทศ (แผนกคดีบุคคล)',
        'LAW3009': 'กฎหมายภาษีอากร',
        'LAW3010': 'นิติปรัชญา',
        'LAW3011': 'กฎหมายทรัพย์สินทางปัญญา',
        'LAW3012': 'กฎหมายการค้าระหว่างประเทศ',
        'LAW3016': 'กฎหมายเกี่ยวกับคอมพิวเตอร์',
        'LAW3035': 'กฎหมายสิ่งแวดล้อม',
        'LAW4001': 'กฎหมายแพ่ง (ละเมิด)',
        'LAW4002': 'กฎหมายวิธีพิจารณาความแพ่ง',
        'LAW4003': 'กฎหมายวิธีพิจารณาความอาญา',
        'LAW4004': 'กฎหมายล้มละลาย',
        'LAW4006': 'กฎหมายระหว่างประเทศ (คดีบุคคล)',
        'LAW4007': 'กฎหมายการคลัง',
        'LAW4008': 'กฎหมายที่ดิน',
        'LAW4105': 'หลักวิชาชีพและจรรยาบรรณ',
    };
    const prefix = code.substring(0, 7);
    return SUBJECTS[prefix] || code;
}

function inferSubjectFromTitle(title: string): { category: string; subjectGroup: string } {
    const t = (title || '').toLowerCase();
    
    // Lawyer license
    if (t.includes('ว่าความ') || t.includes('ตั๋วทนาย')) {
        return { category: 'other', subjectGroup: 'การฝึกอบรมวิชาว่าความ' };
    }
    
    // Year 1
    if (t.includes('มหาชน')) return { category: 'year1', subjectGroup: 'หลักกฎหมายมหาชน' };
    if (t.includes('เอกชน')) return { category: 'year1', subjectGroup: 'หลักกฎหมายเอกชน' };
    if (t.includes('นิติกรรม') || (t.includes('สัญญา') && !t.includes('เอกเทศ') && !t.includes('ธุรกิจ'))) {
        return { category: 'year1', subjectGroup: 'กฎหมายแพ่งและพาณิชย์ (นิติกรรม-สัญญา)' };
    }
    if (t.includes('ทรัพย์') && !t.includes('เช่า') && !t.includes('สินทางปัญญา')) {
        return { category: 'year1', subjectGroup: 'กฎหมายลักษณะทรัพย์' };
    }
    if (t.includes('ประวัติศาสตร์')) return { category: 'year1', subjectGroup: 'ประวัติศาสตร์กฎหมายและภาษากฎหมายไทย' };
    if (t.includes('ภาษาอังกฤษ')) return { category: 'year1', subjectGroup: 'ภาษาอังกฤษสำหรับนักกฎหมาย' };
    
    // Year 2
    if (t.includes('อาญา 1') || t.includes('อาญา1')) return { category: 'year2', subjectGroup: 'กฎหมายอาญา 1 (ภาคทั่วไป)' };
    if (t.includes('อาญา 2') || t.includes('อาญา2') || t.includes('อาญา 3') || t.includes('อาญา3')) {
        return { category: 'year2', subjectGroup: 'กฎหมายอาญา 2 (ภาคความผิด)' };
    }
    if (t.includes('หนี้')) return { category: 'year2', subjectGroup: 'กฎหมายแพ่ง (หนี้)' };
    if (t.includes('เอกเทศสัญญา 1') || t.includes('เอกเทศสัญญา1') || t.includes('ซื้อขาย')) {
        return { category: 'year2', subjectGroup: 'กฎหมายแพ่ง (เอกเทศสัญญา 1)' };
    }
    if (t.includes('เอกเทศสัญญา 2') || t.includes('เอกเทศสัญญา2') || t.includes('เช่า')) {
        return { category: 'year2', subjectGroup: 'กฎหมายแพ่ง (เอกเทศสัญญา 2)' };
    }
    if (t.includes('ครอบครัว')) return { category: 'year2', subjectGroup: 'กฎหมายแพ่ง (ครอบครัว)' };
    if (t.includes('มรดก')) return { category: 'year2', subjectGroup: 'กฎหมายแพ่ง (มรดก)' };
    if (t.includes('รัฐธรรมนูญ')) return { category: 'year2', subjectGroup: 'กฎหมายรัฐธรรมนูญ' };
    if (t.includes('ค้ำประกัน') || t.includes('ค้ำ') || t.includes('จำนอง') || t.includes('หลักประกัน')) {
        return { category: 'year2', subjectGroup: 'กฎหมายแพ่ง (ค้ำประกัน-จำนอง)' };
    }
    if (t.includes('ตั๋วเงิน') || t.includes('บัญชี')) return { category: 'year2', subjectGroup: 'กฎหมายแพ่ง (ตั๋วเงิน-บัญชี)' };
    if (t.includes('หุ้นส่วน') || t.includes('บริษัท')) return { category: 'year2', subjectGroup: 'กฎหมายแพ่ง (หุ้นส่วน-บริษัท)' };
    if (t.includes('ประกันภัย')) return { category: 'year2', subjectGroup: 'กฎหมายแพ่ง (ประกันภัย)' };
    if (t.includes('ตัวแทน') || t.includes('นายหน้า')) return { category: 'year2', subjectGroup: 'กฎหมายว่าด้วยตัวแทน นายหน้า ประกันภัย' };
    
    // Year 3
    if (t.includes('วิ.แพ่ง 1') || t.includes('พิจารณาความแพ่ง 1') || t.includes('พิจารณาความแพ่ง1')) return { category: 'year3', subjectGroup: 'วิ.แพ่ง 1' };
    if (t.includes('วิ.แพ่ง 2') || t.includes('พิจารณาความแพ่ง 2') || t.includes('พิจารณาความแพ่ง2')) return { category: 'year3', subjectGroup: 'วิ.แพ่ง 2' };
    if (t.includes('พิจารณาความอาญา') || t.includes('วิ.อาญา')) return { category: 'year3', subjectGroup: 'กฎหมายวิธีพิจารณาความอาญา' };
    if (t.includes('พยาน')) return { category: 'year3', subjectGroup: 'กฎหมายลักษณะพยาน' };
    if (t.includes('ปกครอง')) return { category: 'year3', subjectGroup: 'กฎหมายปกครอง' };
    if (t.includes('คดีเมือง')) return { category: 'year3', subjectGroup: 'กฎหมายระหว่างประเทศ (แผนกคดีเมือง)' };
    if (t.includes('คดีบุคคล')) return { category: 'year3', subjectGroup: 'กฎหมายระหว่างประเทศ (แผนกคดีบุคคล)' };
    if (t.includes('ภาษี')) return { category: 'year3', subjectGroup: 'กฎหมายภาษีอากร' };
    if (t.includes('ปรัชญา')) return { category: 'year3', subjectGroup: 'นิติปรัชญา' };
    if (t.includes('ทรัพย์สินทางปัญญา')) return { category: 'year3', subjectGroup: 'กฎหมายทรัพย์สินทางปัญญา' };
    if (t.includes('เทคโนโลยี') || t.includes('คอมพิวเตอร์')) return { category: 'year3', subjectGroup: 'กฎหมายเกี่ยวกับคอมพิวเตอร์' };
    if (t.includes('ธรรมนูญ')) return { category: 'year3', subjectGroup: 'พระธรรมนูญศาลยุติธรรม' };
    if (t.includes('ยุติธรรม')) return { category: 'year3', subjectGroup: 'บริหารงานยุติธรรม' };
    
    // Year 4
    if (t.includes('ละเมิด')) return { category: 'year4', subjectGroup: 'กฎหมายแพ่ง (ละเมิด)' };
    if (t.includes('ล้มละลาย')) return { category: 'year4', subjectGroup: 'กฎหมายล้มละลาย' };
    if (t.includes('ที่ดิน')) return { category: 'year4', subjectGroup: 'กฎหมายที่ดิน' };
    if (t.includes('แรงงาน')) return { category: 'year4', subjectGroup: 'กฎหมายแรงงาน' };
    if (t.includes('จรรยาบรรณ') || t.includes('วิชาชีพ')) return { category: 'year4', subjectGroup: 'หลักวิชาชีพและจรรยาบรรณ' };
    if (t.includes('ผู้บริโภค')) return { category: 'year4', subjectGroup: 'กฎหมายคุ้มครองผู้บริโภค' };
    if (t.includes('การค้า') || t.includes('ระงับข้อพิพาท') || t.includes('อนุญาโตตุลาการ')) {
        return { category: 'year4', subjectGroup: 'กฎหมายการค้าระหว่างประเทศ' };
    }
    if (t.includes('การคลัง')) return { category: 'year4', subjectGroup: 'กฎหมายการคลัง' };
    
    return { category: 'year2', subjectGroup: title || 'อื่นๆ' };
}

async function fetchExamsFromFirestore(): Promise<any[]> {
        const app = await initAdmin();
        if (!app) throw new Error('Firebase not initialized');

        const db = admin.firestore();

        // Fetch all in a single paginated pass with minimal fields
        const allDocs: admin.firestore.QueryDocumentSnapshot[] = [];
        let query = db.collection('examSets')
            .select('title', 'subjectCode', 'category', 'subjectGroup', 'session',
                    'totalQuestions', 'essayCount', 'status', 'createdAt')
            .orderBy('createdAt', 'desc')
            .limit(1000);

        let snap = await query.get();
        allDocs.push(...snap.docs);

        while (snap.docs.length === 1000) {
            const lastDoc = snap.docs[snap.docs.length - 1];
            snap = await db.collection('examSets')
                .select('title', 'subjectCode', 'category', 'subjectGroup', 'session',
                        'totalQuestions', 'essayCount', 'status', 'createdAt')
                .orderBy('createdAt', 'desc')
                .startAfter(lastDoc)
                .limit(1000)
                .get();
            allDocs.push(...snap.docs);
        }

        const exams = allDocs.map(doc => {
            const data = doc.data();
            const rawCode = (data.subjectCode || '').toUpperCase();
            const inferred = inferSubjectFromTitle(data.title || '');

            let cat = data.category || '';
            if (!cat || !['year1', 'year2', 'year3', 'year4', 'other'].includes(cat)) {
                cat = mapYear(rawCode) !== 'other' ? mapYear(rawCode) : inferred.category;
            }

            let group = data.subjectGroup || '';
            if (!group || group === 'อื่นๆ') {
                const mappedByCode = mapSubjectGroup(rawCode);
                group = mappedByCode !== 'อื่นๆ' && mappedByCode !== rawCode ? mappedByCode : inferred.subjectGroup;
            }

            return {
                id: doc.id,
                title: data.title || '',
                totalQuestions: data.totalQuestions || data.essayCount || 0,
                category: cat,
                subjectGroup: group,
                subjectCode: '',
                session: data.session || '',
            };
        });

        lastGoodExams = exams;
        return exams;
}

// Cached across requests/warm invocations via Next.js's data cache (works correctly
// in serverless, unlike the old fs-based cache). `clearCache=true` bypasses this by
// calling fetchExamsFromFirestore() directly instead of going through getCachedExams.
const getCachedExams = unstable_cache(fetchExamsFromFirestore, ['education-all-exams'], {
    revalidate: CACHE_TTL_SECONDS,
});

async function getAllExams(forceRefresh = false): Promise<any[]> {
    try {
        return forceRefresh ? await fetchExamsFromFirestore() : await getCachedExams();
    } catch (err) {
        console.warn('getAllExams: Firestore fetch error or quota reached. Using last known-good data.', err);
        return lastGoodExams || [];
    }
}

export async function GET(request: NextRequest) {
    try {
    // route ชุดนี้ใน repo หลังบ้านถูกเรียกจากหน้าแอดมินเท่านั้น (ฝั่งเว็บนักเรียน
    // ใช้สำเนาของตัวเองใน lawlanes-education) จึงใส่ด่านให้ครบ — ของเดิมเป็น GET
    // สาธารณะเพราะออกแบบไว้ให้เว็บนักเรียนเรียก
    try {
        await requireAdmin('education.exams');
    } catch (e) {
        return authErrorResponse(e);
    }
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode');

        const clearCache = searchParams.get('clearCache') === 'true';

        // Mode 1: "summary" — return only counts for tabs/filters (ultra fast)
        if (mode === 'summary') {
            const exams = await getAllExams(clearCache);
            const yearCounts: Record<string, number> = { all: exams.length };
            const subjectCounts: Record<string, Record<string, number>> = {};

            for (const e of exams) {
                yearCounts[e.category] = (yearCounts[e.category] || 0) + 1;
                if (!subjectCounts[e.category]) subjectCounts[e.category] = {};
                const group = e.subjectGroup || 'อื่นๆ';
                subjectCounts[e.category][group] = (subjectCounts[e.category][group] || 0) + 1;
                if (!subjectCounts['all']) subjectCounts['all'] = {};
                subjectCounts['all'][group] = (subjectCounts['all'][group] || 0) + 1;
            }

            return NextResponse.json({ yearCounts, subjectCounts }, {
                headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
            });
        }

        // Mode 2: "page" — paginated results with filters
        if (mode === 'page') {
            const exams = await getAllExams(clearCache);
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '24');
            const year = searchParams.get('year') || 'all';
            const subject = searchParams.get('subject') || 'all';
            const search = (searchParams.get('q') || '').toLowerCase();

            let filtered = exams;

            if (year !== 'all') {
                filtered = filtered.filter(e => e.category === year);
            }
            if (subject !== 'all') {
                filtered = filtered.filter(e => e.subjectGroup === subject);
            }
            if (search) {
                filtered = filtered.filter(e =>
                    e.title.toLowerCase().includes(search) ||
                    e.subjectGroup.toLowerCase().includes(search) ||
                    e.session.toLowerCase().includes(search)
                );
            }

            const total = filtered.length;
            const startIdx = (page - 1) * limit;
            const items = filtered.slice(startIdx, startIdx + limit);

            return NextResponse.json({
                items,
                total,
                page,
                totalPages: Math.ceil(total / limit),
                hasMore: startIdx + limit < total,
            }, {
                headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
            });
        }

        // Default: return all (backward compatible, but with leaner payload)
        const exams = await getAllExams();

        return NextResponse.json(exams, {
            headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
        });
    } catch (error) {
        console.error('Error fetching exams:', error);
        if (lastGoodExams) return NextResponse.json(lastGoodExams);
        return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 });
    }
}
