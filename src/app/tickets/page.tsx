
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ListFilter, Search, Ticket as TicketIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CopyButton } from '@/components/ui/copy-button';
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
import { EmptyState } from '@/components/ui/empty-state';
import { useFirebase } from '@/firebase';
import {
    collection,
    doc as fsDoc,
    documentId,
    getDoc,
    limit as fsLimit,
    orderBy,
    query,
    startAfter,
    where,
} from 'firebase/firestore';
import { ensureDate } from '@/lib/data';
import { useAdminList, type AdminListSource } from '@/hooks/use-admin-list';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { DataTablePagination } from '@/components/admin/DataTablePagination';
import { TableSkeleton } from '@/components/admin/TableSkeleton';

interface TicketRow {
    id: string;
    userId: string;
    problemType: string;
    caseId?: string;
    status: string;
    reportedAtLabel: string;
    clientName: string;
}

const PAGE_SIZE = 25;

export default function AdminTicketsPage() {
    const router = useRouter();
    const { firestore } = useFirebase();
    const [activeTab, setActiveTab] = React.useState('all');
    const [searchInput, setSearchInput] = React.useState('');
    const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
    const [rows, setRows] = React.useState<TicketRow[]>([]);
    const [namesLoading, setNamesLoading] = React.useState(false);

    const source: AdminListSource<Omit<TicketRow, 'clientName'>> = React.useMemo(
        () => ({
            kind: 'firestore-client',
            buildQuery: (cursor, pageSize) => {
                if (!firestore) return null;
                const ticketsRef = collection(firestore, 'tickets');

                // ค้นหา+filter สถานะพร้อมกันไม่ได้ในคำสั่งเดียว (ต้องมี composite index แยก
                // ต่างหาก) — เมื่อมีคำค้นหา จึงตัด where('status',...) ออกจาก query แล้วไป
                // กรองสถานะต่อในเครื่องจากผลลัพธ์หน้านั้น (ดูตัวแปร visibleRows ด้านล่าง)
                if (debouncedSearch) {
                    const constraints = [
                        where('problemType', '>=', debouncedSearch),
                        where('problemType', '<=', debouncedSearch + ''),
                        orderBy('problemType'),
                        orderBy(documentId()),
                        ...(cursor ? [startAfter(cursor)] : []),
                        fsLimit(pageSize),
                    ];
                    return query(ticketsRef, ...constraints);
                }

                const constraints = [
                    ...(activeTab !== 'all' ? [where('status', '==', activeTab)] : []),
                    orderBy('reportedAt', 'desc'),
                    orderBy(documentId()),
                    ...(cursor ? [startAfter(cursor)] : []),
                    fsLimit(pageSize),
                ];
                return query(ticketsRef, ...constraints);
            },
            mapDoc: (docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    userId: data.userId ?? '',
                    problemType: data.problemType ?? '',
                    caseId: data.caseId,
                    status: data.status ?? '',
                    reportedAtLabel: data.reportedAt ? ensureDate(data.reportedAt).toLocaleDateString('th-TH') : 'N/A',
                };
            },
        }),
        [firestore, activeTab, debouncedSearch]
    );

    const { data, loading, error, hasNext, hasPrevious, page, next, previous } = useAdminList({
        source,
        pageSize: PAGE_SIZE,
        resetKey: `${activeTab}|${debouncedSearch}`,
    });

    // แถวที่จะโชว์จริง: ถ้ากำลังค้นหาอยู่ (query ตัด where(status) ออกไปแล้ว) กรองสถานะ
    // เพิ่มในเครื่องจากหน้าที่ได้มา — ไม่งั้น query เอง filter ให้ครบอยู่แล้ว
    const visibleRows = React.useMemo(() => {
        if (debouncedSearch && activeTab !== 'all') {
            return data.filter((t) => t.status === activeTab);
        }
        return data;
    }, [data, debouncedSearch, activeTab]);

    // ผูกชื่อลูกค้าเข้ากับ ticket ของหน้านี้ (join แยกเพราะ clientName ไม่ได้เก็บบน ticket doc เอง)
    React.useEffect(() => {
        if (!firestore || visibleRows.length === 0) {
            setRows(visibleRows.map((t) => ({ ...t, clientName: '' })));
            return;
        }
        let cancelled = false;
        setNamesLoading(true);
        const userIds = Array.from(new Set(visibleRows.map((t) => t.userId).filter(Boolean)));
        Promise.all(
            userIds.map((uid) =>
                getDoc(fsDoc(firestore, 'users', uid)).then((snap) => [uid, snap.exists() ? snap.data().name : undefined] as const)
            )
        )
            .then((entries) => {
                if (cancelled) return;
                const nameByUid = new Map(entries);
                setRows(visibleRows.map((t) => ({ ...t, clientName: nameByUid.get(t.userId) || t.userId })));
            })
            .finally(() => {
                if (!cancelled) setNamesLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [firestore, visibleRows]);

    const statusBadges: { [key: string]: React.ReactNode } = {
        pending: <Badge variant="outline" className="border-yellow-600 text-yellow-700 bg-yellow-50">รอดำเนินการ</Badge>,
        resolved: <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">แก้ไขแล้ว</Badge>,
    };

    const isLoading = loading || namesLoading;

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>Ticket ช่วยเหลือ</CardTitle>
                    <CardDescription>
                        จัดการและตอบกลับคำร้องขอความช่วยเหลือจากผู้ใช้งาน
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <div className="flex flex-wrap items-center gap-2">
                            <TabsList>
                                <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
                                <TabsTrigger value="pending">รอดำเนินการ</TabsTrigger>
                                <TabsTrigger value="resolved">แก้ไขแล้ว</TabsTrigger>
                            </TabsList>
                            <div className="relative ml-auto w-full max-w-[220px]">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="ค้นหาหัวข้อปัญหา..."
                                    className="pl-8 h-8"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
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
                                        <DropdownMenuLabel>กรองตามสถานะ</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuCheckboxItem checked disabled>
                                            ใช้แท็บด้านบนกรองสถานะ
                                        </DropdownMenuCheckboxItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <div className="mt-4">
                            {isLoading ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Ticket ID</TableHead>
                                            <TableHead>หัวข้อปัญหา</TableHead>
                                            <TableHead>ผู้แจ้ง</TableHead>
                                            <TableHead>สถานะ</TableHead>
                                            <TableHead>วันที่แจ้ง</TableHead>
                                            <TableHead><span className="sr-only">Actions</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableSkeleton rows={8} columns={6} />
                                </Table>
                            ) : rows.length === 0 ? (
                                <EmptyState
                                    icon={TicketIcon}
                                    title={debouncedSearch ? `ไม่พบ Ticket สำหรับ "${debouncedSearch}"` : 'ยังไม่มี Ticket ในระบบ'}
                                    description={debouncedSearch ? 'ลองล้างคำค้นหาแล้วค้นหาใหม่' : 'Ticket ใหม่จากผู้ใช้งานจะแสดงที่นี่'}
                                />
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Ticket ID</TableHead>
                                            <TableHead>หัวข้อปัญหา</TableHead>
                                            <TableHead>ผู้แจ้ง</TableHead>
                                            <TableHead>สถานะ</TableHead>
                                            <TableHead>วันที่แจ้ง</TableHead>
                                            <TableHead>
                                                <span className="sr-only">Actions</span>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map(ticket => (
                                            <TableRow
                                                key={ticket.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => router.push(`/tickets/${ticket.id}`)}
                                            >
                                                <TableCell className="font-mono flex items-center gap-2">
                                                    {ticket.id}
                                                    <CopyButton value={ticket.id} className="h-4 w-4" />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{ticket.problemType}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                        เคส: {ticket.caseId || 'N/A'}
                                                        {ticket.caseId && <CopyButton value={ticket.caseId} className="h-3 w-3" />}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{ticket.clientName}</TableCell>
                                                <TableCell>{statusBadges[ticket.status] ?? ticket.status}</TableCell>
                                                <TableCell>{ticket.reportedAtLabel}</TableCell>
                                                <TableCell>
                                                    <Button asChild variant="outline" size="sm">
                                                        <Link href={`/tickets/${ticket.id}`}>
                                                            ดูรายละเอียด
                                                        </Link>
                                                    </Button>
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
                        shown={rows.length}
                        hasNext={hasNext}
                        hasPrevious={hasPrevious}
                        loading={loading}
                        onNext={next}
                        onPrevious={previous}
                    />
                </CardFooter>
            </Card>
        </main>
    );
}
