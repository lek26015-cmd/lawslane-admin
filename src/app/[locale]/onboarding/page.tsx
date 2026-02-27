'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
    Building2,
    CreditCard,
    ChevronRight,
    Loader2,
    CheckCircle2,
    ShieldCheck,
    CalendarDays,
    Check,
    Info,
    ArrowRightLeft
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { companyService } from '@/services/companyService';
import { useUser } from '@/firebase';
import Logo from '@/components/logo';
import { Badge } from '@/components/ui/badge';
import { BusinessFooter } from '@/components/layout/business-footer';

const PLAN_DETAILS = {
    starter: {
        name: 'Starter Plan',
        monthlyPrice: 2900,
        yearlyPrice: 31320, // (2900 * 12) * 0.9
        features: ['10 templates/month', 'Contract builder', '1 User']
    },
    pro: {
        name: 'Pro Plan',
        monthlyPrice: 8900,
        yearlyPrice: 96120, // (8900 * 12) * 0.9
        features: ['Unlimited templates', 'CLM System', '5 Users', 'Legal Review']
    }
};

function OnboardingContent() {
    const { user } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const planKey = (searchParams.get('plan') as 'starter' | 'pro') || 'starter';
    const planInfo = PLAN_DETAILS[planKey];

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Form states
    const [companyName, setCompanyName] = useState('');
    const [taxId, setTaxId] = useState('');
    const [address, setAddress] = useState('');

    // Billing states
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [billingDay, setBillingDay] = useState('1');

    // Card states (Placeholders)
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');

    const currentPrice = billingCycle === 'monthly' ? planInfo.monthlyPrice : planInfo.yearlyPrice;

    const handleCreateCompany = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'กรุณาเข้าสู่ระบบ' });
            return;
        }
        if (!companyName) {
            toast({ variant: 'destructive', title: 'กรุณากรอกชื่อบริษัท' });
            return;
        }

        setIsLoading(true);
        try {
            await companyService.createCompany(user.uid, companyName);
            toast({ title: 'บันทึกข้อมูลบริษัทสำเร็จ' });
            setStep(2);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBindCard = async () => {
        if (!cardNumber || !expiry || !cvv) {
            toast({ variant: 'destructive', title: 'กรุณากรอกข้อมูลบัตรให้ครบถ้วน' });
            return;
        }

        setIsLoading(true);
        // Simulate card binding
        await new Promise(resolve => setTimeout(resolve, 2000));

        toast({
            title: 'ผูกบัตรสำเร็จ',
            description: `ยินดีด้วย! บัญชีของคุณพร้อมใช้งานแล้วในแพ็กเกจ ${planInfo.name} (${billingCycle === 'monthly' ? 'รายเดือน' : 'รายปี'})`,
            className: "bg-emerald-50 border-emerald-200 text-emerald-900"
        });

        setIsLoading(false);
        router.push('/dashboard/b2b');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 md:py-16 px-4">
            {/* Centered Logo */}
            <div className="mb-12 dark:text-slate-900 [&_span]:dark:text-slate-900">
                <Logo href="/" variant="color" className="scale-125" subtitle="Business ELM" />
            </div>

            {/* Stepper (Wider and Centered) */}
            <div className="w-full max-w-2xl mb-12 flex items-center justify-between px-4">
                <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {step > 1 ? <CheckCircle2 className="w-6 h-6" /> : '1'}
                    </div>
                    <span className={`text-[10px] md:text-sm font-bold ${step >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>ข้อมูลบริษัท</span>
                </div>
                <div className={`flex-1 h-px mx-6 ${step > 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
                <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        2
                    </div>
                    <span className={`text-[10px] md:text-sm font-bold ${step >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>ผูกบัตรชำระเงิน</span>
                </div>
            </div>

            {/* Main Grid Container - Much wider to prevent squeezing */}
            <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Summary Card (4 columns) */}
                <Card className="lg:col-span-4 border-none shadow-xl shadow-blue-900/5 rounded-3xl overflow-hidden bg-white dark:bg-white border-slate-200 dark:border-slate-200 text-slate-900 dark:text-slate-900 lg:sticky lg:top-8">
                    <div className="p-6 bg-[#0B3979] text-white">
                        <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-1">สรุปการสั่งซื้อ</p>
                        <h3 className="text-xl font-bold font-headline leading-none">{planInfo.name}</h3>
                    </div>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-500">รอบการชำระเงิน</span>
                                    <Badge variant="outline" className="rounded-lg border-blue-100 bg-blue-50 text-blue-700 font-bold">
                                        {billingCycle === 'monthly' ? 'รายเดือน' : 'รายปี (-10%)'}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-100 pt-4">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-700">ยอดชำระที่คงที่</span>
                                    <div className="text-right">
                                        <p className="text-3xl font-black text-blue-900 dark:text-blue-900 leading-none mb-1">฿{currentPrice.toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium italic">หลังช่วงทดลองใช้ 14 วัน</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest">ฟีเจอร์ที่คุณจะได้รับ</p>
                                <ul className="grid grid-cols-1 gap-2">
                                    {planInfo.features.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-600">
                                            <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                <Check className="w-2.5 h-2.5" />
                                            </div>
                                            <span className="truncate">{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <div className="flex gap-3 text-[10px] text-slate-400 leading-relaxed italic bg-blue-50/50 p-3 rounded-xl border border-blue-50">
                                <Info className="w-4 h-4 flex-shrink-0 text-blue-400" />
                                <p>คุณสามารถยกเลิกการสมัครสมาชิกได้ทุกเมื่อ ระบบจะยังไม่ตัดเงินจริงจากบัตรของคุณในช่วง 14 วันแรกนี้</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Content Area (8 columns) */}
                <div className="lg:col-span-8 space-y-6">
                    {step === 1 ? (
                        <Card className="border-none shadow-2xl shadow-blue-900/5 rounded-3xl overflow-hidden bg-white dark:bg-white text-slate-900 dark:text-slate-900 animate-in fade-in slide-in-from-right-4 duration-500">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-800">
                                    <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-600" />
                                    ข้อมูลบริษัทเพื่อเปิดใช้งาน
                                </CardTitle>
                                <CardDescription className="text-base text-slate-500 dark:text-slate-500">กรุณากรอกข้อมูลบริษัทของคุณเพื่อสร้างโปรไฟล์องค์กรและเตรียมออกใบเสนอราคา/ใบกำกับภาษี</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="companyName" className="font-bold text-slate-700 dark:text-slate-700">ชื่อบริษัท / องค์กร</Label>
                                        <Input
                                            id="companyName"
                                            placeholder="เช่น บริษัท ลอว์สเลน จำกัด"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            className="h-14 rounded-2xl border-slate-200 dark:border-slate-200 bg-white dark:bg-white text-slate-900 dark:text-slate-900 placeholder:text-slate-500 dark:placeholder:text-slate-500 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all text-base px-6 shadow-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="taxId" className="font-bold text-slate-700 dark:text-slate-700">เลขประจำตัวผู้เสียภาษี (13 หลัก)</Label>
                                            <Input
                                                id="taxId"
                                                placeholder="0123456789012"
                                                maxLength={13}
                                                value={taxId}
                                                onChange={(e) => setTaxId(e.target.value)}
                                                className="h-14 rounded-2xl border-slate-200 dark:border-slate-200 bg-white dark:bg-white text-slate-900 dark:text-slate-900 placeholder:text-slate-500 dark:placeholder:text-slate-500 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all text-base px-6 shadow-sm"
                                            />
                                        </div>
                                        <div className="flex flex-col justify-end">
                                            <p className="text-xs text-slate-400 dark:text-slate-400 mb-2 italic">ระบบจะใช้เลขนี้ในเอกสารรับเงินทั้งหมด</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="address" className="font-bold text-slate-700 dark:text-slate-700">ที่อยู่จดทะเบียนบริษัท</Label>
                                        <Input
                                            id="address"
                                            placeholder="ระบุที่อยู่ให้ครบถ้วนเพื่อความถูกต้องของเอกสาร"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            className="h-14 rounded-2xl border-slate-200 dark:border-slate-200 bg-white dark:bg-white text-slate-900 dark:text-slate-900 placeholder:text-slate-500 dark:placeholder:text-slate-500 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all text-base px-6 shadow-sm"
                                        />
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <Button
                                        className="w-full h-16 bg-[#0B3979] hover:bg-[#082a5a] text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/20 transition-all group"
                                        onClick={handleCreateCompany}
                                        disabled={isLoading || !companyName}
                                    >
                                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                            <>
                                                ถัดไป: เลือกวันชำระและผูกบัตร
                                                <ChevronRight className="w-6 h-6 ml-2 transition-transform group-hover:translate-x-1" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            {/* Billing & Payment combined for flow */}
                            <Card className="border-none shadow-2xl shadow-blue-900/5 rounded-3xl overflow-hidden bg-white dark:bg-white text-slate-900 dark:text-slate-900">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-800">
                                        <CalendarDays className="w-6 h-6 text-blue-600 dark:text-blue-600" />
                                        การเรียกเก็บเงินและวันตัดบิล
                                    </CardTitle>
                                    <CardDescription className="text-base text-slate-500 dark:text-slate-500">เลือกเงื่อนไขที่คุณพึงพอใจเพื่อเริ่มรับสิทธิ์ทดลองใช้</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 space-y-10">
                                    {/* Cycle Selector */}
                                    <div className="space-y-3">
                                        <Label className="font-bold text-slate-700 dark:text-slate-700">เลือกรูปแบบสมาชิก</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <button
                                                onClick={() => setBillingCycle('monthly')}
                                                className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col gap-1 relative ${billingCycle === 'monthly' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 dark:border-slate-200 hover:border-slate-200 bg-slate-50/30 dark:bg-slate-50'}`}
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className={`font-bold text-lg ${billingCycle === 'monthly' ? 'text-blue-900 dark:text-blue-900' : 'text-slate-700 dark:text-slate-700'}`}>รายเดือน</span>
                                                    {billingCycle === 'monthly' && <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                                                </div>
                                                <span className="text-xs text-slate-500 dark:text-slate-500 font-medium">จ่าย ฿{planInfo.monthlyPrice.toLocaleString()} /เดือน</span>
                                            </button>
                                            <button
                                                onClick={() => setBillingCycle('yearly')}
                                                className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col gap-1 relative ${billingCycle === 'yearly' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 dark:border-slate-200 hover:border-slate-200 bg-slate-50/30 dark:bg-slate-50'}`}
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className={`font-bold text-lg ${billingCycle === 'yearly' ? 'text-blue-900 dark:text-blue-900' : 'text-slate-700 dark:text-slate-700'}`}>รายปี</span>
                                                    <Badge className="bg-emerald-500 text-white border-none py-0.5 text-[10px]">-10%</Badge>
                                                </div>
                                                <span className="text-xs text-emerald-600 font-bold">จ่ายเพียง ฿{planInfo.yearlyPrice.toLocaleString()} /ปี</span>
                                                {billingCycle === 'yearly' && <div className="w-5 h-5 rounded-full bg-blue-600 absolute bottom-6 right-6 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Date Selector */}
                                    <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-100">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                                                <ArrowRightLeft className="w-6 h-6 text-blue-600 dark:text-blue-600" />
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <div className="space-y-1">
                                                    <Label className="font-bold text-slate-700 dark:text-slate-700 text-lg">วันที่ตัดบิลของทุกเดือน</Label>
                                                    <p className="text-sm text-slate-400 dark:text-slate-400">กรุณาเลือกวันที่ท่านสะดวกชำระค่าบริการเป็นประจำ</p>
                                                </div>
                                                <Select value={billingDay} onValueChange={setBillingDay}>
                                                    <SelectTrigger className="h-14 rounded-2xl border-slate-200 dark:border-slate-200 bg-slate-50 dark:bg-slate-50 text-base font-bold text-blue-900 dark:text-blue-900 focus:ring-4 focus:ring-blue-50">
                                                        <SelectValue placeholder="เลือกวันที่คุ้มที่สุดสำหรับท่าน" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-2xl border-none shadow-2xl bg-white dark:bg-white text-slate-900 dark:text-slate-900">
                                                        {[...Array(28)].map((_, i) => (
                                                            <SelectItem key={i + 1} value={(i + 1).toString()} className="rounded-xl h-10 font-medium">
                                                                วันที่ {i + 1} ของทุกเดือน
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Payment Integration Placeholder */}
                            <Card className="border-none shadow-2xl shadow-blue-900/5 rounded-3xl overflow-hidden bg-white dark:bg-white text-slate-900 dark:text-slate-900">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-800">
                                        <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-600" />
                                        ผูกบัตรเพื่อเปิดรับสิทธิ์
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 pt-4 space-y-8">
                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="cardNumber" className="font-bold text-slate-700 dark:text-slate-700">หมายเลขหน้าบัตร</Label>
                                            <div className="relative">
                                                <Input
                                                    id="cardNumber"
                                                    placeholder="0000 0000 0000 0000"
                                                    value={cardNumber}
                                                    onChange={(e) => setCardNumber(e.target.value)}
                                                    className="h-14 rounded-2xl border-slate-200 dark:border-slate-200 bg-white dark:bg-white text-slate-900 dark:text-slate-900 placeholder:text-slate-500 dark:placeholder:text-slate-500 px-6 text-lg font-medium tracking-widest placeholder:tracking-normal placeholder:font-normal"
                                                />
                                                <div className="absolute right-4 top-4 flex gap-1 opacity-40">
                                                    <div className="w-8 h-5 bg-slate-200 rounded" />
                                                    <div className="w-8 h-5 bg-slate-200 rounded" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="expiry" className="font-bold text-slate-700 dark:text-slate-700">หมดอายุ (MM/YY)</Label>
                                                <Input
                                                    id="expiry"
                                                    placeholder="MM/YY"
                                                    value={expiry}
                                                    onChange={(e) => setExpiry(e.target.value)}
                                                    className="h-14 rounded-2xl border-slate-200 dark:border-slate-200 bg-white dark:bg-white text-slate-900 dark:text-slate-900 placeholder:text-slate-500 dark:placeholder:text-slate-500 px-6 text-base"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="cvv" className="font-bold text-slate-700 dark:text-slate-700">CVV / CVC</Label>
                                                <Input
                                                    id="cvv"
                                                    placeholder="123"
                                                    maxLength={3}
                                                    value={cvv}
                                                    onChange={(e) => setCvv(e.target.value)}
                                                    className="h-14 rounded-2xl border-slate-200 dark:border-slate-200 bg-white dark:bg-white text-slate-900 dark:text-slate-900 placeholder:text-slate-500 dark:placeholder:text-slate-500 px-6 text-base"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex gap-4 items-center">
                                        <ShieldCheck className="w-8 h-8 text-blue-600 shrink-0" />
                                        <p className="text-xs text-blue-900/70 leading-relaxed font-medium">
                                            <strong>ระบบรักษาความปลอดภัย 256-bit SSL</strong> ระบบจะไม่ตัดเงินจริง ท่านสามารถยกเลิกการผูกบัตรได้ตลอดเวลาผ่านทางหน้าตั้งค่าหลังจากเข้าสู่ระบบ
                                        </p>
                                    </div>

                                    <div className="pt-4 space-y-4">
                                        <Button
                                            className="w-full h-16 bg-[#0B3979] hover:bg-[#082a5a] text-white rounded-2xl font-black text-xl shadow-2xl shadow-blue-900/30 transition-all border-b-4 border-blue-950 active:border-b-0 active:translate-y-1 group"
                                            onClick={handleBindCard}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                                <span className="flex items-center">
                                                    ยืนยันและเริ่มใช้งานฟรี 14 วัน
                                                    <ChevronRight className="w-6 h-6 ml-2 transition-transform group-hover:translate-x-1" />
                                                </span>
                                            )}
                                        </Button>
                                        <Button
                                            variant="link"
                                            className="w-full text-slate-400 hover:text-blue-600 font-bold"
                                            onClick={() => setStep(1)}
                                            disabled={isLoading}
                                        >
                                            แก้ไขข้อมูลบริษัท
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Help */}
            <div className="mt-16 text-center pb-16">
                <p className="text-slate-400 text-sm font-medium">
                    มีข้อสงสัยเกี่ยวกับแพ็กเกจ? <span className="text-blue-600 font-bold cursor-pointer hover:underline">ปรึกษาฝ่ายขาย</span> หรืออีเมล <span className="text-slate-600 font-bold">support@lawslane.com</span>
                </p>
            </div>

            <div className="w-full mt-auto">
                <BusinessFooter />
            </div>
        </div>
    );
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        }>
            <OnboardingContent />
        </Suspense>
    );
}
