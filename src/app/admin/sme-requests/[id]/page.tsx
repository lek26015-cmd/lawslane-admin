'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { SmeRequest } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Mail, Phone, Building, Calendar, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function AdminSmeRequestDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [request, setRequest] = useState<SmeRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchRequest = async () => {
            try {
                const { firestore: db } = initializeFirebase();
                const docRef = doc(db, 'smeRequests', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setRequest({ id: docSnap.id, ...docSnap.data() } as SmeRequest);
                } else {
                    toast({
                        variant: "destructive",
                        title: "ไม่พบข้อมูล",
                        description: "ไม่พบคำขอที่คุณต้องการ",
                    });
                    router.push('/admin/sme-requests');
                }
            } catch (error) {
                console.error("Error fetching request:", error);
                toast({
                    variant: "destructive",
                    title: "เกิดข้อผิดพลาด",
                    description: "ไม่สามารถโหลดข้อมูลได้",
                });
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchRequest();
        }
    }, [id, router, toast]);

    const handleStatusChange = async (newStatus: string) => {
        if (!request) return;
        setUpdating(true);
        try {
            const { firestore: db } = initializeFirebase();
            const docRef = doc(db, 'smeRequests', request.id);
            await updateDoc(docRef, { status: newStatus });

            setRequest(prev => prev ? { ...prev, status: newStatus as any } : null);

            toast({
                title: "อัปเดตสถานะสำเร็จ",
                description: `เปลี่ยนสถานะเป็น ${getStatusLabel(newStatus)} แล้ว`,
            });
        } catch (error) {
            console.error("Error updating status:", error);
            toast({
                variant: "destructive",
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถอัปเดตสถานะได้",
            });
        } finally {
            setUpdating(false);
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'new': return 'ใหม่';
            case 'contacted': return 'ติดต่อแล้ว';
            case 'completed': return 'เสร็จสิ้น';
            default: return status;
        }
    };

    const getServiceLabel = (type: string) => {
        switch (type) {
            case 'contract': return 'ร่างและตรวจสัญญาธุรกิจ';
            case 'advisor': return 'ที่ปรึกษากฎหมายประจำบริษัท';
            case 'registration': return 'จดทะเบียนและใบอนุญาต';
            case 'dispute': return 'ระงับข้อพิพาททางธุรกิจ';
            case 'other': return 'อื่นๆ';
            default: return type;
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>;
    }

    if (!request) {
        return <div className="p-8 text-center">ไม่พบข้อมูล</div>;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            <div className="flex items-center gap-4">
                <Link href="/admin/sme-requests">
                    <Button variant="outline" size="icon" className="h-9 w-9">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold font-headline">รายละเอียดคำขอ SME</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building className="w-5 h-5 text-primary" />
                                ข้อมูลผู้ติดต่อ
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">ชื่อ / บริษัท</Label>
                                    <p className="font-medium text-lg">{request.name}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">บริการที่สนใจ</Label>
                                    <p className="font-medium">{getServiceLabel(request.serviceType)}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground text-xs">เบอร์โทรศัพท์</Label>
                                        <p className="font-medium">{request.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground text-xs">อีเมล</Label>
                                        <p className="font-medium">{request.email}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Download className="w-5 h-5 text-primary" />
                                เอกสารแนบ
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {request.fileUrl ? (
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-white border flex items-center justify-center text-red-500 shadow-sm">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm truncate max-w-[200px] sm:max-w-md">
                                                {request.fileName || 'เอกสารแนบ'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">คลิกเพื่อดาวน์โหลด</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={request.fileUrl} target="_blank" rel="noopener noreferrer">
                                            <Download className="w-4 h-4 mr-2" />
                                            ดาวน์โหลด
                                        </a>
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                                    ไม่มีเอกสารแนบ
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar / Status */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">สถานะการดำเนินการ</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>สถานะปัจจุบัน</Label>
                                <Select
                                    value={request.status}
                                    onValueChange={handleStatusChange}
                                    disabled={updating}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                ใหม่
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="contacted">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                                ติดต่อแล้ว
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="completed">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                                เสร็จสิ้น
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="pt-4 border-t space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> วันที่ส่ง:
                                    </span>
                                    <span>{formatDate(request.createdAt)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> อัปเดตล่าสุด:
                                    </span>
                                    <span>-</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" variant="outline" asChild>
                                <a href={`mailto:${request.email}`}>
                                    <Mail className="w-4 h-4 mr-2" />
                                    ส่งอีเมลหาลูกค้า
                                </a>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
