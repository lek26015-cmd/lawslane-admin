'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, Eye, MoreHorizontal, GraduationCap } from 'lucide-react';
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
import { listCoursesAction, deleteCourseAction } from '@/app/actions/course-actions';

// รูปแบบแบนสำหรับแสดงในตาราง — แปลงจาก Course ของจริงตอนโหลด
interface CourseRow {
    id: string;
    title: string;
    instructor: string;
    price: number;
    lessons: number;
    level: string;
    status: 'draft' | 'published';
    createdAt: string;
}

export default function AdminCoursesPage() {
    const [courses, setCourses] = useState<CourseRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState<CourseRow | null>(null);
    const { toast } = useToast();

    const fetchCourses = async () => {
        try {
            const rows = await listCoursesAction();
            setCourses(rows.map(c => ({
                id: c.id,
                title: c.title,
                instructor: c.instructor?.name ?? '',
                price: c.price,
                lessons: c.totalLessons ?? 0,
                level: c.level ?? '',
                status: c.status ?? 'draft',
                createdAt: String((c as { createdAt?: unknown }).createdAt ?? ''),
            })));
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const handleDelete = async () => {
        if (!courseToDelete) return;

        try {
            const res = await deleteCourseAction(courseToDelete.id);

            if (res.success) {
                toast({
                    title: "ลบคอร์สสำเร็จ",
                    description: `คอร์ส "${courseToDelete.title}" ถูกลบแล้ว`,
                });
                fetchCourses();
            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            toast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถลบคอร์สได้",
                variant: "destructive"
            });
        } finally {
            setDeleteDialogOpen(false);
            setCourseToDelete(null);
        }
    };

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.instructor.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(price);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">จัดการคอร์สเรียน</h1>
                    <p className="text-slate-500">สร้าง แก้ไข และจัดการคอร์สเรียนออนไลน์</p>
                </div>
                <Link href="/education/courses/new">
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-2" />
                        สร้างคอร์สใหม่
                    </Button>
                </Link>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="ค้นหาคอร์ส..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Badge variant="secondary">{filteredCourses.length} คอร์ส</Badge>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="text-center py-12">
                        <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">ยังไม่มีคอร์สเรียน</p>
                        <Link href="/education/courses/new">
                            <Button className="mt-4" variant="outline">สร้างคอร์สแรก</Button>
                        </Link>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[350px]">ชื่อคอร์ส</TableHead>
                                <TableHead>ผู้สอน</TableHead>
                                <TableHead>ราคา</TableHead>
                                <TableHead>บทเรียน</TableHead>
                                <TableHead>สถานะ</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCourses.map((course) => (
                                <TableRow key={course.id}>
                                    <TableCell>
                                        <p className="font-medium text-slate-900 line-clamp-1">{course.title}</p>
                                    </TableCell>
                                    <TableCell className="text-slate-600">{course.instructor}</TableCell>
                                    <TableCell className="font-medium">{formatPrice(course.price)}</TableCell>
                                    <TableCell>{course.lessons} บท</TableCell>
                                    <TableCell>
                                        <Badge
                                            className={course.status === 'published'
                                                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                                : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                            }
                                        >
                                            {course.status === 'published' ? 'เผยแพร่' : 'แบบร่าง'}
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
                                                    <Link href={`/courses/${course.id}`} target="_blank">
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        ดูคอร์ส
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/education/courses/${course.id}/edit`}>
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        แก้ไข
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600"
                                                    onClick={() => {
                                                        setCourseToDelete(course);
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
                            คุณต้องการลบคอร์ส "{courseToDelete?.title}" ใช่หรือไม่?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            ลบคอร์ส
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
