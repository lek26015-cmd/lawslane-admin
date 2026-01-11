'use client';

import { useState, useEffect } from "react";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { getUserOrders } from "@/lib/education-data-admin";
import { Order } from "@/lib/education-types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Search, ShoppingBag, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default function OrderHistoryPage() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/education/login');
        } else if (user) {
            fetchOrders(user.uid);
        }
    }, [user, isUserLoading, router]);

    const fetchOrders = async (userId: string) => {
        setIsLoading(true);
        try {
            const data = await getUserOrders(userId);
            setOrders(data);
        } catch (error) {
            console.error("Failed to fetch orders:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">รอชำระเงิน</Badge>;
            case 'PAID':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">ชำระแล้ว</Badge>;
            case 'SHIPPING':
                return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">กำลังจัดส่ง</Badge>;
            case 'COMPLETED':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">เสร็จสิ้น</Badge>;
            case 'CANCELLED':
                return <Badge variant="destructive">ยกเลิก</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (isUserLoading || isLoading) {
        return (
            <div className="container mx-auto py-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">ประวัติการสั่งซื้อ</h1>
                    <p className="text-slate-500">
                        ติดตามสถานะและประวัติการสั่งซื้อสินค้าของคุณ
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/education/books">เลือกซื้อสินค้าต่อ</Link>
                </Button>
            </div>

            {orders.length === 0 ? (
                <Card className="text-center py-16 bg-slate-50 border-dashed">
                    <CardContent className="flex flex-col items-center gap-4">
                        <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <ShoppingBag className="h-8 w-8 text-slate-300" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-medium text-slate-900">ยังไม่มีประวัติการสั่งซื้อ</h3>
                            <p className="text-slate-500 max-w-sm mx-auto">
                                คุณยังไม่ได้ทำการสั่งซื้อสินค้าใดๆ
                                ลองดูสินค้าแนะนำของเราได้ที่ร้านหนังสือ
                            </p>
                        </div>
                        <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" asChild>
                            <Link href="/education/books">ไปที่ร้านหนังสือ</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {orders.map((order) => (
                        <Card key={order.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardHeader className="bg-slate-50/50 border-b pb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base font-semibold">
                                            คำสั่งซื้อ #{order.id}
                                        </CardTitle>
                                        <CardDescription>
                                            สั่งซื้อเมื่อ {order.createdAt.toLocaleDateString('th-TH', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(order.status)}
                                        <p className="font-bold text-lg text-slate-900">
                                            ฿{order.totalAmount.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {order.items.map((item, index) => (
                                        <div key={index} className="flex gap-4">
                                            <div className="h-16 w-12 bg-slate-100 rounded overflow-hidden flex-shrink-0">
                                                {item.coverUrl ? (
                                                    <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-200">
                                                        <Package className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-slate-900 text-sm line-clamp-2">
                                                    {item.title}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {item.type === 'BOOK' ? 'หนังสือ' : 'ข้อสอบ'} x {item.quantity}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium">฿{item.price.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50/30 border-t p-4 flex justify-end">
                                <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" asChild>
                                    <Link href={`/education/profile/orders/${order.id}`}>
                                        ดูรายละเอียด & ติดตามพัสดุ <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
