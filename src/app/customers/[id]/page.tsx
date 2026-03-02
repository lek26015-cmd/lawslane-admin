
'use client'

import * as React from 'react'
import {
  ChevronLeft,
  Loader2,
  AlertTriangle,
} from 'lucide-react'

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
import { useFirebase } from '@/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import type { UserProfile, Case } from '@/lib/types'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { getDashboardData } from '@/lib/data'
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
} from "@/components/ui/alert-dialog"

export default function AdminCustomerDetailPage() {
  const params = useParams()
  const { id } = params
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const [customer, setCustomer] = React.useState<UserProfile | null>(null);
  const [cases, setCases] = React.useState<Case[]>([]);
  const [currentDate, setCurrentDate] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!firestore || !id) return;
    setIsLoading(true);
    try {
      // Fetch User
      const userRef = doc(firestore, 'users', id as string);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        let userProfile = {
          uid: docSnap.id,
          ...data,
          status: data.status || 'active' // Default to active if missing
        } as UserProfile;

        // If user is a lawyer, fetch additional lawyer profile data
        if (data.role === 'lawyer') {
          const lawyerRef = doc(firestore, 'lawyerProfiles', id as string);
          const lawyerSnap = await getDoc(lawyerRef);
          if (lawyerSnap.exists()) {
            const lawyerData = lawyerSnap.data();
            // Merge or attach lawyer data. For now, let's just make it available in the user profile object or separate state?
            // The UserProfile type doesn't stricly have lawyer fields, but let's extend it dynamically for display or use a separate state.
            // Simpler to just extend the state or add a new state variable.
            // Let's modify the customer state to include 'licenseNumber' for display if needed, forcing type casting or extending the type locally.
            (userProfile as any).licenseNumber = lawyerData.licenseNumber;
            (userProfile as any).lawyerStatus = lawyerData.status;
          }
        }

        setCustomer(userProfile);

        // Fetch User Cases
        const dashboardData = await getDashboardData(firestore, id as string);
        setCases(dashboardData.cases);
      }
    } catch (error) {
      console.error("Error fetching customer data:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลลูกค้าได้",
      });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, id, toast]);

  React.useEffect(() => {
    setCurrentDate(new Date().toISOString());
    fetchData();
  }, [fetchData]);

  const handleToggleStatus = async () => {
    if (!firestore || !id || !customer) return;
    setIsProcessing(true);
    try {
      const newStatus = customer.status === 'active' ? 'suspended' : 'active';
      const userRef = doc(firestore, 'users', id as string);
      await updateDoc(userRef, { status: newStatus });

      setCustomer(prev => prev ? { ...prev, status: newStatus } : null);

      toast({
        title: newStatus === 'active' ? "เปิดการใช้งานบัญชีแล้ว" : "ระงับบัญชีเรียบร้อย",
        description: `สถานะของลูกค้าถูกเปลี่ยนเป็น ${newStatus === 'active' ? 'Active' : 'Suspended'}`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะได้",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (!customer) {
    return <div>ไม่พบข้อมูลลูกค้า</div>
  }

  // Calculate stats from real data
  // 'active' cases are active. 'closed' are completed.
  const activeCasesCount = cases.filter(c => c.status === 'active').length;
  const completedCasesCount = cases.filter(c => c.status === 'closed').length;

  // Mock calculation for totalSpent (assuming 500 per chat/case for now, or fetch from payments collection later)
  // For now, let's just count completed cases * 500 as a placeholder estimation or 0 if no data
  const estimatedTotalSpent = completedCasesCount * 500; // This logic can be improved with real payment data

  return (
    <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
      <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="outline" size="icon" className="h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">กลับ</span>
            </Button>
          </Link>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            โปรไฟล์ลูกค้า
          </h1>
          <Badge
            variant={
              customer.status === 'active' ? 'secondary' :
                customer.status === 'pending' ? 'outline' :
                  'destructive'
            }
            className={customer.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''}
          >
            {
              customer.status === 'active' ? 'Active' :
                customer.status === 'pending' ? 'Pending' :
                  'Suspended'
            }
          </Badge>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Link href={`/customers/${id}/edit`}>
              <Button variant="outline" size="sm">
                แก้ไขข้อมูล
              </Button>
            </Link>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant={customer.status === 'active' ? "destructive" : "default"} disabled={isProcessing}>
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {customer.status === 'active' ? 'ระงับบัญชี' : 'ยกเลิกระงับบัญชี'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ยืนยันการดำเนินการ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    คุณต้องการที่จะ {customer.status === 'active' ? 'ระงับการใช้งาน' : 'ยกเลิกการระงับ'} บัญชีของ {customer.name} ใช่หรือไม่?
                    {customer.status === 'active' && " ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้หลังจากนี้"}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleToggleStatus}
                    className={customer.status === 'active' ? "bg-red-600 hover:bg-red-700" : ""}
                  >
                    ยืนยัน
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardDescription>เคสทั้งหมด</CardDescription>
              <CardTitle className="text-4xl">{cases.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {activeCasesCount} เคสกำลังดำเนินการ
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardDescription>ยอดใช้จ่ายรวม (โดยประมาณ)</CardDescription>
              <CardTitle className="text-4xl">฿{estimatedTotalSpent.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                จาก {completedCasesCount} เคสที่เสร็จสิ้น
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>ประวัติเคส</CardTitle>
          </CardHeader>
          <CardContent>
            {cases.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>หัวข้อ</TableHead>
                    <TableHead>ทนายความ</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>อัปเดตล่าสุด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <Link href={`/chat/${c.id}?view=admin`} className="hover:underline">
                          {c.title}
                        </Link>
                      </TableCell>
                      <TableCell>{c.lawyer?.name || 'ไม่ระบุ'}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'closed' ? 'secondary' : 'default'}>{c.status}</Badge>
                      </TableCell>
                      <TableCell>{c.lastMessageTimestamp || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
                <p>ยังไม่มีประวัติเคส</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div>
        <Card className="rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-start bg-muted/50">
            <div className="grid gap-0.5">
              <CardTitle className="group flex items-center gap-2 text-lg">
                ข้อมูลลูกค้า
              </CardTitle>
              <CardDescription>
                ลงทะเบียนเมื่อ: {customer.registeredAt?.toDate ? format(customer.registeredAt.toDate(), 'd MMM yyyy', { locale: th }) : 'N/A'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6 text-sm">
            <div className="grid gap-3">
              <div className="font-semibold">รายละเอียด</div>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={customer.avatar} />
                  <AvatarFallback>{customer.name ? customer.name.slice(0, 2) : 'U'}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-muted-foreground">{customer.email}</p>
                  <p className="text-xs text-muted-foreground">Role: {customer.role || 'user'}</p>
                  {(customer as any).licenseNumber && (
                    <p className="text-xs font-semibold text-blue-600 mt-1">
                      เลขใบอนุญาต: {(customer as any).licenseNumber}
                    </p>
                  )}
                </div>
              </div>
              <div className="font-semibold">หมายเหตุสำหรับแอดมิน</div>
              <Textarea placeholder="เพิ่มหมายเหตุเกี่ยวกับลูกค้าคนนี้..." />
            </div>
          </CardContent>
          <CardFooter className="flex flex-row items-center border-t bg-muted/50 px-6 py-3">
            <div className="text-xs text-muted-foreground">
              {currentDate && <time dateTime={currentDate}>อัปเดตล่าสุดเมื่อสักครู่</time>}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Button size="sm" variant="ghost">
                บันทึก
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </main >
  )
}
