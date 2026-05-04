
'use client';

import * as React from 'react';
import { Suspense } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  TrendingUp,
  HandCoins,
  CheckCircle,
  Eye,
  ShieldAlert,
  FileJson,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useFirebase } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  limit,
  orderBy,
} from 'firebase/firestore';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getFinancialStats, ensureDate } from '@/lib/data';
import { getMainLink } from '@/lib/domain-utils';
import { useSearchParams } from 'next/navigation';
import { SlipVerifier } from '@/components/admin/slip-verifier';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Types
type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'revenue' | 'fee' | 'payout';
  status: 'completed' | 'pending';
  slipUrl?: string;
  lawyerName?: string;
  clientName?: string;
  rawData?: any;
  receiptUrl?: string;
};

type SlipVerificationItem = {
  id: string;
  type: 'Appointment' | 'Chat' | 'Invoice';
  userName: string;
  lawyerName: string;
  amount: number;
  reason?: string;
  submittedAt: Date;
  collectionName: 'appointments' | 'chats' | 'invoices';
  slipUrl?: string;
  userId: string;
  lawyerId?: string;
  rawData?: any;
};

function FinancialsContent() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = React.useState('overview');
  const [slipVerifications, setSlipVerifications] = React.useState<SlipVerificationItem[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [stats, setStats] = React.useState({
    totalServiceValue: 0,
    platformRevenueThisMonth: 0,
    platformTotalRevenue: 0,
    monthlyData: [] as any[]
  });

  const [isVerifierOpen, setIsVerifierOpen] = React.useState(false);
  const [selectedSlip, setSelectedSlip] = React.useState<{ url: string, amount: number, lawyerName: string } | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');
  const [selectedRejectItem, setSelectedRejectItem] = React.useState<SlipVerificationItem | null>(null);

  const [isAuthorized, setIsAuthorized] = React.useState(false);
  const [checkingAuth, setCheckingAuth] = React.useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);

  React.useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  React.useEffect(() => {
    if (!firestore) return;
    
    const checkAdmin = async () => {
      try {
        const { getAuth, onAuthStateChanged } = await import('firebase/auth');
        const auth = getAuth();
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            const userDoc = await getDoc(doc(firestore!, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const isSuper = !!userData.superAdmin || userData.superAdmin === 'true' || user.email === 'lek.26015@gmail.com' || user.uid === 'wS9w7ysNYUajNsBYZ6C7n2Afe9H3';
              setIsSuperAdmin(isSuper);
              setIsAuthorized(true);
            }
          }
          setCheckingAuth(false);
        });
      } catch (e) {
        console.error("Auth check error", e);
        setCheckingAuth(false);
      }
    };
    checkAdmin();
  }, [firestore]);

  const fetchPendingPayments = React.useCallback(async () => {
    if (!firestore || !isAuthorized) return;
    setIsLoading(true);

    try {
      const [appointmentSnapshot, chatSnapshot, invoiceSnapshot] = await Promise.all([
        getDocs(query(
          collection(firestore, 'appointments'), 
          where('status', '==', 'pending_payment'),
          orderBy('createdAt', 'desc'),
          limit(100)
        )),
        getDocs(query(
          collection(firestore, 'chats'), 
          where('status', '==', 'pending_payment'),
          orderBy('lastMessageAt', 'desc'),
          limit(100)
        )),
        getDocs(query(
          collection(firestore, 'invoices'), 
          where('status', '==', 'pending_verification'),
          orderBy('createdAt', 'desc'),
          limit(100)
        )),
      ]);

      const pending: SlipVerificationItem[] = [];
      const userIds = new Set<string>();
      const lawyerIds = new Set<string>();

      [...appointmentSnapshot.docs, ...chatSnapshot.docs, ...invoiceSnapshot.docs].forEach(d => {
        const data = d.data();
        const uId = data.userId || data.client_id || data.participants?.[0];
        const lId = data.lawyerId || data.lawyer_id;
        if (uId) userIds.add(uId);
        if (lId) lawyerIds.add(lId);
      });

      const userProfiles: Record<string, string> = {};
      if (userIds.size > 0) {
        const ids = Array.from(userIds);
        for (let i = 0; i < ids.length; i += 30) {
          const chunk = ids.slice(i, i + 30);
          const snaps = await getDocs(query(collection(firestore, 'users'), where('__name__', 'in', chunk)));
          snaps.forEach(snapDoc => { userProfiles[snapDoc.id] = snapDoc.data().name || 'Unknown User'; });
        }
      }

      const lawyerProfiles: Record<string, string> = {};
      if (lawyerIds.size > 0) {
        const ids = Array.from(lawyerIds);
        for (let i = 0; i < ids.length; i += 30) {
          const chunk = ids.slice(i, i + 30);
          const snaps = await getDocs(query(collection(firestore, 'lawyerProfiles'), where('__name__', 'in', chunk)));
          snaps.forEach(snapDoc => { lawyerProfiles[snapDoc.id] = snapDoc.data().name || 'Unknown Lawyer'; });
        }
      }

      appointmentSnapshot.docs.forEach(d => {
        const data = d.data();
        if (data.slipUrl || data.hasNewPayment) {
          pending.push({
            id: d.id,
            type: 'Appointment',
            userName: userProfiles[data.userId] || 'Unknown User',
            lawyerName: lawyerProfiles[data.lawyerId] || 'Unknown Lawyer',
            amount: data.amount || 3500,
            submittedAt: ensureDate(data.createdAt),
            collectionName: 'appointments',
            slipUrl: data.slipUrl,
            userId: data.userId,
            lawyerId: data.lawyerId,
            rawData: data
          });
        }
      });

      chatSnapshot.docs.forEach(d => {
        const data = d.data();
        const uId = data.userId || data.participants?.[0];
        const attachments = data.attachments;
        
        // 1. Check top-level/pendingPaymentDetails slip
        let slipUrl = data.pendingPaymentDetails?.slipUrl || data.slipUrl;
        
        // 2. Check installments for pending_verification
        const pendingInst = Array.isArray(data.installments) 
          ? data.installments.find((inst: any) => inst.status === 'pending_verification')
          : null;
        
        if (pendingInst && !slipUrl) {
          slipUrl = pendingInst.slipUrl;
        }
        
        // 3. Fallback to attachments
        if (!slipUrl && Array.isArray(attachments) && attachments.length > 0) {
          const firstImage = attachments.find((a: any) => a.url && (a.url.includes('r2.dev') || a.url.includes('firebasestorage') || a.name?.match(/\.(jpg|jpeg|png|webp)$/i)));
          if (firstImage) slipUrl = firstImage.url;
        }

        if (slipUrl || data.status === 'pending_payment' || pendingInst) {
          pending.push({
            id: d.id,
            type: 'Chat',
            userName: userProfiles[uId] || 'Unknown User',
            lawyerName: lawyerProfiles[data.lawyerId] || 'Unknown Lawyer',
            amount: pendingInst?.amount || data.pendingPaymentDetails?.amount || data.amount || 0,
            submittedAt: ensureDate(pendingInst?.submittedAt || data.pendingPaymentDetails?.submittedAt || data.createdAt),
            collectionName: 'chats',
            slipUrl: slipUrl,
            userId: uId,
            lawyerId: data.lawyerId,
            rawData: data
          });
        }
      });

      for (const d of invoiceSnapshot.docs) {
        const data = d.data();
        const userName = data.clientInfo?.name || userProfiles[data.client_id] || 'Unknown User';
        const slipUrl = data.slipUrl || data.evidence_url || data.proofUrl || data.paymentProof || data.image;
        pending.push({
          id: d.id,
          type: 'Invoice',
          userName: userName,
          lawyerName: lawyerProfiles[data.lawyer_id] || 'Unknown Lawyer',
          amount: data.amount,
          submittedAt: ensureDate(data.createdAt || data.created_at),
          collectionName: 'invoices',
          slipUrl: slipUrl,
          userId: data.client_id || '',
          lawyerId: data.lawyer_id
        });
      }

      setSlipVerifications(pending.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime()));
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, isAuthorized, toast]);

  const fetchTransactions = React.useCallback(async () => {
    if (!firestore || !isAuthorized) return;
    setIsLoading(true);

    try {
      const [appSnap, chatSnap, invSnap] = await Promise.all([
        getDocs(query(collection(firestore, 'appointments'), orderBy('createdAt', 'desc'), limit(150))),
        getDocs(query(collection(firestore, 'chats'), orderBy('lastMessageAt', 'desc'), limit(150))),
        getDocs(query(collection(firestore, 'invoices'), orderBy('createdAt', 'desc'), limit(150))),
      ]);

      const allTransactions: Transaction[] = [];
      const userIds = new Set<string>();

      [...appSnap.docs, ...chatSnap.docs, ...invSnap.docs].forEach(d => {
        const data = d.data();
        const uId = data.userId || data.client_id || data.participants?.[0];
        if (uId) userIds.add(uId);
      });

      const userProfiles: Record<string, string> = {};
      if (userIds.size > 0) {
        const ids = Array.from(userIds);
        for (let i = 0; i < ids.length; i += 30) {
          const chunk = ids.slice(i, i + 30);
          const snaps = await getDocs(query(collection(firestore, 'users'), where('__name__', 'in', chunk)));
          snaps.forEach(snapDoc => { userProfiles[snapDoc.id] = snapDoc.data().name || 'Unknown User'; });
        }
      }

      appSnap.docs.forEach(d => {
        const data = d.data();
        const amount = data.amount || 3500;
        if (data.status !== 'pending_payment' && amount > 0) {
          allTransactions.push({
            id: d.id,
            date: format(ensureDate(data.createdAt), 'd MMM yyyy', { locale: th }),
            description: `นัดหมาย`,
            clientName: userProfiles[data.userId] || 'Unknown Client',
            lawyerName: data.lawyerName || 'Unknown Lawyer',
            amount: amount,
            type: 'revenue',
            status: data.status === 'completed' || data.status === 'paid' ? 'completed' : 'pending',
            slipUrl: data.slipUrl || data.paymentProof || data.proofUrl,
            rawData: data
          });
        }
      });

      chatSnap.docs.forEach(d => {
        const data = d.data();
        const uId = data.userId || data.participants?.[0];
        
        // Aggressive slip detection for chats
        let slipUrl = data.slipUrl || data.pendingPaymentDetails?.slipUrl || data.proofUrl || data.paymentProof;
        
        // Check installments
        if (!slipUrl && Array.isArray(data.installments)) {
          const paidInst = data.installments.find((inst: any) => inst.slipUrl || inst.proofUrl);
          if (paidInst) slipUrl = paidInst.slipUrl || paidInst.proofUrl;
        }

        // Check dynamic installment pending fields
        if (!slipUrl) {
          const pendingKeys = Object.keys(data).filter(k => k.startsWith('pendingPaymentDetails_installment_'));
          for (const key of pendingKeys) {
            if (data[key]?.slipUrl) {
              slipUrl = data[key].slipUrl;
              break;
            }
          }
        }
        
        const attachments = data.attachments;
        if (!slipUrl && Array.isArray(attachments) && attachments.length > 0) {
          const firstImage = attachments.find((a: any) => a.url && (a.url.includes('r2.dev') || a.url.includes('firebasestorage') || a.name?.match(/\.(jpg|jpeg|png|webp)$/i)));
          if (firstImage) slipUrl = firstImage.url;
        }

        const amount = data.amount || data.totalPaid || data.pendingPaymentDetails?.amount || 0;
        if (amount > 0) {
          const receiptUrl = data.receiptUrl || data.invoiceUrl || data.pdfUrl || data.documentUrl;
          allTransactions.push({
            id: d.id,
            date: format(ensureDate(data.createdAt || data.lastMessageAt), 'd MMM yyyy', { locale: th }),
            description: `แชท/คดี`,
            clientName: userProfiles[uId] || 'Unknown Client',
            lawyerName: data.lawyerName || 'Unknown Lawyer',
            amount: amount,
            type: 'revenue',
            status: (data.status === 'paid' || data.status === 'active' || data.status === 'closed') ? 'completed' : 'pending',
            slipUrl: slipUrl,
            rawData: data,
            receiptUrl: receiptUrl
          });
        }
      });

      for (const d of invSnap.docs) {
        const data = d.data();
        const userName = data.clientInfo?.name || userProfiles[data.client_id] || data.clientName || 'Unknown User';
        let slipUrl = data.slipUrl || data.evidence_url || data.proofUrl || data.paymentProof || data.image || data.proof_url || data.slip_url;
        
        // If invoice is linked to a chat, try to find slip in the chat if missing here
        if (!slipUrl && data.chatId) {
          const chatDoc = chatSnap.docs.find(cd => cd.id === data.chatId);
          if (chatDoc) {
            const chatData = chatDoc.data();
            slipUrl = chatData.slipUrl || chatData.pendingPaymentDetails?.slipUrl || chatData.proofUrl;
            if (!slipUrl && Array.isArray(chatData.installments)) {
              const paidInst = chatData.installments.find((inst: any) => inst.slipUrl);
              if (paidInst) slipUrl = paidInst.slipUrl;
            }
          }
        }

        const amount = data.amount || 0;
        if (amount > 0) {
          const receiptUrl = data.receiptUrl || data.invoiceUrl || data.pdfUrl || data.documentUrl;
          allTransactions.push({
            id: d.id,
            date: format(ensureDate(data.paidAt || data.createdAt), 'd MMM yyyy', { locale: th }),
            description: `ใบแจ้งหนี้`,
            clientName: userName,
            lawyerName: 'ระบบ',
            amount: amount,
            type: 'revenue',
            status: data.status === 'paid' ? 'completed' : 'pending',
            slipUrl: slipUrl,
            rawData: data,
            receiptUrl: receiptUrl
          });
        }
      }

      setTransactions(allTransactions.sort((a, b) => b.id.localeCompare(a.id)));
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, isAuthorized, toast]);

  const handleApproveSlip = async (item: SlipVerificationItem) => {
    if (!firestore) return;
    
    const confirmApprove = window.confirm(`ยืนยันการอนุมัติสลิปยอด ฿${item.amount.toLocaleString()}?`);
    if (!confirmApprove) return;

    setIsLoading(true);
    try {
      const { approvePaymentSlipAction } = await import('@/app/actions/admin-actions');
      const result = await approvePaymentSlipAction({
        type: item.type.toLowerCase() as 'chat' | 'appointment',
        id: item.id,
        lawyerId: item.lawyerId || '',
        amount: item.amount,
        caseTitle: item.type === 'Chat' ? item.userName : undefined,
        payerName: item.userName
      });

      if (result.success) {
        toast({ title: 'สำเร็จ', description: 'อนุมัติการชำระเงินเรียบร้อยแล้ว' });
        fetchPendingPayments();
        fetchTransactions();
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (isAuthorized) {
      getFinancialStats(firestore!).then(setStats);
      if (activeTab === 'verification') fetchPendingPayments();
      else if (activeTab === 'transactions') fetchTransactions();
    }
  }, [isAuthorized, activeTab, fetchPendingPayments, fetchTransactions, firestore]);

  if (checkingAuth) return <div className="p-8 text-center">Checking permissions...</div>;
  if (!isAuthorized) return (
    <div className="p-8 text-center flex flex-col items-center gap-4">
      <ShieldAlert className="w-12 h-12 text-destructive opacity-50" />
      <h1 className="text-xl font-bold">Access Denied</h1>
      <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้ หรือไม่ได้ล็อกอินด้วยบัญชี Admin</p>
    </div>
  );

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-8 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financials (Complete View)</h1>
          <p className="text-muted-foreground">จัดการธุรกรรมและรายได้ทั้งหมดของแพลตฟอร์ม</p>
        </div>
        <Button onClick={() => activeTab === 'verification' ? fetchPendingPayments() : fetchTransactions()} disabled={isLoading}>
          {isLoading ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card><CardContent className="pt-6"><div className="text-sm font-medium text-muted-foreground">ยอดบริการรวม</div><div className="text-2xl font-bold">฿{stats.totalServiceValue.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm font-medium text-muted-foreground">รายได้แพลตฟอร์ม (เดือนนี้)</div><div className="text-2xl font-bold text-green-600">฿{stats.platformRevenueThisMonth.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm font-medium text-muted-foreground">รายได้แพลตฟอร์ม (รวม)</div><div className="text-2xl font-bold">฿{stats.platformTotalRevenue.toLocaleString()}</div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
          <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
          <TabsTrigger value="verification">ตรวจสลิป ({slipVerifications.length})</TabsTrigger>
          <TabsTrigger value="transactions">ธุรกรรม</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card><CardHeader><CardTitle>สถิติรายได้รายเดือน</CardTitle></CardHeader><CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={stats.monthlyData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="total" fill="#0f172a" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="verification" className="mt-4">
          <Card><Table>
            <TableHeader><TableRow><TableHead>วันที่</TableHead><TableHead>ลูกค้า</TableHead><TableHead>ยอด</TableHead><TableHead className="text-right">จัดการ</TableHead></TableRow></TableHeader>
            <TableBody>
              {slipVerifications.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8">ไม่มีรายการ</TableCell></TableRow> :
                slipVerifications.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{format(item.submittedAt, 'd MMM HH:mm', { locale: th })}</TableCell>
                    <TableCell>
                      {item.userName}<br/>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
                        {item.collectionName === 'chats' && (
                          <a href={getMainLink(`/chat/${item.id}?view=admin`, 'admin')} target="_blank" rel="noopener noreferrer">
                            <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-slate-200">ดูเคส</Badge>
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">฿{item.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="outline" size="sm" onClick={() => { 
                          const url = item.slipUrl;
                          if (!url) {
                            toast({ variant: 'default', title: 'แจ้งเตือน', description: 'ไม่พบไฟล์หลักฐานในระบบ' });
                            return;
                          }
                          setSelectedSlip({ url: url, amount: item.amount, lawyerName: item.lawyerName }); 
                          setIsVerifierOpen(true); 
                        }}><Eye className="w-3 h-3 mr-1" /> ดูสลิป</Button>
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApproveSlip(item)}
                        disabled={isLoading}
                      >
                        อนุมัติ
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table></Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card><Table>
            <TableHeader><TableRow><TableHead>วันที่</TableHead><TableHead>ลูกค้า / ทนาย</TableHead><TableHead>รายการ</TableHead><TableHead className="text-right">จำนวน</TableHead><TableHead className="text-right">หลักฐาน</TableHead></TableRow></TableHeader>
            <TableBody>
              {transactions.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8">ไม่มีข้อมูล</TableCell></TableRow> :
                transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{t.date}</TableCell>
                    <TableCell>
                      <div className="font-bold text-blue-900">{t.clientName || 'ไม่ระบุ'}</div>
                      <div className="text-[10px] text-muted-foreground">ทนาย: {t.lawyerName || 'ไม่ระบุ'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {t.description}
                          {t.slipUrl && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">มีสลิป</Badge>}
                        </div>
                        <div className="flex gap-1">
                          <Badge variant={t.status === 'completed' ? 'outline' : 'secondary'} className={t.status === 'completed' ? 'text-green-600' : ''}>
                            {t.status === 'completed' ? 'สำเร็จ' : 'รอดำเนินการ'}
                          </Badge>
                          {(t.description.includes('แชท/คดี') || t.description.includes('ใบแจ้งหนี้')) && (
                            <a href={getMainLink(`/chat/${t.id}?view=admin`, 'admin')} target="_blank" rel="noopener noreferrer">
                              <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-slate-200">ดูเคส</Badge>
                            </a>
                          )}
                          {t.receiptUrl && (
                            <a href={t.receiptUrl} target="_blank" rel="noopener noreferrer">
                              <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-slate-200 bg-blue-100 text-blue-700">ดูเอกสาร</Badge>
                            </a>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-slate-100">ตรวจสอบข้อมูลดิบ</Badge>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>ข้อมูลดิบของรายการ ({t.type})</DialogTitle>
                                <DialogDescription>ID: {t.id}</DialogDescription>
                              </DialogHeader>
                              <div class="rounded-md border bg-slate-50 p-4 font-mono text-[10px]">
                                <pre>{JSON.stringify(t.rawData, null, 2)}</pre>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">฿{t.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {t.slipUrl && <Button variant="ghost" size="sm" onClick={() => { setSelectedSlip({ url: t.slipUrl!, amount: t.amount, lawyerName: '...' }); setIsVerifierOpen(true); }}><Eye className="w-4 h-4" /></Button>}
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table></Card>
        </TabsContent>
      </Tabs>

      {selectedSlip && <SlipVerifier isOpen={isVerifierOpen} onClose={() => setIsVerifierOpen(false)} slipUrl={selectedSlip.url} expectedAmount={selectedSlip.amount} expectedLawyerName={selectedSlip.lawyerName} />}
    </main>
  );
}

export default function AdminFinancialsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">กำลังโหลด...</div>}>
      <FinancialsContent />
    </Suspense>
  );
}
