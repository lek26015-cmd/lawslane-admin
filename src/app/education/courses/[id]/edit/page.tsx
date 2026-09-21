'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, Loader2, BookOpen, Video, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { getCourseAction, updateCourseAction } from '@/app/actions/course-actions';
import { CourseModuleEditor } from '@/components/education/course-module-editor';
import { CourseExamLinker } from '@/components/education/course-exam-linker';
import { CourseModule } from '@/lib/education-types';

const CATEGORIES = ['เตรียมสอบ', 'กฎหมายแพ่ง', 'กฎหมายอาญา', 'กฎหมายมหาชน', 'กฎหมายธุรกิจ', 'ทั่วไป'];
const LEVELS = [
    { value: 'beginner', label: 'เริ่มต้น' },
    { value: 'intermediate', label: 'ปานกลาง' },
    { value: 'advanced', label: 'ขั้นสูง' }
];

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: 0,
        originalPrice: 0,
        coverUrl: '',
        instructor: '',
        duration: '',
        lessons: 0,
        level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
        category: 'ทั่วไป',
        status: 'draft' as 'draft' | 'published'
    });

    const [modules, setModules] = useState<CourseModule[]>([]);
    const [linkedExamIds, setLinkedExamIds] = useState<string[]>([]);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const course = await getCourseAction(id);
                if (course) {
                    // Course เก็บ instructor เป็น object, ระยะเวลา/จำนวนบทเป็น
                    // totalDurationMinutes/totalLessons และ level เป็นตัวใหญ่
                    // ฟอร์มใช้รูปแบบแบนกว่า จึงต้อง map ที่ขอบเสมอ
                    setFormData({
                        title: course.title,
                        description: course.description || '',
                        price: course.price,
                        originalPrice: course.originalPrice || 0,
                        coverUrl: course.coverUrl || '',
                        instructor: course.instructor?.name || '',
                        duration: String(course.totalDurationMinutes ?? ''),
                        lessons: course.totalLessons ?? 0,
                        level: (course.level?.toLowerCase() as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
                        category: course.category || 'ทั่วไป',
                        status: course.status ?? 'draft'
                    });
                    setModules(course.modules || []);
                    setLinkedExamIds(course.linkedExamIds || []);
                } else {
                    toast({ title: "ไม่พบคอร์ส", variant: "destructive" });
                    router.push('/education/courses');
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCourse();
    }, [id, router, toast]);

    const handleSubmit = async (status: 'draft' | 'published') => {
        if (!formData.title.trim()) {
            toast({ title: "กรุณากรอกชื่อคอร์ส", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);

        // Calculate total lessons from modules
        const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
        const totalDuration = modules.reduce((sum, m) =>
            sum + m.lessons.reduce((ls, l) => ls + (l.durationMinutes || 0), 0), 0
        );

        try {
            const { instructor, duration, lessons, level, ...restForm } = formData;
            const res = await updateCourseAction(id, {
                ...restForm,
                status,
                modules,
                linkedExamIds,
                totalLessons: totalLessons,
                totalDurationMinutes: totalDuration,
                instructor: { name: instructor },
                // เก็บเป็นตัวใหญ่ให้ตรงกับ type และเว็บสาธารณะ
                level: (level.charAt(0).toUpperCase() + level.slice(1)) as 'Beginner' | 'Intermediate' | 'Advanced',
            });

            if (res.success) {
                toast({ title: "บันทึกการแก้ไขสำเร็จ" });
                router.push('/education/courses');
            } else {
                throw new Error('Failed');
            }
        } catch (error) {
            toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/education/courses">
                        <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">แก้ไขคอร์ส</h1>
                        <p className="text-slate-500">อัปเดตข้อมูลคอร์สเรียน</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleSubmit('draft')} disabled={isSubmitting}>
                        <Save className="w-4 h-4 mr-2" />บันทึกแบบร่าง
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => handleSubmit('published')} disabled={isSubmitting}>
                        <Eye className="w-4 h-4 mr-2" />เผยแพร่
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid grid-cols-3 w-full max-w-md">
                    <TabsTrigger value="general" className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        ข้อมูลทั่วไป
                    </TabsTrigger>
                    <TabsTrigger value="lessons" className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        บทเรียน
                    </TabsTrigger>
                    <TabsTrigger value="exams" className="flex items-center gap-2">
                        <FileQuestion className="w-4 h-4" />
                        ข้อสอบ
                    </TabsTrigger>
                </TabsList>

                {/* General Info Tab */}
                <TabsContent value="general">
                    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">ชื่อคอร์ส *</label>
                            <Input value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">รายละเอียด</label>
                            <Textarea rows={4} value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">ราคา (บาท)</label>
                                <Input type="number" value={formData.price} onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">ราคาเดิม (บาท)</label>
                                <Input type="number" value={formData.originalPrice} onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: Number(e.target.value) }))} />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">ผู้สอน</label>
                                <Input value={formData.instructor} onChange={(e) => setFormData(prev => ({ ...prev, instructor: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">ระยะเวลา</label>
                                <Input value={formData.duration} onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))} placeholder="คำนวณอัตโนมัติจากบทเรียน" disabled />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">ระดับ</label>
                                <Select value={formData.level} onValueChange={(v: any) => setFormData(prev => ({ ...prev, level: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">หมวดหมู่</label>
                                <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">รูปภาพปก (URL)</label>
                            <Input value={formData.coverUrl} onChange={(e) => setFormData(prev => ({ ...prev, coverUrl: e.target.value }))} />
                            {formData.coverUrl && (
                                <div className="mt-2 rounded-lg overflow-hidden border w-64">
                                    <img src={formData.coverUrl} alt="Preview" className="w-full h-36 object-cover" />
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                {/* Lessons Tab */}
                <TabsContent value="lessons">
                    <div className="bg-white rounded-xl border shadow-sm p-6">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">จัดการบทเรียน</h2>
                            <p className="text-sm text-slate-500">เพิ่ม/แก้ไขบทเรียน วิดีโอ และเอกสารประกอบ</p>
                        </div>
                        <CourseModuleEditor modules={modules} onChange={setModules} />
                    </div>
                </TabsContent>

                {/* Exams Tab */}
                <TabsContent value="exams">
                    <div className="bg-white rounded-xl border shadow-sm p-6">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">เชื่อมต่อข้อสอบ</h2>
                            <p className="text-sm text-slate-500">เลือกข้อสอบที่จะแนบมากับคอร์สนี้</p>
                        </div>
                        <CourseExamLinker linkedExamIds={linkedExamIds} onChange={setLinkedExamIds} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
