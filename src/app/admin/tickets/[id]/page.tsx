
'use client';

import React, { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Ticket, Upload, ChevronLeft, User, Briefcase, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SupportChatBox } from '@/components/chat/support-chat-box';
import { Separator } from '@/components/ui/separator';
import { useFirebase } from '@/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, onSnapshot } from 'firebase/firestore';

const mockTickets = [
    {
        id: "TICKET-5891A",
        caseId: "case-001",
        clientName: "สมหญิง ใจดี",
        lawyerName: "นางสาวสมศรี ยุติธรรม",
        problemType: "ทนายตอบช้า",
        status: "pending",
        reportedAt: "2024-07-28"
    },
    {
        id: "TICKET-5891B",
        caseId: "case-002",
        clientName: "นายสมชาย กฎหมายดี",
        lawyerName: "ลูกค้า",
        problemType: "ไม่สามารถอัปโหลดไฟล์ได้",
        status: "pending",
        reportedAt: "2024-07-27"
    },
    {
        id: "TICKET-5890C",
        caseId: "case-003",
        clientName: "บริษัท เติบโต จำกัด",
        lawyerName: "นายวิชัย ชนะคดี",
        problemType: "ปัญหาการชำระเงิน",
        status: "resolved",
        reportedAt: "2024-07-25"
    }
]

function AdminTicketDetailPageContent() {
    const params = useParams();
    const router = useRouter();
    const ticketId = params.id as string;

    const [ticket, setTicket] = React.useState<any | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const { toast } = useToast();
    const { firestore } = useFirebase();

    React.useEffect(() => {
        if (!firestore || !ticketId) return;

        const ticketRef = doc(firestore, 'tickets', ticketId);
        const unsubscribe = onSnapshot(ticketRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                setTicket({
                    id: docSnap.id,
                    ...data,
                    reportedAt: data.reportedAt ? data.reportedAt.toDate() : new Date(),
                    // Ensure required fields for UI
                    clientName: data.clientName || 'Unknown',
                    problemType: data.problemType || 'General',
                    caseId: data.caseId || 'N/A'
                });
            } else {
                setTicket(null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching ticket:", error);
            toast({
                title: "Error",
                description: "Failed to fetch ticket details",
                variant: "destructive"
            });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, ticketId, toast]);

    const handleResolveTicket = async () => {
        if (!ticket || !firestore) return;
        try {
            const docRef = doc(firestore, 'tickets', ticket.id);
            await updateDoc(docRef, { status: 'resolved' });

            // Notify User
            await addDoc(collection(firestore, 'notifications'), {
                type: 'ticket_resolved',
                title: 'Ticket ของคุณได้รับการแก้ไขแล้ว',
                message: `Ticket ${ticket.id} (${ticket.problemType}) ได้รับการตรวจสอบและแก้ไขแล้ว`,
                createdAt: serverTimestamp(),
                read: false,
                recipient: ticket.userId,
                link: `/help`, // Or a specific ticket detail page for users if it exists
                relatedId: ticket.id
            });

            // No need to setTicket manually as onSnapshot will handle it
            toast({
                title: "ดำเนินการสำเร็จ",
                description: `Ticket ${ticket.id} ถูกเปลี่ยนสถานะเป็น 'แก้ไขแล้ว'`,
            });
        } catch (error) {
            console.error("Error updating ticket:", error);
            toast({
                title: "Error",
                description: "Failed to update ticket status",
                variant: "destructive"
            });
        }
    };

    const statusBadges: { [key: string]: React.ReactNode } = {
        pending: <Badge variant="outline" className="border-yellow-600 text-yellow-700 bg-yellow-50">รอดำเนินการ</Badge>,
        resolved: <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">แก้ไขแล้ว</Badge>,
    }

    if (isLoading) {
        return <div>Loading ticket details...</div>
    }

    if (!ticket) {
        return <div>Ticket not found.</div>
    }

    const isResolved = ticket.status === 'resolved';
    const reportedTicket = {
        ...ticket,
        lawyerId: 'lawyer-123', // Mock ID
        caseTitle: `เคส ${ticket.caseId}`,
        status: ticket.status as 'pending' | 'resolved',
        // reportedAt is already a Date object
    }
    // Correction: In the onSnapshot above, I formatted reportedAt to string.
    // But SupportChatBox might need the original data?
    // Let's look at SupportChatBox again. It uses ticket.id and ticket.caseTitle.
    // It doesn't seem to use reportedAt.
    // However, to satisfy TypeScript, we need to match the type.
    // Let's just cast it or ensure it's correct.
    // Ideally, I should store the raw data in state and format only for display.
    // But to minimize changes, I'll just leave it as is if it works, or fix if it breaks.
    // The previous code had: reportedAt: new Date(ticket.reportedAt)
    // If ticket.reportedAt is "20/07/2567", new Date() might fail.
    // Let's check the previous code again.
    // Previous code:
    // if (data.reportedAt?.toDate) { reportedAtStr = ... }
    // setTicket({ ... reportedAt: reportedAtStr ... })
    // const reportedTicket = { ... reportedAt: new Date(ticket.reportedAt) }
    // This looks risky if the string is Thai format.
    // But since I'm rewriting, I can improve this.

    return (
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
            <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
                <div className="flex items-center gap-4">
                    <Link href="/admin/tickets">
                        <Button variant="outline" size="icon" className="h-7 w-7">
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">กลับ</span>
                        </Button>
                    </Link>
                    <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                        Ticket: {ticket.id}
                    </h1>
                    <div className="ml-auto">
                        {statusBadges[ticket.status]}
                    </div>
                </div>
                <SupportChatBox ticket={reportedTicket} isDisabled={isResolved} isAdmin={true} />
            </div>

            <div className="space-y-6">
                <Card className="rounded-xl">
                    <CardHeader>
                        <CardTitle>สรุปข้อมูล</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">หัวข้อปัญหา:</span>
                            <span className="font-semibold">{ticket.problemType}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">วันที่แจ้ง:</span>
                            <span>{ticket.reportedAt.toLocaleDateString('th-TH')}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-2"><User /> ผู้แจ้งปัญหา</span>
                            <Link href={`/admin/customers/cus_001`} className="font-semibold text-primary hover:underline">{ticket.clientName}</Link>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-2"><Briefcase /> เคสที่เกี่ยวข้อง</span>
                            <span className="font-mono">{ticket.caseId}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-xl">
                    <CardHeader>
                        <CardTitle>การดำเนินการ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isResolved ? (
                            <div className="text-center p-4 bg-green-50 rounded-md border border-green-200">
                                <CheckCircle className="mx-auto w-8 h-8 text-green-600 mb-2" />
                                <p className="font-semibold text-green-800">Ticket นี้ได้รับการแก้ไขแล้ว</p>
                            </div>
                        ) : (
                            <Button className="w-full" onClick={handleResolveTicket}>
                                <CheckCircle className="mr-2" />
                                Mark as Resolved
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    )
}


export default function AdminTicketDetailPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AdminTicketDetailPageContent />
        </Suspense>
    )
}
