'use client';

import * as React from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit, CalendarIcon, Percent } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useFirebase } from '@/firebase';
import {
    collection,
    query,
    getDocs,
    doc,
    deleteDoc,
    addDoc,
    serverTimestamp,
    updateDoc,
    Timestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { GpCoupon } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';

export default function AdminGpCouponsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [coupons, setCoupons] = React.useState<GpCoupon[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [isEditMode, setIsEditMode] = React.useState(false);
    const [currentCouponId, setCurrentCouponId] = React.useState<string | null>(null);

    // Form State
    const [formData, setFormData] = React.useState<{
        code: string;
        description: string;
        gpRate: string;
        expiryDate: Date | undefined;
    }>({
        code: '',
        description: '',
        gpRate: '',
        expiryDate: undefined,
    });

    const fetchCoupons = React.useCallback(async () => {
        if (!firestore) return;
        setIsLoading(true);
        try {
            const q = query(collection(firestore, 'gpCoupons'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as GpCoupon[];

            const sorted = data.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB.getTime() - dateA.getTime();
            });

            setCoupons(sorted);
        } catch (error) {
            console.error("Error fetching GP coupons:", error);
            toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดข้อมูลคูปอง GP ได้' });
        } finally {
            setIsLoading(false);
        }
    }, [firestore, toast]);

    React.useEffect(() => {
        fetchCoupons();
    }, [fetchCoupons]);

    const handleOpenDialog = (coupon?: GpCoupon) => {
        if (coupon) {
            setIsEditMode(true);
            setCurrentCouponId(coupon.id);
            setFormData({
                code: coupon.code,
                description: coupon.description || '',
                gpRate: (coupon.gpRate * 100).toString(),
                expiryDate: coupon.expiryDate?.toDate?.(),
            });
        } else {
            setIsEditMode(false);
            setCurrentCouponId(null);
            setFormData({ code: '', description: '', gpRate: '', expiryDate: undefined });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;

        const gpRateNum = parseFloat(formData.gpRate);
        if (!formData.code || isNaN(gpRateNum) || gpRateNum < 0 || gpRateNum > 100) {
            toast({ variant: 'destructive', title: 'ข้อมูลไม่ถูกต้อง', description: 'กรุณากรอกรหัสคูปองและอัตรา GP ที่ถูกต้อง (0-100%)' });
            return;
        }

        setIsLoading(true);
        try {
            const couponData = {
                code: formData.code.toUpperCase(),
                description: formData.description,
                gpRate: gpRateNum / 100, // store as decimal e.g. 0.10
                expiryDate: formData.expiryDate ? Timestamp.fromDate(formData.expiryDate) : null,
                isActive: true,
            };

            if (isEditMode && currentCouponId) {
                await updateDoc(doc(firestore, 'gpCoupons', currentCouponId), couponData);
                toast({ title: 'สำเร็จ', description: 'อัปเดตคูปอง GP เรียบร้อยแล้ว' });
            } else {
                await addDoc(collection(firestore, 'gpCoupons'), {
                    ...couponData,
                    assignedTo: [],
                    createdAt: serverTimestamp()
                });
                toast({ title: 'สำเร็จ', description: 'สร้างคูปอง GP เรียบร้อยแล้ว' });
            }
            setIsDialogOpen(false);
            fetchCoupons();
        } catch (error) {
            console.error("Error saving GP coupon:", error);
            toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถบันทึกคูปอง GP ได้' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบคูปอง GP นี้?")) return;
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'gpCoupons', id));
            toast({ title: 'สำเร็จ', description: 'ลบคูปอง GP เรียบร้อยแล้ว' });
            fetchCoupons();
        } catch (error) {
            console.error("Error deleting GP coupon:", error);
            toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถลบคูปอง GP ได้' });
        }
    };

    const toggleStatus = async (coupon: GpCoupon) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, 'gpCoupons', coupon.id), { isActive: !coupon.isActive });
            fetchCoupons();
        } catch (error) {
            console.error("Error toggling GP coupon status:", error);
            toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถเปลี่ยนสถานะได้' });
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Percent className="h-5 w-5 text-primary" />
                            จัดการคูปอง GP ทนาย
                        </CardTitle>
                        <CardDescription>
                            สร้างคูปองลดอัตราค่า GP สำหรับมอบหมายให้กับทนายความในระบบ (ค่าเริ่มต้น GP = 15%)
                        </CardDescription>
                    </div>
                    <Button onClick={() => handleOpenDialog()}>
                        <Plus className="mr-2 h-4 w-4" /> สร้างคูปอง GP
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>รหัสคูปอง</TableHead>
                                    <TableHead>คำอธิบาย</TableHead>
                                    <TableHead>อัตรา GP ใหม่</TableHead>
                                    <TableHead>ทนายที่ได้รับ</TableHead>
                                    <TableHead>วันหมดอายุ</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead className="text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {coupons.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                            ยังไม่มีคูปอง GP — กดปุ่ม "สร้างคูปอง GP" เพื่อเพิ่ม
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    coupons.map((coupon) => (
                                        <TableRow key={coupon.id}>
                                            <TableCell className="font-mono font-semibold text-primary">
                                                {coupon.code}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {coupon.description || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-green-700 bg-green-100 border-green-200">
                                                    {(coupon.gpRate * 100).toFixed(1)}%
                                                </Badge>
                                                <span className="ml-2 text-xs text-muted-foreground">
                                                    (ลดจาก 15%)
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {coupon.assignedTo?.length || 0} คน
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {coupon.expiryDate
                                                    ? format(coupon.expiryDate.toDate(), 'd MMM yyyy', { locale: th })
                                                    : <span className="text-muted-foreground">ไม่มีวันหมดอายุ</span>
                                                }
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-block w-2 h-2 rounded-full ${coupon.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                                                    <span className="text-sm text-muted-foreground">
                                                        {coupon.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => toggleStatus(coupon)}
                                                        title={coupon.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                                                    >
                                                        <div className={`w-4 h-4 rounded-full border-2 ${coupon.isActive ? 'border-green-500' : 'border-gray-300'}`} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(coupon)}>
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive"
                                                        onClick={() => handleDelete(coupon.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create / Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'แก้ไขคูปอง GP' : 'สร้างคูปอง GP ใหม่'}</DialogTitle>
                        <DialogDescription>
                            กำหนดอัตรา GP พิเศษสำหรับแจกจ่ายให้แก่ทนายความ
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="gp-code">รหัสคูปอง</Label>
                            <Input
                                id="gp-code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                placeholder="เช่น GP10, PARTNER15"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gp-description">คำอธิบาย (ไม่บังคับ)</Label>
                            <Textarea
                                id="gp-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="เช่น คูปองสำหรับทนายพาร์ทเนอร์รุ่นแรก"
                                rows={2}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gp-rate">
                                อัตรา GP ใหม่ (%) <span className="text-muted-foreground text-xs">ค่าเริ่มต้น 15%</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="gp-rate"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={formData.gpRate}
                                    onChange={(e) => setFormData({ ...formData, gpRate: e.target.value })}
                                    placeholder="เช่น 10"
                                    className="pr-8"
                                    required
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                            {formData.gpRate && !isNaN(parseFloat(formData.gpRate)) && (
                                <p className="text-xs text-muted-foreground">
                                    ทนายจะถูกหัก GP {parseFloat(formData.gpRate).toFixed(1)}% (แทนที่จะเป็น 15%)
                                </p>
                            )}
                        </div>
                        <div className="space-y-2 flex flex-col">
                            <Label>วันหมดอายุ (ไม่บังคับ)</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full pl-3 text-left font-normal",
                                            !formData.expiryDate && "text-muted-foreground"
                                        )}
                                    >
                                        {formData.expiryDate
                                            ? format(formData.expiryDate, "P", { locale: th })
                                            : <span>ไม่มีวันหมดอายุ</span>
                                        }
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={formData.expiryDate}
                                        onSelect={(date) => setFormData({ ...formData, expiryDate: date })}
                                        disabled={(date) => date < new Date()}
                                        initialFocus
                                    />
                                    {formData.expiryDate && (
                                        <div className="p-2 border-t">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full text-muted-foreground"
                                                onClick={() => setFormData({ ...formData, expiryDate: undefined })}
                                            >
                                                ล้างวันที่
                                            </Button>
                                        </div>
                                    )}
                                </PopoverContent>
                            </Popover>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'กำลังบันทึก...' : 'บันทึกคูปอง GP'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
