"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Assuming we have this, else use standard textarea
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Clock, ChevronLeft, ChevronRight, Flag, Save } from "lucide-react";
import { Question } from "@/lib/education-types";
import Link from 'next/link';
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// MOCK DATA FOR EXAM CONTENT
const MOCK_QUESTIONS: Question[] = [
    {
        id: "q1",
        examId: "exam-1",
        order: 1,
        text: "นายแดงทำสัญญาจะซื้อจะขายที่ดินกับนายดำ โดยวางมัดจำไว้ 50,000 บาท ต่อมานายแดงผิดสัญญาไม่ยอมโอนที่ดินตามกำหนด นายดำจึงฟ้องบังคับให้โอนที่ดินและเรียกค่าเสียหาย\n\nจงวินิจฉัยว่า:\n1. นายดำมีสิทธิฟ้องบังคับให้โอนที่ดินได้หรือไม่\n2. เงินมัดจำ 50,000 บาท ต้องจัดการอย่างไรตามกฎหมาย",
        type: "ESSAY",
        correctAnswerText: "ธงคำตอบ:\n\n1. ประเด็นเรื่องการฟ้องบังคับคดี: สัญญาจะซื้อจะขายที่มีหลักฐานเป็นหนังสือหรือมีการวางมัดจำ ย่อมฟ้องร้องบังคับคดีได้ตาม ป.พ.พ. มาตรา 456 วรรคสอง\n\n2. ประเด็นเรื่องมัดจำ: เมื่อฝ่ายผู้จะขาย (นายแดง) ผิดสัญญา ผู้จะซื้อ (นายดำ) ชอบที่จะริบมัดจำไม่ได้ (เพราะตนไม่ใช่ฝ่ายรับมัดจำ) แต่สามารถเรียกให้คืนมัดจำพร้อมดอกเบี้ย หรือฟ้องเรียกค่าเสียหายได้\n\n(คำอธิบายเพิ่มเติม: ปกติมัดจำให้ริบเมื่อฝ่ายวางผิดสัญญา ถ้าฝ่ายรับผิดสัญญาต้องคืนมัดจำ + อาจเรียกค่าเสียหายเพิ่มได้ตามความเสียหายจริง)",
        subject: "กฎหมายแพ่งและพาณิชย์"
    },
    {
        id: "q2",
        examId: "exam-1",
        order: 2,
        text: "ในคดีอาญา หากจำเลยให้การรับสารภาพในชั้นสอบสวน แต่ให้การปฏิเสธในชั้นศาล ศาลจะรับฟังคำรับสารภาพในชั้นสอบสวนมาลงโทษจำเลยได้หรือไม่ เพียงใด",
        type: "ESSAY",
        correctAnswerText: "ธงคำตอบ:\n\nต้องพิจารณาตาม ป.วิ.อาญา มาตรา 84 วรรคท้าย (เดิม) หรือกฎหมายปัจจุบันที่ห้ามรับฟังคำรับสารภาพในชั้นจับกุม แต่ชั้นสอบสวนรับฟังได้ถ้ามีการแจ้งสิทธิถูกต้อง อย่างไรก็ตาม หากจำเลยปฏิเสธในศาล ศาลต้องสืบพยานประกอบจนแน่ใจว่ากระทำผิดจริงจึงจะลงโทษได้ จะฟังลำพังคำรับสารภาพในชั้นสอบสวนไม่ได้ (ประกอบหลักเรื่องน้ำหนักพยาน)",
        subject: "กฎหมายวิธีพิจารณาความอาญา"
    }
];

