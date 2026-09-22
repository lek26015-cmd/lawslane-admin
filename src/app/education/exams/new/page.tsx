'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = [
    { value: 'license', label: 'ใบอนุญาตว่าความ' },
    { value: 'prosecutor', label: 'อัยการ' },
    { value: 'judge', label: 'ผู้พิพากษา' },
    { value: 'university', label: 'มหาวิทยาลัย' },
    { value: 'other', label: 'อื่นๆ' }
];

const DIFFICULTIES = [
    { value: 'easy', label: 'ง่าย' },
    { value: 'medium', label: 'ปานกลาง' },
    { value: 'hard', label: 'ยาก' }
];

export default function CreateExamPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        durationMinutes: 60,
        passingScore: 60,
        category: 'license',
        difficulty: 'medium',
        coverUrl: '',
        status: 'draft' as 'draft' | 'published'
    });

    const handleSubmit = async (status: 'draft' | 'published') => {
        if (!formData.title.trim()) {
            toast({ title: "กรุณากรอกชื่อข้อสอบ", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/education/exams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, status })
            });

            if (response.ok) {
                const exam = await response.json();
                toast({
                    title: "สร้างข้อสอบสำเร็จ",
                    description: "คุณสามารถเพิ่มคำถามได้ในหน้าแก้ไข"
                });
                router.push(`/education/exams/${exam.id}/edit`);
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
                    <Link href="/education/exams">
                        <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">สร้างข้อสอบใหม่</h1>
                        <p className="text-slate-500">กรอกข้อมูลข้อสอบ แล้วเพิ่มคำถามภายหลัง</p>
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
                    <label className="text-sm font-medium text-slate-700">ชื่อข้อสอบ *</label>
                    <Input
                        placeholder="เช่น แบบทดสอบกฎหมายแพ่ง ชุดที่ 1"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">รายละเอียด</label>
                    <Textarea
                        rows={3}
                        placeholder="อธิบายเนื้อหาและวัตถุประสงค์ของข้อสอบ"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">หมวดหมู่</label>
                        <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">ระดับความยาก</label>
                        <Select value={formData.difficulty} onValueChange={(v) => setFormData(prev => ({ ...prev, difficulty: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">เวลาทำข้อสอบ (นาที)</label>
                        <Input
                            type="number"
                            value={formData.durationMinutes}
                            onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: Number(e.target.value) }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">คะแนนผ่าน (%)</label>
                        <Input
                            type="number"
                            value={formData.passingScore}
                            onChange={(e) => setFormData(prev => ({ ...prev, passingScore: Number(e.target.value) }))}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">รูปภาพปก (URL)</label>
                    <Input
                        value={formData.coverUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, coverUrl: e.target.value }))}
                    />
                    {formData.coverUrl && (
                        <img src={formData.coverUrl} alt="Preview" className="mt-2 w-48 h-32 object-cover rounded-lg border" />
                    )}
                </div>
            </div>
        </div>
    );
}
