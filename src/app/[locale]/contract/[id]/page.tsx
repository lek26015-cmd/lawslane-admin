'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { contractService, ContractData } from '@/services/contractService';
import { FadeIn } from '@/components/fade-in';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { SignaturePad } from '@/components/ui/signature-pad';
import { Loader2, CheckCircle, FileSignature, AlertTriangle, Shield, Calendar, MapPin, User, Download } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { generateContractPDF } from '@/lib/contract-pdf';

export default function ContractSigningPage() {
    const params = useParams();
    const id = params.id as string;

    const [contract, setContract] = useState<ContractData | null>(null);
    const [loading, setLoading] = useState(true);
    const [signingRole, setSigningRole] = useState<'employer' | 'contractor' | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        if (!id) return;

        // Subscribe to real-time updates
        const unsubscribe = contractService.subscribeToContract(id, (data) => {
            setContract(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id]);

    const handleSign = async (signatureDataUrl: string) => {
        if (!signingRole || !contract) return;

        try {
            await contractService.signContract(id, signingRole, signatureDataUrl);
            setIsDialogOpen(false);
        } catch (error) {
            console.error('Error signing contract:', error);
            // Could add toast error here
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
                    <p className="text-slate-500">กำลังโหลดข้อมูลสัญญา...</p>
                </div>
            </div>
        );
    }

    if (!contract) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-4">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
                    <h1 className="text-2xl font-bold text-slate-800">ไม่พบสัญญา</h1>
                    <p className="text-slate-600">สัญญานี้อาจถูกลบหรือไม่มีอยู่ในระบบ</p>
                </div>
            </div>
        );
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        // Handle Firestore Timestamp
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return format(date, 'd MMMM yyyy HH:mm', { locale: th });
    };

    const StatusBadge = () => {
        if (contract.status === 'signed') {
            return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-3 py-1">เซ็นครบแล้ว (Signed)</Badge>;
        }
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 px-3 py-1">รอการเซ็น (Pending)</Badge>;
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 md:px-6">
            <div className="container mx-auto max-w-4xl">
                <FadeIn direction="up">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
                                    <FileSignature className="w-8 h-8 text-blue-600" />
                                    สัญญาจ้างงาน
                                </h1>
                                <StatusBadge />
                            </div>
                            <p className="text-slate-500">Contract ID: <span className="font-mono text-xs text-slate-400">{contract.id}</span></p>
                        </div>
                        {contract.status === 'signed' && (
                            <Button
                                onClick={() => generateContractPDF(contract)}
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/10"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                ดาวน์โหลด PDF
                            </Button>
                        )}
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Main Contract Details - Spans 2 cols */}
                        <div className="md:col-span-2 space-y-6">
                            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                                <CardHeader className="bg-white border-b border-slate-100">
                                    <CardTitle>รายละเอียดข้อตกลง</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                                            <h3 className="font-semibold text-slate-700">ขอบเขตงาน (Scope of Work)</h3>
                                            <p className="text-slate-600 whitespace-pre-line">{contract.task}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                                                <h3 className="text-sm text-slate-500 font-medium">ค่าจ้างรวม</h3>
                                                <p className="text-xl font-bold text-blue-600">฿{contract.price.toLocaleString()}</p>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                                                <h3 className="text-sm text-slate-500 font-medium">มัดจำ</h3>
                                                <p className="text-xl font-bold text-slate-700">
                                                    {contract.deposit ? `฿${contract.deposit.toLocaleString()}` : '-'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm text-slate-500 flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" /> กำหนดส่งงาน
                                                </label>
                                                <p className="font-medium text-slate-800">{contract.deadline}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm text-slate-500 flex items-center gap-2">
                                                    <Shield className="w-4 h-4" /> เงื่อนไขการชำระ
                                                </label>
                                                <p className="font-medium text-slate-800">{contract.paymentTerms || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Signatures Panel - Side Col */}
                        <div className="space-y-6">
                            {/* Employer Card */}
                            <Card className={`border-0 shadow-lg rounded-2xl ${contract.employer.signature ? 'bg-green-50' : 'bg-white'}`}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">ผู้ว่าจ้าง (Employer)</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                            <User className="w-5 h-5 text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{contract.employer.name}</p>
                                            <p className="text-xs text-slate-500">{contract.employer.email || 'ไม่ระบุอีเมล'}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        {contract.employer.signature ? (
                                            <div className="space-y-2 text-center">
                                                <div className="bg-white p-2 rounded-lg border border-green-200">
                                                    <img src={contract.employer.signature} alt="Employer Signature" className="h-16 mx-auto" />
                                                </div>
                                                <p className="text-xs text-green-600 flex items-center justify-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> เซ็นแล้วเมื่อ {formatDate(contract.employer.signedAt)}
                                                </p>
                                            </div>
                                        ) : (
                                            <Dialog open={isDialogOpen && signingRole === 'employer'} onOpenChange={setIsDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        onClick={() => { setSigningRole('employer'); setIsDialogOpen(true); }}
                                                        className="w-full bg-slate-800 hover:bg-slate-900 text-white"
                                                    >
                                                        เซ็นชื่อในฐานะผู้ว่าจ้าง
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle>ลงลายมือชื่อ (ผู้ว่าจ้าง)</DialogTitle>
                                                        <DialogDescription>
                                                            กรุณาเซ็นชื่อลงในช่องว่างด้านล่างเพื่อยืนยันสัญญา
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <SignaturePad onSave={handleSign} />
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Contractor Card */}
                            <Card className={`border-0 shadow-lg rounded-2xl ${contract.contractor.signature ? 'bg-green-50' : 'bg-white'}`}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">ผู้รับจ้าง (Contractor)</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                            <User className="w-5 h-5 text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{contract.contractor.name}</p>
                                            <p className="text-xs text-slate-500">{contract.contractor.email || 'ไม่ระบุอีเมล'}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        {contract.contractor.signature ? (
                                            <div className="space-y-2 text-center">
                                                <div className="bg-white p-2 rounded-lg border border-green-200">
                                                    <img src={contract.contractor.signature} alt="Contractor Signature" className="h-16 mx-auto" />
                                                </div>
                                                <p className="text-xs text-green-600 flex items-center justify-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> เซ็นแล้วเมื่อ {formatDate(contract.contractor.signedAt)}
                                                </p>
                                            </div>
                                        ) : (
                                            <Dialog open={isDialogOpen && signingRole === 'contractor'} onOpenChange={setIsDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        onClick={() => { setSigningRole('contractor'); setIsDialogOpen(true); }}
                                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                                    >
                                                        เซ็นชื่อในฐานะผู้รับจ้าง
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle>ลงลายมือชื่อ (ผู้รับจ้าง)</DialogTitle>
                                                        <DialogDescription>
                                                            กรุณาเซ็นชื่อลงในช่องว่างด้านล่างเพื่อยืนยันสัญญา
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <SignaturePad onSave={handleSign} />
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </FadeIn>
            </div>
        </div>
    );
}
