
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    File,
    ListFilter,
    MoreHorizontal,
    PlusCircle,
    Search,
    UserCheck,
    UserX,
    Clock,
    UserCog,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SecureImage } from '@/components/secure-image';
import { EmptyState } from '@/components/ui/empty-state';
import type { LawyerProfile } from '@/lib/types';
import { ensureDate } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
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
import { useFirebase } from '@/firebase';
import {
    collection,
    doc,
    documentId,
    limit as fsLimit,
    orderBy,
    query,
    startAfter,
    updateDoc,
    where,
} from 'firebase/firestore';
import { useAdminList, type AdminListSource } from '@/hooks/use-admin-list';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { DataTablePagination } from '@/components/admin/DataTablePagination';
import { TableSkeleton } from '@/components/admin/TableSkeleton';

const PAGE_SIZE = 25;
const SPECIALTIES = ['คดีฉ้อโกง SMEs', 'คดีแพ่งและพาณิชย์', 'การผิดสัญญา', 'ทรัพย์สินทางปัญญา', 'กฎหมายแรงงาน'];

export default function AdminLawyersPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const [activeTab, setActiveTab] = React.useState('all');
    const [action, setAction] = React.useState<{ type: LawyerProfile['status']; lawyerId: string, lawyerName: string } | null>(null);
    const [searchInput, setSearchInput] = React.useState('');
    const debouncedSearch = useDebouncedValue(searchInput.trim().toLowerCase(), 300);

    const [specialtyFilters, setSpecialtyFilters] = React.useState<Record<string, boolean>>(
        SPECIALTIES.reduce((acc, s) => ({ ...acc, [s]: true }), {})
    );
    const activeSpecialties = React.useMemo(
        () => SPECIALTIES.filter((s) => specialtyFilters[s]),
        [specialtyFilters]
    );

    const source: AdminListSource<LawyerProfile> = React.useMemo(
        () => ({
            kind: 'firestore-client',
            buildQuery: (cursor, pageSize) => {
                if (!firestore) return null;
                const lawyersRef = collection(firestore, 'lawyerProfiles');

                if (debouncedSearch) {
                    // เหมือนหน้า customers: มีคำค้นหา = ค้น nameLower อย่างเดียว ตัด filter
                    // สถานะ/ความเชี่ยวชาญออก แล้วกรองในเครื่องจากหน้าที่ได้มาแทน
                    return query(
                        lawyersRef,
                        where('nameLower', '>=', debouncedSearch),
                        where('nameLower', '<=', debouncedSearch + ''),
                        orderBy('nameLower'),
                        orderBy(documentId()),
                        ...(cursor ? [startAfter(cursor)] : []),
                        fsLimit(pageSize)
                    );
                }

                // ไม่เลือก specialty เลย = ไม่มีอะไรตรงเงื่อนไข (ตรงกับพฤติกรรมเดิม)
                if (activeSpecialties.length === 0) return null;

                const constraints = [
                    ...(activeTab !== 'all' ? [where('status', '==', activeTab)] : []),
                    // array-contains-any รองรับสูงสุด 30 ค่า — SPECIALTIES มีแค่ 5 จึงไม่ชน
                    ...(activeSpecialties.length < SPECIALTIES.length
                        ? [where('specialty', 'array-contains-any', activeSpecialties)]
                        : []),
                    orderBy('joinedAt', 'desc'),
                    orderBy(documentId()),
                    ...(cursor ? [startAfter(cursor)] : []),
                    fsLimit(pageSize),
                ];
                return query(lawyersRef, ...constraints);
            },
            mapDoc: (docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    ...data,
                    joinedAt: data.joinedAt ? ensureDate(data.joinedAt).toLocaleDateString('th-TH') : 'N/A',
                } as LawyerProfile;
            },
        }),
        [firestore, activeTab, activeSpecialties, debouncedSearch]
    );

    const { data, loading, hasNext, hasPrevious, page, next, previous, refresh } = useAdminList({
        source,
        pageSize: PAGE_SIZE,
        resetKey: `${activeTab}|${activeSpecialties.join(',')}|${debouncedSearch}`,
    });

    const visibleLawyers = React.useMemo(() => {
        const withValidId = data.filter((l) => l && l.id);
        if (!debouncedSearch) return withValidId;
        return withValidId.filter((l) => {
            if (activeTab !== 'all' && l.status !== activeTab) return false;
            if (activeSpecialties.length > 0 && !(l.specialty || []).some((s) => activeSpecialties.includes(s))) return false;
            return true;
        });
    }, [data, debouncedSearch, activeTab, activeSpecialties]);

    const handleExport = () => {
        const headers = ["ID", "Name", "Specialties", "JoinedAt", "Status"];
        const csvRows = [
            headers.join(','),
            ...visibleLawyers.map(l =>
                [l.id, `"${l.name}"`, `"${(l.specialty || []).join(', ')}"`, l.joinedAt, l.status].join(',')
            )
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([`﻿${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'lawyers-export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleStatusChange = () => {
        if (!action || !firestore) return;
        const { lawyerId, type: newStatus } = action;

        const lawyerRef = doc(firestore, 'lawyerProfiles', lawyerId);
        updateDoc(lawyerRef, { status: newStatus }).then(() => {
            toast({
                title: `เปลี่ยนสถานะสำเร็จ`,
                description: `สถานะของ ${action.lawyerName} ถูกเปลี่ยนเป็น "${newStatus}" แล้ว`,
            });
            setAction(null);
            refresh();
        }).catch(err => {
            console.error(err);
            toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถอัปเดตสถานะได้' });
            setAction(null);
        })
    };

    const statusBadges: Record<LawyerProfile['status'], React.ReactNode> = {
        approved: <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">อนุมัติแล้ว</Badge>,
        pending: <Badge variant="outline" className="border-yellow-600 text-yellow-700 bg-yellow-50">รอตรวจสอบ</Badge>,
        rejected: <Badge variant="destructive" className="bg-red-100/50 text-red-800 border-red-200/50">ถูกปฏิเสธ</Badge>,
        suspended: <Badge variant="destructive">ระงับการใช้งาน</Badge>,
    }

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-8 lg:p-8">
            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>จัดการข้อมูลทนายความ</CardTitle>
                    <CardDescription>ตรวจสอบ, อนุมัติ, และจัดการโปรไฟล์ทนายความในระบบ</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <div className="flex flex-wrap items-center gap-2">
                            <TabsList>
                                <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
                                <TabsTrigger value="pending">รอตรวจสอบ</TabsTrigger>
                                <TabsTrigger value="approved">อนุมัติแล้ว</TabsTrigger>
                                <TabsTrigger value="rejected">ถูกปฏิเสธ</TabsTrigger>
                            </TabsList>
                            <div className="relative w-full max-w-[220px]">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="ค้นหาชื่อทนาย..."
                                    className="pl-8 h-8"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                />
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 gap-1">
                                            <ListFilter className="h-3.5 w-3.5" />
                                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">กรอง</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>กรองตามความเชี่ยวชาญ</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {SPECIALTIES.map(s => (
                                            <DropdownMenuCheckboxItem
                                                key={s}
                                                checked={specialtyFilters[s]}
                                                onCheckedChange={(checked) => setSpecialtyFilters(prev => ({ ...prev, [s]: !!checked }))}
                                            >
                                                {s}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleExport}>
                                    <File className="h-3.5 w-3.5" />
                                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
                                </Button>
                                <Button size="sm" className="h-8 gap-1" asChild>
                                    <Link href="/lawyers/new">
                                        <PlusCircle className="h-3.5 w-3.5" />
                                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">เพิ่มทนายความ</span>
                                    </Link>
                                </Button>

                            </div>
                        </div>
                        <div className="mt-4">
                            {loading ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ทนายความ</TableHead>
                                            <TableHead className="hidden lg:table-cell">ความเชี่ยวชาญ</TableHead>
                                            <TableHead className="hidden md:table-cell">สถานะ</TableHead>
                                            <TableHead className="hidden md:table-cell">วันที่เข้าร่วม</TableHead>
                                            <TableHead><span className="sr-only">การดำเนินการ</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableSkeleton rows={8} columns={5} />
                                </Table>
                            ) : visibleLawyers.length === 0 ? (
                                <EmptyState
                                    icon={UserCog}
                                    title={debouncedSearch ? `ไม่พบทนายความสำหรับ "${searchInput}"` : 'ยังไม่มีทนายความในระบบ'}
                                    description={debouncedSearch ? 'ลองล้างคำค้นหาหรือปรับตัวกรอง' : 'ทนายความที่สมัครใหม่จะแสดงที่นี่'}
                                />
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ทนายความ</TableHead>
                                            <TableHead className="hidden lg:table-cell">ความเชี่ยวชาญ</TableHead>
                                            <TableHead className="hidden md:table-cell">สถานะ</TableHead>
                                            <TableHead className="hidden md:table-cell">วันที่เข้าร่วม</TableHead>
                                            <TableHead><span className="sr-only">การดำเนินการ</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {visibleLawyers.map(lawyer => (
                                            <TableRow
                                                key={lawyer.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => router.push(`/lawyers/${lawyer.id}`)}
                                            >
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-9 w-9">
                                                            <SecureImage src={lawyer.imageUrl} alt={lawyer.name} className="h-full w-full" />
                                                            <AvatarFallback>{lawyer.name.slice(0, 2)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            {lawyer.name}
                                                            <div className="text-xs text-muted-foreground">{lawyer.id}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell">
                                                    <div className="flex flex-col gap-1">
                                                        {lawyer?.specialty?.map(s => <Badge key={s} variant="outline" className="w-fit">{s}</Badge>) || null}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">{statusBadges[lawyer.status]}</TableCell>
                                                <TableCell className="hidden md:table-cell">{lawyer.joinedAt as string}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                                <span className="sr-only">สลับเมนู</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>การดำเนินการ</DropdownMenuLabel>
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/lawyers/${lawyer.id}`}>ดูโปรไฟล์</Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/lawyers/${lawyer.id}/edit`}>แก้ไขข้อมูล</Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            {lawyer.status !== 'approved' && (
                                                                <DropdownMenuItem onSelect={() => setAction({ type: 'approved', lawyerId: lawyer.id, lawyerName: lawyer.name })}>
                                                                    <UserCheck className="mr-2 h-4 w-4" /> อนุมัติ
                                                                </DropdownMenuItem>
                                                            )}
                                                            {lawyer.status !== 'pending' && (
                                                                <DropdownMenuItem onSelect={() => setAction({ type: 'pending', lawyerId: lawyer.id, lawyerName: lawyer.name })}>
                                                                    <Clock className="mr-2 h-4 w-4" /> รอตรวจสอบ
                                                                </DropdownMenuItem>
                                                            )}
                                                            {lawyer.status !== 'rejected' && (
                                                                <DropdownMenuItem className="text-destructive" onSelect={() => setAction({ type: 'rejected', lawyerId: lawyer.id, lawyerName: lawyer.name })}>
                                                                    <UserX className="mr-2 h-4 w-4" /> ปฏิเสธ
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>

                        {/* Controlled AlertDialog — ย้ายออกมานอก loop เพื่อไม่ให้ชนกับ DropdownMenu */}
                        <AlertDialog open={!!action} onOpenChange={(open) => { if (!open) setAction(null); }}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>ยืนยันการเปลี่ยนสถานะ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        คุณแน่ใจหรือไม่ที่จะเปลี่ยนสถานะของ {action?.lawyerName} เป็น &quot;{action?.type}&quot;?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setAction(null)}>ยกเลิก</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleStatusChange}>ยืนยัน</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </Tabs>
                </CardContent>
                <CardFooter>
                    <DataTablePagination
                        page={page}
                        shown={visibleLawyers.length}
                        hasNext={hasNext}
                        hasPrevious={hasPrevious}
                        loading={loading}
                        onNext={next}
                        onPrevious={previous}
                    />
                </CardFooter>
            </Card>
        </main>
    )
}
