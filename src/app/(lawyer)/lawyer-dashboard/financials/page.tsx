'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useUser, useFirebase } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/logo';
import { ArrowLeft, DollarSign, TrendingUp, Clock, Loader2, Wallet, History, Briefcase, AlertCircle, Menu, X, PenSquare, Save, Building2, FileText } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, orderBy, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import Link from 'next/link';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import bblLogo from '@/pic/logo-bank/กรุงเทพ.png';
import kbankLogo from '@/pic/logo-bank/กสิกร.png';
import ktbLogo from '@/pic/logo-bank/กรุงไทย.png';
import scbLogo from '@/pic/logo-bank/ไทยพาณิช.png';
import bayLogo from '@/pic/logo-bank/กรุงศรี.png';
import ttbLogo from '@/pic/logo-bank/ttb.png';
import gsbLogo from '@/pic/logo-bank/ออมสิน.png';
import baacLogo from '@/pic/logo-bank/ธนาคาร ธกส.png';
import cimbLogo from '@/pic/logo-bank/Cimb.png';
import uobLogo from '@/pic/logo-bank/UOB.png';
import tiscoLogo from '@/pic/logo-bank/ทิสโก้.png';
import ibankLogo from '@/pic/logo-bank/ธนาคารอิสลาม.png';
import ghbLogo from '@/pic/logo-bank/ธอส.png';
import kkpLogo from '@/pic/logo-bank/เกียรตินาคิน.png';
import lhLogo from '@/pic/logo-bank/แลนด์แลนด์เฮ้าท์ .png';
import icbcLogo from '@/pic/logo-bank/ICBC.png';
import bocLogo from '@/pic/logo-bank/ธนาคารแห่งประเทศจีน.png';
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

