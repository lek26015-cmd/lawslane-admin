
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
  Eye
} from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import type { LawyerProfile } from '@/lib/types'
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
import { useFirebase } from '@/firebase'
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

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
  const [duplicateLawyers, setDuplicateLawyers] = React.useState<LawyerProfile[]>([]);

  React.useEffect(() => {
    setCurrentDate(new Date().toISOString());
    if (!firestore || !id) return;

    getLawyerById(firestore, id as string).then(async (foundLawyer) => {
      setLawyer(foundLawyer || null);

      if (foundLawyer) {
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

  }, [id, firestore]);

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

  // Use real documents if available, otherwise fallback to empty array
  const documents = [
    { name: 'ใบอนุญาตว่าความ', url: lawyer.licenseUrl },
    { name: 'สำเนาบัตรประชาชน', url: lawyer.idCardUrl },
  ].filter(d => d.url); // Only show if URL exists
  const handleViewDocument = (url: string | undefined) => {
    if (!url || url === '#' || url === '') {
      toast({
        variant: "destructive",
        title: "ไม่พบเอกสาร",
        description: "เอกสารนี้ยังไม่ได้ถูกอัปโหลด (ข้อมูลจำลอง)",
      });
      return;
    }
    window.open(url, '_blank');
  };
  return (
    <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
      <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
        <div className="flex items-center gap-4">
          <Link href="/admin/lawyers">
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
            <Link href={`/admin/lawyers/${id}/edit`}>
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
              </DropdownMenuContent>
            </DropdownMenu>

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
                    <Link href={`/admin/lawyers/${dup.id}`} className="underline font-medium hover:text-destructive/80">
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
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>เอกสารประกอบการสมัคร</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {documents.length > 0 ? (
                documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border bg-background p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{doc.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewDocument(doc.url)}>
                        <Eye className="mr-2 h-4 w-4" />ดูเอกสาร
                      </Button>
                      <Button variant="outline" size="sm" asChild disabled={!doc.url}>
                        <a href={doc.url} download target="_blank"><Download className="mr-2 h-4 w-4" />ดาวน์โหลด</a>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground p-4">
                  ไม่พบเอกสารแนบ
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
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
          <CardContent className="p-6 text-sm">
            <div className="grid gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={lawyer.imageUrl} />
                  <AvatarFallback>{lawyer.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                  <p className="font-medium text-lg">{lawyer.name}</p>
                  <p className="text-muted-foreground">ID: {lawyer.userId}</p>
                </div>
              </div>
              <Separator />
              <div className="font-semibold">ความเชี่ยวชาญ</div>
              <div className="flex flex-wrap gap-2">
                {lawyer.specialty.map(s => <Badge key={s} variant="outline">{s}</Badge>)}
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
      </div>
    </main>
  )
}
