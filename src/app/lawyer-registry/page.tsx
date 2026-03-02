'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, doc, writeBatch, query, orderBy, limit, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, CheckCircle, AlertCircle, FileText, Search, Trash2, Plus, FileType, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';
import { VerifiedLawyer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { syncLawyersToRegistry } from '@/lib/data';

export default function LawyerRegistryPage() {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lawyers, setLawyers] = useState<VerifiedLawyer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Upload State
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStats, setUploadStats] = useState<{ total: number; success: number; error: number } | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Manual Entry State
    const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newLawyer, setNewLawyer] = useState<Partial<VerifiedLawyer>>({
        status: 'active'
    });

    // Edit State
    const [editingLawyer, setEditingLawyer] = useState<VerifiedLawyer | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            if (user && firestore) {
                // Simple client-side check, real protection is in Firestore Rules
                // In a real app, you might check a custom claim or a user document
                setIsAdmin(true); // Assuming admin for now based on previous context
                fetchLawyers();
            } else if (!user) {
                setIsAdmin(false);
                setIsLoading(false);
            }
        };
        checkAdmin();
    }, [user, firestore]);

    const fetchLawyers = async () => {
        if (!firestore) return;
        setIsLoading(true);
        try {
            const q = query(collection(firestore, 'verifiedLawyers'), orderBy('updatedAt', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VerifiedLawyer));
            setLawyers(data);
        } catch (error) {
            console.error("Error fetching lawyers:", error);
            toast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถโหลดข้อมูลทนายความได้",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setUploadStats(null);
        }
    };

    const handleUpload = async () => {
        if (!file || !firestore) return;

        setIsUploading(true);
        setUploadStats(null);

        // Check file type
        if (file.type === 'application/pdf') {
            try {
                const formData = new FormData();
                formData.append('file', file);

                // Dynamically import the server action to avoid build issues if not used
                const { extractTextFromPdf } = await import('./actions');
                const { text } = await extractTextFromPdf(formData);

                console.log("Extracted PDF Text:", text);

                // Basic parsing logic (This is highly dependent on PDF structure)
                // Assumption: Each line might contain "License Name Surname" or similar
                // For now, we'll just show a success message with the character count
                // and maybe try to find some patterns if possible.

                // TODO: Implement specific parsing logic based on user's PDF format
                // For now, we treat it as a "Text Extraction Success"

                toast({
                    title: "อ่านไฟล์ PDF สำเร็จ",
                    description: `ดึงข้อความได้ ${text.length} ตัวอักษร (ระบบยังไม่รองรับการแปลงเป็นข้อมูลอัตโนมัติ)`,
                });

            } catch (error) {
                console.error("PDF Upload Error:", error);
                toast({
                    title: "เกิดข้อผิดพลาด",
                    description: "ไม่สามารถอ่านไฟล์ PDF ได้",
                    variant: "destructive",
                });
            } finally {
                setIsUploading(false);
            }
            return;
        }

        // CSV Handling
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data as any[];
                let successCount = 0;
                let errorCount = 0;
                const total = data.length;

                // Process in batches of 500 (Firestore limit)
                const batchSize = 400; // Safe margin
                for (let i = 0; i < data.length; i += batchSize) {
                    const chunk = data.slice(i, i + batchSize);
                    const batch = writeBatch(firestore);

                    chunk.forEach((row) => {
                        // Expected CSV columns: license_number, first_name, last_name, province, status, registered_date
                        // Map CSV columns to VerifiedLawyer type
                        const licenseNumber = row.license_number || row.licenseNumber || row['License Number'];

                        if (licenseNumber) {
                            const lawyerData: Omit<VerifiedLawyer, 'id'> = {
                                licenseNumber: String(licenseNumber).trim(),
                                firstName: (row.first_name || row.firstName || row['First Name'] || '').trim(),
                                lastName: (row.last_name || row.lastName || row['Last Name'] || '').trim(),
                                province: (row.province || row.Province || '').trim(),
                                status: (row.status?.toLowerCase() === 'active' ? 'active' : 'suspended') as 'active' | 'suspended' | 'struck_off', // Default logic
                                registeredDate: row.registered_date || row.registeredDate || new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            };

                            // Use license number as document ID for easy lookup and deduplication
                            // Sanitize ID by replacing / with -
                            const docId = String(lawyerData.licenseNumber).replace(/\//g, '-');
                            const docRef = doc(firestore, 'verifiedLawyers', docId);
                            batch.set(docRef, lawyerData);
                            successCount++;
                        } else {
                            errorCount++;
                        }
                    });

                    try {
                        await batch.commit();
                    } catch (err) {
                        console.error("Batch commit error:", err);
                        errorCount += chunk.length; // Assume whole batch failed if commit fails
                        successCount -= chunk.length; // Correct success count
                    }
                }

                setUploadStats({ total, success: successCount, error: errorCount });
                setIsUploading(false);
                setFile(null);
                toast({
                    title: "นำเข้าข้อมูลสำเร็จ",
                    description: `ประมวลผล ${total} รายการ. สำเร็จ: ${successCount}, ผิดพลาด: ${errorCount}`,
                });
                fetchLawyers(); // Refresh list
            },
            error: (error) => {
                console.error("CSV Parse Error:", error);
                toast({
                    title: "เกิดข้อผิดพลาด",
                    description: "ไม่สามารถอ่านไฟล์ CSV ได้",
                    variant: "destructive",
                });
                setIsUploading(false);
            }
        });
    };

    const handleSync = async () => {
        if (!firestore) return;
        setIsSyncing(true);
        try {
            const result = await syncLawyersToRegistry(firestore);
            toast({
                title: "ซิงค์ข้อมูลสำเร็จ",
                description: `ดึงข้อมูลจากใบสมัครสำเร็จ ${result.success} จากทั้งหมด ${result.total} รายการ`,
            });
            fetchLawyers(); // Refresh list
        } catch (error) {
            console.error("Sync Error:", error);
            toast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถซิงค์ข้อมูลได้",
                variant: "destructive",
            });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleManualSubmit = async () => {
        if (!firestore || !newLawyer.licenseNumber || !newLawyer.firstName || !newLawyer.lastName) {
            toast({
                title: "ข้อมูลไม่ครบถ้วน",
                description: "กรุณากรอกเลขใบอนุญาต ชื่อ และนามสกุล",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const lawyerData: Omit<VerifiedLawyer, 'id'> = {
                licenseNumber: newLawyer.licenseNumber,
                firstName: newLawyer.firstName,
                lastName: newLawyer.lastName,
                province: newLawyer.province || '',
                status: (newLawyer.status as any) || 'active',
                registeredDate: newLawyer.registeredDate || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Sanitize license number for use as document ID (replace / with -)
            const docId = lawyerData.licenseNumber.replace(/\//g, '-');
            await setDoc(doc(firestore, 'verifiedLawyers', docId), lawyerData);

            toast({
                title: "บันทึกสำเร็จ",
                description: "เพิ่มข้อมูลทนายความเรียบร้อยแล้ว",
            });

            setIsManualDialogOpen(false);
            setNewLawyer({ status: 'active' }); // Reset form
            fetchLawyers();
        } catch (error) {
            console.error("Error adding lawyer:", error);
            toast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถบันทึกข้อมูลได้",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (lawyer: VerifiedLawyer) => {
        setEditingLawyer(lawyer);
        setIsEditOpen(true);
    };

    const handleUpdateLawyer = async () => {
        if (!firestore || !editingLawyer) return;

        setIsUpdating(true);
        try {
            const docRef = doc(firestore, 'verifiedLawyers', editingLawyer.id);
            await setDoc(docRef, {
                ...editingLawyer,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            toast({
                title: "อัปเดตสำเร็จ",
                description: "แก้ไขข้อมูลทนายความเรียบร้อยแล้ว",
            });

            setIsEditOpen(false);
            setEditingLawyer(null);
            fetchLawyers();
        } catch (error) {
            console.error("Error updating lawyer:", error);
            toast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถอัปเดตข้อมูลได้",
                variant: "destructive",
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const filteredLawyers = lawyers.filter(l =>
        l.licenseNumber.includes(searchQuery) ||
        l.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.lastName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto py-8 max-w-6xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">ฐานข้อมูลตรวจสอบสถานะทนาย</h1>
                    <p className="text-slate-500">จัดการฐานข้อมูลรายชื่อทนายความสำหรับตรวจสอบสถานะ</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="gap-2"
                    >
                        {isSyncing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        ซิงค์ข้อมูลจากใบสมัคร
                    </Button>
                    <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                เพิ่มข้อมูลด้วยตนเอง
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>เพิ่มข้อมูลทนายความ</DialogTitle>
                                <DialogDescription>
                                    กรอกข้อมูลทนายความเพื่อเพิ่มลงในฐานข้อมูล
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="license" className="text-right">เลขใบอนุญาต</Label>
                                    <Input
                                        id="license"
                                        value={newLawyer.licenseNumber || ''}
                                        onChange={(e) => setNewLawyer({ ...newLawyer, licenseNumber: e.target.value })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="firstname" className="text-right">ชื่อ</Label>
                                    <Input
                                        id="firstname"
                                        value={newLawyer.firstName || ''}
                                        onChange={(e) => setNewLawyer({ ...newLawyer, firstName: e.target.value })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="lastname" className="text-right">นามสกุล</Label>
                                    <Input
                                        id="lastname"
                                        value={newLawyer.lastName || ''}
                                        onChange={(e) => setNewLawyer({ ...newLawyer, lastName: e.target.value })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="province" className="text-right">จังหวัด</Label>
                                    <Input
                                        id="province"
                                        value={newLawyer.province || ''}
                                        onChange={(e) => setNewLawyer({ ...newLawyer, province: e.target.value })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="status" className="text-right">สถานะ</Label>
                                    <Select
                                        value={newLawyer.status}
                                        onValueChange={(val: any) => setNewLawyer({ ...newLawyer, status: val })}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="เลือกสถานะ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">ปกติ (Active)</SelectItem>
                                            <SelectItem value="pending">รอตรวจสอบ (Pending)</SelectItem>
                                            <SelectItem value="suspended">ถูกระงับ (Suspended)</SelectItem>
                                            <SelectItem value="struck_off">ลบชื่อออก (Struck Off)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsManualDialogOpen(false)}>ยกเลิก</Button>
                                <Button onClick={handleManualSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    บันทึก
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>แก้ไขข้อมูลทนายความ</DialogTitle>
                        <DialogDescription>
                            แก้ไขข้อมูลทนายความในฐานข้อมูล
                        </DialogDescription>
                    </DialogHeader>
                    {editingLawyer && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-license" className="text-right">เลขใบอนุญาต</Label>
                                <Input
                                    id="edit-license"
                                    value={editingLawyer.licenseNumber}
                                    onChange={(e) => setEditingLawyer({ ...editingLawyer, licenseNumber: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-firstname" className="text-right">ชื่อ</Label>
                                <Input
                                    id="edit-firstname"
                                    value={editingLawyer.firstName}
                                    onChange={(e) => setEditingLawyer({ ...editingLawyer, firstName: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-lastname" className="text-right">นามสกุล</Label>
                                <Input
                                    id="edit-lastname"
                                    value={editingLawyer.lastName}
                                    onChange={(e) => setEditingLawyer({ ...editingLawyer, lastName: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-province" className="text-right">จังหวัด</Label>
                                <Input
                                    id="edit-province"
                                    value={editingLawyer.province}
                                    onChange={(e) => setEditingLawyer({ ...editingLawyer, province: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-status" className="text-right">สถานะ</Label>
                                <Select
                                    value={editingLawyer.status}
                                    onValueChange={(val: any) => setEditingLawyer({ ...editingLawyer, status: val })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="เลือกสถานะ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">ปกติ (Active)</SelectItem>
                                        <SelectItem value="pending">รอตรวจสอบ (Pending)</SelectItem>
                                        <SelectItem value="suspended">ถูกระงับ (Suspended)</SelectItem>
                                        <SelectItem value="struck_off">ลบชื่อออก (Struck Off)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>ยกเลิก</Button>
                        <Button onClick={handleUpdateLawyer} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            บันทึกการแก้ไข
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid gap-8 md:grid-cols-3">
                {/* Upload Section */}
                <Card className="md:col-span-1 h-fit rounded-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="w-5 h-5" />
                            นำเข้าข้อมูล
                        </CardTitle>
                        <CardDescription>
                            อัปโหลดไฟล์ CSV หรือ PDF เพื่ออัปเดตฐานข้อมูล
                            <br />
                            <span className="text-xs text-slate-400">รองรับไฟล์ .csv และ .pdf</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Input
                                type="file"
                                accept=".csv,.pdf"
                                onChange={handleFileChange}
                                disabled={isUploading}
                            />
                        </div>

                        {file && (
                            <div className="bg-slate-50 p-3 rounded-md text-sm flex items-center gap-2">
                                {file.type === 'application/pdf' ? <FileType className="w-4 h-4 text-red-500" /> : <FileText className="w-4 h-4 text-slate-400" />}
                                <span className="truncate flex-1">{file.name}</span>
                                <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                            </div>
                        )}

                        <Button
                            className="w-full"
                            onClick={handleUpload}
                            disabled={!file || isUploading}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    กำลังประมวลผล...
                                </>
                            ) : (
                                'อัปโหลดและซิงค์ข้อมูล'
                            )}
                        </Button>

                        {uploadStats && (
                            <Alert variant={uploadStats.error === 0 ? "default" : "destructive"} className="mt-4">
                                {uploadStats.error === 0 ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                <AlertTitle>นำเข้าเสร็จสิ้น</AlertTitle>
                                <AlertDescription>
                                    ทั้งหมด: {uploadStats.total}<br />
                                    สำเร็จ: {uploadStats.success}<br />
                                    ผิดพลาด: {uploadStats.error}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {/* List Section */}
                <Card className="md:col-span-2 rounded-xl">
                    <CardHeader>
                        <CardTitle>รายชื่อทนายที่ตรวจสอบแล้ว</CardTitle>
                        <CardDescription>รายการอัปเดตล่าสุดในระบบ</CardDescription>
                        <div className="pt-4">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    placeholder="ค้นหาด้วยชื่อ หรือเลขใบอนุญาต..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>เลขใบอนุญาต</TableHead>
                                        <TableHead>ชื่อ-นามสกุล</TableHead>
                                        <TableHead>จังหวัด</TableHead>
                                        <TableHead>สถานะ</TableHead>
                                        <TableHead className="text-right">จัดการ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLawyers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                                ไม่พบข้อมูล กรุณาอัปโหลดไฟล์ หรือเพิ่มข้อมูลใหม่
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredLawyers.map((lawyer) => (
                                            <TableRow key={lawyer.id}>
                                                <TableCell className="font-medium">{lawyer.licenseNumber}</TableCell>
                                                <TableCell>{lawyer.firstName} {lawyer.lastName}</TableCell>
                                                <TableCell>{lawyer.province || '-'}</TableCell>
                                                <TableCell>
                                                    <Badge variant={lawyer.status === 'active' ? 'default' : lawyer.status === 'pending' ? 'secondary' : 'destructive'}>
                                                        {lawyer.status === 'active' ? 'ปกติ' : lawyer.status === 'pending' ? 'รอตรวจสอบ' : lawyer.status === 'suspended' ? 'ถูกระงับ' : 'ลบชื่อออก'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(lawyer)}>
                                                        แก้ไข
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
