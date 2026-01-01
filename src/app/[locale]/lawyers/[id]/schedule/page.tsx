
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getLawyerById } from '@/lib/data';
import type { LawyerProfile } from '@/lib/types';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { addDays, format } from 'date-fns';
import { useFirebase } from '@/firebase';

export default function SchedulePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const [lawyer, setLawyer] = useState<LawyerProfile | null>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLawyer() {
      if (!id || !firestore) return;
      setIsLoading(true);
      const lawyerData = await getLawyerById(firestore, id);
      if (!lawyerData) {
        notFound();
      }
      setLawyer(lawyerData);
      setIsLoading(false);
    }
    fetchLawyer();
  }, [id, firestore]);

  const handleSubmit = () => {
    if (!date || !description.trim()) {
      toast({
        variant: "destructive",
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกวันที่และกรอกรายละเอียดการปรึกษา",
      });
      return;
    }
    
    // In a real app, you would save this to the database.
    console.log({
      lawyerId: lawyer?.id,
      date,
      description,
    });
    
    const params = new URLSearchParams();
    params.set('lawyerId', id);
    params.set('date', date.toISOString());
    params.set('description', description);

    router.push(`/payment?${params.toString()}`);
  };
  
  if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div>Loading...</div>
        </div>
      );
  }

  if (!lawyer) {
    return notFound();
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-3xl mx-auto">
            <Link href={`/lawyers/${lawyer.id}`} className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                กลับไปที่โปรไฟล์ทนาย
            </Link>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={lawyer.imageUrl} alt={lawyer.name} />
                            <AvatarFallback>{lawyer.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                             <CardTitle className="text-2xl font-headline">นัดหมายเพื่อปรึกษา</CardTitle>
                             <CardDescription>กับคุณ {lawyer.name}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="font-semibold">1. เลือกวันที่สะดวก</h3>
                        <div className="flex justify-center p-2 border rounded-md">
                           <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                disabled={(date) =>
                                    date < new Date() || date > addDays(new Date(), 60)
                                }
                                className="rounded-md"
                            />
                        </div>
                         {date && <p className="text-sm text-center text-muted-foreground">วันที่เลือก: {format(date, 'd MMMM yyyy')}</p>}
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-semibold">2. อธิบายปัญหาของคุณโดยย่อ</h3>
                        <Textarea 
                            placeholder="เพื่อให้ทนายความเตรียมข้อมูลเบื้องต้น..." 
                            rows={5}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <Button onClick={handleSubmit} className="w-full" size="lg" disabled={!date || !description.trim()}>
                        ส่งคำขอนัดหมายและชำระเงิน
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}
