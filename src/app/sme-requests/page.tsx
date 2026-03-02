
'use client';

import React, { useEffect, useState } from 'react';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { SmeRequest } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink, Loader2, Download } from 'lucide-react';
import Link from 'next/link';

export default function AdminSmeRequestsPage() {
    const [requests, setRequests] = useState<SmeRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const { firestore: db } = initializeFirebase();
                const q = query(collection(db, 'smeRequests'), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);

                const data = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as SmeRequest[];

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
            case 'new':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800">ใหม่</Badge>;
            case 'contacted':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">ติดต่อแล้ว</Badge>;
            case 'completed':
                return <Badge variant="secondary" className="bg-green-100 text-green-800">เสร็จสิ้น</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
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
                <h1 className="text-3xl font-bold font-headline">คำขอรับบริการ SME</h1>
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
                                <TableHead>ชื่อ/บริษัท</TableHead>
                                <TableHead>ติดต่อ</TableHead>
                                <TableHead>บริการที่สนใจ</TableHead>
                                <TableHead>เอกสารแนบ</TableHead>
                                <TableHead>สถานะ</TableHead>
                                <TableHead className="text-right">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                                            <div className="font-medium">{request.name}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{request.phone}</div>
                                            <div className="text-xs text-muted-foreground">{request.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-normal">
                                                {getServiceLabel(request.serviceType)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {request.fileUrl ? (
                                                <a href={request.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline text-sm">
                                                    <Download className="w-3 h-3 mr-1" />
                                                    {request.fileName || 'ดาวน์โหลด'}
                                                </a>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/sme-requests/${request.id}`}>
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
