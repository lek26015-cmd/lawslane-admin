'use client';

import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, AlertCircle, Filter, X, ArrowLeft, GraduationCap } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { PageHeader } from '../components/page-header';

// Types
interface Exam {
    id: string;
    title: string;
    description: string;
    price: number;
    durationMinutes: number;
    passingScore: number;
    totalQuestions: number;
    yearLevel: string; // ปี 1, ปี 2, ปี 3, ปี 4, ใบอนุญาต, เนติ
    subject: string; // หัวข้อข้อสอบ
    lawCategory: string; // แพ่ง, วิแพ่ง, อาญา, วิอาญา
    difficulty: 'easy' | 'medium' | 'hard';
}

// MOCK DATA with expanded fields
const MOCK_EXAMS: Exam[] = [
    {
        id: "exam-1",
        title: "ข้อสอบกฎหมายแพ่ง: นิติกรรมและสัญญา",
        description: "ทดสอบความเข้าใจเรื่องนิติกรรม สัญญา และผลของสัญญา",
        price: 0,
        durationMinutes: 60,
        passingScore: 30,
        totalQuestions: 50,
        yearLevel: "ปี 1",
        subject: "นิติกรรมและสัญญา",
        lawCategory: "แพ่ง",
        difficulty: 'easy',
    },
    {
        id: "exam-2",
        title: "ข้อสอบกฎหมายแพ่ง: ทรัพย์สินและที่ดิน",
        description: "เน้นเรื่องกรรมสิทธิ์ ครอบครอง ภาระจำยอม และสิทธิเหนือที่ดิน",
        price: 99,
        durationMinutes: 90,
        passingScore: 40,
        totalQuestions: 60,
        yearLevel: "ปี 2",
        subject: "ทรัพย์สินและที่ดิน",
        lawCategory: "แพ่ง",
        difficulty: 'medium',
    },
    {
        id: "exam-3",
        title: "ข้อสอบกฎหมายอาญา: ความผิดเกี่ยวกับชีวิตและร่างกาย",
        description: "ทดสอบความรู้เรื่องฆ่าคนตาย ทำร้ายร่างกาย และความผิดเกี่ยวกับชีวิต",
        price: 0,
        durationMinutes: 60,
        passingScore: 25,
        totalQuestions: 40,
        yearLevel: "ปี 2",
        subject: "ความผิดเกี่ยวกับชีวิตและร่างกาย",
        lawCategory: "อาญา",
        difficulty: 'medium',
    },
    {
        id: "exam-4",
        title: "ข้อสอบวิธีพิจารณาความแพ่ง: การดำเนินคดี",
        description: "ขั้นตอนการฟ้องคดี การส่งหมาย พยานหลักฐาน และการบังคับคดี",
        price: 150,
        durationMinutes: 120,
        passingScore: 50,
        totalQuestions: 80,
        yearLevel: "ปี 3",
        subject: "การดำเนินคดีแพ่ง",
        lawCategory: "วิแพ่ง",
        difficulty: 'hard',
    },
    {
        id: "exam-5",
        title: "ข้อสอบวิธีพิจารณาความอาญา: สิทธิผู้ต้องหา",
        description: "สิทธิของผู้ต้องหา การสอบสวน การฝากขัง และการประกันตัว",
        price: 0,
        durationMinutes: 60,
        passingScore: 30,
        totalQuestions: 45,
        yearLevel: "ปี 3",
        subject: "สิทธิผู้ต้องหา",
        lawCategory: "วิอาญา",
        difficulty: 'medium',
    },
    {
        id: "exam-6",
        title: "จำลองสอบใบอนุญาตว่าความ (ภาคทฤษฎี) ชุดที่ 1",
        description: "ข้อสอบเสมือนจริง 100 ข้อ จำกัดเวลา 4 ชั่วโมง",
        price: 0,
        durationMinutes: 240,
        passingScore: 50,
        totalQuestions: 100,
        yearLevel: "ใบอนุญาต",
        subject: "ข้อสอบรวม",
        lawCategory: "แพ่ง",
        difficulty: 'hard',
    },
    {
        id: "exam-7",
        title: "จำลองสอบเนติบัณฑิต (กลุ่มกฎหมายแพ่ง)",
        description: "เตรียมสอบเนติบัณฑิตด้วยข้อสอบอัตนัยพร้อมธงคำตอบ",
        price: 299,
        durationMinutes: 180,
        passingScore: 60,
        totalQuestions: 10,
        yearLevel: "เนติ",
        subject: "ข้อสอบเนติกลุ่มแพ่ง",
        lawCategory: "แพ่ง",
        difficulty: 'hard',
    },
    {
        id: "exam-8",
        title: "ข้อสอบกฎหมายอาญา: ความผิดเกี่ยวกับทรัพย์",
        description: "ลักทรัพย์ ยักยอก ฉ้อโกง และความผิดเกี่ยวกับทรัพย์อื่นๆ",
        price: 0,
        durationMinutes: 60,
        passingScore: 30,
        totalQuestions: 50,
        yearLevel: "ปี 2",
        subject: "ความผิดเกี่ยวกับทรัพย์",
        lawCategory: "อาญา",
        difficulty: 'medium',
    },
];

