'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Filter, MoreVertical, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAdminLocale } from '@/lib/admin-i18n';

interface Contract {
    id: string;
    title: string;
    task: string;
    price: number;
    status: string;
    createdAt: string;
    ownerId: string;
}

// ป้ายสถานะที่แสดงผล (ค่าจริงใน DB ยังเป็นภาษาอังกฤษ)
const STATUS_LABEL: Record<string, [string, string]> = {
    draft: ['ฉบับร่าง', 'Draft'],
    pending: ['รอดำเนินการ', 'Pending'],
    succeeded: ['สำเร็จ', 'Succeeded'],
    completed: ['เสร็จสิ้น', 'Completed'],
    active: ['ใช้งานอยู่', 'Active'],
    cancelled: ['ยกเลิกแล้ว', 'Cancelled'],
    failed: ['ล้มเหลว', 'Failed'],
};

export default function AdminContractsPage() {
    const { user: currentUser } = useUser();
    const { tx, locale } = useAdminLocale();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        async function fetchContracts() {
            if (!currentUser) return;
            try {
                const token = await currentUser.getIdToken();
                const res = await fetch('/api/capdeal/contracts', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setContracts(data.contracts || []);
                }
            } catch (error) {
                console.error('Failed to fetch contracts:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchContracts();
    }, [currentUser]);

    const filteredContracts = contracts.filter(c =>
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.task?.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">{tx('จัดการสัญญา', 'Contract Management')}</h2>
                    <p className="text-slate-500">{tx('ดูและจัดการสัญญาที่ผู้ใช้สร้างทั้งหมด', 'View and manage all user-generated contracts')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="rounded-xl border-slate-200">
                        <Filter className="w-4 h-4 mr-2" /> {tx('ตัวกรอง', 'Filter')}
                    </Button>
                    <Button className="rounded-xl bg-slate-900 text-white">
                        {tx('ส่งออก CSV', 'Export CSV')}
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="border-b border-slate-100 p-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder={tx('ค้นหาสัญญาจากชื่อ งาน หรือ ID...', 'Search contracts by title, task, or ID...')}
                            className="pl-11 h-12 rounded-2xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all text-base"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-20 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableHead className="py-4 pl-6 font-bold text-slate-500">{tx('สัญญา', 'CONTRACT')}</TableHead>
                                    <TableHead className="py-4 font-bold text-slate-500">{tx('งาน', 'TASK')}</TableHead>
                                    <TableHead className="py-4 font-bold text-slate-500">{tx('ผู้สร้าง', 'OWNER ID')}</TableHead>
                                    <TableHead className="py-4 font-bold text-slate-500">{tx('ราคา', 'PRICE')}</TableHead>
                                    <TableHead className="py-4 font-bold text-slate-500">{tx('วันที่', 'DATE')}</TableHead>
                                    <TableHead className="py-4 font-bold text-slate-500">{tx('สถานะ', 'STATUS')}</TableHead>
                                    <TableHead className="py-4 text-right pr-6"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredContracts.map((contract) => (
                                    <TableRow key={contract.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="py-5 pl-6">
                                            <Link href={`/contract/${contract.id}`} className="hover:underline">
                                                <div className="font-bold text-slate-900">{contract.title || tx('ไม่มีชื่อ', 'Untitled')}</div>
                                            </Link>
                                            <div className="text-xs text-slate-400 font-mono mt-0.5">{contract.id}</div>
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <div className="text-sm text-slate-600 line-clamp-1 max-w-[200px]">{contract.task || '-'}</div>
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <div className="text-xs text-slate-500 font-mono">{contract.ownerId || '-'}</div>
                                        </TableCell>
                                        <TableCell className="py-5 font-bold text-slate-900">
                                            ฿{(contract.price || 0).toLocaleString(locale === 'en' ? 'en-US' : 'th-TH')}
                                        </TableCell>
                                        <TableCell className="py-5 text-sm text-slate-500">
                                            {new Date(contract.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'th-TH')}
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <Badge className={cn(
                                                "rounded-full px-3 py-1 text-xs font-bold border-none",
                                                contract.status === 'succeeded' ? "bg-emerald-50 text-emerald-600" :
                                                    contract.status === 'draft' ? "bg-amber-50 text-amber-600" :
                                                        "bg-slate-100 text-slate-600"
                                            )}>
                                                {(() => {
                                                    if (!contract.status) return tx(...STATUS_LABEL.draft);
                                                    const label = STATUS_LABEL[contract.status];
                                                    return label ? tx(...label) : contract.status.toUpperCase();
                                                })()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-5 text-right pr-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/contract/${contract.id}`}>
                                                    <Button size="icon" variant="ghost" className="rounded-full hover:bg-white shadow-sm border border-slate-100" aria-label={tx('ดูสัญญา', 'View contract')} title={tx('ดูสัญญา', 'View contract')}>
                                                        <Eye className="w-4 h-4 text-slate-600" />
                                                    </Button>
                                                </Link>
                                                <Button size="icon" variant="ghost" className="rounded-full" aria-label={tx('ตัวเลือกเพิ่มเติม', 'More options')} title={tx('ตัวเลือกเพิ่มเติม', 'More options')}>
                                                    <MoreVertical className="w-4 h-4 text-slate-400" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    {!isLoading && filteredContracts.length === 0 && (
                        <div className="p-20 text-center text-slate-500">
                            {tx('ไม่พบสัญญาที่ตรงกับคำค้นหา', 'No contracts found matching your search.')}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
