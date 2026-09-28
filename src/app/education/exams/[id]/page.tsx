'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Loader2, AlertTriangle, ChevronLeft, ChevronRight,
    Eye, EyeOff, Edit, ClipboardList, ExternalLink, CheckCircle2, Bot, FileQuestion, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { studentExamUrl } from '@/lib/education-site';

/**
 * หน้าดูข้อสอบรายข้อสำหรับแอดมิน (อ่านอย่างเดียว)
 *
 * เดิมปุ่ม "ดูข้อสอบ" พาไปเว็บนักเรียน ซึ่งโชว์แค่ข้อมูลชุดข้อสอบ — จะเห็นคำถามได้
 * ต้องเข้าโหมดทำข้อสอบที่จับเวลาและกินโควตา แอดมินจึงดูรายข้อไม่ได้
 *
 * ดึงข้อมูลจาก /api/education/exams/[id]/review-data (ด่าน requireAdmin('education.exams')
 * เหมือนหน้าแก้ไข/ตรวจ OCR) — เป็นข้อความดิบก่อนปิดชื่อ แอดมินเห็นตามต้นฉบับ
 */

interface ViewQuestion {
    id: string;
    order: number;
    questionText: string;
    type: string;
    choices: unknown[];
    correctAnswer: string;
    modelAnswer: string;
    explanation: string;
    tags: string[];
    isAiGenerated: boolean;
    sourcePage: number | null;
}

interface ExamViewData {
    id: string;
    title: string;
    description: string;
    subjectCode: string;
    session: string;
    examLevel: string;
    totalQuestions: number;
    questions: ViewQuestion[];
}

function choiceText(c: unknown): string {
    if (typeof c === 'string') return c;
    if (c && typeof c === 'object' && 'text' in c && typeof (c as { text: unknown }).text === 'string') {
        return (c as { text: string }).text;
    }
    return String(c ?? '');
}

function isMultipleChoice(q: ViewQuestion): boolean {
    return (q.type === 'multiple_choice' || q.type === 'MULTIPLE_CHOICE') && q.choices.length > 0;
}

// correctAnswer เก็บแบบ "(n) ข้อความ" — ใช้กติกาเดียวกับ API ตัวอื่น (/\((\d+)\)/)
// ถ้าไม่มีเลขในวงเล็บ ลองจับคู่กับข้อความตัวเลือกตรงๆ
function correctChoiceIndex(q: ViewQuestion): number | undefined {
    if (!q.correctAnswer) return undefined;
    const match = q.correctAnswer.match(/\((\d+)\)/);
    if (match) {
        const idx = parseInt(match[1], 10) - 1;
        if (idx >= 0 && idx < q.choices.length) return idx;
    }
    const target = q.correctAnswer.trim();
    const idx = q.choices.findIndex(c => choiceText(c).trim() === target);
    return idx >= 0 ? idx : undefined;
}

function hasAnswer(q: ViewQuestion): boolean {
    return !!(q.correctAnswer || q.modelAnswer);
}

