'use client';

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Book, GraduationCap, ChevronRight, Clock, Target, Award, FileText, Quote, Star } from "lucide-react";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious
} from "@/components/ui/carousel";
import { CourseCard } from "./course-card";
import profileLawyer from "@/pic/profile-lawyer.jpg";
import educationHero from "@/pic/education-hero.png";
import lawlanesHero from "@/pic/Lawlanes-Hero-cover.jpg";
import { ReactNode } from 'react';

// Animated wrapper components using Tailwind CSS
// Using Tailwind's animate-in features for hydration-safe animations

export function HeroFadeIn({ children }: { children: ReactNode }) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-forwards">
            {children}
        </div>
    );
}

export function SectionFadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
    // Note: Tailwind arbitrary values for delay might not work dynamically for all values, 
    // but we can map common ones or just rely on CSS variables style if needed.
    // For simplicity, we use a standard delay for now or style attribute.

    return (
        <div
            className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-forwards"
            style={{ animationDelay: `${delay}s` }}
        >
            {children}
        </div>
    );
}

export function AnimatedGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`animate-in fade-in slide-in-from-bottom-4 duration-500 ${className}`}>
            {children}
        </div>
    );
}

export function AnimatedCard({ children, className = '', index = 0 }: { children: ReactNode; className?: string; index?: number }) {
    return (
        <div
            className={`animate-in fade-in slide-in-from-bottom-4 duration-500 hover:-translate-y-1 transition-transform ${className}`}
            style={{ animationDelay: `${index * 0.1}s` }}
        >
            {children}
        </div>
    );
}

// Feature Cards with Animation
export function FeatureCardsAnimated() {
    const features = [
        { icon: FileText, title: "ข้อสอบครบทุกวิชา", desc: "แพ่ง วิแพ่ง อาญา วิอาญา และอื่นๆ" },
        { icon: Clock, title: "จับเวลาเสมือนจริง", desc: "ฝึกบริหารเวลาให้ชินก่อนสอบจริง" },
        { icon: Target, title: "ธงคำตอบละเอียด", desc: "เทียบแนววินิจฉัยทันทีหลังส่งข้อสอบ" },
        { icon: Award, title: "ประวัติการสอบ", desc: "ดูพัฒนาการและจุดอ่อนของตัวเอง" }
    ];

    return (
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
                <div
                    key={idx}
                    className="animate-in fade-in slide-in-from-bottom-6 duration-700 bg-white border rounded-xl p-6 text-center cursor-pointer hover:-translate-y-1 hover:scale-[1.02] transition-all"
                    style={{ animationDelay: `${idx * 0.1}s`, animationFillMode: 'both' }}
                >
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:rotate-12 transition-transform">
                        <feature.icon className="w-6 h-6 text-slate-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-1 text-slate-900">{feature.title}</h3>
                    <p className="text-sm text-slate-600">{feature.desc}</p>
                </div>
            ))}
        </section>
    );
}

