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
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit, CalendarIcon } from 'lucide-react';
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
    orderBy
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Coupon } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export default function AdminCouponsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [coupons, setCoupons] = React.useState<Coupon[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [isEditMode, setIsEditMode] = React.useState(false);
    const [currentCouponId, setCurrentCouponId] = React.useState<string | null>(null);

    // Form State
    const [formData, setFormData] = React.useState<{
        code: string;
        type: 'fixed' | 'percent';
        value: string;
        expiryDate: Date | undefined;
        usageLimit: string;
    }>({
        code: '',
        type: 'fixed',
        value: '',
        expiryDate: undefined,
        usageLimit: ''
    });

    const fetchCoupons = React.useCallback(async () => {
        if (!firestore) return;
        setIsLoading(true);
        try {
            const q = query(collection(firestore, 'coupons'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Coupon[];
            setCoupons(data);
        } catch (error) {
            console.error("Error fetching coupons:", error);
            toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถโหลดข้อมูลคูปองได้' });
        } finally {
            setIsLoading(false);
        }
    }, [firestore, toast]);

    React.useEffect(() => {
        fetchCoupons();
    }, [fetchCoupons]);

    const handleOpenDialog = (coupon?: Coupon) => {
        if (coupon) {
            setIsEditMode(true);
            setCurrentCouponId(coupon.id);
            setFormData({
                code: coupon.code,
                type: coupon.type,
                value: coupon.value.toString(),
                expiryDate: coupon.expiryDate?.toDate(),
                usageLimit: coupon.usageLimit ? coupon.usageLimit.toString() : ''
            });
        } else {
            setIsEditMode(false);
            setCurrentCouponId(null);
            setFormData({
                code: '',
                type: 'fixed',
                value: '',
                expiryDate: undefined,
                usageLimit: ''
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;

        if (!formData.code || !formData.value || !formData.expiryDate) {
            toast({ variant: 'destructive', title: 'ข้อมูลไม่ครบ', description: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
            return;
        }

        setIsLoading(true);
        try {
            const couponData = {
                code: formData.code.toUpperCase(),
                type: formData.type,
                value: Number(formData.value),
                expiryDate: Timestamp.fromDate(formData.expiryDate),
                usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
                isActive: true,
                // usedCount is 0 for new, kept for edit
            };

            if (isEditMode && currentCouponId) {
                await updateDoc(doc(firestore, 'coupons', currentCouponId), {
                    ...couponData,
                    // Don't reset usedCount or createdAt on edit usually, but here we just update fields
                });
                toast({ title: 'สำเร็จ', description: 'อัปเดตคูปองเรียบร้อยแล้ว' });
            } else {
                await addDoc(collection(firestore, 'coupons'), {
                    ...couponData,
                    usedCount: 0,
                    createdAt: serverTimestamp()
                });
                toast({ title: 'สำเร็จ', description: 'สร้างคูปองเรียบร้อยแล้ว' });
            }
            setIsDialogOpen(false);
            fetchCoupons();
        } catch (error) {
            console.error("Error saving coupon:", error);
            toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถบันทึกคูปองได้' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบคูปองนี้?")) return;
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'coupons', id));
            toast({ title: 'สำเร็จ', description: 'ลบคูปองเรียบร้อยแล้ว' });
            fetchCoupons();
        } catch (error) {
            console.error("Error deleting coupon:", error);
            toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถลบคูปองได้' });
        }
    };

    const toggleStatus = async (coupon: Coupon) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, 'coupons', coupon.id), {
                isActive: !coupon.isActive
            });
            fetchCoupons(); // Refresh to see update
        } catch (error) {
            console.error("Error toggling status:", error);
            toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถเปลี่ยนสถานะได้' });
        }
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>จัดการคูปองส่วนลด</CardTitle>
                        <CardDescription>สร้างและจัดการคูปองส่วนลดสำหรับลูกค้า</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenDialog()}>
                        <Plus className="mr-2 h-4 w-4" /> สร้างคูปอง
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>รหัสคูปอง</TableHead>
                                <TableHead>ประเภท</TableHead>
                                <TableHead>มูลค่า</TableHead>
                                <TableHead>การใช้งาน</TableHead>
                                <TableHead>วันหมดอายุ</TableHead>
                                <TableHead>สถานะ</TableHead>
                                <TableHead className="text-right">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {coupons.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center">ยังไม่มีคูปอง</TableCell>
                                </TableRow>
                            ) : (
                                coupons.map((coupon) => (
                                    <TableRow key={coupon.id}>
                                        <TableCell className="font-medium">{coupon.code}</TableCell>
                                        <TableCell className="capitalize">{coupon.type}</TableCell>
                                        <TableCell>
                                            {coupon.type === 'fixed'
                                                ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(coupon.value)
                                                : `${coupon.value}%`
                                            }
                                        </TableCell>
                                        <TableCell>
                                            {coupon.usedCount} / {coupon.usageLimit || '∞'}
                                        </TableCell>
                                        <TableCell>
                                            {coupon.expiryDate ? format(coupon.expiryDate.toDate(), 'd MMM yyyy', { locale: th }) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-block w-2 h-2 rounded-full ${coupon.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                <span className="text-sm text-muted-foreground">{coupon.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => toggleStatus(coupon)} title={coupon.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}>
                                                    <div className={`w-4 h-4 rounded-full border-2 ${coupon.isActive ? 'border-green-500' : 'border-gray-300'}`} />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(coupon)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(coupon.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'แก้ไขคูปอง' : 'สร้างคูปองใหม่'}</DialogTitle>
                        <DialogDescription>
                            กรอกรายละเอียดคูปองส่วนลด
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">รหัสคูปอง</Label>
                            <Input
                                id="code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                placeholder="เช่น WELCOME100"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">ประเภท</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val: 'fixed' | 'percent') => setFormData({ ...formData, type: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="เลือกประเภท" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fixed">จำนวนเงินคงที่ (บาท)</SelectItem>
                                        <SelectItem value="percent">เปอร์เซ็นต์ (%)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="value">มูลค่า</Label>
                                <Input
                                    id="value"
                                    type="number"
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                    placeholder="เช่น 100 หรือ 10"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 flex flex-col">
                                <Label>วันหมดอายุ</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !formData.expiryDate && "text-muted-foreground"
                                            )}
                                        >
                                            {formData.expiryDate ? (
                                                format(formData.expiryDate, "P", { locale: th })
                                            ) : (
                                                <span>เลือกวันที่</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={formData.expiryDate}
                                            onSelect={(date) => setFormData({ ...formData, expiryDate: date })}
                                            disabled={(date) =>
                                                date < new Date()
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="usageLimit">จำนวนครั้งที่ใช้ได้ (ไม่บังคับ)</Label>
                                <Input
                                    id="usageLimit"
                                    type="number"
                                    value={formData.usageLimit}
                                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                    placeholder="เว้นว่างหากไม่จำกัด"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
                            <Button type="submit" disabled={isLoading}>{isLoading ? 'กำลังบันทึก...' : 'บันทึกคูปอง'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
