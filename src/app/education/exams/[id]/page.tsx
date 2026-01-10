import { Exam } from "@/lib/education-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, HelpCircle, CheckCircle, AlertTriangle, PlayCircle, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StartExamButton } from "../components/start-exam-button";

const MOCK_EXAM: Exam = {
    id: "exam-1",
    title: "จำลองสอบใบอนุญาตว่าความ (ภาคทฤษฎี) ชุดที่ 1",
    description: "ข้อสอบเสมือนจริง 100 ข้อ ครอบคลุมเนื้อหากฎหมายวิธีพิจารณาความแพ่ง กฎหมายวิธีพิจารณาความอาญา พระราชบัญญัติทนายความ และมรรยาททนายความ",
    price: 0,
    durationMinutes: 240,
    passingScore: 50,
    totalQuestions: 100,
    category: 'license',
    difficulty: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
};

export default async function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // In real app, fetch exam by ID
    const exam = MOCK_EXAM;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <Link href="/education/exams" className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                <ChevronLeft className="w-4 h-4 mr-1" />
                กลับไปหน้าคลังข้อสอบ
            </Link>

            <div className="bg-white border rounded-2xl p-8 shadow-sm">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex gap-2 mb-4">
                            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none">
                                {exam.category === 'license' ? 'ใบอนุญาตว่าความ' : 'อื่นๆ'}
                            </Badge>
                            <Badge variant="outline">
                                ระดับ: {exam.difficulty.toUpperCase()}
                            </Badge>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-4">{exam.title}</h1>
                        <p className="text-slate-600 text-lg leading-relaxed">
                            {exam.description}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
                    <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <Clock className="w-8 h-8 text-indigo-500 mb-2" />
                        <span className="text-2xl font-bold text-slate-900">{exam.durationMinutes}</span>
                        <span className="text-sm text-slate-500">นาที</span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <HelpCircle className="w-8 h-8 text-purple-500 mb-2" />
                        <span className="text-2xl font-bold text-slate-900">{exam.totalQuestions}</span>
                        <span className="text-sm text-slate-500">ข้อ</span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                        <span className="text-2xl font-bold text-slate-900">{exam.passingScore}</span>
                        <span className="text-sm text-slate-500">คะแนนที่ผ่าน</span>
                    </div>
                </div>

                <div className="space-y-4 mb-8">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        ข้อตกลงและคำแนะนำ
                    </h3>
                    <ul className="list-disc pl-5 space-y-2 text-slate-600">
                        <li>โปรดเตรียมอุปกรณ์ให้พร้อม แนะนำให้ใช้คอมพิวเตอร์หรือแท็บเล็ต</li>
                        <li>ระบบจะจับเวลาทันทีเมื่อกดปุ่ม "เริ่มทำข้อสอบ"</li>
                        <li>เมื่อหมดเวลา ระบบจะส่งคำตอบโดยอัตโนมัติ</li>
                        <li>ห้ามเปิดตำราหรือค้นหาข้อมูลระหว่างสอบ (เพื่อประโยชน์ในการวัดผลตนเอง)</li>
                    </ul>
                </div>

                <div className="flex justify-center">
                    <StartExamButton examId={id} />
                </div>
            </div>
        </div>
    );
}
