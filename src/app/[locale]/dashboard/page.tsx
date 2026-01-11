
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
import { th, enUS, zhCN } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirebase } from '@/firebase';
import { getProblemTypeKey } from '@/lib/problem-types';
import { useTranslations, useLocale } from 'next-intl';

export default function DashboardPage() {
    const router = useRouter();
    const { auth, firestore } = useFirebase();
    const { user, isUserLoading } = useUser();
    const t = useTranslations('Dashboard');
    const tHelp = useTranslations('Help');
    const locale = useLocale();

    const [cases, setCases] = useState<Case[]>([]);
    const [appointments, setAppointments] = useState<UpcomingAppointment[]>([]);
    const [tickets, setTickets] = useState<ReportedTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const dateLocale = locale === 'th' ? th : locale === 'zh' ? zhCN : enUS;

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

    const activeCases = cases.filter(c => c.status === 'active' || c.status === 'pending_payment' || c.status === 'rejected' || c.status === 'approved' || c.status === 'pending');
    const closedCases = cases.filter(c => c.status === 'closed');

    // Filter appointments (show all, including pending_payment)
    const visibleAppointments = appointments;

    const caseColors: { [key: string]: string } = {
        blue: 'border-l-4 border-blue-500',
        yellow: 'border-l-4 border-yellow-500',
        gray: 'border-l-4 border-gray-400',
        red: 'border-l-4 border-red-500',
    };

    const quickServices = [
        { icon: <Search />, text: t('findLawyer'), href: `/${locale}/lawyers` },
        { icon: <MessageSquare />, text: t('bookConsultation'), href: `/${locale}/lawyers` },
        { icon: <User />, text: t('managePersonalInfo'), href: `/${locale}/account` },
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
                                    {t('upcomingAppointments')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {visibleAppointments.length > 0 ? (
                                    <div className="space-y-4">
                                        {visibleAppointments.map((appt) => (
                                            <div key={appt.id} className="flex items-center justify-between p-4 rounded-3xl bg-green-50 border border-green-200">
                                                <div>
                                                    <p className="font-semibold text-green-900 flex items-center gap-2">
                                                        {appt.description || t('defaultAppointmentDescription')}
                                                        {appt.status === 'pending' && (
                                                            <Badge variant="outline" className="text-yellow-700 border-yellow-600 bg-yellow-50">
                                                                รอทนายตอบรับ
                                                            </Badge>
                                                        )}
                                                        {appt.status === 'pending_payment' && (
                                                            <Badge variant="outline" className="text-red-700 border-red-600 bg-red-50">
                                                                รอชำระเงิน
                                                            </Badge>
                                                        )}
                                                    </p>
                                                    <p className="text-sm text-green-700">
                                                        {t('appointmentWith')}: {appt.lawyer.name} | {t('date')}: {format(appt.date, 'dd MMM yyyy', { locale: dateLocale })} | {t('time')}: {appt.time}
                                                    </p>
                                                </div>
                                                <Button asChild size="sm" className="bg-foreground hover:bg-foreground/90 text-background rounded-full">
                                                    <Link href={`/${locale}/appointment/${appt.id}`}>{t('viewDetails')}</Link>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Calendar className="mx-auto h-10 w-10 mb-2" />
                                        <p>{t('noAppointments')}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Ongoing Cases */}
                        <Card className="rounded-3xl shadow-sm border-none">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 font-bold">
                                    <Briefcase className="w-5 h-5" />
                                    {t('ongoingCases')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {activeCases.length > 0 ? (
                                    <div className="space-y-3">
                                        {activeCases
                                            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                                            .map((caseItem) => (
                                                <Link href={caseItem.status === 'rejected' ? '#' : `/${locale}/chat/${caseItem.id}?lawyerId=${caseItem.lawyer.id}`} key={caseItem.id} className={caseItem.status === 'rejected' ? 'cursor-default' : ''}>
                                                    <div className={`flex items-center justify-between p-4 rounded-3xl bg-card ${caseItem.status === 'rejected' ? caseColors['red'] : caseColors['blue']}`}>
                                                        <div>
                                                            <p className="font-semibold flex items-center gap-2 flex-wrap">
                                                                {caseItem.title || t('defaultCaseTitle')}
                                                                <span className="font-mono text-xs text-muted-foreground">({caseItem.id})</span>
                                                                {caseItem.status === 'pending_payment' && (
                                                                    <Badge variant="outline" className="text-yellow-600 border-yellow-600 bg-yellow-50">
                                                                        รอตรวจสอบสลิป
                                                                    </Badge>
                                                                )}
                                                                {caseItem.status === 'rejected' && (
                                                                    <Badge variant="destructive">
                                                                        คำขอถูกปฏิเสธ
                                                                    </Badge>
                                                                )}
                                                            </p>
                                                            {caseItem.status === 'rejected' && caseItem.rejectReason && (
                                                                <p className="text-sm text-red-600 mt-1">
                                                                    เหตุผล: {caseItem.rejectReason}
                                                                </p>
                                                            )}
                                                            <p className="text-sm text-muted-foreground">{caseItem.lastMessage}</p>
                                                        </div>
                                                        {caseItem.status !== 'rejected' && (
                                                            <Button size="sm" className="bg-foreground hover:bg-foreground/90 text-background rounded-full">{t('viewDetails')}</Button>
                                                        )}
                                                    </div>
                                                </Link>
                                            ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Briefcase className="mx-auto h-10 w-10 mb-2" />
                                        <p>{t('noActiveCases') || "ยังไม่มีรายการปรึกษา"}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Closed Cases */}
                        {closedCases.length > 0 && (
                            <Card className="rounded-3xl shadow-sm border-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 font-bold">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        {t('closedCases')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {closedCases.map((caseItem) => (
                                            <Link href={`/${locale}/chat/${caseItem.id}?lawyerId=${caseItem.lawyer.id}&status=closed`} key={caseItem.id}>
                                                <div className={`flex items-center justify-between p-4 rounded-3xl bg-gray-50 ${caseColors.gray}`}>
                                                    <div>
                                                        <p className="font-semibold">{caseItem.title || t('defaultCaseTitle')} <span className="font-mono text-xs text-muted-foreground">({caseItem.id})</span></p>
                                                        <p className="text-sm text-muted-foreground">{caseItem.lastMessage}</p>
                                                    </div>
                                                    <Badge variant="outline">{t('viewHistory')}</Badge>
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
                                <Link href={`/${locale}/account`} className="w-full">
                                    <Button variant="outline" className="w-full rounded-full">{t('manageAccount')}</Button>
                                </Link>
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl shadow-sm border-none">
                            <CardHeader>
                                <CardTitle className="font-bold">{t('quickServices')}</CardTitle>
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
                                        {t('reportedTickets')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {tickets.map((ticket) => {
                                            const problemTypeKey = getProblemTypeKey(ticket.problemType);
                                            const localizedProblemType = problemTypeKey ? tHelp(`problemTypes.${problemTypeKey}`) : ticket.problemType;

                                            return (
                                                <Link href={`/${locale}/support/${ticket.id}`} key={ticket.id}>
                                                    <div className={`flex items-center justify-between p-4 rounded-3xl border cursor-pointer transition-colors ${ticket.status === 'resolved' ? 'bg-green-50 border-green-200 hover:bg-green-100/50' : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100/50'}`}>
                                                        <div>
                                                            <p className={`font-semibold ${ticket.status === 'resolved' ? 'text-green-900' : 'text-yellow-900'}`}>
                                                                {ticket.caseTitle} <span className={`font-mono text-xs ${ticket.status === 'resolved' ? 'text-green-700' : 'text-yellow-700'}`}>({ticket.caseId})</span>
                                                            </p>
                                                            <p className={`text-sm ${ticket.status === 'resolved' ? 'text-green-800' : 'text-yellow-800'}`}>
                                                                {t('issueType')}: {localizedProblemType} | {t('sentAt')}: {format(ticket.reportedAt, 'dd MMM yyyy', { locale: dateLocale })}
                                                            </p>
                                                        </div>
                                                        {ticket.status === 'resolved' ? (
                                                            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">{t('resolved')}</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="border-yellow-600 text-yellow-700 bg-transparent">{t('pending')}</Badge>
                                                        )}
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="rounded-3xl shadow-sm border-none">
                            <CardHeader>
                                <CardTitle className="font-bold">{t('help')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Link href={`/${locale}/help`} className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                                    <HelpCircle className="mr-2" /> {t('helpCenter')}
                                </Link>
                                <Link href="#" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                                    <MessageSquare className="mr-2" /> {t('contactSupport')}
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
