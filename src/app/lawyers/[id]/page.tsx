
'use client'

import * as React from 'react'
import {
  ChevronLeft,
  Download,
  ShieldCheck,
  ShieldX,
  Clock,
  MoreVertical,
  User,
  FileText,
  Eye,
  Upload,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SecureImage } from '@/components/secure-image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getLawyerById } from '@/lib/data'
import type { LawyerProfile, GpCoupon } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
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
import { useFirebase, initializeFirebase } from '@/firebase'
import { doc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Trash2 } from "lucide-react"

export default function AdminLawyerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { id } = params
  const { toast } = useToast()
  const { firestore } = useFirebase();

  const [cases, setCases] = React.useState<any[]>([]);
  const [lawyer, setLawyer] = React.useState<LawyerProfile | null>(null);
  const [currentDate, setCurrentDate] = React.useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [duplicateLawyers, setDuplicateLawyers] = React.useState<LawyerProfile[]>([]);

  // GP Coupon state
  const [gpCoupons, setGpCoupons] = React.useState<GpCoupon[]>([]); // all active coupons
  const [assignedCoupons, setAssignedCoupons] = React.useState<GpCoupon[]>([]); // coupons assigned to this lawyer
  const [isGpDialogOpen, setIsGpDialogOpen] = React.useState(false);
  const [selectedGpCouponId, setSelectedGpCouponId] = React.useState<string>('');
  const [isAssigning, setIsAssigning] = React.useState(false);

  const fetchGpCoupons = React.useCallback(async () => {
    if (!firestore || !id) return;
    try {
      const snapshot = await getDocs(collection(firestore, 'gpCoupons'));
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as GpCoupon[];
      setGpCoupons(all.filter(c => c.isActive));
      setAssignedCoupons(all.filter(c => c.assignedTo?.includes(id as string)));
    } catch (e) {
      console.error('Error fetching GP coupons:', e);
    }
  }, [firestore, id]);

  React.useEffect(() => {
    setCurrentDate(new Date().toISOString());
    if (!firestore || !id) return;

    getLawyerById(firestore, id as string).then(async (foundLawyer) => {
      let mergedLawyer = foundLawyer;
      if (foundLawyer) {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const userSnap = await getDoc(doc(firestore, 'users', id as string));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            
            // Populate the User Data Inspector div directly for speed
            const inspector = document.getElementById('user-data-inspector');
            if (inspector) {
              const tableHtml = `
                <div class="rounded-md border bg-white overflow-hidden max-h-[400px] overflow-y-auto">
                  <table class="w-full text-[10px] font-mono">
                    <thead class="bg-slate-50">
                      <tr><th class="p-2 border text-left">Field</th><th class="p-2 border text-left">Value</th></tr>
                    </thead>
                    <tbody>
                      ${Object.entries(userData).map(([k, v]) => `
                        <tr>
                          <td class="p-2 border font-bold">${k}</td>
                          <td class="p-2 border break-all">${typeof v === 'string' && (v.startsWith('http') || v.includes('/')) ? `<a href="${v}" target="_blank" class="text-blue-600 underline">${v}</a>` : String(v)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `;
              inspector.innerHTML = tableHtml;
              inspector.className = ""; // Remove centering
            }

            mergedLawyer = {
              ...foundLawyer,
              licenseUrl: foundLawyer.licenseUrl || userData.licenseUrl || userData.license_url || userData.lawyer_license || '',
              idCardUrl: foundLawyer.idCardUrl || userData.idCardUrl || userData.id_card_url || userData.id_card || '',
              imageUrl: foundLawyer.imageUrl || userData.imageUrl || userData.avatar || userData.photoURL || foundLawyer.imageUrl
            };
          }
        } catch (e) {
          console.error("Error merging user data:", e);
        }
      }

      setLawyer(mergedLawyer || null);

      if (mergedLawyer) {
        // Check for duplicates
        const lawyersRef = collection(firestore, 'lawyerProfiles');
        // Check by Name
        const nameQuery = query(lawyersRef, where('name', '==', foundLawyer.name));
        const nameSnapshot = await getDocs(nameQuery);

        // Check by License Number
        const licenseQuery = query(lawyersRef, where('licenseNumber', '==', foundLawyer.licenseNumber));
        const licenseSnapshot = await getDocs(licenseQuery);

        const duplicates = new Map<string, LawyerProfile>();

        nameSnapshot.docs.forEach(doc => {
          if (doc.id !== foundLawyer.id) {
            duplicates.set(doc.id, { id: doc.id, ...doc.data() } as LawyerProfile);
          }
        });

        licenseSnapshot.docs.forEach(doc => {
          if (doc.id !== foundLawyer.id) {
            duplicates.set(doc.id, { id: doc.id, ...doc.data() } as LawyerProfile);
          }
        });

        setDuplicateLawyers(Array.from(duplicates.values()));
      }
    });

    // Fetch real cases
    import('@/lib/data').then(({ getLawyerDashboardData }) => {
      getLawyerDashboardData(firestore, id as string).then(data => {
        setCases([...data.activeCases, ...data.completedCases]);
      });
    });

    fetchGpCoupons();
  }, [id, firestore, fetchGpCoupons]);

  const handleAssignGpCoupon = async () => {
    if (!firestore || !selectedGpCouponId || !id) return;
    setIsAssigning(true);
    try {
      await updateDoc(doc(firestore, 'gpCoupons', selectedGpCouponId), {
        assignedTo: arrayUnion(id as string)
      });
      toast({ title: 'สำเร็จ', description: 'มอบหมายคูปอง GP เรียบร้อยแล้ว' });
      setIsGpDialogOpen(false);
      setSelectedGpCouponId('');
      fetchGpCoupons();
    } catch (e) {
      console.error('Error assigning GP coupon:', e);
      toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถมอบหมายคูปองได้' });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignGpCoupon = async (couponId: string) => {
    if (!firestore || !id) return;
    try {
      await updateDoc(doc(firestore, 'gpCoupons', couponId), {
        assignedTo: arrayRemove(id as string)
      });
      toast({ title: 'สำเร็จ', description: 'ยกเลิกการมอบหมายคูปอง GP แล้ว' });
      fetchGpCoupons();
    } catch (e) {
      console.error('Error unassigning GP coupon:', e);
      toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถยกเลิกคูปองได้' });
    }
  };

  const handleStatusChange = (newStatus: LawyerProfile['status']) => {
    if (!lawyer || !firestore) return;

    const lawyerRef = doc(firestore, 'lawyerProfiles', lawyer.id);
    const updateData: any = { status: newStatus };
    if (newStatus === 'rejected') {
      updateData.rejectionReason = rejectionReason;
    }

    updateDoc(lawyerRef, updateData).then(() => {
      toast({
        title: 'เปลี่ยนสถานะสำเร็จ',
        description: `สถานะของ ${lawyer.name} ถูกเปลี่ยนเป็น "${newStatus}"`,
      });
      setLawyer(prev => prev ? { ...prev, status: newStatus } : null);

      if (newStatus === 'rejected') {
        setIsRejectDialogOpen(false);
        // Open Mail Client
        const subject = encodeURIComponent("แจ้งผลการสมัคร Lawslane: ไม่ผ่านการเกณฑ์เบื้องต้น");
        const body = encodeURIComponent(`เรียนคุณ ${lawyer.name},

ทาง Lawslane ขอแจ้งผลการพิจารณาการสมัครสมาชิกทนายความของคุณ

ผลการพิจารณา: ไม่ผ่านการอนุมัติ
เนื่องจาก: ${rejectionReason}

คำแนะนำ: กรุณาเตรียมเอกสารหรือข้อมูลให้ครบถ้วนและทำการส่งใบสมัครเข้ามาใหม่

ขอแสดงความนับถือ,
ทีมงาน Lawslane`);
        window.location.href = `mailto:${lawyer.email}?subject=${subject}&body=${body}`;
        setRejectionReason("");
      }

    }).catch(err => {
      console.error(err);
      toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถเปลี่ยนสถานะได้' })
    })
  };

  if (!lawyer) {
    return <div>Loading...</div>
  }

  const statusBadges: Record<LawyerProfile['status'], React.ReactNode> = {
    approved: <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 gap-1"><ShieldCheck className="w-3 h-3" />อนุมัติแล้ว</Badge>,
    pending: <Badge variant="outline" className="border-yellow-600 text-yellow-700 bg-yellow-50 gap-1"><Clock className="w-3 h-3" />รอตรวจสอบ</Badge>,
    rejected: <Badge variant="destructive" className="bg-red-100/50 text-red-800 border-red-200/50 gap-1"><ShieldX className="w-3 h-3" />ถูกปฏิเสธ</Badge>,
    suspended: <Badge variant="destructive" className="gap-1"><ShieldX className="w-3 h-3" />ถูกระงับ</Badge>,
  }

  // Prepare documents for rendering with multiple field name fallbacks
  const documents = [
    { 
      name: 'ใบอนุญาตว่าความ', 
      url: lawyer.licenseUrl || (lawyer as any).license_url || (lawyer as any).lawyer_license || (lawyer as any).license,
      id: 'license'
    },
    { 
      name: 'สำเนาบัตรประชาชน', 
      url: lawyer.idCardUrl || (lawyer as any).id_card_url || (lawyer as any).id_card || (lawyer as any).idcard,
      id: 'idCard'
    },
  ];

  // Search for any other fields that look like URLs or documents
  const otherDocs = Object.entries(lawyer)
    .filter(([key, value]) => {
      if (typeof value !== 'string') return false;
      const k = key.toLowerCase();
      const v = value.toLowerCase();
      // Skip fields already included
      if (['licenseurl', 'idcardurl', 'imageurl'].includes(k)) return false;
      // Look for URL patterns or document keywords
      return (k.includes('url') || k.includes('doc') || k.includes('file') || k.includes('slip') || k.includes('proof')) 
             && (v.startsWith('http') || v.startsWith('lawyer_documents/') || v.startsWith('payments/'));
    })
    .map(([key, value]) => ({
      name: `เอกสารเพิ่มเติม (${key})`,
      url: value as string,
      id: key
    }));

  // Logic to determine signup type based on document presence
  const isExpressSignup = !lawyer.idCardUrl && !lawyer.licenseUrl;

  const handleViewDocument = async (url: string | undefined) => {
    if (!url || url === '#' || url === '') {
      toast({
        variant: "destructive",
        title: "ไม่พบเอกสาร",
        description: "เอกสารนี้ยังไม่ได้ถูกอัปโหลด",
      });
      return;
    }

    if (url.startsWith('http')) {
      window.open(url, '_blank');
      return;
    }

    // Resolve Firebase path
    try {
      const { storage } = initializeFirebase();
      if (!storage) throw new Error("Storage not initialized");
      const { ref, getDownloadURL } = await import('firebase/storage');
      const storageRef = ref(storage, url);
      const downloadUrl = await getDownloadURL(storageRef);
      window.open(downloadUrl, '_blank');
    } catch (e) {
      console.error('Error viewing document:', e);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเปิดดูเอกสารได้ในขณะนี้",
      });
    }
  };

  const handleDownloadDocument = async (url: string) => {
    if (!url) return;
    try {
      let downloadUrl = url;
      if (!url.startsWith('http')) {
        const { storage } = initializeFirebase();
        const { ref, getDownloadURL } = await import('firebase/storage');
        const storageRef = ref(storage, url);
        downloadUrl = await getDownloadURL(storageRef);
      }
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error downloading document:', e);
      toast({
        variant: "destructive",
        title: "ดาวน์โหลดไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการดึงไฟล์"
      });
    }
  };
  return (
    <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
      <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
        <div className="flex items-center gap-4">
          <Link href="/lawyers">
            <Button variant="outline" size="icon" className="h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">กลับ</span>
            </Button>
          </Link>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            โปรไฟล์ทนายความ
          </h1>
          <div className="ml-auto sm:ml-0">
            {statusBadges[lawyer.status]}
          </div>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Link href={`/lawyers/${id}/edit`}>
              <Button variant="outline" size="sm">แก้ไขข้อมูล</Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">การดำเนินการ</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleStatusChange('approved')} disabled={lawyer.status === 'approved'}>
                  อนุมัติ
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('pending')} disabled={lawyer.status === 'pending'}>
                  ย้ายไปรอตรวจสอบ
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('suspended')} disabled={lawyer.status === 'suspended'} className="text-orange-600">
                  ระงับการใช้งาน
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); setIsRejectDialogOpen(true); }}
                  className="text-destructive"
                  disabled={lawyer.status === 'rejected'}
                >
                  ปฏิเสธ
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); setIsDeleteDialogOpen(true); }}
                  className="text-destructive font-bold"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  ลบทนายความ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ยืนยันการลบทนายความ</AlertDialogTitle>
                  <AlertDialogDescription>
                    คุณแน่ใจหรือไม่ว่าต้องการลบ <strong>{lawyer.name}</strong>?
                    การดำเนินการนี้ไม่สามารถย้อนกลับได้
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      setIsDeleting(true);
                      try {
                        const { deleteLawyerById } = await import('@/app/actions/seed-actions');
                        const result = await deleteLawyerById(lawyer.id);
                        if (result.success) {
                          toast({ title: 'ลบทนายสำเร็จ', description: `ลบ ${lawyer.name} เรียบร้อยแล้ว` });
                          router.push('/lawyers');
                        } else {
                          throw new Error(result.error);
                        }
                      } catch (error: any) {
                        toast({ variant: 'destructive', title: 'ลบไม่สำเร็จ', description: error.message });
                      } finally {
                        setIsDeleting(false);
                        setIsDeleteDialogOpen(false);
                      }
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Reject Dialog */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>ปฏิเสธคำขอสมัครทนาย</DialogTitle>
                  <DialogDescription>
                    กรุณาระบุเหตุผลที่ปฏิเสธเพื่อแจ้งให้ผู้สมัครทราบ ระบบจะเตรียมอีเมลให้อัตโนมัติ
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="reason">เหตุผล</Label>
                    <Textarea
                      id="reason"
                      placeholder="เช่น เอกสารใบอนุญาตว่าความไม่ชัดเจน หรือ ข้อมูลส่วนตัวไม่ตรงกับเอกสาร"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>ยกเลิก</Button>
                  <Button variant="destructive" onClick={() => handleStatusChange('rejected')} disabled={!rejectionReason}>ยืนยันการปฏิเสธ</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
        </div>

        {duplicateLawyers.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>พบข้อมูลทนายความซ้ำซ้อน</AlertTitle>
            <AlertDescription>
              พบทนายความที่มีชื่อหรือเลขใบอนุญาตตรงกันในระบบ:
              <ul className="list-disc list-inside mt-2">
                {duplicateLawyers.map(dup => (
                  <li key={dup.id}>
                    <Link href={`/lawyers/${dup.id}`} className="underline font-medium hover:text-destructive/80">
                      {dup.name}
                    </Link>
                    <span className="ml-2 text-muted-foreground">
                      (License: {dup.licenseNumber}, Status: {dup.status})
                    </span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>ประวัติเคสล่าสุด</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสเคส</TableHead>
                  <TableHead>หัวข้อ</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>อัปเดตล่าสุด</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.length > 0 ? (
                  cases.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>{c.id.slice(0, 8)}...</TableCell>
                      <TableCell>{c.title}</TableCell>
                      <TableCell>{c.clientName}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'closed' ? 'secondary' : 'default'}>
                          {c.status === 'active' ? 'กำลังดำเนินการ' : c.status === 'closed' ? 'เสร็จสิ้น' : c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.lastUpdate}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      ไม่มีประวัติเคส
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* User Data Inspector */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-800">
              <User className="h-4 w-4" />
              User Record Inspector (Historical Data)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-blue-700 mb-4">
              หากข้อมูลในตารางสีเหลืองด้านบนไม่มีลิงก์เอกสาร ให้ตรวจสอบข้อมูลพื้นฐาน (User Record) ในตารางนี้แทน
            </p>
            <div id="user-data-inspector" className="text-center py-8 text-muted-foreground text-sm">
              กำลังโหลดข้อมูลพื้นฐาน...
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>เอกสารประกอบการสมัคร</CardTitle>
            <Badge variant={isExpressSignup ? "outline" : "secondary"} className={isExpressSignup ? "text-amber-600 border-amber-200 bg-amber-50" : "text-green-700 bg-green-50 border-green-100"}>
              {isExpressSignup ? "สมัครแบบด่วน (Express)" : "สมัครแบบปกติ (Full)"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {[...documents, ...otherDocs].map((doc, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border bg-background p-4 gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${doc.url ? 'bg-primary/10' : 'bg-muted'}`}>
                      <FileText className={`h-5 w-5 ${doc.url ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="grid gap-0.5">
                      <span className="font-medium">{doc.name}</span>
                      {!doc.url ? (
                        <span className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> ยังไม่ระบุข้อมูล
                        </span>
                      ) : (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> พร้อมตรวจสอบ
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.url ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleViewDocument(doc.url)}>
                          <Eye className="mr-2 h-4 w-4" />ดูเอกสาร
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownloadDocument(doc.url)}>
                          <Download className="mr-2 h-4 w-4" />ดาวน์โหลด
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/lawyers/${id}/edit`}>
                          <Upload className="mr-2 h-4 w-4" /> อัปโหลดแทนทนาย
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {isExpressSignup && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">หมายเหตุการสมัครแบบด่วน</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    ทนายความที่สมัครแบบ Express จะยังไม่ได้อัปโหลดเอกสารประกอบการสมัคร แอดมินสามารถขอเอกสารเพิ่มเติมและทำการอัปโหลดเข้าระบบได้ผ่านหน้าแก้ไขข้อมูล
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4">
        <Card className="rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-start bg-muted/50">
            <div className="grid gap-0.5">
              <CardTitle className="group flex items-center gap-2 text-lg">
                ข้อมูลทนายความ
              </CardTitle>
              <CardDescription>
                เข้าร่วมเมื่อ: {lawyer.joinedAt?.toDate ? format(lawyer.joinedAt.toDate(), 'd MMM yyyy', { locale: th }) : 'N/A'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 text-sm">
            <div className="grid gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <SecureImage 
                    src={lawyer.imageUrl} 
                    alt={lawyer.name} 
                    className="h-full w-full"
                  />
                  <AvatarFallback>{lawyer.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                  <p className="font-medium text-lg">{lawyer.name}</p>
                  <p className="text-muted-foreground">ID: {lawyer.userId}</p>
                </div>
              </div>
              <div className="font-semibold">ความเชี่ยวชาญ</div>
              <div className="flex flex-wrap gap-2">
                {(lawyer.specialty || []).map(s => <Badge key={s} variant="outline">{s}</Badge>)}
              </div>
              <Separator />
              <div className="font-semibold">ข้อมูลติดต่อ</div>
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <span className="text-muted-foreground text-xs">เบอร์โทรศัพท์</span>
                  <p className="font-medium break-all">{lawyer.phone || '-'}</p>
                </div>
                <div className="grid gap-1">
                  <span className="text-muted-foreground text-xs">อีเมล</span>
                  <p className="font-medium break-all">{lawyer.email || '-'}</p>
                </div>
                <div className="grid gap-1">
                  <span className="text-muted-foreground text-xs">Line ID</span>
                  <p className="font-medium break-all">{lawyer.lineId || '-'}</p>
                </div>
              </div>
              <Separator />
              <div className="font-semibold">ข้อมูลส่วนตัวและที่อยู่</div>
              <div className="grid gap-3 text-sm">
                <div className="grid gap-1">
                  <span className="text-muted-foreground text-xs">ที่อยู่</span>
                  <p className="leading-relaxed break-words">{lawyer.address || '-'}</p>
                </div>
                <div className="grid gap-1">
                  <span className="text-muted-foreground text-xs">จังหวัดที่ให้บริการ</span>
                  <p className="font-medium break-words">{(lawyer.serviceProvinces || []).join(', ') || '-'}</p>
                </div>
                <div className="grid gap-1">
                  <span className="text-muted-foreground text-xs">วันเกิด</span>
                  <p className="font-medium">
                    {lawyer.dob ? (lawyer.dob.toDate ? format(lawyer.dob.toDate(), 'd MMM yyyy', { locale: th }) : lawyer.dob) : '-'}
                  </p>
                </div>
                <div className="grid gap-1">
                  <span className="text-muted-foreground text-xs">เพศ</span>
                  <p className="font-medium">{lawyer.gender || '-'}</p>
                </div>
              </div>
              <Separator />
              <div className="font-semibold">ข้อมูลบัญชีธนาคาร (สำหรับถอนเงิน)</div>
              <div className="grid gap-3 text-sm">
                <div className="grid gap-1">
                  <span className="text-muted-foreground text-xs">ธนาคาร</span>
                  <p className="font-medium">{lawyer.bankName || '-'}</p>
                </div>
                <div className="grid gap-1">
                  <span className="text-muted-foreground text-xs">ชื่อบัญชี</span>
                  <p className="font-medium break-all">{lawyer.bankAccountName || '-'}</p>
                </div>
                <div className="grid gap-1">
                  <span className="text-muted-foreground text-xs">เลขที่บัญชี</span>
                  <p className="font-medium font-mono break-all">{lawyer.bankAccountNumber || '-'}</p>
                </div>
              </div>
              <Separator />
              <div className="font-semibold">หมายเหตุสำหรับแอดมิน</div>
              <Textarea placeholder="เพิ่มหมายเหตุเกี่ยวกับทนายคนนี้..." />
            </div>
          </CardContent>
          <CardFooter className="flex flex-row items-center border-t bg-muted/50 px-6 py-3">
            <div className="text-xs text-muted-foreground">
              {currentDate && <time dateTime={currentDate}>อัปเดตล่าสุดเมื่อสักครู่</time>}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Button size="sm" variant="ghost">บันทึก</Button>
            </div>
          </CardFooter>
        </Card>

        {/* GP Coupon Card */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  ค่า GP และคูปองพิเศษ
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  GP ปัจจุบัน: <strong>{((lawyer.pricing?.platformFeeRate ?? 0.15) * 100).toFixed(1)}%</strong>
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setIsGpDialogOpen(true)}>
                มอบหมายคูปอง GP
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {assignedCoupons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">
                ยังไม่มีคูปอง GP ที่มอบหมายให้ทนายคนนี้
              </p>
            ) : (
              <div className="space-y-2">
                {assignedCoupons.map(coupon => (
                  <div
                    key={coupon.id}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                  >
                    <div>
                      <p className="font-mono font-semibold text-sm text-primary">{coupon.code}</p>
                      {coupon.description && (
                        <p className="text-xs text-muted-foreground">{coupon.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-green-700 bg-green-100 border-green-200 text-xs">
                        GP {(coupon.gpRate * 100).toFixed(1)}%
                      </Badge>
                      {coupon.expiryDate && (
                        <span className="text-xs text-muted-foreground">
                          หมดอายุ {format(coupon.expiryDate.toDate(), 'd MMM yy', { locale: th })}
                        </span>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleUnassignGpCoupon(coupon.id)}
                        title="ยกเลิกการมอบหมาย"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assign GP Coupon Dialog */}
        <Dialog open={isGpDialogOpen} onOpenChange={setIsGpDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>มอบหมายคูปอง GP ให้ทนาย</DialogTitle>
              <DialogDescription>
                เลือกคูปอง GP ที่ต้องการมอบหมายให้ <strong>{lawyer?.name}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {gpCoupons.filter(c => !assignedCoupons.find(a => a.id === c.id)).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  ไม่มีคูปอง GP ที่พร้อมใช้งาน กรุณาสร้างคูปองที่{' '}
                  <a href="/gp-coupons" className="underline text-primary">หน้าจัดการคูปอง GP</a>
                </p>
              ) : (
                gpCoupons
                  .filter(c => !assignedCoupons.find(a => a.id === c.id))
                  .map((coupon) => (
                    <button
                      key={coupon.id}
                      onClick={() => setSelectedGpCouponId(coupon.id)}
                      className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${selectedGpCouponId === coupon.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                        }`}
                    >
                      <div>
                        <p className="font-mono font-semibold text-primary">{coupon.code}</p>
                        {coupon.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{coupon.description}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-green-700 bg-green-100 border-green-200">
                        GP {(coupon.gpRate * 100).toFixed(1)}%
                      </Badge>
                    </button>
                  ))
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsGpDialogOpen(false); setSelectedGpCouponId(''); }}>ยกเลิก</Button>
              <Button
                onClick={handleAssignGpCoupon}
                disabled={!selectedGpCouponId || isAssigning}
              >
                {isAssigning ? 'กำลังมอบหมาย...' : 'ยืนยันการมอบหมาย'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
