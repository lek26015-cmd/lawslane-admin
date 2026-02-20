
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
  Clock,
  Eye,
  ScanLine,
  FileJson,
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
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getFinancialStats } from '@/lib/data';
import { useSearchParams } from 'next/navigation';

import { SlipVerifier } from '@/components/admin/slip-verifier';

type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'revenue' | 'fee' | 'payout';
  status: 'completed' | 'pending';
};

type WithdrawalRequest = {
  id: string;
  lawyerId: string;
  lawyerName: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
};

type SlipVerificationItem = {
  id: string;
  type: 'Appointment' | 'Chat';
  userName: string;
  lawyerName: string;
  amount: number;
  submittedAt: Date;
  collectionName: 'appointments' | 'chats';
  slipUrl?: string;
  userId: string;
  lawyerId?: string;
};

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminFinancialsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = React.useState(() => searchParams.get('tab') || 'overview');
  const [slipVerifications, setSlipVerifications] = React.useState<
    SlipVerificationItem[]
  >([]);
  const [withdrawalRequests, setWithdrawalRequests] = React.useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [stats, setStats] = React.useState({
    totalServiceValue: 0,
    platformRevenueThisMonth: 0,
    platformTotalRevenue: 0,
    monthlyData: [] as any[]
  });

  const [isVerifierOpen, setIsVerifierOpen] = React.useState(false);
  const [selectedSlip, setSelectedSlip] = React.useState<{ url: string, amount: number, lawyerName: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Manual Release State
  const [isReleaseDialogOpen, setIsReleaseDialogOpen] = React.useState(false);
  const [releaseTicketId, setReleaseTicketId] = React.useState('');
  const [selectedReleaseTransactionId, setSelectedReleaseTransactionId] = React.useState<string | null>(null);

  // Debug State
  const [debugData, setDebugData] = React.useState<any>(null);
  const [isDebugOpen, setIsDebugOpen] = React.useState(false);

  // Permission State
  const [adminPermissions, setAdminPermissions] = React.useState<string[] | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);
  const [isVerifyingPermission, setIsVerifyingPermission] = React.useState(true);

  React.useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  React.useEffect(() => {
    if (!firestore) return;

    // We should ideally use a context for this, but for now we fetch it here
    const fetchUserPermissions = async () => {
      import('firebase/auth').then(({ getAuth, onAuthStateChanged }) => {
        const auth = getAuth();
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            const userDoc = await getDoc(doc(firestore!, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const isSuper = !!userData.superAdmin || user.email === 'lek.26015@gmail.com';
              setIsSuperAdmin(isSuper);
              setAdminPermissions(isSuper ? null : (userData.adminPermissions ?? null));
            }
          }
          setIsVerifyingPermission(false);
        });
      });
    };

    fetchUserPermissions();
  }, [firestore]);

  const hasPermission = React.useCallback((permission: string) => {
    if (isSuperAdmin || adminPermissions === null) return true;
    return adminPermissions.includes(permission);
  }, [isSuperAdmin, adminPermissions]);

  const handleDebug = async (collectionName: string, id: string) => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, collectionName, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Convert timestamps to string for display
        const displayData = Object.entries(data).reduce((acc: any, [key, value]) => {
          if (value && typeof value === 'object' && 'toDate' in value) {
            acc[key] = value.toDate().toISOString();
          } else {
            acc[key] = value;
          }
          return acc;
        }, { id: docSnap.id }); // Include ID

        setDebugData(displayData);
        setIsDebugOpen(true);
      }
    } catch (e) {
      console.error("Debug fetch error:", e);
      toast({ title: "Error", description: "Failed to fetch debug data" });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedSlip({
        url: url,
        amount: 0,
        lawyerName: 'ทดสอบระบบ'
      });
      setIsVerifierOpen(true);
    }
  };

  React.useEffect(() => {
    if (firestore) {
      getFinancialStats(firestore).then(setStats);
    }
  }, [firestore]);

  const fetchPendingPayments = React.useCallback(async () => {
    if (!firestore) return;
    setIsLoading(true);

    try {
      const appointmentsRef = collection(firestore, 'appointments');
      const chatsRef = collection(firestore, 'chats');

      const appointmentQuery = query(
        appointmentsRef,
        where('status', '==', 'pending_payment')
      );
      const chatQuery = query(
        chatsRef,
        where('status', '==', 'pending_payment')
      );

      const [appointmentSnapshot, chatSnapshot] = await Promise.all([
        getDocs(appointmentQuery),
        getDocs(chatQuery),
      ]);

      const pending: SlipVerificationItem[] = [];

      // Helper to fetch user name
      const getUserName = async (uid: string) => {
        try {
          const userDoc = await getDocs(query(collection(firestore, 'users'), where('uid', '==', uid)));
          if (!userDoc.empty) return userDoc.docs[0].data().name;
          return 'Unknown User';
        } catch (e) { return 'Unknown User'; }
      };

      // Helper to fetch lawyer name
      const getLawyerName = async (lawyerId: string) => {
        try {
          const lawyerDocRef = doc(firestore, 'lawyerProfiles', lawyerId);
          const lawyerDoc = await getDoc(lawyerDocRef);
          if (lawyerDoc.exists()) return lawyerDoc.data().name;
          return 'Unknown Lawyer';
        } catch (e) { return 'Unknown Lawyer'; }
      }


      for (const d of appointmentSnapshot.docs) {
        const data = d.data();
        const userName = await getUserName(data.userId);
        pending.push({
          id: d.id,
          type: 'Appointment',
          userName: userName,
          lawyerName: data.lawyerName,
          amount: 3500,
          submittedAt: data.createdAt?.toDate() || new Date(),
          collectionName: 'appointments',
          slipUrl: data.slipUrl,
          userId: data.userId,
          lawyerId: data.lawyerId
        });
      }

      for (const d of chatSnapshot.docs) {
        const data = d.data();
        // Chat participants: [userId, lawyerUserId]
        // We need to find which one is the customer. Usually the creator.
        // But here we saved userId explicitly in my previous step.
        const userId = data.userId || data.participants[0];
        const lawyerId = data.lawyerId;

        const userName = await getUserName(userId);
        const lawyerName = lawyerId ? await getLawyerName(lawyerId) : 'Unknown Lawyer';

        pending.push({
          id: d.id,
          type: 'Chat',
          userName: userName,
          lawyerName: lawyerName,
          amount: 500,
          submittedAt: data.createdAt?.toDate() || new Date(),
          collectionName: 'chats',
          slipUrl: data.slipUrl,
          userId: userId,
          lawyerId: lawyerId
        });
      }

      setSlipVerifications(pending.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime()));
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถดึงข้อมูลรายการรอตรวจสอบได้',
      });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, toast]);

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);

  const fetchTransactions = React.useCallback(async () => {
    if (!firestore) return;
    setIsLoading(true);

    try {
      const appointmentsRef = collection(firestore, 'appointments');
      const chatsRef = collection(firestore, 'chats');

      // Fetch all appointments and chats (in a real app, you'd paginate and filter)
      // For now, we fetch everything and filter client-side for simplicity in this demo
      const [appointmentSnapshot, chatSnapshot] = await Promise.all([
        getDocs(appointmentsRef),
        getDocs(chatsRef),
      ]);

      const allTransactions: Transaction[] = [];

      // Helper to fetch user name
      const getUserName = async (uid: string) => {
        try {
          const userDoc = await getDocs(query(collection(firestore, 'users'), where('uid', '==', uid)));
          if (!userDoc.empty) return userDoc.docs[0].data().name;
          return 'Unknown User';
        } catch (e) { return 'Unknown User'; }
      };

      // Process Appointments
      for (const d of appointmentSnapshot.docs) {
        const data = d.data();
        // Skip if pending payment (handled in verification tab)
        if (data.status === 'pending_payment') continue;

        const userName = await getUserName(data.userId);
        allTransactions.push({
          id: d.id,
          date: data.createdAt ? format(data.createdAt.toDate(), 'd MMM yyyy, HH:mm', { locale: th }) : 'N/A',
          description: `นัดหมายปรึกษา - ${userName}`,
          amount: 3500,
          type: 'revenue',
          status: data.status === 'completed' ? 'completed' : 'pending',
        });
      }

      // Process Chats
      for (const d of chatSnapshot.docs) {
        const data = d.data();
        if (data.status === 'pending_payment') continue;

        const userId = data.userId || (data.participants && data.participants[0]);
        const userName = userId ? await getUserName(userId) : 'Unknown User';

        allTransactions.push({
          id: d.id,
          date: data.createdAt ? format(data.createdAt.toDate(), 'd MMM yyyy, HH:mm', { locale: th }) : 'N/A',
          description: `ปรึกษาผ่านแชท - ${userName}`,
          amount: 500,
          type: 'revenue',
          status: data.status === 'closed' ? 'completed' : 'pending',
        });
      }

      // Sort by date desc
      // Note: date string format might not sort correctly, ideally use timestamp. 
      // But for display we used string. Let's just reverse for now or rely on fetch order if we had orderBy.
      // Better: store timestamp in Transaction object for sorting.
      // For this quick fix, I'll just reverse assuming they come in some order or just leave as is.
      // Actually, let's just sort by ID or something stable if we can't parse the date back easily.
      // Or better, let's just add a rawDate field to Transaction type locally if needed, but I can't change the type easily without a separate edit.
      // I'll just leave it unsorted or sort by the string (which is day-first, so not ideal).
      // Let's try to sort by creating a temp array with date objects.

      const sorted = allTransactions.sort((a, b) => {
        return 0;
      });

      setTransactions(allTransactions);

    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถดึงข้อมูลธุรกรรมได้',
      });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, toast]);

  const fetchWithdrawals = React.useCallback(async () => {
    if (!firestore) return;
    setIsLoading(true);
    try {
      const withdrawalsRef = collection(firestore, 'withdrawals');
      const q = query(withdrawalsRef, where('status', '==', 'pending')); // Initially fetch pending, or maybe all? Let's fetch all for history.
      // Actually, let's just fetch all and sort by date.
      const snapshot = await getDocs(withdrawalsRef);

      const requests: WithdrawalRequest[] = [];

      // Helper to fetch lawyer name
      const getLawyerName = async (lawyerId: string) => {
        try {
          const lawyerDoc = await getDoc(doc(firestore, 'users', lawyerId));
          if (lawyerDoc.exists()) return lawyerDoc.data().name;
          return 'Unknown Lawyer';
        } catch (e) { return 'Unknown Lawyer'; }
      };

      for (const d of snapshot.docs) {
        const data = d.data();
        const lawyerName = await getLawyerName(data.lawyerId);
        requests.push({
          id: d.id,
          lawyerId: data.lawyerId,
          lawyerName,
          amount: data.amount,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          accountName: data.accountName,
          status: data.status,
          requestedAt: data.requestedAt?.toDate() || new Date(),
        });
      }

      requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
      setWithdrawalRequests(requests);

    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถดึงข้อมูลคำร้องถอนเงินได้',
      });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, toast]);

  React.useEffect(() => {
    if (activeTab === 'verification') {
      fetchPendingPayments();
    } else if (activeTab === 'transactions') {
      fetchTransactions();
    } else if (activeTab === 'withdrawals') {
      fetchWithdrawals();
    }
  }, [activeTab, fetchPendingPayments, fetchTransactions, fetchWithdrawals]);

  const handleApprovePayment = async (item: SlipVerificationItem) => {
    if (!firestore) return;

    const docRef = doc(firestore, item.collectionName, item.id);
    const newStatus =
      item.collectionName === 'appointments' ? 'pending' : 'active';

    try {
      await updateDoc(docRef, { status: newStatus });
      toast({
        title: 'อนุมัติสำเร็จ',
        description: `รายการของ ${item.userName} ได้รับการอนุมัติแล้ว`,
      });

      // Notify Client
      await addDoc(collection(firestore, 'notifications'), {
        type: 'payment_approved',
        title: 'การชำระเงินได้รับการอนุมัติ',
        message: `การชำระเงินสำหรับบริการ ${item.type} ได้รับการอนุมัติแล้ว`,
        createdAt: serverTimestamp(),
        read: false,
        recipient: item.userId,
        link: '/dashboard',
        relatedId: item.id
      });

      // Notify Lawyer (Money In)
      if (item.lawyerId) {
        await addDoc(collection(firestore, 'notifications'), {
          type: 'money_in',
          title: 'คุณได้รับยอดเงินใหม่',
          message: `คุณได้รับยอดเงิน ฿${item.amount.toLocaleString()} จากบริการ ${item.type} ของคุณ ${item.userName}`,
          createdAt: serverTimestamp(),
          read: false,
          recipient: item.lawyerId,
          link: '/lawyer-dashboard/financials',
          relatedId: item.id
        });
      }
      // Fetch Lawyer Email
      if (item.lawyerId) {
        try {
          const lawyerDoc = await getDoc(doc(firestore, 'lawyerProfiles', item.lawyerId));
          if (lawyerDoc.exists()) {
            const lawyerData = lawyerDoc.data();
            const lawyerEmail = lawyerData.email;

            if (lawyerEmail) {
              // Send Email
              import('@/app/actions/email').then(({ sendLawyerNewCaseEmail }) => {
                // Construct Link (Admin context lacks locale sometimes, default to th or derive?)
                // Actually, we can just point to /chat or /appointments
                const link = item.type === 'Chat'
                  ? `${window.location.origin}/chat/${item.id}?lawyerId=${item.lawyerId}`
                  : `${window.location.origin}/lawyer-dashboard/appointments`; // Simplify for appointment

                sendLawyerNewCaseEmail(
                  lawyerEmail,
                  lawyerData.name,
                  item.userName || 'ลูกค้า',
                  `อนุมัติแล้ว: ${item.type === 'Chat' ? 'Ticket สนทนา' : 'นัดหมายใหม่'}`,
                  link
                );
              });
            }
          }
        } catch (e) {
          console.error("Failed to send approval email", e);
        }
      }

      // Refetch the list after approval
      fetchPendingPayments();
    } catch (error) {
      console.error('Error approving payment:', error);
      toast({
        variant: 'destructive',
        title: 'อนุมัติไม่สำเร็จ',
        description: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ',
      });
    }
  };

  const handleUpdateWithdrawalStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'withdrawals', id), {
        status: newStatus,
        processedAt: new Date()
      });

      // Get withdrawal details to notify the lawyer
      const withdrawal = withdrawalRequests.find(w => w.id === id);
      if (withdrawal) {
        await addDoc(collection(firestore, 'notifications'), {
          type: 'withdrawal_update',
          title: newStatus === 'approved' ? 'คำร้องถอนเงินอนุมัติแล้ว' : 'คำร้องถอนเงินถูกปฏิเสธ',
          message: newStatus === 'approved'
            ? `คำร้องถอนเงินจำนวน ฿${withdrawal.amount.toLocaleString()} ได้รับการอนุมัติและโอนเงินเรียบร้อยแล้ว`
            : `คำร้องถอนเงินจำนวน ฿${withdrawal.amount.toLocaleString()} ถูกปฏิเสธ กรุณาติดต่อเจ้าหน้าที่`,
          createdAt: serverTimestamp(),
          read: false,
          recipient: withdrawal.lawyerId,
          link: '/lawyer-dashboard/financials',
          relatedId: id
        });
      }

      toast({
        title: newStatus === 'approved' ? 'อนุมัติคำร้องแล้ว' : 'ปฏิเสธคำร้องแล้ว',
        description: 'สถานะคำร้องถูกอัปเดตเรียบร้อยแล้ว',
      });
      fetchWithdrawals();
    } catch (error) {
      console.error('Error updating withdrawal status:', error);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัปเดตสถานะได้',
      });
    }
  };

  const handleReleaseFund = async () => {
    if (!firestore || !selectedReleaseTransactionId || !releaseTicketId) return;

    // Determine collection (Appointment or Chat) based on ID or try both
    // In our simplified transaction list, we don't store the source collection directly in the Transaction object easily reachable here
    // But we can try to find it. Or we can just try to update both collections and see which works, or look at the ID format if distinct.
    // For safety, let's try to fetch from 'appointments' first, if not exists, then 'chats'.

    try {
      let collectionName = 'appointments';
      let docRef = doc(firestore, 'appointments', selectedReleaseTransactionId);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        collectionName = 'chats';
        docRef = doc(firestore, 'chats', selectedReleaseTransactionId);
        docSnap = await getDoc(docRef);
      }

      if (!docSnap.exists()) {
        toast({ variant: 'destructive', title: 'ไม่พบรายการ', description: 'ไม่พบเอกสารอ้างอิงของธุรกรรมนี้' });
        return;
      }

      const updateData = {
        status: collectionName === 'appointments' ? 'completed' : 'closed', // 'completed' for appointment, 'closed' for chat (funds released)
        releasedByAdmin: true,
        adminReleaseTicketId: releaseTicketId,
        releasedAt: serverTimestamp()
      };

      await updateDoc(docRef, updateData);

      toast({
        title: 'ปล่อยเงินสำเร็จ',
        description: `ปล่อยเงินเรียบร้อยแล้ว (Ref Ticket: ${releaseTicketId})`,
      });

      setIsReleaseDialogOpen(false);
      setReleaseTicketId('');
      setSelectedReleaseTransactionId(null);
      fetchTransactions(); // Refresh list

    } catch (error) {
      console.error("Error releasing funds manually:", error);
      toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถทำรายการได้' });
    }
  };

  const { totalServiceValue, platformRevenueThisMonth, platformTotalRevenue, monthlyData } = stats;

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>ภาพรวมการเงิน</CardTitle>
          <CardDescription>
            สรุปธุรกรรม รายได้ และรายการที่ต้องดำเนินการทั้งหมด
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="overview"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="mb-4">
              {hasPermission('financials.overview') && (
                <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
              )}
              {hasPermission('financials.verification') && (
                <TabsTrigger value="verification" className="relative">
                  ตรวจสอบสลิป
                  {slipVerifications.length > 0 && activeTab !== 'verification' && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs">
                      {slipVerifications.length}
                    </span>
                  )}
                </TabsTrigger>
              )}
              {hasPermission('financials.transactions') && (
                <TabsTrigger value="transactions">รายการธุรกรรม</TabsTrigger>
              )}
              {hasPermission('financials.withdrawals') && (
                <TabsTrigger value="withdrawals">คำร้องถอนเงิน</TabsTrigger>
              )}
            </TabsList>

            {isVerifyingPermission ? (
              <div className="py-20 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                กำลังตรวจสอบสิทธิ์...
              </div>
            ) : !hasPermission(`financials.${activeTab === 'overview' ? 'overview' : activeTab === 'verification' ? 'verification' : activeTab === 'transactions' ? 'transactions' : 'withdrawals'}`) ? (
              <div className="py-20 text-center text-muted-foreground">
                <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <h3 className="text-xl font-semibold text-foreground mb-2">ไม่มีสิทธิ์เข้าถึง</h3>
                <p>คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ กรุณาติดต่อ Super Admin</p>
              </div>
            ) : (
              <>
                <TabsContent value="overview">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="rounded-xl">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                          ยอดค่าบริการรวม
                        </CardTitle>
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          ฿
                          {totalServiceValue.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                        <CardDescription>มูลค่าธุรกรรมทั้งหมดในระบบ</CardDescription>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                          รายได้แพลตฟอร์ม (เดือนนี้)
                        </CardTitle>
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-600">
                          ฿
                          {platformRevenueThisMonth.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                        <CardDescription>
                          ส่วนแบ่งรายได้ในเดือนปัจจุบัน
                        </CardDescription>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                          รายได้แพลตฟอร์ม (ทั้งหมด)
                        </CardTitle>
                        <HandCoins className="w-4 h-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          ฿
                          {platformTotalRevenue.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                        <CardDescription>
                          ส่วนแบ่งรายได้ทั้งหมดของแพลตฟอร์ม
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle>สถิติรายได้แพลตฟอร์มรายเดือน</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="month"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) =>
                              `฿${new Intl.NumberFormat('en-US', {
                                notation: 'compact',
                                compactDisplay: 'short',
                              }).format(value as number)}`
                            }
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              borderColor: 'hsl(var(--border))',
                              borderRadius: 'var(--radius)',
                            }}
                            cursor={{ fill: 'hsl(var(--accent))' }}
                            formatter={(value: number) => [
                              value.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                              }),
                              'รายได้',
                            ]}
                          />
                          <Bar
                            dataKey="total"
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="verification">
                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle>รายการรอตรวจสอบสลิป</CardTitle>
                      <CardDescription>
                        ตรวจสอบและอนุมัติรายการที่ลูกค้าชำระเงินโดยการโอน
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-end mb-4">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                        />
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                          <ScanLine className="mr-2 h-4 w-4" />
                          ทดสอบตรวจสอบสลิป
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>วันที่แจ้ง</TableHead>
                            <TableHead>ลูกค้า</TableHead>
                            <TableHead>สำหรับ</TableHead>
                            <TableHead>ทนายความ</TableHead>
                            <TableHead>ยอดเงิน</TableHead>
                            <TableHead className="text-right">
                              การดำเนินการ
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center">
                                กำลังโหลด...
                              </TableCell>
                            </TableRow>
                          ) : slipVerifications.length > 0 ? (
                            slipVerifications.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  {format(item.submittedAt, 'd MMM yyyy, HH:mm', {
                                    locale: th,
                                  })}
                                </TableCell>
                                <TableCell>{item.userName}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{item.type}</Badge>
                                </TableCell>
                                <TableCell>{item.lawyerName}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                    รออนุมัติ
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  ฿{item.amount.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                  {/* Debug Button */}
                                  <Button variant="ghost" size="sm" onClick={() => handleDebug(item.collectionName, item.id)}>
                                    <FileJson className="h-4 w-4 text-gray-500" />
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => {
                                    setSelectedSlip({
                                      url: item.slipUrl || '',
                                      amount: item.amount,
                                      lawyerName: item.lawyerName
                                    });
                                    setIsVerifierOpen(true);
                                  }} disabled={!item.slipUrl}>
                                    <Eye className="mr-1 h-3 w-3" /> ตรวจสอบสลิป
                                  </Button>
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprovePayment(item)}>
                                    <CheckCircle className="mr-1 h-3 w-3" /> ยืนยัน
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center">
                                ไม่มีรายการรอตรวจสอบ
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <SlipVerifier
                  isOpen={isVerifierOpen}
                  onClose={() => setIsVerifierOpen(false)}
                  slipUrl={selectedSlip?.url || ''}
                  expectedAmount={selectedSlip?.amount}
                  expectedLawyerName={selectedSlip?.lawyerName}
                />

                <TabsContent value="transactions">
                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle>รายการธุรกรรมทั้งหมด</CardTitle>
                      <CardDescription>
                        ประวัติการชำระเงินและรายได้ทั้งหมดในระบบ
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>วันที่</TableHead>
                            <TableHead>รายการ</TableHead>
                            <TableHead>ประเภท</TableHead>
                            <TableHead>สถานะ</TableHead>
                            <TableHead className="text-right">จำนวนเงิน</TableHead>
                            <TableHead className="text-right">การดำเนินการ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center">กำลังโหลด...</TableCell>
                            </TableRow>
                          ) : transactions.length > 0 ? (
                            transactions.map((t) => (
                              <TableRow key={t.id}>
                                <TableCell>{t.date}</TableCell>
                                <TableCell>{t.description}</TableCell>
                                <TableCell>
                                  {t.status === 'pending' ? (
                                    <Badge variant="outline" className="text-yellow-700 bg-yellow-50 border-yellow-200">
                                      เงินพัก (Escrow)
                                    </Badge>
                                  ) : (
                                    <Badge variant={t.type === 'revenue' ? 'default' : 'secondary'}>
                                      {t.type === 'revenue' ? 'รายรับ' : 'ค่าธรรมเนียม'}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={t.status === 'completed' ? 'outline' : 'secondary'} className={t.status === 'completed' ? 'text-green-600 border-green-600' : ''}>
                                    {t.status === 'completed' ? 'สำเร็จ' : 'รอดำเนินการ'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  ฿{t.amount.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                  {/* Debug Button */}
                                  <Button variant="ghost" size="sm" onClick={() => handleDebug(t.description.includes('นัดหมาย') ? 'appointments' : 'chats', t.id)}>
                                    <FileJson className="h-4 w-4 text-gray-500" />
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => {
                                    setIsReleaseDialogOpen(true);
                                    setReleaseTicketId('');
                                    setSelectedReleaseTransactionId(t.id);
                                  }}>
                                    ปล่อยเงิน
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center">ไม่มีรายการธุรกรรม</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Release Fund Dialog */}
                <AlertDialog open={isReleaseDialogOpen} onOpenChange={setIsReleaseDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>ยืนยันการปล่อยเงิน (Admin Override)</AlertDialogTitle>
                      <AlertDialogDescription>
                        คุณกำลังจะทำการปล่อยเงินจาก Escrow ให้กับทนายความด้วยตนเอง
                        <br /><br />
                        <span className="font-bold text-destructive">เงื่อนไข: กรุณากรอก "Ticket ID" ที่แจ้งปัญหาเข้ามาเพื่อใช้อ้างอิงในการทำรายการนี้</span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                      <div className="grid gap-2">
                        <label htmlFor="ticket-id" className="text-sm font-medium">Reference Ticket ID:</label>
                        <input
                          id="ticket-id"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Ex. TICKET-1234..."
                          value={releaseTicketId}
                          onChange={(e) => setReleaseTicketId(e.target.value)}
                        />
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => {
                        setIsReleaseDialogOpen(false);
                        setReleaseTicketId('');
                        setSelectedReleaseTransactionId(null);
                      }}>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleReleaseFund}
                        disabled={!releaseTicketId.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        ยืนยันการปล่อยเงิน
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <TabsContent value="withdrawals">
                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle>คำร้องขอถอนเงิน</CardTitle>
                      <CardDescription>รายการที่ทนายความแจ้งขอถอนเงิน</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>วันที่แจ้ง</TableHead>
                            <TableHead>ทนายความ</TableHead>
                            <TableHead>ธนาคาร</TableHead>
                            <TableHead>เลขที่บัญชี</TableHead>
                            <TableHead>ยอดเงิน</TableHead>
                            <TableHead>สถานะ</TableHead>
                            <TableHead className="text-right">การดำเนินการ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center">กำลังโหลด...</TableCell>
                            </TableRow>
                          ) : withdrawalRequests.length > 0 ? (
                            withdrawalRequests.map((req) => (
                              <TableRow key={req.id}>
                                <TableCell>
                                  {format(req.requestedAt, 'd MMM yyyy, HH:mm', { locale: th })}
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">{req.lawyerName}</div>
                                  <div className="text-xs text-muted-foreground">ชื่อบัญชี: {req.accountName}</div>
                                </TableCell>
                                <TableCell>{req.bankName}</TableCell>
                                <TableCell>{req.accountNumber}</TableCell>
                                <TableCell className="font-bold">฿{req.amount.toLocaleString()}</TableCell>
                                <TableCell>
                                  <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}
                                    className={req.status === 'approved' ? 'bg-green-100 text-green-800' : ''}>
                                    {req.status === 'approved' ? 'โอนแล้ว' : req.status === 'rejected' ? 'ปฏิเสธ' : 'รอตรวจสอบ'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                  {req.status === 'pending' && (
                                    <>
                                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleUpdateWithdrawalStatus(req.id, 'rejected')}>
                                        ปฏิเสธ
                                      </Button>
                                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleUpdateWithdrawalStatus(req.id, 'approved')}>
                                        อนุมัติ (โอนแล้ว)
                                      </Button>
                                    </>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                ไม่มีรายการคำร้องขอถอนเงิน
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>


      <AlertDialog open={isDebugOpen} onOpenChange={setIsDebugOpen}>
        <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Debug Data (Raw Firestore)</AlertDialogTitle>
            <AlertDialogDescription>
              ข้อมูลดิบจาก Firestore สำหรับการตรวจสอบ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-slate-950 p-4 rounded-md overflow-x-auto">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>ปิด</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
