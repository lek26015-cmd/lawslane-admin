
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDashboardData, getLawyerById } from '@/lib/data';
import type { UpcomingAppointment, LawyerProfile } from '@/lib/types';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  Mail,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
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
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
  const { firestore, user } = useFirebase();

  const [appointment, setAppointment] = useState<UpcomingAppointment | null>(
    null
  );
  const [lawyer, setLawyer] = useState<LawyerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAppointmentData() {
      if(!firestore || !user) return;
      setIsLoading(true);
      const { appointments } = await getDashboardData(firestore, user.uid);
      const currentAppointment = appointments.find((appt) => appt.id === id);

      if (!currentAppointment) {
        notFound();
        return;
      }
      setAppointment(currentAppointment);

      // We need to extract lawyerId from the appointment data structure.
      // In a real app, the appointment object would contain the lawyer's ID.
      // This is still a bit of a mock. A real query would use currentAppointment.lawyerId
      const lawyerId = '1'; // Mocking lawyer ID
      const lawyerData = await getLawyerById(firestore, lawyerId);
      setLawyer(lawyerData || null);

      setIsLoading(false);
    }
    fetchAppointmentData();
  }, [id, firestore, user]);

  const handleCancelAppointment = () => {
    toast({
      title: 'ยกเลิกนัดหมายสำเร็จ',
      description: 'นัดหมายของคุณได้ถูกยกเลิกแล้ว (จำลอง)',
    });
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!appointment || !lawyer) {
    return notFound();
  }

  return (
    <div className="bg-gray-100/50 py-12">
      <div className="container mx-auto max-w-2xl px-4 md:px-6">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับไปที่แดชบอร์ด
          </Link>
        </div>

        <Card className="overflow-hidden shadow-lg">
          <CardHeader className="bg-background p-6">
            <CardTitle className="text-2xl font-bold font-headline">
              รายละเอียดการนัดหมาย
            </CardTitle>
            <CardDescription>
              นัดหมายกับทนายความสำหรับเคสของคุณ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-4 rounded-lg border bg-background p-4">
              <h3 className="font-semibold">ข้อมูลการนัดหมาย</h3>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">วันที่</p>
                    <p className="text-muted-foreground">
                      {format(appointment.date, 'EEEE, d MMMM yyyy', {
                        locale: th,
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <Clock className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">เวลา</p>
                    <p className="text-muted-foreground">{appointment.time}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">หัวข้อการปรึกษา</p>
                  <p className="text-muted-foreground">
                    {appointment.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border bg-background p-4">
              <h3 className="font-semibold">ทนายความ</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={lawyer.imageUrl} alt={lawyer.name} />
                    <AvatarFallback>{lawyer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold">{lawyer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {lawyer.specialty.join(', ')}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/lawyers/${lawyer.id}`}>ดูโปรไฟล์</Link>
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 bg-gray-50 p-6 sm:flex-row sm:justify-end">
            <Button variant="outline" asChild>
              <Link href={`/chat/case-from-${appointment.id}?lawyerId=${lawyer.id}`}>
                 <Mail className="mr-2" /> ติดต่อทนาย
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <AlertTriangle className="mr-2" /> ยกเลิกนัดหมาย
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
                  <AlertDialogDescription>
                    การยกเลิกนัดหมายนี้ไม่สามารถย้อนกลับได้
                    โปรดตรวจสอบนโยบายการคืนเงินก่อนดำเนินการ
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelAppointment}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    ยืนยันการยกเลิก
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
