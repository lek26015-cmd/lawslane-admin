
'use client';

import React, { useEffect, useState } from 'react';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { RegistrationRequest } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminRegistrationRequestsPage() {
    const [requests, setRequests] = useState<RegistrationRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const { firestore: db } = initializeFirebase();
                const q = query(collection(db, 'registrationRequests'), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);

                const data = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as RegistrationRequest[];

                setRequests(data);
            } catch (error) {
                console.error("Error fetching requests:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">รอตรวจสอบ</Badge>;
            case 'processing':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800">กำลังดำเนินการ</Badge>;
            case 'completed':
                return <Badge variant="secondary" className="bg-green-100 text-green-800">เสร็จสิ้น</Badge>;
            case 'cancelled':
                return <Badge variant="secondary" className="bg-red-100 text-red-800">ยกเลิก</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        // Handle Firestore Timestamp
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold font-headline">คำขอจดทะเบียนธุรกิจ</h1>
            </div>

            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>รายการคำขอล่าสุด</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>วันที่ส่ง</TableHead>
                                <TableHead>ชื่อธุรกิจ</TableHead>
                                <TableHead>ผู้ติดต่อ</TableHead>
                                <TableHead>ประเภท</TableHead>
                                <TableHead>สถานะ</TableHead>
                                <TableHead className="text-right">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        ไม่มีรายการคำขอ
                                    </TableCell>
                                </TableRow>
                            ) : (
                                requests.map((request) => (
                                    <TableRow key={request.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {formatDate(request.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{request.companyName}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{request.contactName}</div>
                                            <div className="text-sm text-muted-foreground">{request.phone}</div>
                                            <div className="text-xs text-muted-foreground">{request.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                                <span>
                                                    {request.registrationType === 'company' && 'บริษัทจำกัด'}
                                                    {request.registrationType === 'partnership' && 'ห้างหุ้นส่วน'}
                                                    {request.registrationType === 'trademark' && 'เครื่องหมายการค้า'}
                                                    {request.registrationType === 'other' && 'อื่นๆ'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/admin/registration-requests/${request.id}`}>
                                                    <ExternalLink className="w-4 h-4 mr-1" />
                                                    รายละเอียด
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
