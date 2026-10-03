'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, FileText, ImageIcon, Loader2, Merge,
    Plus, RefreshCw, ScanText, Sparkles, Trash2, Upload, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
    MAX_IMPORT_PAGES,
    type ImportQuestion,
    type StructureChunkResult,
    assessTextLayer,
    chunkPagesForStructuring,
    computeQuestionIssues,
    composeQuestionText,
    detectTextIssues,
    finalizeImportQuestions,
    normalizeThaiText,
    removeRepeatedHeaders,
} from '@/lib/exam-import';
import {
    ACCEPTED_IMPORT_TYPES,
    type PreparedPage,
    isPdfFile,
    prepareImage,
    preparePdf,
    uploadToPresignedUrl,
} from '@/lib/exam-import-browser';

/**
 * นำเข้าข้อสอบจากไฟล์ (OCR) — แทน pipeline Python/Tesseract แบบออฟไลน์เดิม
 *
 * ขั้นตอน (ทุกขั้นเรียก API ทีละคำขอ ไม่มีคำขอไหนยาวเกิน maxDuration):
 *  1. เบราว์เซอร์แปลง PDF/ภาพเป็นภาพหน้า JPEG และดึง text layer ของ PDF
 *  2. อัปโหลดภาพหน้าขึ้น R2 ตรงผ่าน presigned URL (ไม่ผ่าน Vercel function)
 *  3. หน้าไหน text layer ใช้ได้ใช้เลย ที่เหลือ OCR ทีละหน้า (Gemini → Typhoon)
 *  4. จัดโครงสร้างเป็นรายข้อด้วย AI ทีละกลุ่มหน้า (สำรองด้วยกฎ) แล้วให้แอดมินตรวจ/แก้
 *  5. บันทึกเป็นชุดแบบร่าง → ไปหน้าตรวจ OCR / AI สร้างเฉลย → เผยแพร่จากหน้าแก้ไข
 */

type PageMethod = 'text' | 'ocr';
type PageStatus = 'ready' | 'uploading' | 'uploaded' | 'reading' | 'done' | 'error';

interface PageItem {
    page: number;
    sourceName: string;
    sourcePage: number;
    previewUrl: string;
    blob: Blob;
    textLayer: string;
    method: PageMethod;
    methodReason: string;
    status: PageStatus;
    url?: string;
    text: string;
    engine?: string;
    error?: string;
}

interface Duplicate {
    id: string;
    title: string;
    session: string;
    sourceFile: string;
    status: string;
    totalQuestions: number;
}

type Step = 'setup' | 'pages' | 'questions';

async function postJson<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `คำขอล้มเหลว (${res.status})`);
    return data as T;
}

const emptyQuestion = (): ImportQuestion => ({
    number: null, questionText: '', attachmentTitle: '', attachmentText: '', type: 'essay', choices: [],
    correctAnswer: '', modelAnswer: '', requiresForm: false, formType: '', sourcePage: null, notes: [], include: true,
});

