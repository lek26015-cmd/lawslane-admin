
'use client';

import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress"; // Added Progress
import { BookOpen, ShoppingBag, Clock, FileText, TrendingUp, AlertCircle, Sparkles, Award } from "lucide-react"; // Added TrendingUp, AlertCircle, Sparkles
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { useUser, useFirebase } from "@/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { ExamResult } from "@/lib/education-types"; // Added ExamResult type
import { PageHeader } from '../components/page-header';

interface SubjectPerformance {
    subject: string;
    totalScore: number;
    totalMaxScore: number;
    count: number;
}

export default function MyLearningPage() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { firestore } = useFirebase();
    const [examHistory, setExamHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // Basic protection
    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/education/login');
        }
    }, [user, isUserLoading, router]);

    // Fetch Exam History
    useEffect(() => {
        async function fetchHistory() {
            if (!user || !firestore) return;

            try {
                const q = query(
                    collection(firestore, 'student_exam_results'),
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );

                const querySnapshot = await getDocs(q);
                const history = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setExamHistory(history);
            } catch (error) {
                console.error("Error fetching exam history:", error);
            } finally {
                setIsLoadingHistory(false);
            }
        }

        if (user && firestore) {
            fetchHistory();
        }
    }, [user, firestore]);

    // Calculate Analytics
    const analytics = useMemo(() => {
        const subjects: Record<string, SubjectPerformance> = {};
        const recommendations: any[] = [];

        examHistory.forEach(exam => {
            const result = exam.result as ExamResult;
            const questions = exam.questions || [];

            // Aggregate Subject Scores
            if (result && result.analysis) {
                result.analysis.forEach((ans) => {
                    const question = questions.find((q: any) => q.id === ans.questionId);
                    const subject = question?.subject || 'กฎหมายทั่วไป';

                    if (!subjects[subject]) {
                        subjects[subject] = { subject, totalScore: 0, totalMaxScore: 0, count: 0 };
                    }
                    subjects[subject].totalScore += ans.score || 0;
                    subjects[subject].totalMaxScore += 10; // Assuming 10 per question
                    subjects[subject].count += 1;
                });
            }

            // Aggregate Recommendations
            if (result && result.recommendedMaterials) {
                recommendations.push(...result.recommendedMaterials);
            }
        });

        const subjectList = Object.values(subjects).map(s => ({
            ...s,
            percentage: s.totalMaxScore > 0 ? (s.totalScore / s.totalMaxScore) * 100 : 0
        })).sort((a, b) => b.percentage - a.percentage);

        // Deduplicate recommendations
        const uniqueDocs = new Set();
        const uniqueRecommendations = recommendations.filter(rec => {
            const isDuplicate = uniqueDocs.has(rec.title);
            uniqueDocs.add(rec.title);
            return !isDuplicate;
        }).slice(0, 5); // Limit to top 5

        return { subjects: subjectList, recommendations: uniqueRecommendations };
    }, [examHistory]);

    if (isUserLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) return null;

    return (
        <div className="space-y-6">
            {/* Beautiful Page Header */}
            <PageHeader
                title="การเรียนรู้ของฉัน"
                description="ติดตามสถานะการเรียน สมรรถนะ และประวัติการทำข้อสอบของคุณ"
                icon={Award}
                theme="rose"
                backLink="/education"
                backLabel="กลับหน้าหลัก"
                badge={`${examHistory.length} ผลสอบ`}
            />

            {/* Analytics Dashboard */}
            {examHistory.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Performance Card */}
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <TrendingUp className="w-5 h-5 text-indigo-600" />
                                สมรรถนะรายวิชา (Performance)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {analytics.subjects.map((sub) => (
                                <div key={sub.subject} className="space-y-2">
                                    <div className="flex justify-between text-sm font-medium">
                                        <span className="text-slate-700">{sub.subject}</span>
                                        <span className={sub.percentage >= 70 ? "text-green-600" : sub.percentage >= 50 ? "text-amber-600" : "text-red-600"}>
                                            {sub.percentage.toFixed(0)}%
                                        </span>
                                    </div>
                                    <Progress value={sub.percentage} className="h-2" />
                                </div>
                            ))}
                            {analytics.subjects.length === 0 && (
                                <div className="text-center text-slate-500 py-4">ยังไม่มีข้อมูลเพียงพอ</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* AI Recommendations Card */}
                    <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg text-indigo-900">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                                AI แนะนำการอ่านเพิ่ม
                            </CardTitle>
                            <CardDescription>
                                วิเคราะห์จากจุดที่ควรปรับปรุงในการสอบที่ผ่านมา
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {analytics.recommendations.length > 0 ? (
                                    analytics.recommendations.map((rec, idx) => (
                                        <div key={idx} className="flex gap-3 items-start bg-white p-3 rounded-lg border border-indigo-50 shadow-sm">
                                            <div className="mt-1 bg-indigo-100 p-1.5 rounded text-indigo-600">
                                                <BookOpen className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900">{rec.title}</h4>
                                                <p className="text-xs text-slate-500 mt-1">{rec.reason}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500 text-sm">
                                        <AlertCircle className="w-8 h-8 mb-2 text-slate-300" />
                                        ยังไม่มีคำแนะนำ (ลองทำข้อสอบให้เสร็จก่อน)
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Tabs defaultValue="exams" className="w-full space-y-6">
                <div className="border-b border-slate-200">
                    <TabsList className="bg-transparent h-auto p-0 space-x-6">
                        <TabsTrigger
                            value="exams"
                            className="rounded-none border-b-2 border-transparent px-4 py-3 font-medium text-slate-500 hover:text-indigo-600 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent shadow-none"
                        >
                            <FileText className="mr-2 h-4 w-4" />
                            คลังข้อสอบของฉัน
                        </TabsTrigger>
                        <TabsTrigger
                            value="orders"
                            className="rounded-none border-b-2 border-transparent px-4 py-3 font-medium text-slate-500 hover:text-indigo-600 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent shadow-none"
                        >
                            <ShoppingBag className="mr-2 h-4 w-4" />
                            ประวัติการสั่งซื้อ
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="exams" className="space-y-4">
                    {isLoadingHistory ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : examHistory.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {examHistory.map((exam) => (
                                <Card key={exam.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold mb-2 inline-block">
                                                {exam.examId || 'EXAM'}
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {exam.createdAt?.seconds ? new Date(exam.createdAt.seconds * 1000).toLocaleDateString('th-TH') : 'เมื่อสักครู่'}
                                            </span>
                                        </div>
                                        <CardTitle className="text-base line-clamp-1">
                                            {exam.questions?.[0]?.text ? `ฝึกทำข้อสอบ: ${exam.questions[0].text.substring(0, 30)}...` : 'แบบทดสอบกฎหมาย'}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
                                            <span>คะแนนที่ได้:</span>
                                            <span className="font-bold text-lg text-indigo-600">{exam.score || 0}/10</span>
                                        </div>
                                        <Button variant="outline" className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50" disabled>
                                            ดูผลการวิเคราะห์
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="border-dashed border-2 bg-slate-50/50">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                                <div className="bg-slate-100 p-4 rounded-full">
                                    <BookOpen className="h-8 w-8 text-slate-400" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-medium text-slate-900">ยังไม่มีรายการข้อสอบ</h3>
                                    <p className="text-sm text-slate-500 max-w-sm mx-auto">
                                        คุณยังไม่ได้เริ่มทำข้อสอบรายการใด เริ่มต้นฝึกฝนวันนี้เพื่อเตรียมความพร้อม
                                    </p>
                                </div>
                                <Button asChild variant="default" className="bg-indigo-600 hover:bg-indigo-700">
                                    <Link href="/education/exams">
                                        ดูคลังข้อสอบทั้งหมด
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="orders" className="space-y-4">
                    <Card className="border-dashed border-2 bg-slate-50/50">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                            <div className="bg-slate-100 p-4 rounded-full">
                                <Clock className="h-8 w-8 text-slate-400" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-medium text-slate-900">ไม่มีประวัติการสั่งซื้อ</h3>
                                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                                    คุณยังไม่มีประวัติการสั่งซื้อหนังสือหรือคอร์สเรียน
                                </p>
                            </div>
                            <Button asChild variant="outline">
                                <Link href="/education/books">
                                    ดูร้านหนังสือ
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
