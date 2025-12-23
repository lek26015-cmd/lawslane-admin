
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Briefcase, FileText, Loader2, Search, MessageSquare, Building, FileUp, HelpCircle, CheckCircle, User, Ticket } from 'lucide-react';
import { getDashboardData } from '@/lib/data';
import type { Case, UpcomingAppointment, ReportedTicket } from '@/lib/types';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirebase } from '@/firebase';

export default function DashboardPage() {
    const router = useRouter();
    const { auth, firestore } = useFirebase();
    const { user, isUserLoading } = useUser();

    const [cases, setCases] = useState<Case[]>([]);
    const [appointments, setAppointments] = useState<UpcomingAppointment[]>([]);
    const [tickets, setTickets] = useState<ReportedTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isUserLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }
        if (!firestore) return;

        async function fetchData() {
            setIsLoading(true);
            try {
                const { cases, appointments, tickets } = await getDashboardData(firestore!, user!.uid);
                setCases(cases);
                setAppointments(appointments);
                setTickets(tickets);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                // Optionally set an error state here to show to the user
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [isUserLoading, user, router, firestore]);

    if (isUserLoading || isLoading || !user) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    const activeCases = cases.filter(c => c.status === 'active');
    const closedCases = cases.filter(c => c.status === 'closed');

    const caseColors: { [key: string]: string } = {
        blue: 'border-l-4 border-blue-500',
        yellow: 'border-l-4 border-yellow-500',
        gray: 'border-l-4 border-gray-400',
    };

    const quickServices = [
        { icon: <Search />, text: 'ค้นหาทนายความ', href: '/lawyers' },
        { icon: <MessageSquare />, text: 'นัดหมายปรึกษาทนาย', href: '/lawyers' },
        { icon: <User />, text: 'จัดการข้อมูลส่วนบุคคล', href: '/account' },
    ];

    return (
        <div className="bg-gray-100/50">
            <div className="container mx-auto px-4 md:px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Upcoming Appointments */}
                        <Card className="rounded-3xl shadow-sm border-none">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 font-bold">
                                    <Calendar className="w-5 h-5" />
                                    นัดหมายที่กำลังจะมาถึง
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {appointments.length > 0 ? (
                                    <div className="space-y-4">
                                        {appointments.map((appt) => (
                                            <div key={appt.id} className="flex items-center justify-between p-4 rounded-3xl bg-green-50 border border-green-200">
                                                <div>
                                                    <p className="font-semibold text-green-900">{appt.description}</p>
                                                    <p className="text-sm text-green-700">
                                                        กับ: {appt.lawyer.name} | วันที่: {format(appt.date, 'dd MMM yyyy', { locale: th })} | เวลา: {appt.time}
                                                    </p>
                                                </div>
                                                <Button asChild size="sm" className="bg-foreground hover:bg-foreground/90 text-background rounded-full">
                                                    <Link href={`/appointment/${appt.id}`}>ดูรายละเอียด</Link>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Calendar className="mx-auto h-10 w-10 mb-2" />
                                        <p>ยังไม่มีการนัดหมาย</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Ongoing Cases */}
                        {activeCases.length > 0 && (
                            <Card className="rounded-3xl shadow-sm border-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 font-bold">
                                        <Briefcase className="w-5 h-5" />
                                        งานที่กำลังดำเนินการ
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {activeCases.map((caseItem) => (
                                            <Link href={`/chat/${caseItem.id}?lawyerId=${caseItem.lawyer.id}`} key={caseItem.id}>
                                                <div className={`flex items-center justify-between p-4 rounded-3xl bg-card ${caseColors['blue']}`}>
                                                    <div>
                                                        <p className="font-semibold">{caseItem.title} <span className="font-mono text-xs text-muted-foreground">({caseItem.id})</span></p>
                                                        <p className="text-sm text-muted-foreground">{caseItem.lastMessage}</p>
                                                    </div>
                                                    <Button size="sm" className="bg-foreground hover:bg-foreground/90 text-background rounded-full">ดูรายละเอียด</Button>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Closed Cases */}
                        {closedCases.length > 0 && (
                            <Card className="rounded-3xl shadow-sm border-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 font-bold">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        คดีที่เสร็จสิ้น
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {closedCases.map((caseItem) => (
                                            <Link href={`/chat/${caseItem.id}?lawyerId=${caseItem.lawyer.id}&status=closed`} key={caseItem.id}>
                                                <div className={`flex items-center justify-between p-4 rounded-3xl bg-gray-50 ${caseColors.gray}`}>
                                                    <div>
                                                        <p className="font-semibold">{caseItem.title} <span className="font-mono text-xs text-muted-foreground">({caseItem.id})</span></p>
                                                        <p className="text-sm text-muted-foreground">{caseItem.lastMessage}</p>
                                                    </div>
                                                    <Badge variant="outline">ดูประวัติ</Badge>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}


                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="rounded-3xl shadow-sm border-none">
                            <CardContent className="pt-6 flex flex-col items-center text-center">
                                <Avatar className="w-20 h-20 mb-4">
                                    <AvatarImage src={user.photoURL || "https://picsum.photos/seed/user-avatar/100/100"} />
                                    <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <p className="font-semibold text-lg">{user.displayName || user.email}</p>
                                <p className="text-sm text-muted-foreground mb-4">{user.email}</p>
                                <Link href="/account" className="w-full">
                                    <Button variant="outline" className="w-full rounded-full">จัดการบัญชี / แก้ไขโปรไฟล์</Button>
                                </Link>
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl shadow-sm border-none">
                            <CardHeader>
                                <CardTitle className="font-bold">บริการด่วน</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {quickServices.map((service, index) => (
                                    <Link href={service.href} key={index} passHref>
                                        <Button variant="outline" className="w-full justify-start h-16 text-lg pl-6 rounded-full border-gray-200 bg-gray-50/50 hover:bg-gray-100 hover:text-primary shadow-sm hover:shadow-md transition-all">
                                            {service.icon} <span className="ml-2">{service.text}</span>
                                        </Button>
                                    </Link>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Reported Tickets */}
                        {tickets.length > 0 && (
                            <Card className="rounded-3xl shadow-sm border-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 font-bold">
                                        <Ticket className="w-5 h-5 text-destructive" />
                                        Ticket ปัญหาที่รายงาน
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {tickets.map((ticket) => (
                                            <Link href={`/support/${ticket.id}`} key={ticket.id}>
                                                <div className={`flex items-center justify-between p-4 rounded-3xl border cursor-pointer transition-colors ${ticket.status === 'resolved' ? 'bg-green-50 border-green-200 hover:bg-green-100/50' : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100/50'}`}>
                                                    <div>
                                                        <p className={`font-semibold ${ticket.status === 'resolved' ? 'text-green-900' : 'text-yellow-900'}`}>
                                                            {ticket.caseTitle} <span className={`font-mono text-xs ${ticket.status === 'resolved' ? 'text-green-700' : 'text-yellow-700'}`}>({ticket.caseId})</span>
                                                        </p>
                                                        <p className={`text-sm ${ticket.status === 'resolved' ? 'text-green-800' : 'text-yellow-800'}`}>
                                                            ประเภทปัญหา: {ticket.problemType} | ส่งเมื่อ: {format(ticket.reportedAt, 'dd MMM yyyy', { locale: th })}
                                                        </p>
                                                    </div>
                                                    {ticket.status === 'resolved' ? (
                                                        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">แก้ไขแล้ว</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="border-yellow-600 text-yellow-700 bg-transparent">กำลังตรวจสอบ</Badge>
                                                    )}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="rounded-3xl shadow-sm border-none">
                            <CardHeader>
                                <CardTitle className="font-bold">ช่วยเหลือ</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Link href="/help" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                                    <HelpCircle className="mr-2" /> ศูนย์ช่วยเหลือ / FAQ
                                </Link>
                                <Link href="#" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                                    <MessageSquare className="mr-2" /> ติดต่อฝ่ายสนับสนุนลูกค้า
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
