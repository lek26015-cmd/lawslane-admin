

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    File,
    ListFilter,
    MoreHorizontal,
    PlusCircle,
    ChevronsLeft,
    ChevronsRight,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { useFirebase } from '@/firebase';
import { getAllUsers } from '@/lib/data';
import type { UserProfile } from '@/lib/types';


export default function AdminCustomersPage() {
    const router = useRouter();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [allCustomers, setAllCustomers] = React.useState<UserProfile[]>([]);
    const [filteredCustomers, setFilteredCustomers] = React.useState<UserProfile[]>([]);
    const [activeTab, setActiveTab] = React.useState('all');
    const [typeFilters, setTypeFilters] = React.useState({
        individual: true,
        sme: true,
    });

    React.useEffect(() => {
        if (!firestore) return;
        getAllUsers(firestore)
            .then(setAllCustomers)
            .catch(error => {
                console.error("Error fetching customers:", error);
                toast({
                    variant: "destructive",
                    title: "เกิดข้อผิดพลาด",
                    description: "ไม่สามารถดึงข้อมูลลูกค้าได้ (อาจไม่มีสิทธิ์)"
                });
            });
    }, [firestore]);


    React.useEffect(() => {
        let customers = allCustomers;

        if (activeTab !== 'all') {
            // @ts-ignore
            customers = customers.filter(c => c.status === activeTab);
        }

        customers = customers.filter(c => {
            if (c.type === 'บุคคลทั่วไป' && typeFilters.individual) return true;
            if (c.type === 'SME' && typeFilters.sme) return true;
            return false;
        });

        setFilteredCustomers(customers);
    }, [activeTab, typeFilters, allCustomers]);

    const handleExport = () => {
        const headers = ["ID", "Name", "Email", "Type", "RegisteredAt", "Status"];
        const csvRows = [
            headers.join(','),
            ...filteredCustomers.map(c =>
                [c.uid, `"${c.name}"`, c.email, c.type, c.registeredAt, c.status].join(',')
            )
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'customers-export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>จัดการข้อมูลลูกค้า</CardTitle>
                    <CardDescription>
                        ดู, ค้นหา, และจัดการบัญชีผู้ใช้งานทั้งหมดในระบบ
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="all" onValueChange={setActiveTab}>
                        <div className="flex items-center">
                            <TabsList>
                                <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
                                <TabsTrigger value="active">Active</TabsTrigger>
                                <TabsTrigger value="suspended">Suspended</TabsTrigger>
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
                                    <Link href="/admin/customers/new">
                                        <PlusCircle className="h-3.5 w-3.5" />
                                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                            เพิ่มลูกค้า
                                        </span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                        <div className="mt-4">
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
                                    {filteredCustomers.map(customer => (
                                        <TableRow
                                            key={customer.uid}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => router.push(`/admin/customers/${customer.uid}`)}
                                        >
                                            <TableCell className="hidden sm:table-cell">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={customer.avatar} alt={customer.name} />
                                                    <AvatarFallback>{customer.name.slice(0, 2)}</AvatarFallback>
                                                </Avatar>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {customer.name}
                                                <div className="text-xs text-muted-foreground md:hidden">
                                                    {customer.email}
                                                </div>
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
                                                            <Link href={`/admin/customers/${customer.uid}`}>ดูโปรไฟล์</Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/admin/customers/${customer.uid}/edit`}>แก้ไขข้อมูล</Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive">
                                                            ระงับบัญชี
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                    </Tabs>
                </CardContent>
                <CardFooter>
                    <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                        <div>แสดง <strong>{filteredCustomers.length}</strong> จาก <strong>{allCustomers.length}</strong> รายการ</div>
                    </div>
                </CardFooter>
            </Card>
        </main >
    )
}
