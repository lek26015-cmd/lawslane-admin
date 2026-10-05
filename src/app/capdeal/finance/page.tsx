'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Banknote, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { approveDealPayment, rejectDealPayment } from '@/app/actions/capdeal-finance-actions';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { useAdminLocale } from '@/lib/admin-i18n';

interface Transaction {
    id: string;
    type: string;
    amount: number;
    status: string;
    customer: string;
    title: string;
    date: string;
}

interface ChartItem {
    date: string;
    amount: number;
}

interface PendingDeal {
    id: string;
    title: string;
    amount: number;
    submittedAt: any;
    ownerId: string;
    slipUrl?: string;
    status: string;
}

// ป้ายสถานะธุรกรรมที่แสดงผล (ค่าจริงจาก API ยังเป็นภาษาอังกฤษ)
const TX_STATUS_LABEL: Record<string, [string, string]> = {
    succeeded: ['สำเร็จ', 'Succeeded'],
    success: ['สำเร็จ', 'Success'],
    paid: ['ชำระแล้ว', 'Paid'],
    completed: ['เสร็จสิ้น', 'Completed'],
    active: ['ใช้งานอยู่', 'Active'],
    pending: ['รอดำเนินการ', 'Pending'],
    pending_payment: ['รอชำระเงิน', 'Pending payment'],
    failed: ['ล้มเหลว', 'Failed'],
    refunded: ['คืนเงินแล้ว', 'Refunded'],
};