// Filter Options
const YEAR_LEVELS = ['ทั้งหมด', 'ปี 1', 'ปี 2', 'ปี 3', 'ปี 4', 'ใบอนุญาต', 'เนติ'];
const LAW_CATEGORIES = ['ทั้งหมด', 'แพ่ง', 'วิแพ่ง', 'อาญา', 'วิอาญา'];
const DIFFICULTIES = ['ทั้งหมด', 'easy', 'medium', 'hard'];

export default function ExamListingPage() {
    const [yearFilter, setYearFilter] = useState('ทั้งหมด');
    const [lawCategoryFilter, setLawCategoryFilter] = useState('ทั้งหมด');
    const [difficultyFilter, setDifficultyFilter] = useState('ทั้งหมด');

    const filteredExams = useMemo(() => {
        return MOCK_EXAMS.filter(exam => {
            const matchYear = yearFilter === 'ทั้งหมด' || exam.yearLevel === yearFilter;
            const matchLaw = lawCategoryFilter === 'ทั้งหมด' || exam.lawCategory === lawCategoryFilter;
            const matchDiff = difficultyFilter === 'ทั้งหมด' || exam.difficulty === difficultyFilter;
            return matchYear && matchLaw && matchDiff;
        });
    }, [yearFilter, lawCategoryFilter, difficultyFilter]);

    const clearFilters = () => {
        setYearFilter('ทั้งหมด');
        setLawCategoryFilter('ทั้งหมด');
        setDifficultyFilter('ทั้งหมด');
    };

    const hasActiveFilters = yearFilter !== 'ทั้งหมด' || lawCategoryFilter !== 'ทั้งหมด' || difficultyFilter !== 'ทั้งหมด';

    return (
        <div className="flex flex-col gap-6">
            {/* Beautiful Page Header */}
            <PageHeader
                title="คลังข้อสอบ"
                description="ฝึกฝนให้มั่นใจกับระบบจำลองสอบเสมือนจริง ทั้งข้อสอบปรนัยและอัตนัยพร้อมธงคำตอบ"
                icon="GraduationCap"
                theme="blue"
                backLink="/education"
                backLabel="กลับหน้าหลัก"
                badge={`${filteredExams.length} ชุดข้อสอบ`}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Sidebar Filters */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl p-4 border shadow-sm sticky top-24">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Filter className="w-5 h-5 text-slate-600" />
                                <span className="font-semibold text-slate-900">ตัวกรอง</span>
                            </div>
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                                >
                                    <X className="w-3 h-3" /> ล้าง
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {/* Year Level Filter */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">ระดับชั้นปี</label>
                                <Select value={yearFilter} onValueChange={setYearFilter}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="เลือกระดับ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {YEAR_LEVELS.map(year => (
                                            <SelectItem key={year} value={year}>{year}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Law Category Filter */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">ประเภทกฎหมาย</label>
                                <Select value={lawCategoryFilter} onValueChange={setLawCategoryFilter}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="เลือกประเภท" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LAW_CATEGORIES.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Difficulty Filter */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">ระดับความยาก</label>
                                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="เลือกระดับ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DIFFICULTIES.map(diff => (
                                            <SelectItem key={diff} value={diff}>
                                                {diff === 'ทั้งหมด' ? 'ทั้งหมด' : diff === 'easy' ? 'ง่าย' : diff === 'medium' ? 'ปานกลาง' : 'ยาก'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Quick Filter Pills - Moved here or kept? Let's keep them as quick toggles or remove to clean up? 
                            User asked for "like Lawyer Search" which usually just has sidebar. 
                            I'll remove the pills to keep it clean, or maybe simplify. 
                            Let's keep them but simpler. Actually, the Select above covers it. 
                        */}
                    </div>
                </div>

                {/* Main Content */}
                <div className="md:col-span-3 space-y-6">
                    {/* Results Count */}
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border">
                        <p className="text-sm text-slate-600">
                            พบทั้งหมด <strong>{filteredExams.length}</strong> รายการ
                        </p>
                    </div>

                    {/* Exam List */}
                    <motion.div
                        className="space-y-4"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: { opacity: 0 },
                            visible: {
                                opacity: 1,
                                transition: { staggerChildren: 0.1 }
                            }
                        }}
                    >
                        {filteredExams.length > 0 ? (
                            filteredExams.map((exam) => (
                                <motion.div
                                    key={exam.id}
                                    variants={{
                                        hidden: { opacity: 0, x: -20 },
                                        visible: { opacity: 1, x: 0 }
                                    }}
                                    whileHover={{ x: 5 }}
                                    transition={{ duration: 0.2 }}
                                    className="group relative flex flex-col sm:flex-row gap-6 p-6 border rounded-xl bg-white hover:border-purple-300 transition-all hover:shadow-md"
                                >
                                    <div className="flex-1 space-y-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant={exam.price === 0 ? "default" : "outline"} className={exam.price === 0 ? "bg-green-600 hover:bg-green-700" : ""}>
                                                {exam.price === 0 ? "ฟรี" : `฿${exam.price}`}
                                            </Badge>
                                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                                {exam.yearLevel}
                                            </Badge>
                                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                                {exam.lawCategory}
                                            </Badge>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${exam.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                                                exam.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                {exam.difficulty === 'easy' ? 'ง่าย' : exam.difficulty === 'medium' ? 'ปานกลาง' : 'ยาก'}
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                            {exam.title}
                                        </h3>
                                        <p className="text-slate-500">
                                            {exam.description}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4" />
                                                <span>{exam.durationMinutes} นาที</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <AlertCircle className="w-4 h-4" />
                                                <span>{exam.totalQuestions} ข้อ</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>เกณฑ์ผ่าน {exam.passingScore} คะแนน</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-row sm:flex-col items-center sm:justify-center border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-6 gap-3">
                                        <Link href={`/education/exams/${exam.id}`} className="w-full sm:w-auto">
                                            <Button className="w-full sm:w-32 bg-purple-600 hover:bg-purple-700">
                                                เริ่มทำข้อสอบ
                                            </Button>
                                        </Link>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200"
                            >
                                <div className="bg-white p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
                                    <Filter className="h-8 w-8 text-slate-400" />
                                </div>
                                <h3 className="mt-2 text-lg font-semibold text-slate-900">ไม่พบข้อสอบที่ตรงกับเงื่อนไข</h3>
                                <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                                    ลองปรับเปลี่ยนตัวกรองด้านซ้ายมือ หรือล้างตัวกรองเพื่อดูรายการทั้งหมด
                                </p>
                                <Button variant="outline" className="mt-6" onClick={clearFilters}>
                                    ล้างตัวกรองทั้งหมด
                                </Button>
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
