'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirebase } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/logo';
import { ArrowLeft, DollarSign, TrendingUp, Clock, Loader2, Wallet, History, Briefcase, AlertCircle, Menu, X } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import Link from 'next/link';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { notifyAdmins } from '@/app/actions/admin-notifications';

type Transaction = {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'revenue' | 'fee';
    status: 'completed' | 'pending';
    clientName: string;
    rawDate: Date;
};

type Withdrawal = {
    id: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: any;
    bankName: string;
    accountNumber: string;
};

export default function LawyerFinancialsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { firestore } = useFirebase();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalIncome: 0,
        pendingIncome: 0,
        incomeThisMonth: 0,
        withdrawnAmount: 0,
        availableBalance: 0
    });

    // Withdrawal Form State
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchFinancials = useCallback(async () => {
        if (!firestore || !user) return;
        setIsLoading(true);

        try {
            const appointmentsRef = collection(firestore, 'appointments');
            const chatsRef = collection(firestore, 'chats');
            const withdrawalsRef = collection(firestore, 'withdrawals');

            // Fetch appointments for this lawyer
            const appQuery = query(appointmentsRef, where('lawyerId', '==', user.uid));
            const chatQuery = query(chatsRef, where('participants', 'array-contains', user.uid));
            const withdrawQuery = query(withdrawalsRef, where('lawyerId', '==', user.uid));

            const [appSnapshot, chatSnapshot, withdrawSnapshot] = await Promise.all([
                getDocs(appQuery),
                getDocs(chatQuery),
                getDocs(withdrawQuery)
            ]);

            const allTransactions: Transaction[] = [];
            let total = 0;
            let pending = 0;
            let thisMonth = 0;
            const now = new Date();

            // Helper to fetch user name
            const getUserName = async (uid: string) => {
                try {
                    if (!uid) return 'Unknown User';
                    const userDoc = await getDoc(doc(firestore, 'users', uid));
                    if (userDoc.exists()) return userDoc.data().name;
                    return 'Unknown User';
                } catch (e) { return 'Unknown User'; }
            };

            // Fetch lawyer's pricing (defaults if not set)
            const lawyerDoc = await getDoc(doc(firestore, 'lawyerProfiles', user.uid));
            const lawyerProfile = lawyerDoc.data();
            const appointmentFeeBase = lawyerProfile?.pricing?.appointmentFee || 3500;
            const chatFeeBase = lawyerProfile?.pricing?.chatFee || 500;
            const platformFeeRate = lawyerProfile?.pricing?.platformFeeRate || 0.15;

            // Process Appointments
            for (const d of appSnapshot.docs) {
                const data = d.data();
                // Only count if status is not cancelled or pending_payment (unless we want to show pending)
                if (data.status === 'cancelled' || data.status === 'pending_payment') continue;

                const amount = appointmentFeeBase * (1 - platformFeeRate); // Lawyer gets (100 - GP%)
                const isCompleted = data.status === 'completed';

                if (isCompleted) {
                    total += amount;
                    if (data.createdAt && data.createdAt.toDate().getMonth() === now.getMonth()) {
                        thisMonth += amount;
                    }
                } else {
                    pending += amount;
                }

                const clientName = await getUserName(data.userId);

                allTransactions.push({
                    id: d.id,
                    date: data.createdAt ? format(data.createdAt.toDate(), 'd MMM yyyy, HH:mm', { locale: th }) : 'N/A',
                    rawDate: data.createdAt ? data.createdAt.toDate() : new Date(0),
                    description: 'นัดหมายปรึกษา',
                    amount: amount,
                    type: 'revenue',
                    status: isCompleted ? 'completed' : 'pending',
                    clientName
                });
            }

            // Process Chats
            for (const d of chatSnapshot.docs) {
                const data = d.data();
                if (data.status === 'pending_payment') continue;

                // Identify client ID
                const clientId = data.participants.find((p: string) => p !== user.uid);
                const clientName = await getUserName(clientId);

                const amount = chatFeeBase * (1 - platformFeeRate); // Lawyer gets (100 - GP%)
                const isCompleted = data.status === 'closed';

                if (isCompleted) {
                    total += amount;
                    if (data.createdAt && data.createdAt.toDate().getMonth() === now.getMonth()) {
                        thisMonth += amount;
                    }
                } else {
                    pending += amount;
                }

                allTransactions.push({
                    id: d.id,
                    date: data.createdAt ? format(data.createdAt.toDate(), 'd MMM yyyy, HH:mm', { locale: th }) : 'N/A',
                    rawDate: data.createdAt ? data.createdAt.toDate() : new Date(0),
                    description: 'ปรึกษาผ่านแชท',
                    amount: amount,
                    type: 'revenue',
                    status: isCompleted ? 'completed' : 'pending',
                    clientName
                });
            }

            // Process Withdrawals
            const withdrawalList: Withdrawal[] = [];
            let totalWithdrawn = 0;
            let pendingWithdrawal = 0;

            withdrawSnapshot.forEach(doc => {
                const data = doc.data();
                withdrawalList.push({
                    id: doc.id,
                    amount: data.amount,
                    status: data.status,
                    requestedAt: data.requestedAt,
                    bankName: data.bankName,
                    accountNumber: data.accountNumber
                });

                if (data.status === 'approved') {
                    totalWithdrawn += data.amount;
                } else if (data.status === 'pending') {
                    pendingWithdrawal += data.amount;
                }
            });

            // Sort transactions
            allTransactions.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

            // Sort withdrawals
            withdrawalList.sort((a, b) => {
                const timeA = a.requestedAt?.toDate ? a.requestedAt.toDate().getTime() : 0;
                const timeB = b.requestedAt?.toDate ? b.requestedAt.toDate().getTime() : 0;
                return timeB - timeA;
            });

            setTransactions(allTransactions);
            setWithdrawals(withdrawalList);
            setStats({
                totalIncome: total,
                pendingIncome: pending,
                incomeThisMonth: thisMonth,
                withdrawnAmount: totalWithdrawn,
                availableBalance: total - totalWithdrawn - pendingWithdrawal
            });

        } catch (error) {
            console.error("Error fetching lawyer financials:", error);
        } finally {
            setIsLoading(false);
        }

        // Fetch Lawyer Bank Details
        try {
            const lawyerDoc = await getDoc(doc(firestore, 'lawyerProfiles', user.uid));
            if (lawyerDoc.exists()) {
                const data = lawyerDoc.data();
                setBankName(data.bankName || '');
                setAccountNumber(data.bankAccountNumber || '');
                setAccountName(data.name || ''); // Assuming account name matches lawyer name
            }
        } catch (e) {
            console.error("Error fetching lawyer profile:", e);
        }

    }, [firestore, user]);

    useEffect(() => {
        if (!isUserLoading && user) {
            fetchFinancials();
        } else if (!isUserLoading && !user) {
            router.push('/lawyer-login');
        }
    }, [isUserLoading, user, fetchFinancials, router]);

    const handleWithdraw = async () => {
        if (!firestore || !user) return;

        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ variant: "destructive", title: "ยอดเงินไม่ถูกต้อง", description: "กรุณาระบุจำนวนเงินที่ถูกต้อง" });
            return;
        }
        if (amount < 1000) {
            toast({ variant: "destructive", title: "ยอดเงินขั้นต่ำไม่ถึงเกณฑ์", description: "ต้องถอนเงินขั้นต่ำ 1,000 บาทขึ้นไป" });
            return;
        }
        if (amount > stats.availableBalance) {
            toast({ variant: "destructive", title: "ยอดเงินไม่เพียงพอ", description: "คุณมียอดเงินที่ถอนได้ไม่เพียงพอ" });
            return;
        }
        if (!bankName || !accountNumber || !accountName) {
            toast({ variant: "destructive", title: "ข้อมูลไม่ครบถ้วน", description: "กรุณากรอกข้อมูลบัญชีธนาคารให้ครบถ้วน" });
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'withdrawals'), {
                lawyerId: user.uid,
                amount: amount,
                bankName,
                accountNumber,
            });

            // Create Admin Notification (In-App)
            await addDoc(collection(firestore, 'notifications'), {
                type: 'withdrawal',
                title: 'คำร้องขอถอนเงินใหม่',
                message: `มีคำร้องขอถอนเงินจากทนายความ (฿${amount.toLocaleString()})`,
                createdAt: serverTimestamp(),
                read: false,
                recipient: 'admin',
                link: `/admin/financials`,
                relatedId: user.uid
            });

            // Send Email Notification to Admins
            // We don't await this to prevent blocking the UI response
            notifyAdmins('withdrawal', {
                lawyerName: user.displayName || accountName || 'Unknown Lawyer',
                amount: amount,
                bankName: bankName,
                accountNumber: accountNumber
            });

            toast({ title: "ส่งคำร้องสำเร็จ", description: "คำร้องขอถอนเงินของคุณถูกส่งเรียบร้อยแล้ว" });
            setIsWithdrawOpen(false);
            setWithdrawAmount('');
            // Refresh data
            fetchFinancials();
        } catch (error) {
            console.error("Withdrawal error:", error);
            toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: "ไม่สามารถส่งคำร้องได้" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="bg-gray-100/50 min-h-screen p-4 md:p-8">
            <div className="container mx-auto max-w-5xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <Link href={searchParams.get('view') === 'admin' ? "/lawyer-dashboard?view=admin" : "/lawyer-dashboard"} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2 mb-2">
                            <ArrowLeft className="w-4 h-4" />
                            กลับไปที่แดชบอร์ด
                        </Link>
                        <h1 className="text-3xl font-bold font-headline">ข้อมูลการเงิน</h1>
                        <p className="text-muted-foreground">จัดการรายได้และการถอนเงินของคุณ</p>
                    </div>

                    <Button className="bg-blue-600 hover:bg-blue-700 rounded-full" onClick={() => setIsWithdrawOpen(true)}>
                        <Wallet className="mr-2 h-4 w-4" /> แจ้งถอนเงิน
                    </Button>

                    <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                        <DialogContent hideCloseButton={true} className="w-screen h-screen max-w-none sm:h-auto sm:w-full sm:max-w-[450px] rounded-none sm:rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl duration-300 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-10 flex flex-col">
                            {/* Mobile Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-white border-b sm:hidden shrink-0">
                                <Logo variant="color" href="/" />
                                <Button variant="ghost" size="icon" onClick={() => setIsWithdrawOpen(false)}>
                                    <Menu className="w-6 h-6 text-foreground" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <div className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] p-6 text-white">
                                    <DialogHeader className="text-white">
                                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                            <Wallet className="w-6 h-6 animate-bounce" /> แจ้งถอนเงิน
                                        </DialogTitle>
                                        <DialogDescription className="text-blue-100">
                                            ระบุจำนวนเงินที่ต้องการถอนเข้าบัญชีของคุณ
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                                        <p className="text-sm text-blue-100 mb-1">ยอดที่ถอนได้</p>
                                        <p className="text-3xl font-bold">฿{stats.availableBalance.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100 space-y-3 hover:shadow-md transition-shadow duration-300">
                                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                                <div className="p-2 bg-white rounded-full shadow-sm">
                                                    <Briefcase className="w-4 h-4 text-primary" />
                                                </div>
                                                <span className="text-sm font-medium">บัญชีรับเงิน</span>
                                            </div>

                                            <div className="space-y-1 pl-2 border-l-2 border-primary/20">
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">ธนาคาร:</span>
                                                    <span className="col-span-2 font-medium text-foreground">{bankName || '-'}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">เลขที่บัญชี:</span>
                                                    <span className="col-span-2 font-medium text-foreground tracking-wider">{accountNumber || '-'}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">ชื่อบัญชี:</span>
                                                    <span className="col-span-2 font-medium text-foreground">{accountName || '-'}</span>
                                                </div>
                                            </div>

                                            {!bankName && (
                                                <div className="flex items-center gap-2 text-red-500 text-xs bg-red-50 p-2 rounded-lg animate-pulse">
                                                    <AlertCircle className="w-4 h-4" />
                                                    <span>ไม่พบข้อมูลบัญชี กรุณาติดต่อผู้ดูแลระบบ</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="amount" className="text-base font-semibold">จำนวนเงินที่ต้องการถอน</Label>
                                            <div className="relative group">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl font-light group-focus-within:text-blue-600 transition-colors">฿</span>
                                                <Input
                                                    id="amount"
                                                    type="number"
                                                    className="pl-10 h-14 text-lg rounded-2xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-300"
                                                    placeholder="0.00"
                                                    value={withdrawAmount}
                                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground pl-1">* ขั้นต่ำ 1,000 บาท</p>
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter className="gap-2 sm:gap-0">
                                    <Button variant="ghost" onClick={() => setIsWithdrawOpen(false)} className="rounded-full hover:bg-gray-100 text-muted-foreground">
                                        ยกเลิก
                                    </Button>
                                    <Button
                                        onClick={handleWithdraw}
                                        disabled={isSubmitting || parseFloat(withdrawAmount) > stats.availableBalance || parseFloat(withdrawAmount) < 1000 || !bankName}
                                        className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-8 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transition-all duration-300 transform hover:-translate-y-0.5"
                                    >
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'ยืนยันการถอน'}
                                    </Button>
                                </DialogFooter>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="rounded-3xl shadow-sm border-none">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">ยอดเงินที่ถอนได้</CardTitle>
                        <Wallet className="w-4 h-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">฿{stats.availableBalance.toLocaleString()}</div>
                        <CardDescription>พร้อมโอนเข้าบัญชีคุณ</CardDescription>
                    </CardContent>
                </Card>
                <Card className="rounded-3xl shadow-sm border-none">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">รายได้ทั้งหมด</CardTitle>
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">฿{stats.totalIncome.toLocaleString()}</div>
                        <CardDescription>รายได้สะสมทั้งหมด</CardDescription>
                    </CardContent>
                </Card>
                <Card className="rounded-3xl shadow-sm border-none">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">ถอนแล้ว</CardTitle>
                        <History className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">฿{stats.withdrawnAmount.toLocaleString()}</div>
                        <CardDescription>ยอดเงินที่โอนสำเร็จแล้ว</CardDescription>
                    </CardContent>
                </Card>
                <Card className="rounded-3xl shadow-sm border-none">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">รอดำเนินการ</CardTitle>
                        <Clock className="w-4 h-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">฿{stats.pendingIncome.toLocaleString()}</div>
                        <CardDescription>จากเคสที่ยังไม่เสร็จสิ้น</CardDescription>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="transactions" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="transactions">รายการรายรับ</TabsTrigger>
                    <TabsTrigger value="withdrawals">ประวัติการถอนเงิน</TabsTrigger>
                </TabsList>

                <TabsContent value="transactions">
                    <Card className="rounded-3xl shadow-sm border-none">
                        <CardHeader>
                            <CardTitle>รายการธุรกรรม</CardTitle>
                            <CardDescription>รายได้จากการให้คำปรึกษา (หักค่าธรรมเนียมแพลตฟอร์ม 15% แล้ว)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>วันที่</TableHead>
                                        <TableHead>รายการ</TableHead>
                                        <TableHead>ลูกค้า</TableHead>
                                        <TableHead>สถานะ</TableHead>
                                        <TableHead className="text-right">จำนวนเงิน (85%)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.length > 0 ? (
                                        transactions.map((t) => (
                                            <TableRow key={t.id}>
                                                <TableCell>{t.date}</TableCell>
                                                <TableCell>{t.description}</TableCell>
                                                <TableCell>{t.clientName}</TableCell>
                                                <TableCell>
                                                    <Badge variant={t.status === 'completed' ? 'default' : 'secondary'} className={t.status === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}>
                                                        {t.status === 'completed' ? 'ได้รับแล้ว' : 'รอดำเนินการ'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">฿{t.amount.toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">ไม่มีรายการธุรกรรม</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="withdrawals">
                    <Card className="rounded-3xl shadow-sm border-none">
                        <CardHeader>
                            <CardTitle>ประวัติการถอนเงิน</CardTitle>
                            <CardDescription>รายการคำร้องขอถอนเงินของคุณ</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>วันที่แจ้ง</TableHead>
                                        <TableHead>ธนาคาร</TableHead>
                                        <TableHead>เลขที่บัญชี</TableHead>
                                        <TableHead>สถานะ</TableHead>
                                        <TableHead className="text-right">จำนวนเงิน</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {withdrawals.length > 0 ? (
                                        withdrawals.map((w) => (
                                            <TableRow key={w.id}>
                                                <TableCell>
                                                    {w.requestedAt?.toDate ? format(w.requestedAt.toDate(), 'd MMM yyyy, HH:mm', { locale: th }) : 'กำลังดำเนินการ'}
                                                </TableCell>
                                                <TableCell>{w.bankName}</TableCell>
                                                <TableCell>{w.accountNumber}</TableCell>
                                                <TableCell>
                                                    <Badge variant={w.status === 'approved' ? 'default' : w.status === 'rejected' ? 'destructive' : 'secondary'}
                                                        className={w.status === 'approved' ? 'bg-green-100 text-green-800' : ''}>
                                                        {w.status === 'approved' ? 'โอนแล้ว' : w.status === 'rejected' ? 'ปฏิเสธ' : 'รอตรวจสอบ'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">฿{w.amount.toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">ไม่มีประวัติการถอนเงิน</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
        </div >
    );
}
