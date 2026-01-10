import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Book, GraduationCap, ChevronRight, Clock, Target, Award, FileText, Quote } from "lucide-react";
import educationHero from "@/pic/education-hero.png";
import { ArticlesSection } from "./components/articles-section";
import { RecommendedBooksSection } from './components/recommended-books';

export default function EducationPage() {
    return (
        <div className="flex flex-col gap-12">
            {/* Hero Section - Exam Focused */}
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
                        <span className="px-3 py-1 bg-amber-500/30 rounded-full text-sm text-amber-200">ข้อสอบทาย</span>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-4">
                        <Link href="/exams">
                            <Button
                                size="lg"
                                className="h-14 px-8 text-lg font-semibold shadow-lg"
                                style={{ backgroundColor: '#1e1b4b', color: 'white' }}
                            >
                                <GraduationCap className="mr-2 h-5 w-5" />
                                เริ่มทำข้อสอบเลย
                            </Button>
                        </Link>
                        <Link href="/books">
                            <Button
                                size="lg"
                                variant="outline"
                                className="h-14 px-8 text-lg font-semibold shadow-md"
                                style={{ backgroundColor: 'white', color: '#581c87', borderColor: '#c4b5fd' }}
                            >
                                <Book className="mr-2 h-5 w-5" />
                                ดูหนังสือประกอบ
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Hero Illustration */}
                <div className="absolute right-0 bottom-0 hidden lg:block">
                    <Image
                        src={educationHero}
                        alt="นักศึกษากฎหมายเตรียมสอบ"
                        width={400}
                        height={400}
                        className="opacity-90"
                    />
                </div>

                {/* Abstract Shapes/Background */}
                <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-purple-500/30 blur-3xl rounded-full" />
                <div className="absolute bottom-0 right-20 translate-y-12 w-96 h-96 bg-indigo-500/20 blur-3xl rounded-full" />
            </section>

            {/* Target Audience Banner */}
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

            {/* Feature Highlights - Exam System */}
            <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border rounded-xl p-6 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-6 h-6 text-slate-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-1 text-slate-900">ข้อสอบครบทุกวิชา</h3>
                    <p className="text-sm text-slate-600">แพ่ง วิแพ่ง อาญา วิอาญา และอื่นๆ</p>
                </div>
                <div className="bg-white border rounded-xl p-6 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-6 h-6 text-slate-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-1 text-slate-900">จับเวลาเสมือนจริง</h3>
                    <p className="text-sm text-slate-600">ฝึกบริหารเวลาให้ชินก่อนสอบจริง</p>
                </div>
                <div className="bg-white border rounded-xl p-6 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Target className="w-6 h-6 text-slate-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-1 text-slate-900">ธงคำตอบละเอียด</h3>
                    <p className="text-sm text-slate-600">เทียบแนววินิจฉัยทันทีหลังส่งข้อสอบ</p>
                </div>
                <div className="bg-white border rounded-xl p-6 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="w-6 h-6 text-slate-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-1 text-slate-900">ประวัติการสอบ</h3>
                    <p className="text-sm text-slate-600">ดูพัฒนาการและจุดอ่อนของตัวเอง</p>
                </div>
            </section>

            {/* Exam CTA - Big Card */}
            <Link href="/exams" className="group block">
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

            {/* Books - Secondary/Smaller */}
            <div className="grid md:grid-cols-2 gap-6">
                <Link href="/books" className="group block">
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
                <Link href="/my-learning" className="group block">
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

            {/* Testimonials Section */}
            <section className="py-8">
                <h2 className="text-2xl font-bold text-center mb-8 text-slate-900">รีวิวจากผู้ใช้งานจริง</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white border rounded-2xl p-6">
                        <Quote className="w-8 h-8 text-slate-300 mb-4" />
                        <p className="text-slate-600 mb-4">
                            "ข้อสอบครบทุกวิชา พร้อมธงคำตอบละเอียดมาก ช่วยให้เข้าใจแนวการเขียนวินิจฉัยได้ดีขึ้น ทำให้สอบใบอนุญาตผ่านรอบแรก"
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-medium">ก</div>
                            <div>
                                <p className="font-medium text-slate-900">คุณกานต์</p>
                                <p className="text-sm text-slate-500">สอบผ่านใบอนุญาตว่าความ 2025</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border rounded-2xl p-6">
                        <Quote className="w-8 h-8 text-slate-300 mb-4" />
                        <p className="text-slate-600 mb-4">
                            "เหมาะมากสำหรับนักศึกษาที่ต้องการฝึกทำข้อสอบก่อนสอบปลายภาค ข้อสอบทายช่วยทบทวนความรู้ได้ดี"
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-medium">ป</div>
                            <div>
                                <p className="font-medium text-slate-900">คุณปิยะ</p>
                                <p className="text-sm text-slate-500">นักศึกษานิติศาสตร์ ปี 3</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border rounded-2xl p-6">
                        <Quote className="w-8 h-8 text-slate-300 mb-4" />
                        <p className="text-slate-600 mb-4">
                            "ใช้ฝึกเตรียมสอบเนติบัณฑิต ข้อสอบอัตนัยช่วยให้ฝึกเขียนคำตอบได้จริง ไม่ใช่แค่ท่องจำ ธงคำตอบอธิบายละเอียดมาก"
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-medium">ว</div>
                            <div>
                                <p className="font-medium text-slate-900">คุณวรรณ</p>
                                <p className="text-sm text-slate-500">เตรียมสอบเนติบัณฑิต</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Articles from Main Site */}
            <ArticlesSection />

            {/* Recommended Books Section */}
            <RecommendedBooksSection />
        </div>
    );
}
