'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Users, ShieldCheck, Mail, Inbox, History, RefreshCcw } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { getAllUsers, getAllLawyers } from '@/lib/data';
import { sendAdminEmail } from '@/app/actions/admin-email';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function AdminEmailPage() {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();

    const [recipientType, setRecipientType] = useState('specific');
    const [specificEmail, setSpecificEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [recipientCount, setRecipientCount] = useState(0);

    const [inboxMessages, setInboxMessages] = useState<any[]>([]);
    const [sentMessages, setSentMessages] = useState<any[]>([]);
    const [isLoadingInbox, setIsLoadingInbox] = useState(false);
    const [isLoadingSent, setIsLoadingSent] = useState(false);

    // Effect to calculate potential recipient count
    useEffect(() => {
        async function fetchCount() {
            if (!firestore) return;
            setIsLoading(true);
            try {
                if (recipientType === 'all_users') {
                    const users = await getAllUsers(firestore);
                    setRecipientCount(users.length);
                } else if (recipientType === 'all_lawyers') {
                    const lawyers = await getAllLawyers(firestore);
                    setRecipientCount(lawyers.length);
                } else {
                    setRecipientCount(1);
                }
            } catch (error) {
                console.error("Error fetching count:", error);
            } finally {
                setIsLoading(false);
            }
        }

        if (recipientType !== 'specific') {
            fetchCount();
        } else {
            setRecipientCount(1);
        }
    }, [recipientType, firestore]);

    const fetchInbox = async () => {
        if (!firestore) return;
        setIsLoadingInbox(true);
        try {
            const q = query(collection(firestore, 'smeRequests'), orderBy('createdAt', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setInboxMessages(messages);
        } catch (error) {
            console.error("Error fetching inbox:", error);
            toast({ variant: 'destructive', title: 'โหลดข้อมูลไม่สำเร็จ', description: 'ไม่สามารถดึงข้อมูลกล่องข้อความได้' });
        } finally {
            setIsLoadingInbox(false);
        }
    };

    const getServiceLabel = (type: string) => {
        switch (type) {
            case 'contract': return 'ร่างและตรวจสัญญาธุรกิจ';
            case 'advisor': return 'ที่ปรึกษากฎหมายประจำบริษัท';
            case 'registration': return 'จดทะเบียนและใบอนุญาต';
            case 'dispute': return 'ระงับข้อพิพาททางธุรกิจ';
            case 'other': return 'อื่นๆ';
            default: return type;
        }
    };

    const fetchSent = async () => {
        if (!firestore) return;
        setIsLoadingSent(true);
        try {
            const q = query(collection(firestore, 'email_logs'), orderBy('sentAt', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSentMessages(messages);
        } catch (error) {
            console.error("Error fetching sent logs:", error);
            // toast({ variant: 'destructive', title: 'โหลดข้อมูลไม่สำเร็จ', description: 'ไม่สามารถดึงประวัติการส่งได้' });
        } finally {
            setIsLoadingSent(false);
        }
    };

    useEffect(() => {
        fetchInbox();
        fetchSent();
    }, [firestore]);

    const handleSend = async () => {
        if (!subject || !body) {
            toast({ variant: 'destructive', title: 'กรุณากรอกข้อมูลให้ครบ', description: 'ต้องระบุหัวข้อและเนื้อหาอีเมล' });
            return;
        }

        if (recipientType === 'specific' && !specificEmail) {
            toast({ variant: 'destructive', title: 'กรุณาระบุอีเมล', description: 'ต้องระบุอีเมลผู้รับ' });
            return;
        }

        setIsSending(true);
        try {
            let recipients: string[] = [];
            let recipientLabel = '';

            if (recipientType === 'specific') {
                recipients = [specificEmail];
                recipientLabel = specificEmail;
            } else if (recipientType === 'all_users') {
                if (!firestore) throw new Error("Firestore not initialized");
                const users = await getAllUsers(firestore);
                recipients = users.map(u => u.email).filter(email => email);
                recipientLabel = 'ผู้ใช้ทั้งหมด (ลูกค้า)';
            } else if (recipientType === 'all_lawyers') {
                if (!firestore) throw new Error("Firestore not initialized");
                const lawyers = await getAllLawyers(firestore);
                recipients = lawyers.map(l => l.email).filter(email => email);
                recipientLabel = 'ทนายความทั้งหมด';
            }

            if (recipients.length === 0) {
                toast({ variant: 'destructive', title: 'ไม่พบผู้รับ', description: 'ไม่มีอีเมลในกลุ่มที่เลือก' });
                setIsSending(false);
                return;
            }

            const result = await sendAdminEmail(recipients, subject, body);

            if (result.success) {
                // Log to Firestore
                if (firestore && user) {
                    await addDoc(collection(firestore, 'email_logs'), {
                        subject,
                        body,
                        recipientType,
                        recipientLabel,
                        recipientCount: recipients.length,
                        sentBy: user.email,
                        sentAt: serverTimestamp(),
                        status: 'success'
                    });
                    fetchSent(); // Refresh sent list
                }

                toast({
                    title: 'ส่งอีเมลสำเร็จ',
                    description: `ส่งอีเมลไปยัง ${recipients.length} รายชื่อเรียบร้อยแล้ว`,
                });
                // Reset form
                setSubject('');
                setBody('');
                if (recipientType === 'specific') setSpecificEmail('');
            } else {
                throw new Error(result.error || 'Unknown error');
            }

        } catch (error: any) {
            console.error("Failed to send email:", error);
            toast({
                variant: 'destructive',
                title: 'ส่งอีเมลไม่สำเร็จ',
                description: error.message || 'เกิดข้อผิดพลาดในการส่งอีเมล',
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="mx-auto grid w-full max-w-5xl gap-2">
                <h1 className="text-3xl font-semibold">ระบบอีเมล</h1>
                <p className="text-muted-foreground">จัดการการสื่อสาร รับข้อความจากลูกค้า และส่งประกาศต่างๆ</p>
            </div>
            <div className="mx-auto grid w-full max-w-5xl">
                <Tabs defaultValue="inbox" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-8">
                        <TabsTrigger value="inbox" className="flex items-center gap-2">
                            <Inbox className="w-4 h-4" /> กล่องข้อความเข้า
                        </TabsTrigger>
                        <TabsTrigger value="compose" className="flex items-center gap-2">
                            <Mail className="w-4 h-4" /> เขียนอีเมลใหม่
                        </TabsTrigger>
                        <TabsTrigger value="sent" className="flex items-center gap-2">
                            <History className="w-4 h-4" /> ประวัติการส่ง
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="inbox">
                        <Card className="rounded-xl">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>ข้อความจากแบบฟอร์มติดต่อ</CardTitle>
                                    <CardDescription>รายการข้อความที่ส่งมาจากหน้า "ติดต่อเรา" หรือ SME</CardDescription>
                                </div>
                                <Button variant="outline" size="icon" onClick={fetchInbox} disabled={isLoadingInbox}>
                                    <RefreshCcw className={`w-4 h-4 ${isLoadingInbox ? 'animate-spin' : ''}`} />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {isLoadingInbox ? (
                                    <div className="text-center py-8">กำลังโหลด...</div>
                                ) : inboxMessages.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">ไม่มีข้อความใหม่</div>
                                ) : (
                                    <div className="space-y-4">
                                        {inboxMessages.map((msg) => (
                                            <div key={msg.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="font-semibold">{msg.name}</h4>
                                                        <p className="text-sm text-muted-foreground">{msg.email} • {msg.phone}</p>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'd MMM yyyy HH:mm', { locale: th }) : 'เมื่อสักครู่'}
                                                    </span>
                                                </div>
                                                <p className="text-sm bg-gray-100 p-3 rounded-md mt-2">
                                                    <span className="font-semibold">บริการที่สนใจ:</span> {getServiceLabel(msg.serviceType)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="compose">
                        <Card className="rounded-xl">
                            <CardHeader>
                                <CardTitle>เขียนอีเมลใหม่</CardTitle>
                                <CardDescription>
                                    ส่งอีเมลถึงผู้ใช้ในระบบ (ส่งจาก noreply@lawslane.com)
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6">
                                <div className="grid gap-3">
                                    <Label htmlFor="recipient-type">ส่งถึง</Label>
                                    <Select value={recipientType} onValueChange={setRecipientType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="เลือกกลุ่มผู้รับ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="specific">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4" /> ระบุอีเมลเฉพาะ
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="all_users">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4" /> ผู้ใช้ทั้งหมด (ลูกค้า)
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="all_lawyers">
                                                <div className="flex items-center gap-2">
                                                    <ShieldCheck className="w-4 h-4" /> ทนายความทั้งหมด
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {recipientType !== 'specific' && (
                                        <p className="text-sm text-muted-foreground">
                                            {isLoading ? 'กำลังคำนวณจำนวนผู้รับ...' : `จะส่งถึงประมาณ ${recipientCount} คน`}
                                        </p>
                                    )}
                                </div>

                                {recipientType === 'specific' && (
                                    <div className="grid gap-3">
                                        <Label htmlFor="email">อีเมลผู้รับ</Label>
                                        <Input
                                            id="email"
                                            placeholder="example@lawslane.com"
                                            value={specificEmail}
                                            onChange={(e) => setSpecificEmail(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="grid gap-3">
                                    <Label htmlFor="subject">หัวข้ออีเมล</Label>
                                    <Input
                                        id="subject"
                                        placeholder="ระบุหัวข้อเรื่อง..."
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                    />
                                </div>

                                <div className="grid gap-3">
                                    <Label htmlFor="body">เนื้อหา</Label>
                                    <Textarea
                                        id="body"
                                        placeholder="เขียนข้อความของคุณที่นี่..."
                                        className="min-h-[200px]"
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">รองรับการขึ้นบรรทัดใหม่ (Plain Text)</p>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end border-t px-6 py-4">
                                <Button onClick={handleSend} disabled={isSending || isLoading}>
                                    {isSending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังส่ง...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-4 w-4" /> ส่งอีเมล
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    <TabsContent value="sent">
                        <Card className="rounded-xl">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>ประวัติการส่งอีเมล</CardTitle>
                                    <CardDescription>รายการอีเมลที่ส่งออกจากระบบ Admin</CardDescription>
                                </div>
                                <Button variant="outline" size="icon" onClick={fetchSent} disabled={isLoadingSent}>
                                    <RefreshCcw className={`w-4 h-4 ${isLoadingSent ? 'animate-spin' : ''}`} />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {isLoadingSent ? (
                                    <div className="text-center py-8">กำลังโหลด...</div>
                                ) : sentMessages.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">ยังไม่มีประวัติการส่ง</div>
                                ) : (
                                    <div className="space-y-4">
                                        {sentMessages.map((msg) => (
                                            <div key={msg.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="font-semibold">{msg.subject}</h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            ส่งถึง: {msg.recipientLabel} ({msg.recipientCount} คน)
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs text-muted-foreground block">
                                                            {msg.sentAt?.toDate ? format(msg.sentAt.toDate(), 'd MMM yyyy HH:mm', { locale: th }) : 'เมื่อสักครู่'}
                                                        </span>
                                                        <span className="text-xs text-green-600 font-medium">ส่งสำเร็จ</span>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-600 line-clamp-2">{msg.body}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    );
}
