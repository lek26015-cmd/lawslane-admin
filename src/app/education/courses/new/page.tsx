'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { createCourseAction } from '@/app/actions/course-actions';

const CATEGORIES = ['เตรียมสอบ', 'กฎหมายแพ่ง', 'กฎหมายอาญา', 'กฎหมายมหาชน', 'กฎหมายธุรกิจ', 'ทั่วไป'];
const LEVELS = [
    { value: 'beginner', label: 'เริ่มต้น' },
    { value: 'intermediate', label: 'ปานกลาง' },
    { value: 'advanced', label: 'ขั้นสูง' }
];

export default function CreateCoursePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleSubmit = async (status: 'draft' | 'published') => {
        if (!formData.title.trim()) {
            toast({ title: "กรุณากรอกชื่อคอร์ส", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);

        try {
            const { instructor, duration, lessons, level, ...restForm } = formData as typeof formData & {
                instructor: string; duration: string; lessons: number; level: string;
            };
            const res = await createCourseAction({
                ...restForm,
                status,
                instructor: { name: instructor },
                totalLessons: lessons,
                totalDurationMinutes: Number(duration) || 0,
                level: (level.charAt(0).toUpperCase() + level.slice(1)) as 'Beginner' | 'Intermediate' | 'Advanced',
            });

            if (res.success) {
                toast({
                    title: status === 'published' ? "เผยแพร่คอร์สสำเร็จ" : "บันทึกแบบร่างสำเร็จ",
                });
                router.push('/education/courses');
            } else {
                throw new Error('Failed to create');
            }
        } catch (error) {
            toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/education/courses">
                        <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">สร้างคอร์สใหม่</h1>
                        <p className="text-slate-500">เพิ่มคอร์สเรียนออนไลน์</p>
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

            <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">ชื่อคอร์ส *</label>
                    <Input
                        placeholder="เช่น คอร์สเตรียมสอบทนายความภาคทฤษฎี"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">รายละเอียด</label>
                    <Textarea
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">ราคา (บาท)</label>
                        <Input
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">ราคาเดิม (บาท)</label>
                        <Input
                            type="number"
                            value={formData.originalPrice}
                            onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: Number(e.target.value) }))}
                        />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">ผู้สอน</label>
                        <Input
                            value={formData.instructor}
                            onChange={(e) => setFormData(prev => ({ ...prev, instructor: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">ระยะเวลา</label>
                        <Input
                            placeholder="ระบุเป็นนาที (เช่น 2400)"
                            type="number"
                            value={formData.duration}
                            onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">จำนวนบทเรียน</label>
                        <Input
                            type="number"
                            value={formData.lessons}
                            onChange={(e) => setFormData(prev => ({ ...prev, lessons: Number(e.target.value) }))}
                        />
                    </div>
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
                    <Input
                        value={formData.coverUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, coverUrl: e.target.value }))}
                    />
                    {formData.coverUrl && (
                        <div className="mt-2 rounded-lg overflow-hidden border w-64">
                            <img src={formData.coverUrl} alt="Preview" className="w-full h-36 object-cover" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
