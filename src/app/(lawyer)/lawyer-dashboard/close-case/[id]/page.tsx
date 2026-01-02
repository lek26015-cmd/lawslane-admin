
'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Briefcase, FileSignature, DollarSign, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"


function CloseCasePageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const caseId = params.id as string;
  const clientName = searchParams.get('clientName') || 'ลูกค้า';
  const lawyerId = searchParams.get('lawyerId');
  const clientId = searchParams.get('clientId');
  
  const [summary, setSummary] = useState('');
  const [finalFee, setFinalFee] = useState('3500');
  const initialFee = 3500; // Mock initial fee

  const handleSubmit = () => {
    if (!summary.trim() || !finalFee.trim()) {
      toast({
        variant: 'destructive',
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกบทสรุปและค่าบริการสุดท้าย',
      });
      return;
    }
    
    const finalFeeNumber = parseFloat(finalFee);
    const requiresApproval = finalFeeNumber > initialFee;
    
    const chatParams = new URLSearchParams();
    chatParams.set('lawyerId', lawyerId || '1'); // Fallback to '1'
    if(clientId) chatParams.set('clientId', clientId);
    chatParams.set('view', 'lawyer');

    if (requiresApproval) {
        toast({
            title: 'ส่งคำขอค่าบริการเพิ่มเติมสำเร็จ',
            description: `ระบบได้ส่งคำขออนุมัติค่าบริการใหม่ให้ '${clientName}' แล้ว`,
        });
        chatParams.set('additionalFeeRequested', 'true');
        router.push(`/chat/${caseId}?${chatParams.toString()}`);
    } else {
        toast({
          title: 'ส่งสรุปเคสสำเร็จ',
          description: `ได้ส่งสรุปและแจ้งปิดเคสสำหรับ ${caseId} เรียบร้อยแล้ว`,
        });
        chatParams.set('status', 'closed');
        router.push(`/chat/${caseId}?${chatParams.toString()}`);
    }

  };
  
  const handleCancelCase = () => {
    // In a real app, this would update the case status and refund the client.
    toast({
        title: 'ยกเลิกเคสสำเร็จ',
        description: `เคส ${caseId} ถูกยกเลิกแล้ว ระบบจะดำเนินการคืนเงินให้ลูกค้าต่อไป (จำลอง)`,
        variant: 'default',
        className: 'bg-yellow-100 border-yellow-500 text-yellow-800'
    });
    router.push('/lawyer-dashboard');
  };


  return (
    <div className="bg-gray-100/50 min-h-screen">
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <Link href={`/chat/${caseId}?lawyerId=${lawyerId}&clientId=${clientId}&view=lawyer`} className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              กลับไปที่ห้องแชท
            </Link>
            <h1 className="text-3xl font-bold font-headline">ส่งสรุปและปิดเคส</h1>
            <p className="text-muted-foreground">สรุปผลการให้คำปรึกษาและแจ้งค่าบริการสุดท้ายเพื่อปิดเคส</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Briefcase /> ข้อมูลเคส</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="font-semibold text-muted-foreground">รหัสเคส:</span>
                    <span className="font-mono">{caseId}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-semibold text-muted-foreground">ลูกค้า:</span>
                    <span>{clientName}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="font-semibold text-muted-foreground">หัวข้อเคส:</span>
                    <span>คดีมรดก (ตัวอย่าง)</span>
                </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileSignature /> บทสรุปและคำแนะนำสุดท้าย</CardTitle>
                <CardDescription>กรอกรายละเอียดสรุปผลการให้คำปรึกษาและขั้นตอนต่อไป (ถ้ามี) เพื่อส่งให้ลูกค้า</CardDescription>
            </CardHeader>
            <CardContent>
                <Textarea 
                    placeholder="เช่น จากการตรวจสอบเอกสารทั้งหมด พบว่า..."
                    rows={10}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign /> ค่าบริการสุดท้าย</CardTitle>
                <CardDescription>ระบุยอดค่าบริการทั้งหมดสำหรับเคสนี้ (รวมค่าปรึกษาครั้งแรก)</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        type="number"
                        placeholder="3500"
                        value={finalFee}
                        onChange={(e) => setFinalFee(e.target.value)}
                        className="pl-10 text-lg font-bold"
                    />
                </div>
                 {parseFloat(finalFee) > initialFee && (
                    <Alert className="mt-4 border-blue-500 bg-blue-50 text-blue-800">
                        <Info className="h-4 w-4 !text-blue-600" />
                        <AlertTitle>แจ้งเพื่อทราบ</AlertTitle>
                        <AlertDescription>
                            ยอดเงินที่ระบุสูงกว่าค่าบริการเริ่มต้น ระบบจะส่งคำขอให้ลูกค้าอนุมัติค่าบริการส่วนต่าง
                        </AlertDescription>
                    </Alert>
                 )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" size="lg" onClick={handleCancelCase}>
                ยกเลิกเคส (ไม่รับค่าบริการ)
            </Button>
            <Button size="lg" onClick={handleSubmit}>
                ยืนยันและส่งสรุปเพื่อปิดเคส
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CloseCasePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CloseCasePageContent />
        </Suspense>
    )
}