// Testimonials with Animation
export function TestimonialsAnimated() {
    const testimonials = [
        {
            quote: "ข้อสอบครบทุกวิชา พร้อมธงคำตอบละเอียดมาก ช่วยให้เข้าใจแนวการเขียนวินิจฉัยได้ดีขึ้น ทำให้สอบใบอนุญาตผ่านรอบแรก",
            name: "คุณกานต์",
            role: "สอบผ่านใบอนุญาตว่าความ 2025",
            initial: "ก"
        },
        {
            quote: "เหมาะมากสำหรับนักศึกษาที่ต้องการฝึกทำข้อสอบก่อนสอบปลายภาค ข้อสอบทายช่วยทบทวนความรู้ได้ดี",
            name: "คุณปิยะ",
            role: "นักศึกษานิติศาสตร์ ปี 3",
            initial: "ป"
        },
        {
            quote: "ใช้ฝึกเตรียมสอบเนติบัณฑิต ข้อสอบอัตนัยช่วยให้ฝึกเขียนคำตอบได้จริง ไม่ใช่แค่ท่องจำ ธงคำตอบอธิบายละเอียดมาก",
            name: "คุณวรรณ",
            role: "เตรียมสอบเนติบัณฑิต",
            initial: "ว"
        }
    ];

    return (
        <section className="py-8">
            <h2 className="text-2xl font-bold text-center mb-8 text-slate-900 animate-in fade-in zoom-in duration-500">
                รีวิวจากผู้ใช้งานจริง
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
                {testimonials.map((t, idx) => (
                    <div
                        key={idx}
                        className="bg-white border rounded-2xl p-6 hover:-translate-y-1 transition-transform animate-in fade-in slide-in-from-bottom-6 duration-700"
                        style={{ animationDelay: `${idx * 0.1}s`, animationFillMode: 'both' }}
                    >
                        <Quote className="w-8 h-8 text-slate-300 mb-4" />
                        <p className="text-slate-600 mb-4">"{t.quote}"</p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-medium hover:scale-110 transition-transform">
                                {t.initial}
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">{t.name}</p>
                                <p className="text-sm text-slate-500">{t.role}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

// Exam Categories with Animation
export function ExamCategoriesAnimated() {
    const categories = [
        { name: "กฎหมายแพ่ง", count: "25 ชุด", href: "/education/exams?category=civil", colors: "from-blue-50 to-blue-100 border-blue-200 hover:border-blue-400", iconBg: "bg-blue-500", textColor: "text-blue-900", countColor: "text-blue-600" },
        { name: "วิ.แพ่ง", count: "18 ชุด", href: "/education/exams?category=civil-procedure", colors: "from-green-50 to-green-100 border-green-200 hover:border-green-400", iconBg: "bg-green-500", textColor: "text-green-900", countColor: "text-green-600" },
        { name: "กฎหมายอาญา", count: "22 ชุด", href: "/education/exams?category=criminal", colors: "from-red-50 to-red-100 border-red-200 hover:border-red-400", iconBg: "bg-red-500", textColor: "text-red-900", countColor: "text-red-600" },
        { name: "วิ.อาญา", count: "20 ชุด", href: "/education/exams?category=criminal-procedure", colors: "from-purple-50 to-purple-100 border-purple-200 hover:border-purple-400", iconBg: "bg-purple-500", textColor: "text-purple-900", countColor: "text-purple-600" }
    ];

    return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {categories.map((cat, idx) => (
                <div key={idx} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: 'both' }}>
                    <Link href={cat.href} className="group block">
                        <div className={`bg-gradient-to-br ${cat.colors} border rounded-xl p-4 transition-all hover:scale-[1.03] hover:-translate-y-1`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 ${cat.iconBg} rounded-lg flex items-center justify-center text-white`}>
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className={`font-bold ${cat.textColor}`}>{cat.name}</h3>
                                    <p className={`text-xs ${cat.countColor}`}>{cat.count}ข้อสอบ</p>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            ))}
        </div>
    );
}

// Sample Exams with Animation
export function SampleExamsAnimated() {
    const exams = [
        {
            id: 1,
            title: "คอร์สติวสอบใบอนุญาตว่าความ ภาคทฤษฎี รุ่น 61",
            description: "ปูพื้นฐานกฎหมายวิธีพิจารณาความแพ่งและอาญา พร้อมเทคนิคการเขียนตอบข้อสอบอัตนัยให้ได้คะแนนดี เจาะลึกธงคำตอบจากสนามสอบจริง",
            thumbnail: educationHero,
            instructorName: "อ.ทิวา (ทนายความอาวุโส)",
            instructorImage: profileLawyer,
            badge: "แนะนำ",
            category: "ตั๋วทนาย",
            href: "/education/exams/1"
        },
        {
            id: 2,
            title: "ตะลุยโจทย์ข้อสอบเนติบัณฑิต ขาแพ่ง-อาญา",
            description: "รวมข้อสอบเก่ากว่า 10 ปี พร้อมเฉลยละเอียดและฎีกาที่น่าสนใจ อัพเดทล่าสุดปี 2568 เน้นจุดที่ออกสอบบ่อย",
            thumbnail: lawlanesHero,
            instructorName: "อ.ณัฐ (เนติบัณฑิตไทย)",
            instructorImage: profileLawyer,
            badge: "ขายดี",
            rating: "4.9/5",
            category: "เนติบัณฑิต",
            href: "/education/exams/2"
        },
        {
            id: 3,
            title: "สรุปหลักกฎหมายแพ่งและพาณิชย์ สำหรับนักศึกษาปี 1-4",
            description: "เข้าใจง่าย ใช้สอบได้จริง ครอบคลุมเนื้อหาสำคัญทั้งบรรพ 1-6 พร้อมตัวอย่างประกอบและการเขียนตอบข้อสอบ",
            thumbnail: educationHero,
            instructorName: "พี่บิว (เกียรตินิยมอันดับ 1)",
            instructorImage: profileLawyer,
            badge: "PREMIUM",
            rating: "HOT",
            category: "กฎหมายแพ่ง",
            href: "/education/exams/3"
        },
        {
            id: 4,
            title: "ติวเข้มวิ.แพ่ง ภาคบังคับคดีและอุทธรณ์-ฎีกา",
            description: "เจาะลึกกระบวนพิจารณาในชั้นบังคับคดีและชั้นศาลสูง พร้อมตัวอย่างคำร้องคำขอที่สำคัญ",
            thumbnail: lawlanesHero,
            instructorName: "อ.สมชาย (ผู้เชี่ยวชาญ)",
            instructorImage: profileLawyer,
            category: "วิ.แพ่ง",
            href: "/education/exams/4"
        }
    ];

    return (
        <div className="w-full px-4 md:px-12 relative animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-forwards">
            <Carousel
                opts={{
                    align: "start",
                    loop: true,
                }}
                className="w-full"
            >
                <CarouselContent className="-ml-4 pb-4">
                    {exams.map((exam) => (
                        <CarouselItem key={exam.id} className="pl-4 basis-[85%] sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/5">


                            <div className="h-full py-2"> {/* Added py-2 to prevent shadow clip */}
                                <CourseCard
                                    id={exam.id}
                                    title={exam.title}
                                    description={exam.description}
                                    thumbnail={exam.thumbnail}
                                    instructorName={exam.instructorName}
                                    instructorImage={exam.instructorImage}
                                    badge={exam.badge}
                                    rating={exam.rating}
                                    category={exam.category}
                                    href={exam.href}
                                />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="-left-4 lg:-left-12 h-12 w-12 bg-white shadow-lg border-0 text-slate-800 hover:bg-slate-50 hover:text-primary" />
                <CarouselNext className="-right-4 lg:-right-12 h-12 w-12 bg-white shadow-lg border-0 text-slate-800 hover:bg-slate-50 hover:text-primary" />
            </Carousel>
        </div>
    );
}