const banks = [
    { name: "ธนาคารกรุงเทพ", logo: bblLogo, color: "#1e4598" },
    { name: "ธนาคารกสิกรไทย", logo: kbankLogo, color: "#138f2d" },
    { name: "ธนาคารกรุงไทย", logo: ktbLogo, color: "#1ba5e1" },
    { name: "ธนาคารไทยพาณิชย์", logo: scbLogo, color: "#4e2e7f" },
    { name: "ธนาคารกรุงศรีอยุธยา", logo: bayLogo, color: "#fec43b" },
    { name: "ธนาคารทหารไทยธนชาต", logo: ttbLogo, color: "#102a4d" },
    { name: "ธนาคารออมสิน", logo: gsbLogo, color: "#eb198d" },
    { name: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร", logo: baacLogo, color: "#4b9b1d" },
    { name: "ธนาคารซีไอเอ็มบี ไทย", logo: cimbLogo, color: "#7e2f36" },
    { name: "ธนาคารยูโอบี", logo: uobLogo, color: "#0b3979" },
    { name: "ธนาคารทิสโก้", logo: tiscoLogo, color: "#1a4d8d" },
    { name: "ธนาคารอิสลามแห่งประเทศไทย", logo: ibankLogo, color: "#164134" },
    { name: "ธนาคารอาคารสงเคราะห์", logo: ghbLogo, color: "#f58523" },
    { name: "ธนาคารเกียรตินาคินภัทร", logo: kkpLogo, color: "#6e5a9c" },
    { name: "ธนาคารแลนด์ แอนด์ เฮ้าส์", logo: lhLogo, color: "#6d6e71" },
    { name: "ธนาคารไอซีบีซี (ไทย)", logo: icbcLogo, color: "#c4161c" },
    { name: "ธนาคารแห่งประเทศจีน (ไทย)", logo: bocLogo, color: "#b40026" },
];

function LawyerFinancialsContent() {
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

    // Lawyer Profile Data
    const [lawyerOfficialName, setLawyerOfficialName] = useState('');

    // Withdrawal Form State
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Bank State
    const [isEditingBank, setIsEditingBank] = useState(false);
    const [editBankName, setEditBankName] = useState('');
    const [editAccountNumber, setEditAccountNumber] = useState('');
    const [editAccountName, setEditAccountName] = useState('');
    const [isSavingBank, setIsSavingBank] = useState(false);

    // Corporate Profile State (for e-Tax / Billing)
    const [corporateName, setCorporateName] = useState('');
    const [corporateTaxId, setCorporateTaxId] = useState('');
    const [corporateAddress, setCorporateAddress] = useState('');

    // Edit Corporate State
    const [isEditingCorporate, setIsEditingCorporate] = useState(false);
    const [editCorporateName, setEditCorporateName] = useState('');
    const [editCorporateTaxId, setEditCorporateTaxId] = useState('');
    const [editCorporateAddress, setEditCorporateAddress] = useState('');
    const [isSavingCorporate, setIsSavingCorporate] = useState(false);

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

        // Fetch Lawyer Bank & Corporate Details
        try {
            const lawyerDoc = await getDoc(doc(firestore, 'lawyerProfiles', user.uid));
            if (lawyerDoc.exists()) {
                const data = lawyerDoc.data();
                setBankName(data.bankName || '');
                setAccountNumber(data.bankAccountNumber || '');
                setAccountName(data.bankAccountName || data.name || '');
                setLawyerOfficialName(data.name || '');

                // Initialize edit bank state
                setEditBankName(data.bankName || '');
                setEditAccountNumber(data.bankAccountNumber || '');
                setEditAccountName(data.bankAccountName || data.name || '');

                // Initialize corporate profile state
                setCorporateName(data.corporateName || '');
                setCorporateTaxId(data.corporateTaxId || '');
                setCorporateAddress(data.corporateAddress || '');

                // Initialize edit corporate state
                setEditCorporateName(data.corporateName || '');
                setEditCorporateTaxId(data.corporateTaxId || '');
                setEditCorporateAddress(data.corporateAddress || '');
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
                link: `/financials`,
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

    const handleUpdateBankDetails = async () => {
        if (!firestore || !user) return;

        if (!editBankName || !editAccountNumber || !editAccountName) {
            toast({ variant: "destructive", title: "ข้อมูลไม่ครบถ้วน", description: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
            return;
        }

        if (editAccountName !== lawyerOfficialName) {
            toast({ variant: "destructive", title: "ชื่อบัญชีไม่ถูกต้อง", description: `เชื่อบัญชีต้องตรงกับชื่อที่ลงทะเบียน: ${lawyerOfficialName}` });
            return;
        }

        setIsSavingBank(true);
        try {
            const lawyerRef = doc(firestore, 'lawyerProfiles', user.uid);
            await updateDoc(lawyerRef, {
                bankName: editBankName,
                bankAccountNumber: editAccountNumber,
                bankAccountName: editAccountName, // Saving specifically as bankAccountName
                // We don't update root 'name' here to avoid confusion, assuming account name matches user
            });

            // Update local state
            setBankName(editBankName);
            setAccountNumber(editAccountNumber);
            setAccountName(editAccountName);

            setIsEditingBank(false);
            toast({ title: "บันทึกข้อมูลสำเร็จ", description: "ข้อมูลบัญชีธนาคารของคุณถูกอัปเดตแล้ว" });
        } catch (error) {
            console.error("Error updating bank details:", error);
            toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: "ไม่สามารถบันทึกข้อมูลได้" });
        } finally {
            setIsSavingBank(false);
        }
    };

    const handleUpdateCorporateDetails = async () => {
        if (!firestore || !user) return;

        if (!editCorporateName || !editCorporateTaxId || !editCorporateAddress) {
            toast({ variant: "destructive", title: "ข้อมูลไม่ครบถ้วน", description: "กรุณากรอกข้อมูลนิติบุคคลให้ครบทุกช่อง" });
            return;
        }

        setIsSavingCorporate(true);
        try {
            const lawyerRef = doc(firestore, 'lawyerProfiles', user.uid);
            await updateDoc(lawyerRef, {
                corporateName: editCorporateName,
                corporateTaxId: editCorporateTaxId,
                corporateAddress: editCorporateAddress,
            });

            // Update local state
            setCorporateName(editCorporateName);
            setCorporateTaxId(editCorporateTaxId);
            setCorporateAddress(editCorporateAddress);

            setIsEditingCorporate(false);
            toast({ title: "บันทึกข้อมูลสำเร็จ", description: "ข้อมูลนิติบุคคลสำหรับการออกใบกำกับภาษีถูกอัปเดตแล้ว" });
        } catch (error) {
            console.error("Error updating corporate details:", error);
            toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: "ไม่สามารถบันทึกข้อมูลได้" });
        } finally {
            setIsSavingCorporate(false);
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
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <div className="p-2 bg-white rounded-full shadow-sm">
                                                        <Briefcase className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <span className="text-sm font-medium">บัญชีรับเงิน</span>
                                                </div>
                                                {!isEditingBank ? (
                                                    <Button variant="ghost" size="sm" onClick={() => setIsEditingBank(true)} className="h-8 w-8 p-0 rounded-full hover:bg-white/50">
                                                        <PenSquare className="w-4 h-4 text-primary" />
                                                    </Button>
                                                ) : (
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="sm" onClick={() => setIsEditingBank(false)} className="h-8 w-8 p-0 rounded-full hover:bg-red-50 text-red-500">
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                            {isEditingBank ? (
                                                <div className="space-y-3 p-2 animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">ธนาคาร</Label>
                                                        <Select value={editBankName} onValueChange={setEditBankName}>
                                                            <SelectTrigger className="bg-white border-0 shadow-sm h-10">
                                                                <SelectValue placeholder="เลือกธนาคาร" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {banks.map((bank) => (
                                                                    <SelectItem key={bank.name} value={bank.name}>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="relative w-6 h-6 rounded-lg overflow-hidden border">
                                                                                <Image src={bank.logo} alt={bank.name} fill className="object-cover" />
                                                                            </div>
                                                                            <span className="text-sm">{bank.name}</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">เลขที่บัญชี</Label>
                                                        <Input
                                                            value={editAccountNumber}
                                                            onChange={e => setEditAccountNumber(e.target.value)}
                                                            className="bg-white border-0 shadow-sm h-10"
                                                            placeholder="เลขบัญชี 10-12 หลัก"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">ชื่อบัญชี</Label>
                                                        <Input
                                                            value={editAccountName}
                                                            onChange={e => setEditAccountName(e.target.value)}
                                                            className="bg-white border-0 shadow-sm h-10"
                                                            placeholder="ชื่อ-นามสกุลเจ้าของบัญชี"
                                                        />
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={handleUpdateBankDetails}
                                                        disabled={isSavingBank}
                                                        className="w-full rounded-full bg-green-600 hover:bg-green-700 text-white mt-2"
                                                    >
                                                        {isSavingBank ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                                                        บันทึกข้อมูล
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-1 pl-2 border-l-2 border-primary/20">
                                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                                        <span className="text-muted-foreground">ธนาคาร:</span>
                                                        <span className="col-span-2 font-medium text-foreground flex items-center gap-2">
                                                            {bankName && banks.find(b => b.name === bankName)?.logo && (
                                                                <div className="relative w-5 h-5 rounded overflow-hidden flex-shrink-0">
                                                                    <Image src={banks.find(b => b.name === bankName)!.logo} alt={bankName} fill className="object-cover" />
                                                                </div>
                                                            )}
                                                            {bankName || '-'}
                                                        </span>
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
                                            )}

                                            {!bankName && !isEditingBank && (
                                                <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 p-2 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => setIsEditingBank(true)}>
                                                    <AlertCircle className="w-4 h-4" />
                                                    <span>ยังไม่มีข้อมูลบัญชี คลิกเพื่อเพิ่ม</span>
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

                                <DialogFooter className="gap-2 sm:gap-0 px-6 pb-6">
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
                    <TabsList className="mb-4 flex flex-wrap gap-2 h-auto bg-transparent p-0">
                        <TabsTrigger value="transactions" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 px-6 py-2">
                            รายการรายรับ
                        </TabsTrigger>
                        <TabsTrigger value="withdrawals" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 px-6 py-2">
                            ประวัติการถอนเงิน
                        </TabsTrigger>
                        <TabsTrigger value="corporate_billing" className="rounded-full data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md border border-transparent px-6 py-2">
                            <Building2 className="w-4 h-4 mr-2" /> ข้อมูลนิติบุคคล (Tax)
                        </TabsTrigger>
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

                    <TabsContent value="corporate_billing">
                        <Card className="rounded-3xl shadow-sm border-none overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b pb-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl flex items-center gap-2">
                                            <Building2 className="w-5 h-5 text-blue-600" />
                                            ข้อมูลนิติบุคคล (Corporate Billing)
                                        </CardTitle>
                                        <CardDescription className="mt-1">
                                            ข้อมูลสำหรับใช้ในการออกใบกำกับภาษีเต็มรูปแบบและหนังสือรับรองการหัก ณ ที่จ่าย
                                        </CardDescription>
                                    </div>
                                    {!isEditingCorporate ? (
                                        <Button variant="outline" size="sm" onClick={() => setIsEditingCorporate(true)} className="rounded-full">
                                            <PenSquare className="w-4 h-4 mr-2" /> แก้ไขข้อมูล
                                        </Button>
                                    ) : (
                                        <Button variant="ghost" size="sm" onClick={() => setIsEditingCorporate(false)} className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50">
                                            <X className="w-4 h-4 mr-2" /> ยกเลิก
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                {isEditingCorporate ? (
                                    <div className="space-y-4 max-w-2xl animate-in fade-in zoom-in-95 duration-200">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>ชื่อนิติบุคคล / บริษัท <span className="text-red-500">*</span></Label>
                                                <Input
                                                    value={editCorporateName}
                                                    onChange={(e) => setEditCorporateName(e.target.value)}
                                                    placeholder="เช่น บริษัท ลอว์เลนส์ จำกัด"
                                                    className="bg-slate-50 border-slate-200"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>เลขประจำตัวผู้เสียภาษีอากร 13 หลัก <span className="text-red-500">*</span></Label>
                                                <Input
                                                    value={editCorporateTaxId}
                                                    onChange={(e) => setEditCorporateTaxId(e.target.value)}
                                                    placeholder="0123456789012"
                                                    maxLength={13}
                                                    className="bg-slate-50 border-slate-200"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>ที่อยู่จดทะเบียนบริษัท <span className="text-red-500">*</span></Label>
                                            <Input
                                                value={editCorporateAddress}
                                                onChange={(e) => setEditCorporateAddress(e.target.value)}
                                                placeholder="ที่อยู่สำหรับออกใบกำกับภาษี"
                                                className="bg-slate-50 border-slate-200"
                                            />
                                        </div>
                                        <div className="pt-4 flex justify-end">
                                            <Button
                                                onClick={handleUpdateCorporateDetails}
                                                disabled={isSavingCorporate}
                                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8"
                                            >
                                                {isSavingCorporate ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                                บันทึกข้อมูลบริษัท
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-w-2xl">
                                        {corporateName ? (
                                            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                    <span className="text-slate-500 text-sm font-medium">ชื่อนิติบุคคล:</span>
                                                    <span className="col-span-2 font-semibold text-slate-800">{corporateName}</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                    <span className="text-slate-500 text-sm font-medium">เลขประจำตัวผู้เสียภาษี:</span>
                                                    <span className="col-span-2 font-medium text-slate-800 tracking-widest">{corporateTaxId}</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                    <span className="text-slate-500 text-sm font-medium">ที่อยู่จดทะเบียน:</span>
                                                    <span className="col-span-2 text-slate-700">{corporateAddress}</span>
                                                </div>

                                                <div className="mt-6 pt-4 border-t border-blue-100 flex items-start gap-3">
                                                    <FileText className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                                    <div className="text-sm text-slate-600">
                                                        <span className="font-semibold text-emerald-700">พร้อมใช้งานสำหรับการเบิกจ่ายองค์กร</span>
                                                        <p className="mt-1">ข้อมูลนี้จะถูกนำไปใช้เพื่อออกเอกสารใบกำกับภาษี (e-Tax Invoice) ตอนที่คุณแจ้งถอนเงินโดยอัตโนมัติ</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Building2 className="w-8 h-8 text-blue-600" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-slate-800 mb-2">ยังไม่มีข้อมูลนิติบุคคล</h3>
                                                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                                    หากคุณใช้งานในนามบริษัท สามารถเพิ่มข้อมูลเพื่อใช้ขอใบกำกับภาษีและจัดการเรื่องการหัก ณ ที่จ่ายได้
                                                </p>
                                                <Button onClick={() => setIsEditingCorporate(true)} className="bg-blue-600 hover:bg-blue-700 rounded-full">
                                                    เพิ่มข้อมูลบริษัท
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div >
    );
}

export default function LawyerFinancialsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <LawyerFinancialsContent />
        </Suspense>
    );
}
