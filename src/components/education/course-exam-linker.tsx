'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    FileQuestion,
    Search,
    Clock,
    Target,
    Plus,
    X
} from 'lucide-react';
import { Exam } from '@/lib/education-types';
import { listExamsForLinkingAction } from '@/app/actions/course-actions';

interface CourseExamLinkerProps {
    linkedExamIds: string[];
    onChange: (examIds: string[]) => void;
}

export function CourseExamLinker({ linkedExamIds, onChange }: CourseExamLinkerProps) {
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchExams = async () => {
            try {
                // server action ของ repo นี้ — หน้าจัดการข้อสอบเต็มรูปแบบยังอยู่ที่
                // education จนกว่าจะถึง Module 5 ตัวนี้อ่านอย่างเดียวพอให้ผูกข้อสอบได้
                const data = await listExamsForLinkingAction();
                setExams(data as unknown as Exam[]);
            } catch (error) {
                console.error('Error fetching exams:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchExams();
    }, []);

    const filteredExams = exams.filter(exam =>
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const linkedExams = exams.filter(e => linkedExamIds.includes(e.id));
    const availableExams = filteredExams.filter(e => !linkedExamIds.includes(e.id));

    const linkExam = (examId: string) => {
        onChange([...linkedExamIds, examId]);
    };

    const unlinkExam = (examId: string) => {
        onChange(linkedExamIds.filter(id => id !== examId));
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'bg-green-100 text-green-700';
            case 'medium': return 'bg-yellow-100 text-yellow-700';
            case 'hard': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getDifficultyLabel = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'ง่าย';
            case 'medium': return 'ปานกลาง';
            case 'hard': return 'ยาก';
            default: return difficulty;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Linked Exams */}
            {linkedExams.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">ข้อสอบที่เชื่อมต่อแล้ว ({linkedExams.length})</h3>
                    <div className="space-y-2">
                        {linkedExams.map(exam => (
                            <div key={exam.id} className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <FileQuestion className="w-5 h-5 text-indigo-600 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-slate-900">{exam.title}</p>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {exam.durationMinutes} นาที
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Target className="w-3.5 h-3.5" />
                                                {exam.totalQuestions} ข้อ
                                            </span>
                                            <Badge className={getDifficultyColor(exam.difficulty)}>
                                                {getDifficultyLabel(exam.difficulty)}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => unlinkExam(exam.id)}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Available Exams */}
            <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">เพิ่มข้อสอบ</h3>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ค้นหาข้อสอบ..."
                        className="pl-9"
                    />
                </div>

                {availableExams.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        {exams.length === 0 ? (
                            <p>ยังไม่มีข้อสอบในระบบ</p>
                        ) : searchQuery ? (
                            <p>ไม่พบข้อสอบที่ตรงกับคำค้นหา</p>
                        ) : (
                            <p>เชื่อมต่อข้อสอบทั้งหมดแล้ว</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {availableExams.map(exam => (
                            <div
                                key={exam.id}
                                className="flex items-center justify-between p-3 bg-white border rounded-lg hover:border-indigo-300 transition-colors cursor-pointer"
                                onClick={() => linkExam(exam.id)}
                            >
                                <div className="flex items-start gap-3">
                                    <FileQuestion className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-slate-900">{exam.title}</p>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {exam.durationMinutes} นาที
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Target className="w-3.5 h-3.5" />
                                                {exam.totalQuestions} ข้อ
                                            </span>
                                            <Badge className={getDifficultyColor(exam.difficulty)}>
                                                {getDifficultyLabel(exam.difficulty)}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="text-indigo-600">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