export default function ExamViewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const [exam, setExam] = useState<ExamViewData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [showAnswers, setShowAnswers] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/education/exams/${id}/review-data`);
                if (!res.ok) {
                    const msg = res.status === 404 ? 'ไม่พบชุดข้อสอบนี้'
                        : res.status === 401 || res.status === 403 ? 'คุณไม่มีสิทธิ์ดูข้อสอบ'
                            : 'โหลดข้อสอบไม่สำเร็จ';
                    if (!cancelled) setError(msg);
                    return;
                }
                const data: ExamViewData = await res.json();
                if (!cancelled) {
                    setExam(data);
                    setCurrentIdx(0);
                }
            } catch (e) {
                console.error('Error fetching exam:', e);
                if (!cancelled) setError('โหลดข้อสอบไม่สำเร็จ');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, [id, reloadKey]);

    const total = exam?.questions.length ?? 0;

    const goTo = useCallback((idx: number) => {
        if (total === 0) return;
        setCurrentIdx(Math.max(0, Math.min(total - 1, idx)));
    }, [total]);

    // คีย์ลัด ←/→ เปลี่ยนข้อ (ไม่ทำงานตอนพิมพ์ในช่องกรอก)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const el = e.target as HTMLElement | null;
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
            if (e.altKey || e.ctrlKey || e.metaKey) return;
            if (e.key === 'ArrowLeft') { e.preventDefault(); setCurrentIdx(i => Math.max(0, i - 1)); }
            if (e.key === 'ArrowRight') { e.preventDefault(); setCurrentIdx(i => Math.min(Math.max(total - 1, 0), i + 1)); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [total]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error || !exam) {
        return (
            <div className="max-w-xl mx-auto py-12 text-center space-y-4">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                <p className="text-slate-700">{error || 'โหลดข้อสอบไม่สำเร็จ'}</p>
                <div className="flex justify-center gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/education/exams"><ArrowLeft className="w-4 h-4 mr-2" />กลับรายการข้อสอบ</Link>
                    </Button>
                    <Button onClick={() => setReloadKey(k => k + 1)}>
                        <RotateCcw className="w-4 h-4 mr-2" />ลองใหม่
                    </Button>
                </div>
            </div>
        );
    }

    const q = exam.questions[currentIdx];
    const mc = q ? isMultipleChoice(q) : false;
    const correctIdx = q && mc ? correctChoiceIndex(q) : undefined;
    const noAnswerCount = exam.questions.filter(x => !hasAnswer(x)).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3 min-w-0">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/education/exams" aria-label="กลับรายการข้อสอบ"><ArrowLeft className="w-5 h-5" /></Link>
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-slate-900 break-words">{exam.title || 'ไม่มีชื่อชุดข้อสอบ'}</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-slate-500">
                            <span>{total} ข้อ</span>
                            {exam.subjectCode && <Badge variant="outline">{exam.subjectCode}</Badge>}
                            {exam.session && <Badge variant="outline">{exam.session}</Badge>}
                            {noAnswerCount > 0 && (
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                    ยังไม่มีเฉลย {noAnswerCount} ข้อ
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                        <Link href={`/education/exams/${id}/edit`}><Edit className="w-4 h-4 mr-2" />แก้ไข</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={`/education/exams/${id}/review`}><ClipboardList className="w-4 h-4 mr-2" />ตรวจสอบ OCR</Link>
                    </Button>
                    <Button variant="ghost" asChild>
                        <a href={studentExamUrl(id)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />เปิดหน้านักเรียน
                        </a>
                    </Button>
                </div>
            </div>

            {total === 0 || !q ? (
                <div className="bg-white rounded-xl border shadow-sm p-12 text-center text-slate-400 space-y-3">
                    <FileQuestion className="w-10 h-10 mx-auto" />
                    <p>ชุดข้อสอบนี้ยังไม่มีคำถาม</p>
                    <Button variant="outline" asChild>
                        <Link href={`/education/exams/${id}/edit`}>ไปหน้าแก้ไขเพื่อเพิ่มคำถาม</Link>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                    {/* Question navigator */}
                    <aside className="bg-white rounded-xl border shadow-sm p-4 space-y-4 h-fit lg:sticky lg:top-4">
                        <div className="flex items-center justify-between">
                            <label htmlFor="toggle-answers" className="text-sm font-medium text-slate-700">แสดงเฉลย</label>
                            <Switch id="toggle-answers" checked={showAnswers} onCheckedChange={setShowAnswers} />
                        </div>
                        <div className="grid grid-cols-6 lg:grid-cols-5 gap-1.5 max-h-[60vh] overflow-y-auto">
                            {exam.questions.map((item, idx) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => goTo(idx)}
                                    title={hasAnswer(item) ? `ข้อ ${item.order}` : `ข้อ ${item.order} (ยังไม่มีเฉลย)`}
                                    aria-current={idx === currentIdx ? 'true' : undefined}
                                    className={`relative h-9 rounded-md text-xs font-medium transition-colors ${
                                        idx === currentIdx
                                            ? 'bg-[#0c4a6e] text-white'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    {item.order}
                                    {!hasAnswer(item) && (
                                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-400">ใช้ปุ่ม ← / → บนคีย์บอร์ดเพื่อเปลี่ยนข้อ · จุดสีส้ม = ยังไม่มีเฉลย</p>
                    </aside>

                    {/* Question detail */}
                    <section className="bg-white rounded-xl border shadow-sm p-6 space-y-6 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-semibold text-slate-900">ข้อ {q.order}</span>
                            <span className="text-sm text-slate-400">({currentIdx + 1} / {total})</span>
                            <Badge variant="outline">{mc ? 'ปรนัย' : 'อัตนัย'}</Badge>
                            {q.isAiGenerated && (
                                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                                    <Bot className="w-3 h-3 mr-1" />เฉลยจาก AI
                                </Badge>
                            )}
                            {q.sourcePage && <Badge variant="secondary">หน้า {q.sourcePage}</Badge>}
                        </div>

                        <p className="text-slate-900 whitespace-pre-wrap break-words leading-relaxed">
                            {q.questionText || <span className="text-slate-400">(ไม่มีข้อความคำถาม)</span>}
                        </p>

                        {mc && (
                            <ol className="space-y-2">
                                {q.choices.map((c, i) => {
                                    const isCorrect = showAnswers && i === correctIdx;
                                    return (
                                        <li
                                            key={i}
                                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                                                isCorrect ? 'border-green-400 bg-green-50' : 'bg-slate-50'
                                            }`}
                                        >
                                            <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                                                isCorrect ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-700'
                                            }`}>
                                                {i + 1}
                                            </span>
                                            <span className="flex-1 whitespace-pre-wrap break-words text-slate-800">{choiceText(c)}</span>
                                            {isCorrect && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />}
                                        </li>
                                    );
                                })}
                            </ol>
                        )}

                        {showAnswers ? (
                            <div className="space-y-4">
                                {q.correctAnswer && (mc ? correctIdx === undefined : true) && (
                                    <AnswerBlock title="คำตอบที่ถูกต้อง" text={q.correctAnswer} tone="green" />
                                )}
                                {q.modelAnswer && <AnswerBlock title="ธงคำตอบ / แนวคำตอบ" text={q.modelAnswer} tone="blue" />}
                                {q.explanation && <AnswerBlock title="คำอธิบาย" text={q.explanation} tone="slate" />}
                                {!hasAnswer(q) && (
                                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                        <AlertTriangle className="w-4 h-4" />ข้อนี้ยังไม่มีเฉลย
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 flex items-center gap-2">
                                <EyeOff className="w-4 h-4" />ซ่อนเฉลยอยู่ — เปิดสวิตช์ &quot;แสดงเฉลย&quot; เพื่อดู
                            </p>
                        )}

                        {q.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {q.tags.map((tag, i) => <Badge key={`${tag}-${i}`} variant="secondary">{tag}</Badge>)}
                            </div>
                        )}

                        <div className="flex items-center justify-between border-t pt-4">
                            <Button variant="outline" onClick={() => goTo(currentIdx - 1)} disabled={currentIdx === 0}>
                                <ChevronLeft className="w-4 h-4 mr-1" />ข้อก่อนหน้า
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setShowAnswers(s => !s)}>
                                {showAnswers ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                                {showAnswers ? 'ซ่อนเฉลย' : 'แสดงเฉลย'}
                            </Button>
                            <Button variant="outline" onClick={() => goTo(currentIdx + 1)} disabled={currentIdx >= total - 1}>
                                ข้อถัดไป<ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

function AnswerBlock({ title, text, tone }: { title: string; text: string; tone: 'green' | 'blue' | 'slate' }) {
    const styles = {
        green: 'border-green-200 bg-green-50 text-green-900',
        blue: 'border-sky-200 bg-sky-50 text-sky-900',
        slate: 'border-slate-200 bg-slate-50 text-slate-800',
    }[tone];
    return (
        <div className={`rounded-lg border p-4 ${styles}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">{title}</p>
            <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p>
        </div>
    );
}
