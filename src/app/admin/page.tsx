
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  DollarSign,
  Gavel,
  Home,
  Landmark,
  Megaphone,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  Ticket,
  Users2,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { Badge } from '@/components/ui/badge';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { getAdminStats } from '@/lib/data';

export default function AdminDashboard() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState({
    totalUsers: 0,
    newUsers: 0,
    activeTicketsCount: 0,
    pendingLawyersCount: 0,
    approvedLawyersCount: 0,
    totalRevenue: 0
  });
  const [pendingLawyers, setPendingLawyers] = React.useState<any[]>([]);
  const [tickets, setTickets] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!firestore || !user) return;

    // Fetch user role
    const userDocRef = doc(firestore, "users", user.uid);
    getDoc(userDocRef).then(docSnap => {
      if (docSnap.exists()) {
        setUserRole(docSnap.data().role);
      }
    });

    // Fetch stats
    getAdminStats(firestore).then(setStats);

    // Fetch pending lawyers
    const lawyersRef = collection(firestore, 'lawyerProfiles');
    const qLawyers = query(lawyersRef, where('status', '==', 'pending'), limit(5));
    getDocs(qLawyers).then(snapshot => {
      setPendingLawyers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch open tickets
    const ticketsRef = collection(firestore, 'tickets');
    const qTickets = query(ticketsRef, where('status', '==', 'pending'), limit(5));
    getDocs(qTickets).then(snapshot => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

  }, [firestore]);


  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        {userRole === 'Super Admin' && (
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                รายได้รวม (จำลอง)
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">฿{stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                ยังไม่เปิดใช้งานระบบชำระเงิน
              </p>
            </CardContent>
          </Card>
        )}
        <Link href="/admin/customers" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="rounded-xl h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                ผู้ใช้งานทั้งหมด
              </CardTitle>
              <Users2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.newUsers} ในเดือนนี้
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/tickets" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="rounded-xl h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket ที่เปิดอยู่</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeTicketsCount}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeTicketsCount > 0 ? `${stats.activeTicketsCount} เรื่องรอการแก้ไข` : 'ไม่มีเรื่องค้าง'}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/lawyers?tab=pending" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="rounded-xl h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                ทนายรออนุมัติ
              </CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingLawyersCount}</div>
              <p className="text-xs text-muted-foreground">
                รอการตรวจสอบคุณสมบัติ
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/lawyers?tab=active" className="block transition-transform hover:scale-[1.02] active:scale-95">
          <Card className="rounded-xl h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                ทนายที่ Active
              </CardTitle>
              <Gavel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approvedLawyersCount}</div>
              <p className="text-xs text-muted-foreground">
                ทนายความพร้อมให้บริการ
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2 rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>ทนายความรอการอนุมัติ</CardTitle>
              <CardDescription>
                ตรวจสอบและอนุมัติใบสมัครทนายความใหม่
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/admin/lawyers?tab=pending">
                ดูทั้งหมด
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ทนายความ</TableHead>
                  <TableHead className="hidden xl:table-cell">
                    ความเชี่ยวชาญ
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">
                    สถานะ
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    วันที่สมัคร
                  </TableHead>
                  <TableHead>
                    <span className="sr-only">การดำเนินการ</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingLawyers.map(lawyer => (
                  <TableRow key={lawyer.id}>
                    <TableCell>
                      <div className="font-medium">{lawyer.name}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
                        {lawyer.userId}
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {lawyer.specialty.join(', ')}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <Badge className="text-xs" variant="outline">
                        รอตรวจสอบ
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {lawyer.joinedAt?.toDate().toLocaleDateString('th-TH') || 'N/A'}
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
                          <DropdownMenuItem asChild><Link href={`/admin/lawyers/${lawyer.id}`}>ดูใบสมัคร</Link></DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Ticket ช่วยเหลือล่าสุด</CardTitle>
            <CardDescription>
              ตอบกลับคำขอความช่วยเหลือจากลูกค้าและทนายความ
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8">
            {tickets.map(ticket => (
              <div key={ticket.id} className="flex items-center gap-4">
                <div className="grid gap-1">
                  <p className="text-sm font-medium leading-none">
                    {ticket.userId}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {ticket.id}: {ticket.problemType}
                  </p>
                </div>
                <Button asChild size="sm" className="ml-auto gap-1">
                  <Link href={`/admin/tickets/${ticket.id}`}>
                    ดู Ticket
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