export default function ImportExamPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [meta, setMeta] = useState({
        title: '',
        subjectCode: '',
        session: '',
        description: '',
        timeLimitMinutes: 180,
        passingScore: 50,
    });
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<Step>('setup');
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);
    const [pages, setPages] = useState<PageItem[]>([]);
    const [duplicates, setDuplicates] = useState<Duplicate[] | null>(null);
    const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
    const [questions, setQuestions] = useState<ImportQuestion[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [structureEngines, setStructureEngines] = useState<string[]>([]);

    // คืนหน่วยความจำของภาพ preview เมื่อออกจากหน้า
    const pagesRef = useRef<PageItem[]>([]);
    pagesRef.current = pages;
    useEffect(() => () => pagesRef.current.forEach(p => URL.revokeObjectURL(p.previewUrl)), []);

    const updatePage = (page: number, patch: Partial<PageItem>) =>
        setPages(prev => prev.map(p => (p.page === page ? { ...p, ...patch } : p)));

    /* ---------------- ไฟล์ ---------------- */

    const addFiles = (list: FileList | null) => {
        if (!list) return;
        setFiles(prev => [...prev, ...Array.from(list)]);
        setDuplicates(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    const moveFile = (idx: number, dir: -1 | 1) => setFiles(prev => {
        const next = [...prev];
        const j = idx + dir;
        if (j < 0 || j >= next.length) return prev;
        [next[idx], next[j]] = [next[j], next[idx]];
        return next;
    });

    /* ---------------- ขั้น 1-3: เตรียมหน้า → อัปโหลด → อ่านข้อความ ---------------- */

    const ocrOnePage = async (item: PageItem): Promise<void> => {
        if (!item.url) return;
        updatePage(item.page, { status: 'reading', error: undefined });
        try {
            const res = await postJson<{ text: string; engine: string; model: string; warning?: string }>(
                '/api/education/exams/ocr-page', { url: item.url });
            updatePage(item.page, {
                status: 'done',
                text: res.text,
                engine: res.engine === 'typhoon' ? `Typhoon (สำรอง: ${res.warning ?? ''})` : res.model,
            });
        } catch (e) {
            updatePage(item.page, { status: 'error', error: (e as Error).message });
            throw e;
        }
    };

    const startImport = async () => {
        if (!meta.title.trim()) {
            toast({ title: 'กรุณากรอกชื่อข้อสอบ', variant: 'destructive' });
            return;
        }
        if (files.length === 0) {
            toast({ title: 'กรุณาเลือกไฟล์ข้อสอบ', variant: 'destructive' });
            return;
        }

        setBusy(true);
        try {
            // ตรวจชุดซ้ำก่อน (title+session หรือชื่อไฟล์เดียวกัน)
            if (!duplicateConfirmed) {
                const check = await postJson<{ duplicates: Duplicate[] }>('/api/education/exams/import/check', {
                    title: meta.title.trim(),
                    session: meta.session.trim(),
                    sourceFiles: files.map(f => f.name),
                });
                setDuplicates(check.duplicates);
                if (check.duplicates.length > 0) {
                    toast({ title: 'พบชุดข้อสอบที่อาจซ้ำ', description: 'ตรวจรายการด้านล่าง แล้วติ๊กยืนยันถ้าต้องการนำเข้าต่อ', variant: 'destructive' });
                    return;
                }
            }

            // 1. แปลงไฟล์เป็นภาพหน้า (ตามลำดับไฟล์ที่แอดมินจัด)
            const prepared: PreparedPage[] = [];
            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                setProgress({ label: `กำลังแปลงไฟล์ ${f.name}`, done: i, total: files.length });
                if (isPdfFile(f)) {
                    prepared.push(...await preparePdf(f, MAX_IMPORT_PAGES - prepared.length, (d, t) =>
                        setProgress({ label: `กำลังแปลง ${f.name} หน้า ${d}/${t}`, done: i, total: files.length })));
                } else {
                    prepared.push(await prepareImage(f));
                }
                if (prepared.length > MAX_IMPORT_PAGES) throw new Error(`รวมแล้วเกิน ${MAX_IMPORT_PAGES} หน้า`);
            }

            let items: PageItem[] = prepared.map((p, i) => {
                const assessment = assessTextLayer(p.textLayer);
                return {
                    page: i + 1,
                    sourceName: p.sourceName,
                    sourcePage: p.sourcePage,
                    previewUrl: p.previewUrl,
                    blob: p.blob,
                    textLayer: p.textLayer,
                    method: assessment.usable ? 'text' : 'ocr',
                    methodReason: p.textLayer || assessment.usable ? assessment.reason : 'ไฟล์ภาพ',
                    status: 'ready',
                    text: assessment.usable ? normalizeThaiText(p.textLayer) : '',
                };
            });
            pagesRef.current.forEach(p => URL.revokeObjectURL(p.previewUrl));
            setPages(items);
            setStep('pages');

            // 2. อัปโหลดภาพทุกหน้าขึ้น R2 (หน้า review ใช้แสดงคู่กับข้อความ)
            const presign = await postJson<{ items: { page: number; uploadUrl: string; publicUrl: string }[] }>(
                '/api/education/exams/upload-url', { count: items.length });
            for (let i = 0; i < items.length; i++) {
                setProgress({ label: `อัปโหลดภาพหน้า ${i + 1}/${items.length}`, done: i, total: items.length });
                updatePage(items[i].page, { status: 'uploading' });
                try {
                    await uploadToPresignedUrl(presign.items[i].uploadUrl, items[i].blob);
                } catch (e) {
                    const msg = e instanceof TypeError
                        ? 'อัปโหลดถูกบล็อก — ตั้ง CORS ของ bucket R2 ให้อนุญาต PUT จากโดเมนแอดมิน'
                        : (e as Error).message;
                    updatePage(items[i].page, { status: 'error', error: msg });
                    throw new Error(msg);
                }
                items[i] = { ...items[i], url: presign.items[i].publicUrl, status: items[i].method === 'text' ? 'done' : 'uploaded' };
                updatePage(items[i].page, { url: items[i].url, status: items[i].status });
            }

            // 3. OCR ทีละหน้า เฉพาะหน้าที่ text layer ใช้ไม่ได้
            const toOcr = items.filter(p => p.method === 'ocr');
            let failed = 0;
            for (let i = 0; i < toOcr.length; i++) {
                setProgress({ label: `OCR หน้า ${toOcr[i].page} (${i + 1}/${toOcr.length})`, done: i, total: toOcr.length });
                try {
                    await ocrOnePage(toOcr[i]);
                } catch (e) {
                    failed++;
                    // คีย์ผิด/ไม่ได้ตั้งค่า ล้มทุกหน้าเหมือนกัน — หยุดแจ้งทันทีไม่ต้องลองต่อ
                    if (/GOOGLE_GENAI_API_KEY|TYPHOON_API_KEY|R2_/.test((e as Error).message)) {
                        toast({ title: 'OCR ใช้งานไม่ได้', description: (e as Error).message, variant: 'destructive' });
                        break;
                    }
                }
            }
            if (failed > 0) {
                toast({ title: `OCR ไม่สำเร็จ ${failed} หน้า`, description: 'กด "OCR ใหม่" ที่หน้านั้น หรือพิมพ์ข้อความเอง', variant: 'destructive' });
            } else {
                toast({ title: 'อ่านข้อความครบทุกหน้าแล้ว', description: 'ตรวจข้อความแต่ละหน้า แล้วกด "แยกข้อด้วย AI"' });
            }
        } catch (e) {
            toast({ title: 'นำเข้าไม่สำเร็จ', description: (e as Error).message, variant: 'destructive' });
        } finally {
            setBusy(false);
            setProgress(null);
        }
    };

    const retryOcr = async (item: PageItem) => {
        setBusy(true);
        try {
            await ocrOnePage(item);
            updatePage(item.page, { method: 'ocr' });
        } catch (e) {
            toast({ title: `OCR หน้า ${item.page} ไม่สำเร็จ`, description: (e as Error).message, variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    /* ---------------- ขั้น 4: จัดโครงสร้างเป็นรายข้อ ---------------- */

    const pagesReady = pages.length > 0 && pages.every(p => p.url && (p.status === 'done' || p.text.trim()));

    const structure = async () => {
        setBusy(true);
        try {
            const cleaned = removeRepeatedHeaders(pages.map(p => ({ page: p.page, text: normalizeThaiText(p.text) })))
                .filter(p => p.text.trim());
            const chunks = chunkPagesForStructuring(cleaned);
            const results: StructureChunkResult[] = [];
            for (let i = 0; i < chunks.length; i++) {
                setProgress({ label: `จัดโครงสร้างข้อสอบ ส่วนที่ ${i + 1}/${chunks.length}`, done: i, total: chunks.length });
                // บริบทจากส่วนก่อน: ให้ AI รู้ว่าข้อแรกของส่วนนี้ต่อจากข้อไหน/อยู่ในเอกสารแนบไหม
                const prevQs = results.flatMap(r => r.questions);
                const last = prevQs[prevQs.length - 1];
                const lastNumber = [...prevQs].reverse().find(q => q.number)?.number ?? null;
                const res = await postJson<StructureChunkResult>('/api/education/exams/import/structure', {
                    pages: chunks[i],
                    context: {
                        title: meta.title,
                        lastQuestionNumber: lastNumber,
                        inAttachment: !!last?.attachmentText,
                        tail: last ? (last.attachmentText || last.questionText).slice(-400) : '',
                    },
                });
                results.push(res);
            }
            const final = finalizeImportQuestions(results);
            setQuestions(final.questions);
            setWarnings(final.warnings);
            setStructureEngines(Array.from(new Set(results.map(r => (r.engine === 'ai' ? 'AI' : 'กฎ (สำรอง)')))));
            setStep('questions');
        } catch (e) {
            toast({ title: 'แยกข้อไม่สำเร็จ', description: (e as Error).message, variant: 'destructive' });
        } finally {
            setBusy(false);
            setProgress(null);
        }
    };

    /* ---------------- แก้ไขรายข้อ ---------------- */

    const updateQuestion = (idx: number, patch: Partial<ImportQuestion>) =>
        setQuestions(prev => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
    const removeQuestion = (idx: number) => setQuestions(prev => prev.filter((_, i) => i !== idx));
    const moveQuestion = (idx: number, dir: -1 | 1) => setQuestions(prev => {
        const next = [...prev];
        const j = idx + dir;
        if (j < 0 || j >= next.length) return prev;
        [next[idx], next[j]] = [next[j], next[idx]];
        return next;
    });
    /** รวมข้อนี้เข้ากับข้อก่อนหน้า (เช่น ข้อย่อยของสัญญาที่ถูกแยกออกมา) — ต่อเป็นเอกสารแนบถ้าข้อก่อนมีอยู่แล้ว */
    const mergeWithPrevious = (idx: number) => setQuestions(prev => {
        if (idx === 0) return prev;
        const next = [...prev];
        const a = { ...next[idx - 1] };
        const b = next[idx];
        const bText = [b.number ? `ข้อ ${b.number}. ${b.questionText}` : b.questionText, b.attachmentText].filter(Boolean).join('\n');
        if (a.attachmentText) a.attachmentText = `${a.attachmentText}\n${bText}`;
        else a.questionText = `${a.questionText}\n${bText}`;
        if (!a.modelAnswer && b.modelAnswer) a.modelAnswer = b.modelAnswer;
        a.notes = Array.from(new Set([...a.notes, ...b.notes.filter(n => !n.startsWith('เลขข้อวนกลับ'))]));
        next[idx - 1] = a;
        next.splice(idx, 1);
        return next;
    });

    const included = questions.filter(q => q.include);
    const flaggedCount = included.filter(q => computeQuestionIssues({ ...q, questionText: composeQuestionText(q) }).length > 0).length;

    /* ---------------- ขั้น 5: บันทึก ---------------- */

    const save = async () => {
        if (included.length === 0) {
            toast({ title: 'ยังไม่ได้เลือกข้อที่จะบันทึก', variant: 'destructive' });
            return;
        }
        setBusy(true);
        try {
            const res = await postJson<{ id: string; totalQuestions: number; flaggedQuestions: number }>(
                '/api/education/exams/import', {
                    meta: {
                        ...meta,
                        title: meta.title.trim(),
                        sourceFile: files.map(f => f.name).join(', '),
                    },
                    pages: pages.filter(p => p.url).map(p => ({ page: p.page, url: p.url })),
                    questions: included,
                });
            toast({
                title: `บันทึกแบบร่างแล้ว ${res.totalQuestions} ข้อ`,
                description: res.flaggedQuestions > 0
                    ? `มี ${res.flaggedQuestions} ข้อที่ต้องแก้ก่อนเผยแพร่ — แก้ในหน้าตรวจ OCR`
                    : 'ตรวจ OCR และสร้างเฉลยด้วย AI ต่อได้เลย',
            });
            router.push(`/education/exams/${res.id}/review`);
        } catch (e) {
            toast({ title: 'บันทึกไม่สำเร็จ', description: (e as Error).message, variant: 'destructive' });
            setBusy(false);
        }
    };

    const methodSummary = useMemo(() => ({
        text: pages.filter(p => p.method === 'text').length,
        ocr: pages.filter(p => p.method === 'ocr').length,
    }), [pages]);

    /* ---------------- UI ---------------- */

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/education/exams">
                        <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">นำเข้าข้อสอบ (OCR)</h1>
                        <p className="text-slate-500">อัปโหลด PDF หรือภาพข้อสอบ → อ่านข้อความ → แยกข้อ → ตรวจและบันทึกเป็นแบบร่าง</p>
                    </div>
                </div>
            </div>

            {/* ขั้นตอน */}
            <div className="flex flex-wrap gap-2 text-sm">
                {[
                    { key: 'setup', label: '1. ข้อมูลและไฟล์' },
                    { key: 'pages', label: '2. อ่านข้อความรายหน้า' },
                    { key: 'questions', label: '3. ตรวจรายข้อและบันทึก' },
                ].map(s => (
                    <span key={s.key} className={`px-3 py-1 rounded-full border ${step === s.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500'}`}>
                        {s.label}
                    </span>
                ))}
            </div>

            {progress && (
                <div className="bg-white rounded-xl border shadow-sm p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />{progress.label}
                    </div>
                    <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
                </div>
            )}

            {step === 'setup' && (
                <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700">ชื่อข้อสอบ / ชื่อวิชา *</label>
                            <Input placeholder="เช่น กฎหมายอาญา 1" value={meta.title}
                                onChange={e => { setMeta(m => ({ ...m, title: e.target.value })); setDuplicates(null); setDuplicateConfirmed(false); }} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">รหัสวิชา</label>
                            <Input placeholder="เช่น LAW2001" value={meta.subjectCode}
                                onChange={e => setMeta(m => ({ ...m, subjectCode: e.target.value.toUpperCase() }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">ภาค / ปีการศึกษา</label>
                            <Input placeholder="เช่น ภาคปลาย ปีการศึกษา 2567" value={meta.session}
                                onChange={e => { setMeta(m => ({ ...m, session: e.target.value })); setDuplicates(null); setDuplicateConfirmed(false); }} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">เวลาทำข้อสอบ (นาที)</label>
                            <Input type="number" value={meta.timeLimitMinutes}
                                onChange={e => setMeta(m => ({ ...m, timeLimitMinutes: Number(e.target.value) }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">คะแนนผ่าน (%)</label>
                            <Input type="number" value={meta.passingScore}
                                onChange={e => setMeta(m => ({ ...m, passingScore: Number(e.target.value) }))} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700">รายละเอียด (ไม่ใส่ = &quot;ข้อสอบเก่าวิชา…&quot;)</label>
                            <Textarea rows={2} value={meta.description} onChange={e => setMeta(m => ({ ...m, description: e.target.value }))} />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700">ไฟล์ข้อสอบ</label>
                        <div
                            className="border-2 border-dashed rounded-xl p-6 text-center text-slate-500 hover:bg-slate-50 cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                        >
                            <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                            <p>คลิกหรือลากไฟล์มาวาง — PDF (ทั้งแบบมีข้อความและแบบสแกน) หรือภาพ JPG / PNG / WEBP / HEIC</p>
                            <p className="text-xs mt-1">ภาพหลายไฟล์ = หลายหน้า เรียงตามลำดับด้านล่าง (สูงสุด {MAX_IMPORT_PAGES} หน้า)</p>
                            <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_IMPORT_TYPES} className="hidden"
                                onChange={e => addFiles(e.target.files)} />
                        </div>
                        {files.length > 0 && (
                            <ul className="divide-y border rounded-lg">
                                {files.map((f, i) => (
                                    <li key={`${f.name}-${i}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                                        <span className="w-6 text-slate-400">{i + 1}.</span>
                                        {isPdfFile(f) ? <FileText className="w-4 h-4 text-red-500" /> : <ImageIcon className="w-4 h-4 text-sky-500" />}
                                        <span className="flex-1 truncate">{f.name}</span>
                                        <span className="text-slate-400">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveFile(i, -1)} disabled={i === 0}><ArrowUp className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveFile(i, 1)} disabled={i === files.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}><X className="w-4 h-4" /></Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {duplicates && duplicates.length > 0 && (
                        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-2 text-sm">
                            <p className="font-medium text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />มีชุดข้อสอบที่อาจซ้ำอยู่แล้ว</p>
                            <ul className="list-disc list-inside text-amber-900">
                                {duplicates.map(d => (
                                    <li key={d.id}>
                                        <Link href={`/education/exams/${d.id}/review`} className="underline" target="_blank">{d.title}</Link>
                                        {d.session && ` · ${d.session}`}{d.sourceFile && ` · ${d.sourceFile}`} · {d.totalQuestions} ข้อ · {d.status === 'draft' ? 'แบบร่าง' : 'เผยแพร่'}
                                    </li>
                                ))}
                            </ul>
                            <label className="flex items-center gap-2 text-amber-900">
                                <Checkbox checked={duplicateConfirmed} onCheckedChange={v => setDuplicateConfirmed(v === true)} />
                                ยืนยันว่าเป็นข้อสอบคนละชุด นำเข้าต่อ
                            </label>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={startImport}
                            disabled={busy || (duplicates !== null && duplicates.length > 0 && !duplicateConfirmed)}>
                            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanText className="w-4 h-4 mr-2" />}
                            เริ่มอ่านข้อสอบ
                        </Button>
                    </div>
                </div>
            )}

            {step === 'pages' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-600">
                            {pages.length} หน้า · ใช้ข้อความในไฟล์ {methodSummary.text} หน้า · OCR {methodSummary.ocr} หน้า
                            <span className="block text-xs text-slate-400">แก้ข้อความแต่ละหน้าได้ก่อนแยกข้อ</span>
                        </p>
                        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={structure} disabled={busy || !pagesReady}>
                            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            แยกข้อด้วย AI
                        </Button>
                    </div>
                    {pages.map(p => (
                        <div key={p.page} className="bg-white rounded-xl border shadow-sm p-4 grid md:grid-cols-[220px_1fr] gap-4">
                            <a href={p.previewUrl} target="_blank" rel="noreferrer" className="block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.previewUrl} alt={`หน้า ${p.page}`} className="w-full rounded border bg-slate-50" />
                            </a>
                            <div className="space-y-2 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <span className="font-semibold">หน้า {p.page}</span>
                                    <span className="text-slate-400 truncate">{p.sourceName}{/\.pdf$/i.test(p.sourceName) ? ` หน้า ${p.sourcePage}` : ''}</span>
                                    <Badge variant="outline" className={p.method === 'text' ? 'border-emerald-300 text-emerald-700' : 'border-sky-300 text-sky-700'}>
                                        {p.method === 'text' ? 'ข้อความในไฟล์' : 'OCR'}
                                    </Badge>
                                    <span className="text-xs text-slate-400">{p.methodReason}{p.engine ? ` · ${p.engine}` : ''}</span>
                                    {p.status === 'uploading' && <Badge variant="secondary">กำลังอัปโหลด</Badge>}
                                    {p.status === 'reading' && <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />กำลัง OCR</Badge>}
                                    {p.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                                    {p.url && (
                                        <Button variant="outline" size="sm" className="ml-auto h-7" onClick={() => retryOcr(p)} disabled={busy}>
                                            <RefreshCw className="w-3 h-3 mr-1" />{p.method === 'text' ? 'ใช้ OCR แทน' : 'OCR ใหม่'}
                                        </Button>
                                    )}
                                </div>
                                {p.error && <p className="text-sm text-red-600">{p.error}</p>}
                                <Textarea rows={10} className="font-mono text-sm" value={p.text}
                                    placeholder={p.status === 'done' ? '' : 'รอข้อความ…'}
                                    onChange={e => updatePage(p.page, { text: e.target.value, status: e.target.value.trim() ? 'done' : p.status })} />
                                {p.text && detectTextIssues(p.text).filter(i => !i.startsWith('เนื้อหาสั้น')).length > 0 && (
                                    <p className="text-xs text-amber-700">ภาษาผิดปกติ: {detectTextIssues(p.text).join(' · ')}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {step === 'questions' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-slate-600">
                                จะบันทึก {included.length} ข้อ (ปรนัย {included.filter(q => q.type === 'multiple_choice').length} · อัตนัย {included.filter(q => q.type === 'essay').length})
                                · ต้องแก้ก่อนเผยแพร่ {flaggedCount} ข้อ · แยกด้วย {structureEngines.join(', ')}
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setStep('pages')} disabled={busy}>กลับไปแก้ข้อความรายหน้า</Button>
                                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={save} disabled={busy || included.length === 0}>
                                    {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                    บันทึกเป็นแบบร่าง
                                </Button>
                            </div>
                        </div>
                        {warnings.length > 0 && (
                            <ul className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
                                {warnings.map((w, i) => <li key={i} className="flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{w}</li>)}
                            </ul>
                        )}
                        <p className="text-xs text-slate-400">
                            ข้อที่มีป้ายสีแดงจะบันทึกได้ แต่เผยแพร่ไม่ได้จนกว่าจะแก้ในหน้าตรวจ OCR · เฉลยมาจากเอกสารเท่านั้น ข้อที่ไม่มีเฉลยให้กด &quot;AI สร้างเฉลย&quot; ในหน้าตรวจ
                        </p>
                    </div>

                    {questions.map((q, idx) => {
                        const issues = computeQuestionIssues({ ...q, questionText: composeQuestionText(q) });
                        const garbled = detectTextIssues(composeQuestionText(q), q.type === 'multiple_choice' ? 5 : 20)
                            .filter(i => !i.startsWith('เนื้อหาสั้น'));
                        const order = questions.slice(0, idx + 1).filter(x => x.include).length;
                        return (
                            <div key={idx} className={`bg-white rounded-xl border shadow-sm p-4 space-y-3 ${q.include ? '' : 'opacity-60'}`}>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Checkbox checked={q.include} onCheckedChange={v => updateQuestion(idx, { include: v === true })} />
                                    <span className="font-semibold">{q.include ? `ข้อ ${order}` : 'ไม่บันทึก'}</span>
                                    {q.number && <span className="text-xs text-slate-400">(ต้นฉบับข้อ {q.number})</span>}
                                    {q.sourcePage && <Badge variant="outline">หน้า {q.sourcePage}</Badge>}
                                    <select className="border rounded px-2 py-1 text-sm" value={q.type}
                                        onChange={e => updateQuestion(idx, { type: e.target.value as ImportQuestion['type'] })}>
                                        <option value="essay">อัตนัย</option>
                                        <option value="multiple_choice">ปรนัย</option>
                                    </select>
                                    {garbled.length > 0 && <Badge className="bg-red-100 text-red-700 hover:bg-red-100">ภาษาผิดปกติ</Badge>}
                                    {q.requiresForm && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">ต้องใช้แบบฟอร์ม: {q.formType || 'เอกสาร'}</Badge>}
                                    {q.attachmentText && <Badge variant="secondary">มีเอกสารแนบ</Badge>}
                                    {(q.modelAnswer || q.correctAnswer) && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">มีเฉลยจากเอกสาร</Badge>}
                                    <div className="ml-auto flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" title="ขึ้น" onClick={() => moveQuestion(idx, -1)} disabled={idx === 0}><ArrowUp className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" title="ลง" onClick={() => moveQuestion(idx, 1)} disabled={idx === questions.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="sm" className="h-7" title="รวมเข้ากับข้อก่อนหน้า" onClick={() => mergeWithPrevious(idx)} disabled={idx === 0}><Merge className="w-4 h-4 mr-1" />รวมกับข้อก่อน</Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" title="ลบ" onClick={() => removeQuestion(idx)}><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                </div>

                                <Textarea rows={Math.min(14, Math.max(4, q.questionText.split('\n').length + 1))} value={q.questionText}
                                    onChange={e => updateQuestion(idx, { questionText: e.target.value })} placeholder="คำถาม (ไม่ต้องใส่เลขข้อ)" />

                                {(q.attachmentText || q.attachmentTitle) && (
                                    <div className="rounded-lg border bg-slate-50 p-3 space-y-2">
                                        <Input value={q.attachmentTitle} placeholder="ชื่อเอกสารแนบ เช่น สัญญาธุรกิจแฟรนไชส์"
                                            onChange={e => updateQuestion(idx, { attachmentTitle: e.target.value })} />
                                        <Textarea rows={8} value={q.attachmentText} onChange={e => updateQuestion(idx, { attachmentText: e.target.value })} />
                                        <p className="text-xs text-slate-400">เอกสารแนบจะต่อท้ายคำถามข้อนี้ (ข้อย่อยในเอกสารไม่นับเป็นข้อสอบ)</p>
                                    </div>
                                )}
                                {!q.attachmentText && !q.attachmentTitle && (
                                    <button type="button" className="text-xs text-indigo-600 hover:underline"
                                        onClick={() => updateQuestion(idx, { attachmentTitle: 'เอกสารประกอบ' })}>+ เพิ่มเอกสารแนบ</button>
                                )}

                                {q.type === 'multiple_choice' ? (
                                    <div className="grid md:grid-cols-[1fr_200px] gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">ตัวเลือก (บรรทัดละ 1 ตัว ไม่ต้องใส่ ก. ข.)</label>
                                            <Textarea rows={5} value={q.choices.join('\n')}
                                                onChange={e => updateQuestion(idx, { choices: e.target.value.split('\n') })}
                                                onBlur={() => updateQuestion(idx, { choices: q.choices.map(c => c.trim()).filter(Boolean) })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">คำตอบที่ถูก</label>
                                            <select className="border rounded px-2 py-1 text-sm w-full" value={q.correctAnswer}
                                                onChange={e => updateQuestion(idx, { correctAnswer: e.target.value })}>
                                                <option value="">— ยังไม่มีเฉลย —</option>
                                                {q.choices.filter(c => c.trim()).map((c, i) => (
                                                    <option key={i} value={`(${i + 1})`}>({i + 1}) {c.slice(0, 40)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500">ธงคำตอบจากเอกสาร (ว่างได้ — สร้างด้วย AI ในหน้าตรวจ)</label>
                                        <Textarea rows={q.modelAnswer ? 5 : 2} value={q.modelAnswer}
                                            onChange={e => updateQuestion(idx, { modelAnswer: e.target.value })} />
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                    <label className="flex items-center gap-2">
                                        <Checkbox checked={q.requiresForm}
                                            onCheckedChange={v => updateQuestion(idx, { requiresForm: v === true, formType: v === true ? (q.formType || 'คำฟ้อง') : '' })} />
                                        ต้องร่างเอกสาร/แบบฟอร์มจริง
                                    </label>
                                    {q.requiresForm && (
                                        <Input className="w-56 h-8" value={q.formType} placeholder="ชนิดเอกสาร เช่น คำฟ้อง"
                                            onChange={e => updateQuestion(idx, { formType: e.target.value })} />
                                    )}
                                </div>

                                {q.include && (issues.length > 0 || q.notes.length > 0) && (
                                    <ul className="text-xs space-y-0.5">
                                        {issues.map((i, k) => <li key={`i${k}`} className="text-red-600">• {i}</li>)}
                                        {q.notes.map((n, k) => <li key={`n${k}`} className="text-amber-700">• {n}</li>)}
                                    </ul>
                                )}
                            </div>
                        );
                    })}

                    <Button variant="outline" onClick={() => setQuestions(prev => [...prev, emptyQuestion()])}>
                        <Plus className="w-4 h-4 mr-2" />เพิ่มข้อ
                    </Button>
                </div>
            )}
        </div>
    );
}
