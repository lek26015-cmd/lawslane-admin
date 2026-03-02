
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ListFilter, Ticket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { useFirebase } from '@/firebase';
import { getAllTickets } from '@/lib/data';


export default function AdminTicketsPage() {
    const router = useRouter();
    const { firestore } = useFirebase();
    const [allTickets, setAllTickets] = React.useState<any[]>([]);
    const [filteredTickets, setFilteredTickets] = React.useState<any[]>([]);
    const [activeTab, setActiveTab] = React.useState('all');

    React.useEffect(() => {
        if (!firestore) return;
        getAllTickets(firestore).then(tickets => {
            setAllTickets(tickets);
            setFilteredTickets(tickets);
        });
    }, [firestore]);

    React.useEffect(() => {
        if (activeTab === 'all') {
            setFilteredTickets(allTickets);
        } else {
            setFilteredTickets(allTickets.filter(t => t.status === activeTab));
        }
    }, [activeTab, allTickets]);


    const statusBadges: { [key: string]: React.ReactNode } = {
        pending: <Badge variant="outline" className="border-yellow-600 text-yellow-700 bg-yellow-50">รอดำเนินการ</Badge>,
        resolved: <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">แก้ไขแล้ว</Badge>,
    }

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
                    <Tabs defaultValue="all" onValueChange={setActiveTab}>
                        <div className="flex items-center">
                            <TabsList>
                                <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
                                <TabsTrigger value="pending">รอดำเนินการ</TabsTrigger>
                                <TabsTrigger value="resolved">แก้ไขแล้ว</TabsTrigger>
                            </TabsList>
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
                                        <DropdownMenuLabel>กรองตามประเภทปัญหา</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuCheckboxItem checked>
                                            ทนายตอบช้า
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuCheckboxItem>ปัญหาทางเทคนิค</DropdownMenuCheckboxItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <TabsContent value={activeTab}>
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
                                    {filteredTickets.map(ticket => (
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
                                            <TableCell>{statusBadges[ticket.status]}</TableCell>
                                            <TableCell>{ticket.reportedAt}</TableCell>
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
                        </TabsContent>
                    </Tabs>
                </CardContent>
                <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        แสดง <strong>{filteredTickets.length}</strong> จาก <strong>{allTickets.length}</strong> รายการ
                    </div>
                </CardFooter>
            </Card>
        </main>
    )
}
