'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, Eye, MoreHorizontal, ClipboardList, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

interface Exam {
    id: string;
    title: string;
    description: string;
    durationMinutes: number;
    passingScore: number;
    totalQuestions: number;
    category: string;
    difficulty: string;
    status: 'draft' | 'published';
}

const CATEGORY_LABELS: Record<string, string> = {
    license: 'ใบอนุญาตว่าความ',
    prosecutor: 'อัยการ',
    judge: 'ผู้พิพากษา',
    university: 'มหาวิทยาลัย',
    other: 'อื่นๆ'
};

const DIFFICULTY_LABELS: Record<string, string> = {
    easy: 'ง่าย',
    medium: 'ปานกลาง',
    hard: 'ยาก'
};

export default function AdminExamsPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
    const { toast } = useToast();

    const fetchExams = async () => {
        try {
            const response = await fetch('/api/education/exams?all=true');
            if (response.ok) {
                const data = await response.json();
                setExams(data);
            }
        } catch (error) {
            console.error('Error fetching exams:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExams();
    }, []);

    const handleDelete = async () => {
        if (!examToDelete) return;

        try {
            const response = await fetch(`/api/education/exams/${examToDelete.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast({
                    title: "ลบข้อสอบสำเร็จ",
                    description: `ข้อสอบ "${examToDelete.title}" ถูกลบแล้ว`,
                });
                fetchExams();
            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            toast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถลบข้อสอบได้",
                variant: "destructive"
            });
        } finally {
            setDeleteDialogOpen(false);
            setExamToDelete(null);
        }
    };

    const filteredExams = exams.filter(exam =>
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">จัดการข้อสอบ</h1>
                    <p className="text-slate-500">สร้าง แก้ไข และจัดการชุดข้อสอบ</p>
                </div>
                <Link href="/education/exams/new">
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-2" />
                        สร้างข้อสอบใหม่
                    </Button>
                </Link>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="ค้นหาข้อสอบ..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Badge variant="secondary">{filteredExams.length} ชุดข้อสอบ</Badge>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : filteredExams.length === 0 ? (
                    <div className="text-center py-12">
                        <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">ยังไม่มีข้อสอบ</p>
                        <Link href="/education/exams/new">
                            <Button className="mt-4" variant="outline">สร้างข้อสอบแรก</Button>
                        </Link>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px]">ชื่อข้อสอบ</TableHead>
                                <TableHead>หมวดหมู่</TableHead>
                                <TableHead>ระดับ</TableHead>
                                <TableHead className="text-center">คำถาม</TableHead>
                                <TableHead className="text-center">เวลา</TableHead>
                                <TableHead>สถานะ</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredExams.map((exam) => (
                                <TableRow key={exam.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium text-slate-900 line-clamp-1">{exam.title}</p>
                                            <p className="text-xs text-slate-500 line-clamp-1">{exam.description}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{CATEGORY_LABELS[exam.category] || exam.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={
                                            exam.difficulty === 'easy' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                                                exam.difficulty === 'medium' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                                                    'bg-red-100 text-red-700 hover:bg-red-100'
                                        }>
                                            {DIFFICULTY_LABELS[exam.difficulty] || exam.difficulty}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="inline-flex items-center gap-1 text-slate-600">
                                            <AlertCircle className="w-3 h-3" />
                                            {exam.totalQuestions}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="inline-flex items-center gap-1 text-slate-600">
                                            <Clock className="w-3 h-3" />
                                            {exam.durationMinutes} นาที
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={exam.status === 'published'
                                                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                                : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                            }
                                        >
                                            {exam.status === 'published' ? 'เผยแพร่' : 'แบบร่าง'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/exams/${exam.id}`} target="_blank">
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        ดูข้อสอบ
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/education/exams/${exam.id}/edit`}>
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        แก้ไข
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/education/exams/${exam.id}/review`}>
                                                        <ClipboardList className="w-4 h-4 mr-2" />
                                                        ตรวจสอบ OCR
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600"
                                                    onClick={() => {
                                                        setExamToDelete(exam);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    ลบ
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Delete Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                        <AlertDialogDescription>
                            คุณต้องการลบข้อสอบ "{examToDelete?.title}" ใช่หรือไม่?
                            การลบจะรวมถึงคำถามทั้งหมดในชุดข้อสอบนี้ด้วย
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            ลบข้อสอบ
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
