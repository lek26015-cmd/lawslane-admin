

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
    Users2,
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
import { useFirebase } from '@/firebase';
import {
    collection,
    documentId,
    limit as fsLimit,
    orderBy,
    query,
    startAfter,
    where,
} from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { ensureDate } from '@/lib/data';
import { useAdminList, type AdminListSource } from '@/hooks/use-admin-list';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useToast } from '@/hooks/use-toast';
import { setUserRoleAction, deleteUserAction, canManageUsersAction, getAuthPhotoUrlsAction } from '@/app/actions/user-management';
import { DataTablePagination } from '@/components/admin/DataTablePagination';
import { TableSkeleton } from '@/components/admin/TableSkeleton';

const PAGE_SIZE = 25;

export default function AdminCustomersPage() {
    const router = useRouter();
    const { firestore } = useFirebase();
    const [activeTab, setActiveTab] = React.useState('all');
    const [typeFilters, setTypeFilters] = React.useState({ individual: true, sme: true });
    const [searchInput, setSearchInput] = React.useState('');
    const debouncedSearch = useDebouncedValue(searchInput.trim().toLowerCase(), 300);
    const { toast } = useToast();

    // การเปลี่ยน role และลบบัญชีสงวนไว้ให้ super admin — ยกมาจากหน้า users ของ
    // capdeal ตอนรวมหลังบ้าน (Module 7) ที่นั่นทุกแอดมินทำได้และเขียนทับ claim
    // ทั้งก้อนจนสิทธิ์หาย
    const [canManage, setCanManage] = React.useState(false);
    const [pendingUid, setPendingUid] = React.useState<string | null>(null);

    React.useEffect(() => {
        canManageUsersAction().then(setCanManage).catch(() => setCanManage(false));
    }, []);

    const handleSetRole = async (uid: string, role: string) => {
        setPendingUid(uid);
        const res = await setUserRoleAction(uid, role);
        setPendingUid(null);
        toast(res.ok
            ? { title: 'เปลี่ยนสิทธิ์แล้ว', description: `ตั้งเป็น ${role} เรียบร้อย` }
            : { variant: 'destructive', title: 'เปลี่ยนสิทธิ์ไม่สำเร็จ', description: res.error });
        if (res.ok) router.refresh();
    };

    const handleDeleteUser = async (uid: string, name?: string) => {
        if (!window.confirm(`ลบบัญชี "${name || uid}" ถาวร?\n\nลบทั้งใน Firestore และ Firebase Auth ย้อนกลับไม่ได้`)) return;
        setPendingUid(uid);
        const res = await deleteUserAction(uid);
        setPendingUid(null);
        toast(res.ok
            ? { title: 'ลบบัญชีแล้ว' }
            : { variant: 'destructive', title: 'ลบไม่สำเร็จ', description: res.error });
        if (res.ok) router.refresh();
    };

    const activeTypes = React.useMemo(() => {
        const types: string[] = [];
        if (typeFilters.individual) types.push('บุคคลทั่วไป');
        if (typeFilters.sme) types.push('SME');
        return types;
    }, [typeFilters]);

    const source: AdminListSource<UserProfile> = React.useMemo(
        () => ({
            kind: 'firestore-client',
            buildQuery: (cursor, pageSize) => {
                if (!firestore) return null;
                const usersRef = collection(firestore, 'users');

                // มีคำค้นหา → ค้นด้วย nameLower (prefix) เพียงอย่างเดียว ตัด filter สถานะ/ประเภท
                // ออกจาก query (ต้องการ composite index คนละชุด) แล้วกรองในเครื่องแทน — ดู
                // scripts/backfill-lowercase-fields.ts: เอกสารเก่าที่ยังไม่ backfill จะไม่ถูก
                // ค้นเจอจนกว่าจะรันสคริปต์นั้น
                if (debouncedSearch) {
                    return query(
                        usersRef,
                        where('nameLower', '>=', debouncedSearch),
                        where('nameLower', '<=', debouncedSearch + ''),
                        orderBy('nameLower'),
                        orderBy(documentId()),
                        ...(cursor ? [startAfter(cursor)] : []),
                        fsLimit(pageSize)
                    );
                }

                // ไม่เลือก type filter เลย = ไม่มีอะไรตรงเงื่อนไข (ตรงกับพฤติกรรมเดิม)
                if (activeTypes.length === 0) return null;

                const constraints = [
                    ...(activeTab !== 'all' ? [where('status', '==', activeTab)] : []),
                    ...(activeTypes.length < 2 ? [where('type', '==', activeTypes[0])] : []),
                    orderBy('registeredAt', 'desc'),
                    orderBy(documentId()),
                    ...(cursor ? [startAfter(cursor)] : []),
                    fsLimit(pageSize),
                ];
                return query(usersRef, ...constraints);
            },
            mapDoc: (docSnap) => {
                const data = docSnap.data();
                return {
                    uid: docSnap.id,
                    ...data,
                    type: data.type || 'บุคคลทั่วไป',
                    status: data.status || 'active',
                    registeredAt: (data.registeredAt || data.createdAt)
                        ? ensureDate(data.registeredAt || data.createdAt).toLocaleDateString('th-TH')
                        : 'N/A',
                } as UserProfile;
            },
        }),
        [firestore, activeTab, activeTypes, debouncedSearch]
    );

    const { data, loading, hasNext, hasPrevious, page, next, previous } = useAdminList({
        source,
        pageSize: PAGE_SIZE,
        resetKey: `${activeTab}|${activeTypes.join(',')}|${debouncedSearch}`,
    });

    // ลูกค้าส่วนใหญ่ไม่มี users.avatar — ใช้รูปจากบัญชี Google/LINE (Firebase Auth) แทน
    const [authPhotos, setAuthPhotos] = React.useState<Record<string, string>>({});
    React.useEffect(() => {
        const missing = data.filter(c => !c.avatar && !(c.uid in authPhotos)).map(c => c.uid);
        if (missing.length === 0) return;
        let cancelled = false;
        getAuthPhotoUrlsAction(missing).then(photos => {
            if (cancelled) return;
            // uid ที่ไม่มีรูปเก็บเป็น '' กันยิงซ้ำ
            setAuthPhotos(prev => ({ ...prev, ...Object.fromEntries(missing.map(uid => [uid, photos[uid] || ''])) }));
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    // เมื่อค้นหาอยู่ query ตัด filter สถานะ/ประเภทออกไปแล้ว (ดูเหตุผลใน buildQuery) —
    // กรองสองอย่างนี้เพิ่มในเครื่องจากหน้าที่ได้มา ถ้ามีการเลือก filter ไว้ไม่ครบ
    const visibleCustomers = React.useMemo(() => {
        if (!debouncedSearch) return data;
        return data.filter((c) => {
            if (activeTab !== 'all' && c.status !== activeTab) return false;
            if (!activeTypes.includes(c.type)) return false;
            return true;
        });
    }, [data, debouncedSearch, activeTab, activeTypes]);

    const handleExport = () => {
        const headers = ["ID", "Name", "Email", "Type", "RegisteredAt", "Status"];
        const csvRows = [
            headers.join(','),
            ...visibleCustomers.map(c =>
                [c.uid, `"${c.name || 'Unknown'}"`, c.email, c.type, c.registeredAt, c.status].join(',')
            )
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([`﻿${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'customers-export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-8 lg:p-8">
            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>จัดการข้อมูลลูกค้า</CardTitle>
                    <CardDescription>
                        ดู, ค้นหา, และจัดการบัญชีผู้ใช้งานทั้งหมดในระบบ
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <div className="flex flex-wrap items-center gap-2">
                            <TabsList>
                                <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
                                <TabsTrigger value="active">Active</TabsTrigger>
                                <TabsTrigger value="suspended">Suspended</TabsTrigger>
                            </TabsList>
                            <div className="relative w-full max-w-[220px]">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="ค้นหาชื่อลูกค้า..."
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
                                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                                กรอง
                                            </span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>กรองตามประเภท</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuCheckboxItem
                                            checked={typeFilters.individual}
                                            onCheckedChange={(checked) => setTypeFilters(prev => ({ ...prev, individual: !!checked }))}
                                        >
                                            บุคคลทั่วไป
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuCheckboxItem
                                            checked={typeFilters.sme}
                                            onCheckedChange={(checked) => setTypeFilters(prev => ({ ...prev, sme: !!checked }))}
                                        >
                                            SME
                                        </DropdownMenuCheckboxItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleExport}>
                                    <File className="h-3.5 w-3.5" />
                                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                        Export
                                    </span>
                                </Button>
                                <Button size="sm" className="h-8 gap-1" asChild>
                                    <Link href="/customers/new">
                                        <PlusCircle className="h-3.5 w-3.5" />
                                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                            เพิ่มลูกค้า
                                        </span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                        <div className="mt-4">
                            {loading ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="hidden w-[100px] sm:table-cell"><span className="sr-only">รูป</span></TableHead>
                                            <TableHead>ลูกค้า</TableHead>
                                            <TableHead>ประเภท</TableHead>
                                            <TableHead className="hidden md:table-cell">วันที่ลงทะเบียน</TableHead>
                                            <TableHead className="hidden md:table-cell">สถานะ</TableHead>
                                            <TableHead><span className="sr-only">การดำเนินการ</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableSkeleton rows={8} columns={6} />
                                </Table>
                            ) : visibleCustomers.length === 0 ? (
                                <EmptyState
                                    icon={Users2}
                                    title={debouncedSearch ? `ไม่พบลูกค้าสำหรับ "${searchInput}"` : 'ยังไม่มีลูกค้าในระบบ'}
                                    description={debouncedSearch ? 'ลองล้างคำค้นหาหรือปรับตัวกรอง' : 'ลูกค้าที่ลงทะเบียนใหม่จะแสดงที่นี่'}
                                />
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="hidden w-[100px] sm:table-cell">
                                                <span className="sr-only">รูป</span>
                                            </TableHead>
                                            <TableHead>ลูกค้า</TableHead>
                                            <TableHead>ประเภท</TableHead>
                                            <TableHead className="hidden md:table-cell">
                                                วันที่ลงทะเบียน
                                            </TableHead>
                                            <TableHead className="hidden md:table-cell">
                                                สถานะ
                                            </TableHead>
                                            <TableHead>
                                                <span className="sr-only">การดำเนินการ</span>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {visibleCustomers.map(customer => (
                                            <TableRow
                                                key={customer.uid}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => router.push(`/customers/${customer.uid}`)}
                                            >
                                                <TableCell className="hidden sm:table-cell">
                                                    <Avatar className="h-9 w-9">
                                                        <SecureImage src={customer.avatar || authPhotos[customer.uid]} alt={customer.name || 'User'} className="absolute inset-0 z-10 h-full w-full" showLoader={false} fallback={null} />
                                                        <AvatarFallback>{(customer.name || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {customer.name || 'Unnamed User'}
                                                    <div className="text-xs text-muted-foreground">
                                                        {customer.email}
                                                    </div>
                                                    {customer.phone && (
                                                        <div className="text-xs text-blue-600 font-medium">
                                                            {customer.phone}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{customer.type || 'N/A'}</Badge>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    {customer.registeredAt as string}
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <Badge
                                                        variant={
                                                            customer.status === 'active' ? 'secondary' :
                                                                customer.status === 'pending' ? 'outline' :
                                                                    'destructive'
                                                        }
                                                        className={customer.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''}
                                                    >
                                                        {
                                                            customer.status === 'active' ? 'Active' :
                                                                customer.status === 'pending' ? 'Pending' :
                                                                    'Suspended'
                                                        }
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                aria-haspopup="true"
                                                                size="icon"
                                                                variant="ghost"
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                                <span className="sr-only">สลับเมนู</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>การดำเนินการ</DropdownMenuLabel>
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/customers/${customer.uid}`}>ดูโปรไฟล์</Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/customers/${customer.uid}/edit`}>แก้ไขข้อมูล</Link>
                                                            </DropdownMenuItem>
                                                            {canManage && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                                                        ตั้งสิทธิ์
                                                                    </DropdownMenuLabel>
                                                                    {(['customer', 'lawyer', 'admin'] as const).map(r => (
                                                                        <DropdownMenuItem
                                                                            key={r}
                                                                            disabled={pendingUid === customer.uid}
                                                                            onSelect={() => handleSetRole(customer.uid, r)}
                                                                        >
                                                                            {r === 'customer' ? 'ลูกค้า' : r === 'lawyer' ? 'ทนายความ' : 'แอดมิน'}
                                                                        </DropdownMenuItem>
                                                                    ))}
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        className="text-destructive"
                                                                        disabled={pendingUid === customer.uid}
                                                                        onSelect={() => handleDeleteUser(customer.uid, customer.name)}
                                                                    >
                                                                        ลบบัญชีถาวร
                                                                    </DropdownMenuItem>
                                                                </>
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

                    </Tabs>
                </CardContent>
                <CardFooter>
                    <DataTablePagination
                        page={page}
                        shown={visibleCustomers.length}
                        hasNext={hasNext}
                        hasPrevious={hasPrevious}
                        loading={loading}
                        onNext={next}
                        onPrevious={previous}
                    />
                </CardFooter>
            </Card>
        </main >
    )
}
