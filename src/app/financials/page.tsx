
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
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getFinancialStats, ensureDate } from '@/lib/data';
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
};

function FinancialsContent() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = React.useState('overview');
  const [slipVerifications, setSlipVerifications] = React.useState<SlipVerificationItem[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
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

  // Simple Admin Check
  const [isAuthorized, setIsAuthorized] = React.useState(false);
  const [checkingAuth, setCheckingAuth] = React.useState(true);

  React.useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  React.useEffect(() => {
    if (!firestore) return;
    
    // Quick admin check
    const checkAdmin = async () => {
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(firestore, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.role === 'admin' || data.superAdmin === true || data.superAdmin === 'true' || user.email === 'lek.26015@gmail.com') {
              setIsAuthorized(true);
            }
          }
        }
      } catch (e) {
        console.error("Auth check error", e);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAdmin();
  }, [firestore]);

  // Fetch functions with simplified logic
  const fetchData = React.useCallback(async () => {
    if (!firestore || !isAuthorized) return;
    setIsLoading(true);

    try {
      // Fetch Stats
      const financialStats = await getFinancialStats(firestore);
      setStats(financialStats);

      // Fetch Pending
      const pending: SlipVerificationItem[] = [];
      
      const appSnap = await getDocs(query(collection(firestore, 'appointments'), where('status', '==', 'pending_payment'), limit(50)));
      const chatSnap = await getDocs(query(collection(firestore, 'chats'), where('status', '==', 'pending_payment'), limit(50)));
      const invSnap = await getDocs(query(collection(firestore, 'invoices'), where('status', '==', 'pending_verification'), limit(50)));

      // Process with individual name fetching if needed, but keep it safe
      for (const d of appSnap.docs) {
        const data = d.data();
        if (data.slipUrl || data.hasNewPayment) {
          pending.push({
            id: d.id,
            type: 'Appointment',
            userName: 'Loading...',
            lawyerName: 'Loading...',
            amount: data.amount || 3500,
            submittedAt: ensureDate(data.createdAt),
            collectionName: 'appointments',
            slipUrl: data.slipUrl,
            userId: data.userId,
            lawyerId: data.lawyerId
          });
        }
      }

      for (const d of chatSnap.docs) {
        const data = d.data();
        const slipUrl = data.pendingPaymentDetails?.slipUrl || data.slipUrl;
        if (slipUrl) {
          pending.push({
            id: d.id,
            type: 'Chat',
            userName: 'Loading...',
            lawyerName: 'Loading...',
            amount: data.pendingPaymentDetails?.amount || data.amount || 0,
            submittedAt: ensureDate(data.pendingPaymentDetails?.submittedAt || data.createdAt),
            collectionName: 'chats',
            slipUrl: slipUrl,
            userId: data.userId || data.participants?.[0],
            lawyerId: data.lawyerId
          });
        }
      }

      setSlipVerifications(pending);

      // Fetch Transactions (Simplified)
      const allTx: Transaction[] = [];
      const txSnap = await getDocs(query(collection(firestore, 'invoices'), where('status', '==', 'paid'), limit(50)));
      txSnap.docs.forEach(d => {
        const data = d.data();
        allTx.push({
          id: d.id,
          date: format(ensureDate(data.paidAt || data.createdAt), 'd MMM yyyy', { locale: th }),
          description: `Invoice - ${d.id}`,
          amount: data.amount,
          type: 'revenue',
          status: 'completed',
          slipUrl: data.evidence_url
        });
      });
      setTransactions(allTx);

    } catch (error: any) {
      console.error("Data fetch error", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || "Failed to fetch data"
      });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, isAuthorized, toast]);

  React.useEffect(() => {
    if (isAuthorized) fetchData();
  }, [isAuthorized, fetchData]);

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
          <h1 className="text-2xl font-bold tracking-tight">Financials (Stable Mode)</h1>
          <p className="text-muted-foreground">จัดการข้อมูลการเงินและความปลอดภัย</p>
        </div>
        <Button onClick={fetchData} disabled={isLoading}>
          {isLoading ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ยอดบริการรวม</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{stats.totalServiceValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">รายได้เดือนนี้</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">฿{stats.platformRevenueThisMonth.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">รายได้ทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{stats.platformTotalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
          <TabsTrigger value="verification">ตรวจสอบสลิป ({slipVerifications.length})</TabsTrigger>
          <TabsTrigger value="transactions">ธุรกรรม</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>แนวโน้มรายได้</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#0f172a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>จำนวนเงิน</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slipVerifications.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">ไม่มีรายการรอตรวจสอบ</TableCell></TableRow>
                ) : (
                  slipVerifications.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{format(item.submittedAt, 'd MMM HH:mm', { locale: th })}</TableCell>
                      <TableCell><Badge variant="outline">{item.type}</Badge></TableCell>
                      <TableCell className="font-bold">฿{item.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setSelectedSlip({ url: item.slipUrl || '', amount: item.amount, lawyerName: '...' });
                          setIsVerifierOpen(true);
                        }}><Eye className="w-4 h-4 mr-1" /> ดูสลิป</Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">อนุมัติ</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>รายการ</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">ไม่มีข้อมูลธุรกรรม</TableCell></TableRow>
                ) : (
                  transactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{t.date}</TableCell>
                      <TableCell>{t.description}</TableCell>
                      <TableCell className="text-right font-bold">฿{t.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedSlip && (
        <SlipVerifier
          isOpen={isVerifierOpen}
          onClose={() => setIsVerifierOpen(false)}
          slipUrl={selectedSlip.url}
          expectedAmount={selectedSlip.amount}
          expectedLawyerName={selectedSlip.lawyerName}
        />
      )}
    </main>
  );
}

export default function AdminFinancialsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading Page...</div>}>
      <FinancialsContent />
    </Suspense>
  );
}