export default function ExamTakePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState(4 * 60 * 60); // 4 hours in seconds
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [examResult, setExamResult] = useState<any>(null); // Type should be ExamResult

    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/education/login');
        }
    }, [user, isUserLoading, router]);

    if (isUserLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const questions = MOCK_QUESTIONS;
    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    const allAnswered = questions.every(q => answers[q.id] && answers[q.id].trim().length > 0);

    // Timer Logic
    useEffect(() => {
        if (isSubmitted) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isSubmitted]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswerChange = (text: string) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: text
        }));
    };

    const handleSubmit = async () => {
        if (!allAnswered && timeLeft > 0) return; // Prevent manual submit if incomplete

        setIsSubmitted(true);
        setIsAnalyzing(true);

        try {
            const response = await fetch('/api/education/analyze-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    examId: id,
                    userId: user?.uid,
                    questions: questions,
                    userAnswers: answers
                })
            });

            const result = await response.json();
            setExamResult(result);
        } catch (error) {
            console.error("Analysis Failed", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-80px)] -mt-4">
            {/* Sidebar: Navigation */}
            <div className="w-64 border-r bg-white flex flex-col hidden md:flex">
                <div className="p-4 border-b">
                    <h2 className="font-bold text-lg">ข้อน่ารู้</h2>
                    <div className="flex items-center gap-2 text-indigo-600 font-mono text-xl mt-2 font-bold">
                        <Clock className="w-5 h-5" />
                        {formatTime(timeLeft)}
                    </div>
                </div>
                <ScrollArea className="flex-1 p-4">
                    <div className="grid grid-cols-4 gap-2">
                        {questions.map((q, idx) => (
                            <button
                                key={q.id}
                                onClick={() => setCurrentQuestionIndex(idx)}
                                className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${currentQuestionIndex === idx
                                    ? "bg-indigo-600 text-white"
                                    : answers[q.id]
                                        ? "bg-indigo-100 text-indigo-700"
                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                    }`}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t space-y-2">
                    <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={handleSubmit}
                        disabled={isSubmitted || !allAnswered}
                    >
                        {isSubmitted ? "ส่งข้อสอบแล้ว" : allAnswered ? "ยืนยันส่งคำตอบ" : "ยังทำไม่ครบ"}
                    </Button>
                    {!allAnswered && !isSubmitted && (
                        <p className="text-xs text-center text-red-500">
                            *ต้องตอบให้ครบทุกข้อก่อน
                        </p>
                    )}
                    {isSubmitted && (
                        <Link href="/education/exams">
                            <Button variant="outline" className="w-full mt-2">
                                กลับหน้าคลังข้อสอบ
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                {/* Mobile Header (Timer & Nav) */}
                <div className="md:hidden bg-white p-3 border-b flex items-center justify-between">
                    <span className="font-bold">ข้อที่ {currentQuestionIndex + 1}/{questions.length}</span>
                    <span className="font-mono text-indigo-600 font-bold">{formatTime(timeLeft)}</span>
                </div>

                <ScrollArea className="flex-1 p-6 md:p-10">
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Question Section */}
                        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                                    คำถามข้อที่ {currentQuestionIndex + 1}
                                </span>
                                {currentQuestion.type === 'ESSAY' && (
                                    <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-bold">
                                        อัตนัย (เขียนตอบ)
                                    </span>
                                )}
                            </div>
                            <div className="text-lg md:text-xl font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">
                                {currentQuestion.text}
                            </div>
                        </div>

                        {/* Answer Section */}
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-slate-700">
                                คำวินิจฉัยของคุณ
                            </label>
                            {isSubmitted ? (
                                <div className="space-y-6">
                                    {/* User Answer (Read Only) */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 text-slate-700 whitespace-pre-wrap">
                                        <h4 className="text-sm font-bold text-slate-400 mb-2 uppercase">คำตอบของคุณ</h4>
                                        {answers[currentQuestion.id] || "- ไม่ได้ตอบ -"}
                                    </div>

                                    {/* Model Answer (Solution) */}
                                    <div className="bg-green-50 p-6 rounded-xl border border-green-200 text-slate-800 whitespace-pre-wrap">
                                        <h4 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-2">
                                            <Flag className="w-4 h-4" />
                                            ธงคำตอบ / แนววินิจฉัย
                                        </h4>
                                        {currentQuestion.correctAnswerText || "ไม่มีเฉลย"}
                                    </div>

                                    {/* AI Feedback */}
                                    {isAnalyzing ? (
                                        <div className="bg-purple-50 p-6 rounded-xl border border-purple-200 flex flex-col items-center justify-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
                                            <p className="text-purple-700 font-medium">AI กำลังวิเคราะห์และให้คำแนะนำ...</p>
                                        </div>
                                    ) : examResult ? (
                                        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                    ✨
                                                </div>
                                                <h4 className="text-lg font-semibold text-indigo-900">AI แนะนำการเรียนรู้</h4>
                                            </div>

                                            {/* Question specific feedback */}
                                            {examResult.analysis?.find((a: any) => a.questionId === currentQuestion.id) && (
                                                <div className="mb-6">
                                                    <h5 className="font-semibold text-indigo-800 mb-2">บทวิเคราะห์ข้อนี้:</h5>
                                                    <p className="text-slate-700 mb-2">
                                                        {examResult.analysis.find((a: any) => a.questionId === currentQuestion.id).feedback}
                                                    </p>
                                                    <div className="flex gap-2 flex-wrap mt-2">
                                                        {examResult.analysis.find((a: any) => a.questionId === currentQuestion.id).suggestions.map((s: string, i: number) => (
                                                            <span key={i} className="text-xs bg-white px-2 py-1 rounded border border-indigo-100 text-indigo-600">
                                                                💡 {s}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Overall Recommendations (Show only on first question or separately) */}
                                            {currentQuestionIndex === 0 && examResult.recommendedMaterials?.length > 0 && (
                                                <div className="bg-white/60 rounded-lg p-4 mt-4">
                                                    <h5 className="font-medium text-slate-800 mb-3">📚 หนังสือและบทความที่ควรอ่านเพิ่ม:</h5>
                                                    <ul className="space-y-2">
                                                        {examResult.recommendedMaterials.map((m: any, idx: number) => (
                                                            <li key={idx} className="flex gap-2 text-sm text-slate-700">
                                                                <span className="text-indigo-500">•</span>
                                                                <span>
                                                                    <strong>{m.title}</strong> - {m.reason}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <Textarea
                                    placeholder="พิมพ์คำตอบของคุณที่นี่... (อ้างอิงหลักกฎหมายและการปรับบท)"
                                    className="min-h-[300px] p-6 text-lg font-normal leading-relaxed resize-none focus-visible:ring-indigo-500"
                                    value={answers[currentQuestion.id] || ""}
                                    onChange={(e) => handleAnswerChange(e.target.value)}
                                />
                            )}
                        </div>
                    </div>
                </ScrollArea>

                {/* Footer Navigation */}
                <div className="bg-white border-t p-4 flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        ข้อก่อนหน้า
                    </Button>

                    <span className="text-sm text-slate-500 hidden md:block">
                        {isSubmitted ? "บันทึกเข้าระบบแล้ว" : "ระบบจะบันทึกคำตอบอัตโนมัติ"}
                    </span>

                    {/* Change Next button to Submit on last page */}
                    {isLastQuestion ? (
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={handleSubmit}
                            disabled={isSubmitted || !allAnswered}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSubmitted ? "ส่งแล้ว" : "ยืนยันส่งคำตอบ"}
                        </Button>
                    ) : (
                        <Button
                            onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                            disabled={currentQuestionIndex === questions.length - 1}
                        >
                            ข้อถัดไป
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
