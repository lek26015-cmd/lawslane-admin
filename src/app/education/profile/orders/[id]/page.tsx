'use client';

import { useState, useEffect } from "react";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { getUserOrders } from "@/lib/education-data-admin";
import { Order } from "@/lib/education-types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Package, Truck, CheckCircle2, MapPin, Copy } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function OrderDetailPage({ params }: { params: { id: string } }) {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/education/login');
        } else if (user) {
            // Simulate fetching single order by filtering user orders (MOCK)
            fetchOrder(user.uid, params.id);
        }
    }, [user, isUserLoading, router, params.id]);

    const fetchOrder = async (userId: string, orderId: string) => {
        setIsLoading(true);
        try {
            const allOrders = await getUserOrders(userId);
            const foundOrder = allOrders.find(o => o.id === orderId);
            if (foundOrder) {
                setOrder(foundOrder);
            } else {
                router.push('/education/profile/orders'); // Not found
            }
        } catch (error) {
            console.error("Failed to fetch order:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "คัดลอกเรียบร้อย",
            description: "คัดลอกเลขพัสดุลงในคลิปบอร์ดแล้ว",
            duration: 1500,
        });
    };

    if (isUserLoading || isLoading || !order) {
        return (
            <div className="container mx-auto py-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 px-4 max-w-3xl">
            <div className="mb-6">
                <Button variant="ghost" asChild className="pl-0 hover:bg-transparent text-slate-500 hover:text-slate-900">
                    <Link href="/education/profile/orders">
                        <ArrowLeft className="mr-2 h-4 w-4" /> กลับไปประวัติการสั่งซื้อ
                    </Link>
                </Button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        คำสั่งซื้อ #{order.id}
                        {order.status === 'SHIPPING' && <Badge className="bg-indigo-600">กำลังจัดส่ง</Badge>}
                        {order.status === 'PENDING' && <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">รอชำระเงิน</Badge>}
                        {order.status === 'COMPLETED' && <Badge className="bg-green-600">เสร็จสิ้น</Badge>}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        สั่งซื้อเมื่อ {order.createdAt.toLocaleDateString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}
                    </p>
                </div>
            </div>

            {/* Tracking Section */}
            {(order.status === 'SHIPPING' || order.status === 'COMPLETED') && order.shippingInfo?.trackingNumber && (
                <Card className="mb-8 border-indigo-100 bg-indigo-50/30 overflow-hidden">
                    <CardHeader className="bg-indigo-100/50 border-b border-indigo-100 pb-4">
                        <CardTitle className="text-lg flex items-center gap-2 text-indigo-900">
                            <Truck className="h-5 w-5" /> ข้อมูลการจัดส่ง
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm text-slate-500">หมายเลขพัสดุ (Tracking Number)</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-mono font-bold text-slate-900 tracking-wider">
                                        {order.shippingInfo.trackingNumber}
                                    </span>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={() => handleCopy(order.shippingInfo!.trackingNumber!)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>

                                </div>
                                <p className="text-sm text-indigo-700 font-medium">ขนส่งโดย: {order.shippingInfo.carrier}</p>
                            </div>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                                ตรวจสอบสถานะพัสดุ
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>รายการสินค้า</CardTitle>
                        </CardHeader>
                        <CardContent className="divide-y">
                            {order.items.map((item, index) => (
                                <div key={index} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                                    <div className="h-20 w-16 bg-slate-100 rounded overflow-hidden flex-shrink-0">
                                        {item.coverUrl ? (
                                            <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-200">
                                                <Package className="w-5 h-5 text-slate-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-slate-900">{item.title}</h4>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {item.type === 'BOOK' ? 'หนังสือ' : 'ข้อสอบ'}
                                        </p>
                                        <div className="flex justify-between items-center mt-2">
                                            <p className="text-sm text-slate-600">จำนวน: {item.quantity}</p>
                                            <p className="font-medium">฿{item.price.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="pt-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">ยอดรวมสินค้า</span>
                                    <span>฿{order.totalAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">ค่าจัดส่ง</span>
                                    <span className="text-green-600 font-medium">ฟรี</span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between font-bold text-lg">
                                    <span>ยอดสุทธิ</span>
                                    <span className="text-indigo-700">฿{order.totalAmount.toLocaleString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">ที่อยู่จัดส่ง</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-3">
                            <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium text-slate-900">{order.shippingInfo?.name}</p>
                                    <p className="text-slate-500 mt-1 leading-relaxed">
                                        {order.shippingInfo?.address}
                                    </p>
                                    <p className="text-slate-500 mt-1">{order.shippingInfo?.phone}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">สถานะคำสั่งซื้อ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative border-l-2 border-slate-200 ml-2 space-y-6 pl-6 py-2">
                                <div className="relative">
                                    <div className={`absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 ${order.status === 'PENDING' ? 'bg-yellow-100 border-yellow-500' : 'bg-slate-100 border-slate-300'}`} />
                                    <p className="text-sm font-medium">รอชำระเงิน</p>
                                    <p className="text-xs text-slate-400">
                                        {order.createdAt.toLocaleDateString('th-TH')}
                                    </p>
                                </div>
                                <div className="relative">
                                    <div className={`absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 ${['PAID', 'SHIPPING', 'COMPLETED'].includes(order.status) ? 'bg-blue-100 border-blue-500' : 'bg-slate-100 border-slate-300'}`} />
                                    <p className="text-sm font-medium">ชำระเงินแล้ว</p>
                                </div>
                                <div className="relative">
                                    <div className={`absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 ${['SHIPPING', 'COMPLETED'].includes(order.status) ? 'bg-indigo-100 border-indigo-500' : 'bg-slate-100 border-slate-300'}`} />
                                    <p className="text-sm font-medium">กำลังจัดส่ง</p>
                                    {order.status === 'SHIPPING' && <p className="text-xs text-indigo-600 font-medium mt-1">สถานะปัจจุบัน</p>}
                                </div>
                                <div className="relative">
                                    <div className={`absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 ${order.status === 'COMPLETED' ? 'bg-green-100 border-green-500' : 'bg-slate-100 border-slate-300'}`} />
                                    <p className="text-sm font-medium">เสร็จสิ้น</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
