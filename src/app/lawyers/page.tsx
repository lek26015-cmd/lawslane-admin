
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    File,
    ListFilter,
    MoreHorizontal,
    PlusCircle,
    UserCheck,
    UserX,
    Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAllLawyers } from '@/lib/data';
import type { LawyerProfile } from '@/lib/types';
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';


export default function AdminLawyersPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const [allLawyers, setAllLawyers] = React.useState<LawyerProfile[]>([]);
    const [filteredLawyers, setFilteredLawyers] = React.useState<LawyerProfile[]>([]);
    const [activeTab, setActiveTab] = React.useState('all');
    const [action, setAction] = React.useState<{ type: LawyerProfile['status']; lawyerId: string, lawyerName: string } | null>(null);

    const specialties = ['คดีฉ้อโกง SMEs', 'คดีแพ่งและพาณิชย์', 'การผิดสัญญา', 'ทรัพย์สินทางปัญญา', 'กฎหมายแรงงาน'];

    const [specialtyFilters, setSpecialtyFilters] = React.useState<Record<string, boolean>>(
        specialties.reduce((acc, s) => ({ ...acc, [s]: true }), {})
    );

    React.useEffect(() => {
        if (!firestore) return;
        getAllLawyers(firestore).then(setAllLawyers);
    }, [firestore]);

    React.useEffect(() => {
        // Ensure we only work with valid lawyer objects
        let lawyers = (allLawyers || []).filter(l => l && l.id);

        if (activeTab !== 'all') {
            lawyers = lawyers.filter(l => l.status === activeTab);
        }

        const activeSpecialties = Object.keys(specialtyFilters).filter(s => specialtyFilters[s]);
        if (activeSpecialties.length > 0 && activeSpecialties.length < specialties.length) {
            lawyers = lawyers.filter(l =>
                (l.specialty || []).some(s => activeSpecialties.includes(s))
            );
        }

        setFilteredLawyers(lawyers);
    }, [activeTab, specialtyFilters, allLawyers]);

    const handleExport = () => {
        const headers = ["ID", "Name", "Specialties", "JoinedAt", "Status"];
        const csvRows = [
            headers.join(','),
            ...filteredLawyers.map(l =>
                [l.id, `"${l.name}"`, `"${(l.specialty || []).join(', ')}"`, l.joinedAt, l.status].join(',')
            )
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
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
            setAllLawyers(prev => prev.map(l => l.id === lawyerId ? { ...l, status: newStatus } : l));
            setAction(null);
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
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>จัดการข้อมูลทนายความ</CardTitle>
                    <CardDescription>ตรวจสอบ, อนุมัติ, และจัดการโปรไฟล์ทนายความในระบบ</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                        <div className="flex items-center">
                            <TabsList>
                                <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
                                <TabsTrigger value="pending">รอตรวจสอบ</TabsTrigger>
                                <TabsTrigger value="approved">อนุมัติแล้ว</TabsTrigger>
                                <TabsTrigger value="rejected">ถูกปฏิเสธ</TabsTrigger>
                            </TabsList>
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
                                        {specialties.map(s => (
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
                                    <Link href="/admin/lawyers/new">
                                        <PlusCircle className="h-3.5 w-3.5" />
                                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">เพิ่มทนายความ</span>
                                    </Link>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-8 gap-1 ml-2"
                                    onClick={async () => {
                                        try {
                                            const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
                                            const dummyId = 'test-lawyer-' + Date.now();
                                            await setDoc(doc(firestore!, 'lawyerProfiles', dummyId), {
                                                id: dummyId,
                                                userId: 'test-user-' + Date.now(), // Add dummy userId
                                                name: 'Test Lawyer ' + Date.now(),
                                                email: 'test@example.com',
                                                status: 'pending',
                                                specialty: ['คดีแพ่ง'],
                                                joinedAt: serverTimestamp(),
                                                imageHint: 'professional',
                                                imageUrl: ''
                                            });
                                            toast({ title: 'สร้างทนายจำลองสำเร็จ', description: 'ลองรีเฟรชหน้าจอเพื่อดูข้อมูล' });
                                            // Trigger refresh
                                            getAllLawyers(firestore!).then(setAllLawyers);
                                        } catch (e) {
                                            console.error(e);
                                            toast({ variant: 'destructive', title: 'Error', description: String(e) });
                                        }
                                    }}
                                >
                                    <PlusCircle className="h-3.5 w-3.5" />
                                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Test Data</span>
                                </Button>
                            </div>
                        </div>
                        <TabsContent value={activeTab}>
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
                                    {filteredLawyers.filter(Boolean).map(lawyer => (
                                        <TableRow
                                            key={lawyer.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => router.push(`/admin/lawyers/${lawyer.id}`)}
                                        >
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={lawyer.imageUrl} alt={lawyer.name} />
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
                                                <AlertDialog>
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
                                                                <Link href={`/admin/lawyers/${lawyer.id}`}>ดูโปรไฟล์</Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/admin/lawyers/${lawyer.id}/edit`}>แก้ไขข้อมูล</Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            {lawyer.status !== 'approved' && (
                                                                <AlertDialogTrigger asChild>
                                                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setAction({ type: 'approved', lawyerId: lawyer.id, lawyerName: lawyer.name }); }}>
                                                                        <UserCheck className="mr-2 h-4 w-4" /> อนุมัติ
                                                                    </DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                            )}
                                                            {lawyer.status !== 'pending' && (
                                                                <AlertDialogTrigger asChild>
                                                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setAction({ type: 'pending', lawyerId: lawyer.id, lawyerName: lawyer.name }); }}>
                                                                        <Clock className="mr-2 h-4 w-4" /> รอตรวจสอบ
                                                                    </DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                            )}
                                                            {lawyer.status !== 'rejected' && (
                                                                <AlertDialogTrigger asChild>
                                                                    <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); setAction({ type: 'rejected', lawyerId: lawyer.id, lawyerName: lawyer.name }); }}>
                                                                        <UserX className="mr-2 h-4 w-4" /> ปฏิเสธ
                                                                    </DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>ยืนยันการเปลี่ยนสถานะ?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                คุณแน่ใจหรือไม่ที่จะเปลี่ยนสถานะของ {action?.lawyerName} เป็น "{action?.type}"?
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel onClick={() => setAction(null)}>ยกเลิก</AlertDialogCancel>
                                                            <AlertDialogAction onClick={handleStatusChange}>ยืนยัน</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                </CardContent>
                <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        แสดง <strong>{filteredLawyers.length}</strong> จาก <strong>{allLawyers.length}</strong> รายการ
                    </div>
                </CardFooter>
            </Card>
        </main>
    )
}
