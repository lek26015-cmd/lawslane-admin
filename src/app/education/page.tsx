import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Book, GraduationCap, ChevronRight, Target, Award, FileText } from "lucide-react";
import { ArticlesSection } from "./components/articles-section";
import { RecommendedBooksSection } from './components/recommended-books';
import {
    FeatureCardsAnimated,
    TestimonialsAnimated,
    ExamCategoriesAnimated,
    SampleExamsAnimated
} from './components/animated-sections';
import { HeroFadeIn, SectionFadeIn } from './components/fade-in';

export default function EducationPage() {
    return (
        <div className="flex flex-col gap-12" key="education-page-v4-cache-buster">
            {/* Hero Section - Exam Focused */}
            <HeroFadeIn>
                <section
                    className="relative overflow-hidden rounded-3xl text-white p-12 lg:p-20"
                    style={{ background: 'linear-gradient(to bottom right, #581c87, #312e81, #0f172a)' }}
                >
                    <div className="relative z-10 max-w-3xl space-y-6">
                        <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
                            ฝึกทำข้อสอบ<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-200">
                                จนกว่าจะมั่นใจ
                            </span>
                        </h1>
                        <p className="text-lg text-slate-300 max-w-xl">
                            ข้อสอบครบทุกวิชา ทั้ง <strong className="text-white">แพ่ง วิแพ่ง อาญา วิอาญา</strong> พร้อมธงคำตอบละเอียด
                            เหมาะกับนักศึกษา<strong className="text-white">ปี 1 ถึงเตรียมสอบเนติบัณฑิต</strong>
                        </p>

                        {/* Subject Tags */}
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">กฎหมายแพ่ง</span>
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">วิธีพิจารณาความแพ่ง</span>
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">กฎหมายอาญา</span>
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">วิธีพิจารณาความอาญา</span>
                            <span className="px-3 py-1 bg-amber-500/30 rounded-full text-sm text-amber-200">ข้อสอบทนาย</span>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4">
                            <Link href="/education/exams">
                                <Button
                                    size="lg"
                                    className="bg-white !text-purple-900 border border-white hover:bg-slate-100 font-bold rounded-full px-8 h-12 shadow-lg relative z-10"
                                    style={{ color: '#4c1d95' }} // Force purple-900 color
                                >
                                    เริ่มทำข้อสอบเลย
                                </Button>
                            </Link>
                            <Link href="/education/books">
                                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/20 hover:text-white rounded-full px-8 h-12 backdrop-blur-sm relative z-10 font-medium">
                                    ดูหนังสือประกอบ
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Background decoration elements */}
                    <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
                        {/* Abstract shapes or pattern can go here */}
                        <div className="absolute top-20 right-20 w-64 h-64 bg-purple-500 rounded-full blur-[100px]" />
                        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[120px]" />
                    </div>
                </section>
            </HeroFadeIn>

            {/* Target Audience Banner */}
            <SectionFadeIn delay={0.1}>
                <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center">
                        <span className="text-lg font-semibold text-slate-800">เหมาะสำหรับ:</span>
                        <div className="flex flex-wrap justify-center gap-3">
                            <span className="px-4 py-2 bg-white rounded-full shadow-sm text-sm font-medium text-slate-700 border">นักศึกษานิติศาสตร์ ปี 1-4</span>
                            <span className="px-4 py-2 bg-white rounded-full shadow-sm text-sm font-medium text-slate-700 border">เตรียมสอบใบอนุญาตว่าความ</span>
                            <span className="px-4 py-2 bg-white rounded-full shadow-sm text-sm font-medium text-slate-700 border">เตรียมสอบเนติบัณฑิต</span>
                        </div>
                    </div>
                </section>
            </SectionFadeIn>

            {/* Feature Highlights - Exam System */}
            <FeatureCardsAnimated />

            {/* Exam CTA - Big Card */}
            <SectionFadeIn delay={0.1}>
                <Link href="/education/exams" className="group block">
                    <div className="relative overflow-hidden border-2 border-purple-200 rounded-3xl p-10 lg:p-16 hover:shadow-2xl transition-all bg-gradient-to-br from-purple-50 to-white hover:border-purple-400">
                        <div className="flex flex-col lg:flex-row items-center gap-8">
                            <div className="w-24 h-24 bg-purple-600 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-purple-200">
                                <GraduationCap className="w-12 h-12" />
                            </div>
                            <div className="flex-1 text-center lg:text-left">
                                <h3 className="text-3xl lg:text-4xl font-bold mb-3 text-purple-900">คลังข้อสอบทนายความ</h3>
                                <p className="text-lg text-slate-600 max-w-2xl">
                                    ฝึกทำข้อสอบใบอนุญาตว่าความ ทั้งภาคทฤษฎีและอัตนัย
                                    พร้อมธงคำตอบจากทีมอาจารย์กฎหมาย
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-purple-600 font-bold text-lg">
                                เข้าสู่ห้องสอบ
                                <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>
                    </div>
                </Link>
            </SectionFadeIn>

            {/* Books - Secondary/Smaller */}
            <SectionFadeIn delay={0.2}>
                <div className="grid md:grid-cols-2 gap-6">
                    <Link href="/education/books" className="group block">
                        <div className="h-full border rounded-2xl p-6 hover:shadow-md transition-all hover:border-indigo-200 bg-white">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform flex-shrink-0">
                                    <Book className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-1">หนังสือเตรียมสอบ</h3>
                                    <p className="text-sm text-slate-600 mb-3">
                                        คู่มือติว สรุปย่อ และรวมข้อสอบเก่าพร้อมเฉลย
                                    </p>
                                    <span className="text-indigo-600 font-medium inline-flex items-center text-sm group-hover:gap-2 transition-all">
                                        ดูรายการหนังสือ <ChevronRight className="w-4 h-4" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Link>
                    <Link href="/education/my-learning" className="group block">
                        <div className="h-full border rounded-2xl p-6 hover:shadow-md transition-all hover:border-slate-300 bg-white">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform flex-shrink-0">
                                    <Award className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-1">การเรียนรู้ของฉัน</h3>
                                    <p className="text-sm text-slate-600 mb-3">
                                        ดูประวัติการสอบ คะแนน และความก้าวหน้าของคุณ
                                    </p>
                                    <span className="text-slate-600 font-medium inline-flex items-center text-sm group-hover:gap-2 transition-all">
                                        เข้าสู่ห้องเรียน <ChevronRight className="w-4 h-4" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </SectionFadeIn>

            {/* Sample Exams Section */}
            <section className="py-8">
                <SectionFadeIn>
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-slate-600" />
                            <h2 className="text-xl font-bold text-slate-900">ตัวอย่างข้อสอบจากคลังข้อสอบ</h2>
                        </div>
                        <Link href="/education/exams">
                            <Button variant="link" className="text-slate-600 hover:text-primary text-sm">
                                ดูทั้งหมด <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                        </Link>
                    </div>
                </SectionFadeIn>

                {/* Categories */}
                <ExamCategoriesAnimated />

                {/* Sample Exam Cards */}
                <SampleExamsAnimated />
            </section>

            {/* Testimonials Section */}
            <TestimonialsAnimated />

            {/* Articles from Main Site */}
            <ArticlesSection />

            {/* Recommended Books Section */}
            <RecommendedBooksSection />
        </div>
    );
}
