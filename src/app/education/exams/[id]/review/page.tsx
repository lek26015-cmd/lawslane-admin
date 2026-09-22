'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    ArrowLeft, Save, Loader2, AlertTriangle, CheckCircle2, Bot,
    Circle, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCcw,
    Sparkles, FileText, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface PageImage {
    page: number;
    url: string;
}

interface ReviewQuestion {
    id: string;
    order: number;
    questionText: string;
    type: string;
    choices: any[];
    correctAnswer: string;
    modelAnswer: string;
    explanation: string;
    tags: string[];
    isAiGenerated: boolean;
    sourcePage: number | null;
}

interface OcrCheckResult {
    questionId: string;
    order: number;
    riskLevel: 'high' | 'medium' | 'low' | 'ok';
    issues: string[];
    hasAnswer: boolean;
    isAiGenerated: boolean;
}

interface ExamReviewData {
    id: string;
    title: string;
    subjectCode: string;
    session: string;
    pageImages: PageImage[];
    hasImages: boolean;
    totalQuestions: number;
    questions: ReviewQuestion[];
}

export default function ExamReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { toast } = useToast();

    const [exam, setExam] = useState<ExamReviewData | null>(null);
    const [ocrChecks, setOcrChecks] = useState<OcrCheckResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isReOcring, setIsReOcring] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0);
    const [activeTab, setActiveTab] = useState<'content' | 'answer'>('content');
    const [editedText, setEditedText] = useState('');
    const [editedAnswer, setEditedAnswer] = useState('');
    const [editedExplanation, setEditedExplanation] = useState('');
    const [hasChanges, setHasChanges] = useState(false);

    // Image viewer
    const [zoom, setZoom] = useState(1);
    const [currentPage, setCurrentPage] = useState(0);

    const currentQuestion = exam?.questions[selectedQuestionIdx];
    const currentOcr = ocrChecks.find(c => c.questionId === currentQuestion?.id);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [reviewRes, ocrRes] = await Promise.all([
                    fetch(`/api/education/exams/${id}/review-data`),
                    fetch(`/api/education/exams/${id}/ocr-check`),
                ]);

                if (reviewRes.ok) {
                    const reviewData = await reviewRes.json();
                    setExam(reviewData);
                    if (reviewData.questions.length > 0) {
                        setEditedText(reviewData.questions[0].questionText);
                        setEditedAnswer(reviewData.questions[0].modelAnswer);
                        setEditedExplanation(reviewData.questions[0].explanation);
                    }
                }

                if (ocrRes.ok) {
                    const ocrData = await ocrRes.json();
                    setOcrChecks(ocrData.questions || []);
                }
            } catch (error) {
                console.error('Error:', error);
                toast({ title: "โหลดข้อมูลไม่สำเร็จ", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id, toast]);

    // Sync editor when switching questions
    const selectQuestion = useCallback((idx: number) => {
        if (!exam) return;
        const q = exam.questions[idx];
        if (!q) return;
        setSelectedQuestionIdx(idx);
        setEditedText(q.questionText);
        setEditedAnswer(q.modelAnswer);
        setEditedExplanation(q.explanation);
        setHasChanges(false);

        // Try to sync image viewer to question's page
        if (q.sourcePage && exam.pageImages.length > 0) {
            const pageIdx = exam.pageImages.findIndex(p => p.page === q.sourcePage);
            if (pageIdx >= 0) setCurrentPage(pageIdx);
        } else if (exam.pageImages.length > 0) {
            // Estimate page from question order
            const estimatedPage = Math.min(Math.floor(idx / 2), exam.pageImages.length - 1);
            setCurrentPage(estimatedPage);
        }
    }, [exam]);

    // Save changes
    const handleSave = async () => {
        if (!currentQuestion) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/education/exams/${id}/review-data`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionId: currentQuestion.id,
                    questionText: editedText,
                    modelAnswer: editedAnswer,
                    explanation: editedExplanation,
                }),
            });
            if (res.ok) {
                toast({ title: "บันทึกสำเร็จ" });
                // Update local state
                setExam(prev => {
                    if (!prev) return prev;
                    const updated = { ...prev };
                    updated.questions = [...updated.questions];
                    updated.questions[selectedQuestionIdx] = {
                        ...updated.questions[selectedQuestionIdx],
                        questionText: editedText,
                        modelAnswer: editedAnswer,
                        explanation: editedExplanation,
                    };
                    return updated;
                });
                setHasChanges(false);
            } else {
                throw new Error('Save failed');
            }
        } catch {
            toast({ title: "บันทึกไม่สำเร็จ", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    // Re-OCR with Gemini Vision
    const handleReOcr = async () => {
        if (!currentQuestion || !exam?.pageImages[currentPage]) return;
        setIsReOcring(true);
        try {
            const res = await fetch(`/api/education/questions/${currentQuestion.id}/re-ocr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    examId: id,
                    pageImageUrl: exam.pageImages[currentPage].url,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setEditedText(data.newText);
                setHasChanges(true);
                toast({ title: "Re-OCR สำเร็จ — ตรวจสอบและบันทึก" });
            } else {
                throw new Error('Re-OCR failed');
            }
        } catch {
            toast({ title: "Re-OCR ไม่สำเร็จ", variant: "destructive" });
        } finally {
            setIsReOcring(false);
        }
    };

    // Generate AI answer
    const handleGenerateAiAnswer = async () => {
        if (!currentQuestion) return;
        setIsGeneratingAi(true);
        try {
            const res = await fetch(`/api/education/exams/${id}/generate-answers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionIds: [currentQuestion.id] }),
            });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Generate failed');
            }

            const result = data.results?.[0];
            if (result?.success && result.modelAnswer) {
                setEditedAnswer(result.modelAnswer);
                setEditedExplanation(result.explanation || '');
                setHasChanges(true);
                toast({ title: "สร้างธงคำตอบ AI สำเร็จ — ตรวจสอบและบันทึก" });
            } else if (result && !result.success) {
                toast({ title: `AI ไม่สามารถสร้างคำตอบได้: ${result.error || 'Unknown error'}`, variant: "destructive" });
            } else {
                toast({ title: data.message || "ไม่มีผลลัพธ์จาก AI", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: `สร้างธงคำตอบไม่สำเร็จ: ${err.message || ''}`, variant: "destructive" });
        } finally {
            setIsGeneratingAi(false);
        }
    };

    // Status icon for question tabs
    const getStatusIcon = (qId: string, q: ReviewQuestion) => {
        const ocr = ocrChecks.find(c => c.questionId === qId);
        if (ocr?.riskLevel === 'high' || ocr?.riskLevel === 'medium') {
            return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
        }
        if (q.isAiGenerated) {
            return <Bot className="w-3.5 h-3.5 text-purple-500" />;
        }
        if (q.modelAnswer || q.correctAnswer) {
            return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
        }
        return <Circle className="w-3.5 h-3.5 text-slate-300" />;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!exam) {
        return (
            <div className="text-center py-20 text-slate-500">ไม่พบข้อสอบ</div>
        );
    }

    const issueCount = ocrChecks.filter(c => c.riskLevel !== 'ok').length;
    const noAnswerCount = exam.questions.filter(q => !q.modelAnswer && !q.correctAnswer).length;

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col">
            {/* Header */}
            <div className="border-b bg-white px-6 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Link href={`/education/exams/${id}/edit`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            กลับ
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-sm font-semibold text-slate-900 truncate max-w-md">
                            {exam.title}
                        </h1>
                        <p className="text-xs text-slate-500">
                            {exam.totalQuestions} ข้อ
                            {exam.subjectCode && ` · ${exam.subjectCode}`}
                            {exam.session && ` · ${exam.session}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {issueCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {issueCount} ข้อมีปัญหา OCR
                        </Badge>
                    )}
                    {noAnswerCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                            <Circle className="w-3 h-3 mr-1" />
                            {noAnswerCount} ข้อยังไม่มีธง
                        </Badge>
                    )}
                </div>
            </div>

            {/* Main Split View */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left — Image Viewer */}
                <div className="w-1/2 border-r bg-slate-50 flex flex-col">
                    {/* Image toolbar */}
                    <div className="border-b bg-white px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost" size="sm"
                                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                                disabled={currentPage <= 0}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-xs text-slate-600 min-w-[80px] text-center">
                                หน้า {currentPage + 1} / {exam.pageImages.length || 0}
                            </span>
                            <Button
                                variant="ghost" size="sm"
                                onClick={() => setCurrentPage(Math.min(exam.pageImages.length - 1, currentPage + 1))}
                                disabled={currentPage >= exam.pageImages.length - 1}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>
                                <ZoomOut className="w-4 h-4" />
                            </Button>
                            <span className="text-xs text-slate-500 min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
                            <Button variant="ghost" size="sm" onClick={() => setZoom(Math.min(3, zoom + 0.25))}>
                                <ZoomIn className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setZoom(1)}>
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Image display */}
                    <div className="flex-1 overflow-auto p-4">
                        {exam.pageImages.length > 0 && exam.pageImages[currentPage] ? (
                            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s' }}>
                                <img
                                    src={exam.pageImages[currentPage].url}
                                    alt={`หน้า ${exam.pageImages[currentPage].page}`}
                                    className="max-w-full rounded shadow-md"
                                    style={{ imageRendering: zoom > 1.5 ? 'pixelated' : 'auto' }}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                <div className="text-center">
                                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                    <p>ไม่มีภาพสแกนสำหรับข้อสอบนี้</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right — Content Editor */}
                <div className="w-1/2 flex flex-col bg-white">
                    {/* Question info */}
                    <div className="border-b px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-700">
                                ข้อ {currentQuestion?.order}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                                {currentQuestion?.type === 'multiple_choice' || currentQuestion?.type === 'MULTIPLE_CHOICE' ? 'ปรนัย' : 'อัตนัย'}
                            </Badge>
                            {currentOcr && currentOcr.riskLevel !== 'ok' && (
                                <Badge variant="destructive" className="text-[10px]">
                                    ⚠ OCR ผิดปกติ
                                </Badge>
                            )}
                            {currentQuestion?.isAiGenerated && (
                                <Badge className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">
                                    🤖 AI
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleReOcr}
                                disabled={isReOcring || !exam.hasImages}
                                className="text-xs"
                            >
                                {isReOcring ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                                Re-OCR
                            </Button>
                            <Button
                                size="sm"
                                variant={hasChanges ? "default" : "outline"}
                                onClick={handleSave}
                                disabled={isSaving || !hasChanges}
                                className="text-xs"
                            >
                                {isSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                                บันทึก
                            </Button>
                        </div>
                    </div>

                    {/* OCR Issues Alert */}
                    {currentOcr && currentOcr.issues.length > 0 && (
                        <div className="mx-5 mt-3 p-3 rounded-lg bg-red-50 border border-red-100">
                            <p className="text-xs font-medium text-red-700 mb-1">⚠ ตรวจพบปัญหา OCR:</p>
                            <ul className="text-xs text-red-600 space-y-0.5">
                                {currentOcr.issues.map((issue, i) => (
                                    <li key={i}>• {issue}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="px-5 pt-3 flex gap-1">
                        <button
                            onClick={() => setActiveTab('content')}
                            className={`px-3 py-1.5 text-xs rounded-t-lg border border-b-0 transition-colors ${
                                activeTab === 'content'
                                    ? 'bg-white text-slate-900 font-medium'
                                    : 'bg-slate-50 text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <FileText className="w-3 h-3 inline mr-1" />
                            เนื้อหาข้อสอบ
                        </button>
                        <button
                            onClick={() => setActiveTab('answer')}
                            className={`px-3 py-1.5 text-xs rounded-t-lg border border-b-0 transition-colors ${
                                activeTab === 'answer'
                                    ? 'bg-white text-slate-900 font-medium'
                                    : 'bg-slate-50 text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <MessageSquare className="w-3 h-3 inline mr-1" />
                            ธงคำตอบ
                            {!currentQuestion?.modelAnswer && !currentQuestion?.correctAnswer && (
                                <span className="ml-1 text-red-500">●</span>
                            )}
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-auto px-5 pb-4">
                        {activeTab === 'content' ? (
                            <div className="space-y-3 pt-3">
                                <Textarea
                                    value={editedText}
                                    onChange={(e) => { setEditedText(e.target.value); setHasChanges(true); }}
                                    className="min-h-[300px] font-mono text-sm leading-relaxed resize-none"
                                    placeholder="เนื้อหาข้อสอบ..."
                                />

                                {/* Choices (read-only for now) */}
                                {currentQuestion?.choices && currentQuestion.choices.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-slate-500">ตัวเลือก:</p>
                                        {currentQuestion.choices.map((c: any, i: number) => (
                                            <div key={i} className="text-xs text-slate-700 bg-slate-50 rounded px-3 py-1.5">
                                                ({i + 1}) {typeof c === 'string' ? c : c.text || c}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3 pt-3">
                                {/* Generate AI button */}
                                {!currentQuestion?.modelAnswer && !currentQuestion?.correctAnswer && (
                                    <Button
                                        onClick={handleGenerateAiAnswer}
                                        disabled={isGeneratingAi}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm"
                                    >
                                        {isGeneratingAi ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Sparkles className="w-4 h-4 mr-2" />
                                        )}
                                        สร้างธงคำตอบด้วย AI
                                    </Button>
                                )}

                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">ธงคำตอบ / แนวคำตอบ:</label>
                                    <Textarea
                                        value={editedAnswer}
                                        onChange={(e) => { setEditedAnswer(e.target.value); setHasChanges(true); }}
                                        className="min-h-[200px] font-mono text-sm leading-relaxed resize-none"
                                        placeholder="แนวคำตอบ..."
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">คำอธิบาย / อ้างอิง:</label>
                                    <Textarea
                                        value={editedExplanation}
                                        onChange={(e) => { setEditedExplanation(e.target.value); setHasChanges(true); }}
                                        className="min-h-[100px] font-mono text-sm leading-relaxed resize-none"
                                        placeholder="คำอธิบายเพิ่มเติม..."
                                    />
                                </div>

                                {currentQuestion?.correctAnswer && (
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 mb-1 block">คำตอบที่ถูกต้อง (ต้นฉบับ):</label>
                                        <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">
                                            {currentQuestion.correctAnswer}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom — Question Navigator */}
            <div className="border-t bg-white px-4 py-2 flex-shrink-0 overflow-x-auto">
                <div className="flex gap-1">
                    {exam.questions.map((q, idx) => (
                        <button
                            key={q.id}
                            onClick={() => selectQuestion(idx)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                                idx === selectedQuestionIdx
                                    ? 'bg-[#0c4a6e] text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {getStatusIcon(q.id, q)}
                            <span>ข้อ {q.order}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
