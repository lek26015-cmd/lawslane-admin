
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function KnowledgeBasePage() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle'; message: string }>({ type: 'idle', message: '' });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== 'application/pdf') {
                setStatus({ type: 'error', message: 'กรุณาเลือกไฟล์ PDF เท่านั้น' });
                return;
            }
            setFile(selectedFile);
            setStatus({ type: 'idle', message: '' });
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setStatus({ type: 'idle', message: '' });

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/admin/upload-knowledge', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            setStatus({ type: 'success', message: `อัปโหลดสำเร็จ! ประมวลผล ${data.chunks} ส่วน` });
            setFile(null);
            // Reset file input if needed, but React state handles the UI
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
                <p className="text-muted-foreground">จัดการข้อมูลเอกสารกฎหมายสำหรับ AI Legal Advisor</p>
            </div>

            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>อัปโหลดเอกสารใหม่</CardTitle>
                    <CardDescription>
                        เลือกไฟล์ PDF ที่ต้องการเพิ่มในฐานข้อมูล AI ระบบจะทำการอ่านและจัดเก็บให้อัตโนมัติ
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="pdf-upload">ไฟล์เอกสาร (PDF)</Label>
                        <Input
                            id="pdf-upload"
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            disabled={uploading}
                        />
                    </div>

                    {file && (
                        <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                            <FileText className="h-5 w-5 text-primary" />
                            <span className="text-sm font-medium">{file.name}</span>
                            <span className="text-xs text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                    )}

                    {status.type === 'error' && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
                            <AlertDescription>{status.message}</AlertDescription>
                        </Alert>
                    )}

                    {status.type === 'success' && (
                        <Alert className="border-green-500 text-green-600 bg-green-50">
                            <CheckCircle className="h-4 w-4" />
                            <AlertTitle>สำเร็จ</AlertTitle>
                            <AlertDescription>{status.message}</AlertDescription>
                        </Alert>
                    )}

                    <Button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="w-full sm:w-auto"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                กำลังอัปโหลด...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                อัปโหลดเข้าสู่ระบบ
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