export default function AdminFinancePage() {
    const { user: currentUser } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { tx, locale } = useAdminLocale();
    const numLocale = locale === 'en' ? 'en-US' : 'th-TH';
    const [data, setData] = useState<{ transactions: Transaction[], chartData: ChartItem[], summary: any } | null>(null);
    const [pendingDeals, setPendingDeals] = useState<PendingDeal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isVerifying, setIsVerifying] = useState(false);
    
    // UI State
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedDeal, setSelectedDeal] = useState<PendingDeal | null>(null);
    const [isVerifierOpen, setIsVerifierOpen] = useState(false);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        async function fetchFinance() {
            if (!currentUser) return;
            try {
                const token = await currentUser.getIdToken();
                const res = await fetch('/api/capdeal/finance', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error('Failed to fetch finance data:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchFinance();
    }, [currentUser]);

    useEffect(() => {
        if (activeTab === 'verification') {
            fetchPendingDeals();
        }
    }, [activeTab]);

    const fetchPendingDeals = async () => {
        if (!firestore) return;
        setIsVerifying(true);
        try {
            const q = query(
                collection(firestore, 'cap-deals'),
                where('status', '==', 'pending_payment'),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const deals = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                submittedAt: doc.data().createdAt?.toDate() || new Date()
            } as PendingDeal));
            setPendingDeals(deals);
        } catch (error) {
            console.error('Failed to fetch pending deals:', error);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleApprove = async (deal: PendingDeal) => {
        // ผ่าน server action ที่ตรวจสิทธิ์แอดมินและเขียนด้วย Admin SDK
        // (เดิม updateDoc จากเบราว์เซอร์ ซึ่ง production ปฏิเสธเพราะไม่มีกฎ cap-deals
        //  และต่อให้เพิ่มกฎ การให้ client เขียน status การเงินเองก็ไม่ปลอดภัย)
        const res = await approveDealPayment(deal.id);
        if (!res.ok) {
            toast({ variant: 'destructive', title: tx('เกิดข้อผิดพลาด', 'Error'), description: res.error });
            return;
        }
        toast({ title: tx('อนุมัติเรียบร้อย', 'Approved'), description: tx('ดีลนี้เปลี่ยนสถานะเป็น Active แล้ว', 'This deal is now Active.') });
        fetchPendingDeals();
        setIsVerifierOpen(false);
    };

    const handleReject = async () => {
        if (!selectedDeal || !rejectReason) return;
        const res = await rejectDealPayment(selectedDeal.id, rejectReason);
        if (!res.ok) {
            toast({ variant: 'destructive', title: tx('เกิดข้อผิดพลาด', 'Error'), description: res.error });
            return;
        }
        toast({ title: tx('ปฏิเสธรายการแล้ว', 'Payment rejected'), description: tx('แจ้งเหตุผลให้ลูกค้าเรียบร้อยแล้ว', 'The customer has been notified of the reason.') });
        setIsRejectDialogOpen(false);
        setIsVerifierOpen(false);
        setRejectReason('');
        fetchPendingDeals();
    };

    if (isLoading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">{tx('ภาพรวมการเงิน', 'Financial Overview')}</h2>
                    <p className="text-slate-500">{tx('ติดตามรายได้และธุรกรรมของ Cap and Deal', 'Track revenue and transactions for Cap and Deal')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="rounded-xl border-slate-200">
                        <Calendar className="w-4 h-4 mr-2" /> {tx('30 วันล่าสุด', 'Last 30 Days')}
                    </Button>
                    <Button className="rounded-xl bg-slate-900 text-white">
                        {tx('ส่งออกรายงาน', 'Export Report')}
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="overview">{tx('ภาพรวมการเงิน', 'Financial Overview')}</TabsTrigger>
                    <TabsTrigger value="verification">{tx('ตรวจสอบสลิป', 'Slip Verification')} {pendingDeals.length > 0 && <Badge className="ml-2 bg-red-100 text-red-600 border-none">{pendingDeals.length}</Badge>}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border-none shadow-sm rounded-3xl p-6 bg-slate-900 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-white/10 rounded-2xl">
                                    <DollarSign className="w-6 h-6 text-white" />
                                </div>
                                <div className={cn(
                                    "flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full",
                                    data?.summary?.revenueTrend?.startsWith('-') ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                                )}>
                                    {data?.summary?.revenueTrend?.startsWith('-') ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                    {data?.summary?.revenueTrend || '+0%'}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">{tx('รายได้รวม', 'Total Revenue')}</p>
                                <p className="text-3xl font-bold tracking-tight">฿{(data?.summary?.totalRevenue || 0).toLocaleString(numLocale)}</p>
                            </div>
                        </Card>

                        <Card className="border-none shadow-sm rounded-3xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-blue-50 rounded-2xl">
                                    <Banknote className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">{tx('จำนวนธุรกรรมทั้งหมด', 'Total Transactions')}</p>
                                <p className="text-3xl font-bold text-slate-900 tracking-tight">{(data?.summary?.transactionCount || 0).toLocaleString(numLocale)}</p>
                            </div>
                        </Card>

                        <Card className="border-none shadow-sm rounded-3xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-purple-50 rounded-2xl">
                                    <TrendingUp className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">{tx('มูลค่าเฉลี่ยต่อธุรกรรม', 'Avg. Transaction Value')}</p>
                                <p className="text-3xl font-bold text-slate-900 tracking-tight">
                                    ฿{Math.round((data?.summary?.totalRevenue || 0) / (data?.summary?.transactionCount || 1)).toLocaleString(numLocale)}
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Revenue Chart */}
                    <Card className="border-none shadow-sm rounded-3xl p-6">
                        <CardHeader className="px-0 pt-0">
                            <CardTitle className="text-lg font-bold">{tx('แนวโน้มรายได้', 'Revenue Trends')}</CardTitle>
                            <CardDescription>{tx('รายได้รายวันในช่วง 30 วันล่าสุด', 'Daily revenue for the last 30 days')}</CardDescription>
                        </CardHeader>
                        <CardContent className="px-0 pt-6 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data?.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        tickFormatter={(str) => new Date(str).toLocaleDateString(numLocale, { day: 'numeric', month: 'short' })}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        tickFormatter={(val) => `฿${val.toLocaleString(numLocale)}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(val: number) => [`฿${val.toLocaleString(numLocale)}`, tx('รายได้', 'Revenue')]}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="amount"
                                        stroke="#0f172a"
                                        strokeWidth={3}
                                        dot={{ fill: '#0f172a', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Transactions Table */}
                    <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                        <CardHeader className="p-6 border-b border-slate-100">
                            <CardTitle className="text-lg font-bold">{tx('ธุรกรรมล่าสุด', 'Recent Transactions')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow className="border-none hover:bg-transparent">
                                        <TableHead className="py-4 pl-6 font-bold text-slate-500">{tx('ธุรกรรม', 'TRANSACTION')}</TableHead>
                                        <TableHead className="py-4 font-bold text-slate-500">{tx('ลูกค้า', 'CUSTOMER')}</TableHead>
                                        <TableHead className="py-4 font-bold text-slate-500">{tx('จำนวนเงิน', 'AMOUNT')}</TableHead>
                                        <TableHead className="py-4 font-bold text-slate-500">{tx('วันที่', 'DATE')}</TableHead>
                                        <TableHead className="py-4 font-bold text-slate-500">{tx('สถานะ', 'STATUS')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data?.transactions.map((txn) => (
                                        <TableRow key={txn.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="py-5 pl-6">
                                                <div className="font-bold text-slate-900">{txn.title}</div>
                                                <div className="text-xs text-slate-400 font-mono mt-0.5">{txn.id}</div>
                                            </TableCell>
                                            <TableCell className="py-5">
                                                <div className="text-xs text-slate-500 font-mono line-clamp-1 max-w-[150px]">{txn.customer}</div>
                                            </TableCell>
                                            <TableCell className="py-5 font-bold text-slate-900">
                                                ฿{txn.amount.toLocaleString(numLocale)}
                                            </TableCell>
                                            <TableCell className="py-5 text-sm text-slate-500">
                                                {new Date(txn.date).toLocaleDateString(numLocale, { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </TableCell>
                                            <TableCell className="py-5">
                                                <Badge className="bg-emerald-50 text-emerald-600 rounded-full px-3 py-1 text-xs font-bold border-none">
                                                    {TX_STATUS_LABEL[txn.status] ? tx(...TX_STATUS_LABEL[txn.status]) : txn.status.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {data?.transactions.length === 0 && (
                                <div className="p-20 text-center text-slate-500">{tx('ไม่พบธุรกรรม', 'No transactions found.')}</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="verification" className="space-y-6">
                    <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                        <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold">{tx('สลิปที่รอตรวจสอบ', 'Pending Slip Verification')}</CardTitle>
                                <CardDescription>{tx('ตรวจสอบการชำระเงินยอดสูงของสัญญา Cap and Deal', 'Verify large-sum payments for Cap and Deal contracts')}</CardDescription>
                            </div>
                            <Button onClick={fetchPendingDeals} variant="outline" size="sm" disabled={isVerifying}>
                                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : tx('รีเฟรช', 'Refresh')}
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow className="border-none hover:bg-transparent">
                                        <TableHead className="py-4 pl-6 font-bold text-slate-500">{tx('ชื่อดีล', 'DEAL TITLE')}</TableHead>
                                        <TableHead className="py-4 font-bold text-slate-500">{tx('จำนวนเงิน', 'AMOUNT')}</TableHead>
                                        <TableHead className="py-4 font-bold text-slate-500">{tx('ส่งเมื่อ', 'SUBMITTED AT')}</TableHead>
                                        <TableHead className="py-4 text-right font-bold text-slate-500 pr-6">{tx('การดำเนินการ', 'ACTIONS')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingDeals.map((deal) => (
                                        <TableRow key={deal.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="py-5 pl-6">
                                                <div className="font-bold text-slate-900">{deal.title}</div>
                                                <div className="text-xs text-slate-400 font-mono mt-0.5">{deal.id}</div>
                                            </TableCell>
                                            <TableCell className="py-5 font-bold text-slate-900">
                                                ฿{deal.amount.toLocaleString(numLocale)}
                                            </TableCell>
                                            <TableCell className="py-5 text-sm text-slate-500">
                                                {new Date(deal.submittedAt).toLocaleString(numLocale)}
                                            </TableCell>
                                            <TableCell className="py-5 text-right pr-6">
                                                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => {
                                                    setSelectedDeal(deal);
                                                    setIsVerifierOpen(true);
                                                }}>
                                                    <Eye className="w-4 h-4 mr-1" /> {tx('ดูสลิป', 'View Slip')}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {pendingDeals.length === 0 && !isVerifying && (
                                <div className="p-20 text-center text-slate-500">
                                    <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-50" />
                                    {tx('ไม่มีสลิปที่รอตรวจสอบ', 'No pending slip verifications.')}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Slip Verifier Modal */}
            <Dialog open={isVerifierOpen} onOpenChange={setIsVerifierOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
                    <DialogHeader>
                        <DialogTitle>{tx('ตรวจสอบสลิปโอนเงิน', 'Verify Transfer Slip')}</DialogTitle>
                        <DialogDescription>{tx('ดีล', 'Deal')}: {selectedDeal?.title} | {tx('ยอดเงิน', 'Amount')}: ฿{selectedDeal?.amount.toLocaleString(numLocale)}</DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        <div className="relative aspect-[3/4] bg-slate-100 rounded-3xl overflow-hidden border border-slate-200">
                            {selectedDeal?.slipUrl ? (
                                <Image 
                                    src={selectedDeal.slipUrl} 
                                    alt={tx('สลิป', 'Slip')} 
                                    fill 
                                    className="object-contain"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">{tx('ไม่พบสลิป', 'Slip not found')}</div>
                            )}
                        </div>
                        
                        <div className="space-y-6">
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <h4 className="font-bold mb-4">{tx('รายละเอียดดีล', 'Deal Details')}</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">{tx('รหัสดีล:', 'Deal ID:')}</span>
                                        <span className="font-mono">{selectedDeal?.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">{tx('ผู้เป็นเจ้าของ:', 'Owner:')}</span>
                                        <span>{selectedDeal?.ownerId}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">{tx('ยอดที่ต้องชำระ:', 'Amount due:')}</span>
                                        <span className="font-bold text-lg text-slate-900">฿{selectedDeal?.amount.toLocaleString(numLocale)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-3 pt-4">
                                <Button className="w-full bg-slate-900 text-white rounded-2xl h-12 text-lg font-bold" onClick={() => handleApprove(selectedDeal!)}>
                                    <CheckCircle className="w-5 h-5 mr-2" /> {tx('ยืนยันยอดเงิน', 'Confirm Payment')}
                                </Button>
                                <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50 rounded-2xl h-12 text-lg font-bold" onClick={() => setIsRejectDialogOpen(true)}>
                                    <XCircle className="w-5 h-5 mr-2" /> {tx('ปฏิเสธสลิป', 'Reject Slip')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Rejection Reason Modal */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent className="rounded-3xl">
                    <DialogHeader>
                        <DialogTitle>{tx('ระบุเหตุผลที่ปฏิเสธ', 'Reason for Rejection')}</DialogTitle>
                        <DialogDescription>{tx('เหตุผลนี้จะถูกส่งไปยังลูกค้าเพื่อแจ้งให้ทราบ', 'This reason will be sent to the customer.')}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea 
                            placeholder={tx('เช่น ยอดเงินไม่ตรง, สลิปไม่ชัดเจน, สลิปซ้ำ...', 'e.g. amount mismatch, unclear slip, duplicate slip...')}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="min-h-[120px] rounded-2xl p-4"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl" onClick={() => setIsRejectDialogOpen(false)}>{tx('ยกเลิก', 'Cancel')}</Button>
                        <Button className="bg-red-600 text-white rounded-xl" onClick={handleReject} disabled={!rejectReason.trim()}>
                            {tx('ยืนยันการปฏิเสธ', 'Confirm Rejection')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
