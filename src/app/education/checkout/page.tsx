'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '../context/cart-context'; // Adjust path if needed
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { CheckCircle2, CreditCard, Loader2, MapPin, Phone, User, Upload, Copy, Landmark, ArrowLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from 'next/image';

function CheckoutContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { items: cartItems, totalPrice: cartTotalPrice, clearCart } = useCart();
    const { toast } = useToast();

    // Direct Checkout Params
    const directId = searchParams.get('id');
    const directTitle = searchParams.get('title');
    const directPrice = searchParams.get('price');
    const directCover = searchParams.get('coverUrl');
    const directType = searchParams.get('type');

    const isDirectCheckout = !!directId;

    const effectiveItems = isDirectCheckout ? [{
        id: directId!,
        title: directTitle || 'สินค้า',
        price: Number(directPrice) || 0,
        coverUrl: directCover || '',
        quantity: 1,
        type: (directType as any) || 'COURSE',
        originalItem: {} as any
    }] : cartItems;

    const totalPrice = isDirectCheckout
        ? (Number(directPrice) || 0)
        : cartTotalPrice;

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState("bank-transfer");

    // Form State
    const [shippingInfo, setShippingInfo] = useState({
        name: '',
        phone: '',
        address: ''
    });

    const [slipFile, setSlipFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Redirect if invalid state
    React.useEffect(() => {
        if (effectiveItems.length === 0 && !isSuccess) {
            router.push('/education');
        }
    }, [effectiveItems, isSuccess, router]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "คัดลอกเรียบร้อย",
            description: "คัดลอกเลขบัญชีลงในคลิปบอร์ดแล้ว",
            duration: 1500,
        });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast({
                    variant: "destructive",
                    title: "ไฟล์มีขนาดใหญ่เกินไป",
                    description: "กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5MB"
                });
                return;
            }
            setSlipFile(file);
        }
    };

    // Check if shipping is required (Physical Books). 
    // Logic: It is a book if type is BOOK or undefined, AND it's not explicitly digital in originalItem.
    // ADDED: Fallback check if title contains "คอร์ส", "Course", "E-Book" -> treat as digital (no shipping).
    const requiresShipping = effectiveItems.some(item => {
        // REMOVED 'Exam' and 'ข้อสอบ' because physical books often contain these words (e.g. "รวมข้อสอบ")
        const isDigitalKeyword = /คอร์ส|Course|E-Book|e-book|ebook/i.test(item.title);
        const isDigitalType = item.type === 'COURSE' || item.type === 'EXAM';
        const isDigitalFlag = (item.originalItem as any)?.isDigital;

        // It requires shipping if it is NOT digital
        return !(isDigitalKeyword || isDigitalType || isDigitalFlag);
    });

    const handleSubmit = async () => {
        // Validation
        if (requiresShipping && (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address)) {
            toast({
                variant: 'destructive',
                title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
                description: 'กรุณาระบุชื่อ เบอร์โทร และที่อยู่จัดส่ง'
            });
            return;
        }

        if (!slipFile) {
            toast({
                variant: 'destructive',
                title: 'กรุณาแนบสลิปการโอนเงิน',
                description: 'เพื่อยืนยันการชำระเงิน'
            });
            return;
        }

        setIsLoading(true);

        try {
            // Create Order Payload
            const orderData = {
                userId: 'user-123', // Hardcoded for demo/dev match with MyLearning default
                items: effectiveItems,
                totalAmount: totalPrice,
                shippingInfo: requiresShipping ? shippingInfo : null,
                paymentMethod: activeTab,
                slipUrl: 'https://placehold.co/400x600/png?text=Slip', // Mock slip URL since we don't have real upload yet
                status: 'PAID'
            };

            const response = await fetch('/api/education/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData),
            });

            if (!response.ok) {
                throw new Error('Failed to create order');
            }

            // Success
            setIsLoading(false);
            setIsSuccess(true);
            if (!isDirectCheckout) {
                clearCart();
            }
            window.scrollTo(0, 0);

        } catch (error) {
            console.error("Checkout error:", error);
            setIsLoading(false);
            toast({
                variant: 'destructive',
                title: 'เกิดข้อผิดพลาด',
                description: 'ไม่สามารถทำรายการได้ กรุณาลองใหม่อีกครั้ง'
            });
        }
    };

    if (isSuccess) {
        return (
            <div className="container mx-auto px-4 py-12 max-w-2xl">
                <Card className="text-center p-8 shadow-lg border-green-100 bg-green-50/30">
                    <CardContent className="flex flex-col items-center space-y-6 pt-6">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold text-slate-900">สั่งซื้อสำเร็จ!</h2>
                            <p className="text-slate-600 text-lg">
                                ขอบคุณสำหรับการสั่งซื้อ เราได้รับข้อมูลการชำระเงินเรียบร้อยแล้ว
                            </p>
                            <p className="text-slate-500 text-sm">
                                เจ้าหน้าที่จะดำเนินการตรวจสอบและจัดส่งสินค้าให้โดยเร็วที่สุด
                            </p>
                        </div>
                        <div className="w-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-4 max-w-md mx-auto">
                            <p className="text-sm font-medium text-slate-700 mb-4">ติดตามสถานะหรือสอบถามเพิ่มเติม</p>
                            <Button className="w-full bg-[#06C755] hover:bg-[#05b54c] text-white font-bold h-12 shadow-md transition-all hover:-translate-y-0.5">
                                LINE Official Account
                            </Button>
                        </div>
                        <Button variant="outline" onClick={() => router.push('/education')} className="mt-8">
                            <ArrowLeft className="mr-2 h-4 w-4" /> กลับไปหน้าหนังสือ
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (effectiveItems.length === 0) return null; // Prevent flash before redirect

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 animate-in fade-in duration-500">
            <div className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit">
                <Button variant="ghost" className="pl-0 hover:bg-transparent" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> กลับ
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Order Summary */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="lg:sticky lg:top-8 space-y-6">
                        <Card className="shadow-md border-0 overflow-hidden">
                            <CardHeader className="bg-slate-100/50 border-b pb-4">
                                <CardTitle className="flex items-center gap-2 text-xl text-slate-800">
                                    <CreditCard className="w-5 h-5 text-indigo-600" />
                                    สรุปรายการคำสั่งซื้อ
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100">
                                    {effectiveItems.map((item) => (
                                        <div key={item.id} className="flex gap-4 p-4 bg-white hover:bg-slate-50/50 transition-colors">
                                            <div className="w-16 h-24 bg-slate-100 rounded-md overflow-hidden flex-shrink-0 shadow-sm">
                                                <img
                                                    src={item.coverUrl}
                                                    alt={item.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 flex flex-col justify-between py-1">
                                                <div>
                                                    <h4 className="font-medium text-slate-900 line-clamp-2 text-sm leading-snug">{item.title}</h4>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        จำนวน: {item.quantity} {
                                                            (item.type === 'COURSE' || /คอร์ส|Course|E-Book|e-book|ebook/i.test(item.title))
                                                                ? 'รายการ'
                                                                : 'เล่ม'
                                                        }
                                                    </p>
                                                </div>
                                                <p className="font-semibold text-indigo-600 text-sm">
                                                    ฿{(item.price * item.quantity).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 bg-slate-50/50 border-t space-y-3">
                                    <div className="flex justify-between text-slate-600 text-sm">
                                        <span>ยอดรวม ({effectiveItems.reduce((sum, i) => sum + i.quantity, 0)} รายการ)</span>
                                        <span>฿{totalPrice.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 text-sm">
                                        <span>ค่าจัดส่ง</span>
                                        {requiresShipping ? (
                                            <span className="text-green-600 font-medium">ฟรี</span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </div>
                                    <div className="border-t pt-3 mt-3 flex justify-between items-center">
                                        <span className="font-bold text-lg text-slate-900">ยอดสุทธิ</span>
                                        <span className="font-bold text-2xl text-indigo-700">฿{totalPrice.toLocaleString()}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Right Column: Checkout Form */}
                <div className="lg:col-span-2 space-y-6">
                    {requiresShipping && (
                        <Card className="shadow-md border-0">
                            <CardHeader className="border-b pb-4">
                                <CardTitle className="text-xl">ข้อมูลการจัดส่ง</CardTitle>
                                <CardDescription>กรุณากรอกที่อยู่สำหรับจัดส่งหนังสือ</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-slate-400" /> ชื่อ-นามสกุล
                                        </Label>
                                        <Input
                                            id="name"
                                            placeholder="ชื่อผู้รับ"
                                            value={shippingInfo.name}
                                            onChange={(e) => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone" className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-slate-400" /> เบอร์โทรศัพท์
                                        </Label>
                                        <Input
                                            id="phone"
                                            placeholder="08x-xxx-xxxx"
                                            value={shippingInfo.phone}
                                            onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address" className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-slate-400" /> ที่อยู่จัดส่ง
                                    </Label>
                                    <Textarea
                                        id="address"
                                        placeholder="บ้านเลขที่, หมู่, ซอย, ถนน, ตำบล/แขวง, อำเภอ/เขต, จังหวัด, รหัสไปรษณีย์"
                                        className="min-h-[100px]"
                                        value={shippingInfo.address}
                                        onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="shadow-md border-0">
                        <CardHeader className="border-b pb-4">
                            <CardTitle className="text-xl">ชำระเงิน</CardTitle>
                            <CardDescription>เลือกวิธีการชำระเงิน</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-1 mb-6">
                                    <TabsTrigger value="bank-transfer" className="py-3">
                                        <Landmark className="mr-2 h-4 w-4" /> โอนเงินธนาคาร
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="bank-transfer" className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                    <div className="rounded-xl border bg-slate-50/50 p-6 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-[#148F46] rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-[#148F46]/20">
                                                KBANK
                                            </div>
                                            <div>
                                                <p className="font-semibold text-lg text-slate-900">ธนาคารกสิกรไทย</p>
                                                <p className="text-slate-500">สาขาเซ็นทรัลพลาซา แกรนด์ พระราม 9</p>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                                            <p className="text-sm text-slate-500 mb-1">เลขที่บัญชี</p>
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-2xl font-bold text-slate-800 tracking-wider">
                                                    012-3-45678-9
                                                </span>
                                                <Button variant="ghost" size="sm" className="h-8 hover:bg-slate-100 text-indigo-600" onClick={() => handleCopy('012-3-45678-9')}>
                                                    <Copy className="w-4 h-4 mr-1" /> คัดลอก
                                                </Button>
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 mt-2">ชื่อบัญชี: บจก. ลอว์เลนส์ เอ็ดดูเคชั่น</p>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                            <p>กรุณาโอนเงินยอด <strong>฿{totalPrice.toLocaleString()}</strong></p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label htmlFor="slip-upload" className="text-base font-semibold">หลักฐานการโอนเงิน</Label>
                                        <div
                                            className={`flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${slipFile ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {slipFile ? (
                                                <>
                                                    <CheckCircle2 className="w-12 h-12 text-green-500 mb-2 animate-in zoom-in" />
                                                    <p className="font-medium text-green-700">{slipFile.name}</p>
                                                    <p className="text-xs text-green-600 mt-1">คลิกเพื่อเปลี่ยนไฟล์</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-10 h-10 text-slate-400 mb-2" />
                                                    <p className="font-medium text-slate-600">คลิกเพื่ออัปโหลดสลิป</p>
                                                    <p className="text-xs text-slate-400 mt-1">รองรับไฟล์ภาพ .jpg, .png</p>
                                                </>
                                            )}
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            id="slip-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                        <CardFooter className="bg-slate-50 border-t p-6">
                            <Button
                                onClick={handleSubmit}
                                className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:scale-[1.01]"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังดำเนินการ...</>
                                ) : (
                                    'ยืนยันการสั่งซื้อ'
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        }>
            <CheckoutContent />
        </Suspense>
    );
}
