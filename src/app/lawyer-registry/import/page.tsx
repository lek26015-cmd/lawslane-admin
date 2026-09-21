'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import {
    Upload, FileImage, Loader2, ArrowLeft, Trash2, Plus, Download,
    ShieldCheck, AlertCircle, CheckCircle2, Eye, X
} from 'lucide-react';
import {
    extractLawyersFromImage,
    importLawyersToRegistry,
    type ExtractedLawyer,
} from '@/app/actions/registry-import-actions';

export default function RegistryImportPage() {
    const [files, setFiles] = useState<{ name: string; preview: string; base64: string; mimeType: string }[]>([]);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedData, setExtractedData] = useState<ExtractedLawyer[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ success: number; duplicates: number; errors: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
    const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles) return;
        setError(null);

        const newFiles: typeof files = [];
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            if (!file.type.startsWith('image/')) {
                setError('รองรับเฉพาะไฟล์รูปภาพ (.jpg, .png, .webp)');
                continue;
            }
            if (file.size > 10 * 1024 * 1024) {
                setError('ไฟล์ต้องมีขนาดไม่เกิน 10MB');
                continue;
            }

            const base64 = await fileToBase64(file);
            newFiles.push({
                name: file.name,
                preview: URL.createObjectURL(file),
                base64,
                mimeType: file.type,
            });
        }
        setFiles(prev => [...prev, ...newFiles]);
    }, []);

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const dt = e.dataTransfer;
        if (dt.files.length > 0) {
            const fakeEvent = { target: { files: dt.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
            handleFileChange(fakeEvent);
        }
    }, [handleFileChange]);

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleExtract = async () => {
        if (files.length === 0) return;
        setIsExtracting(true);
        setError(null);
        setExtractedData([]);
        setImportResult(null);
        setProgress({ current: 0, total: files.length, fileName: files[0].name });

        try {
            let allLawyers: ExtractedLawyer[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setProgress({ current: i, total: files.length, fileName: file.name });
                try {
                    const lawyers = await extractLawyersFromImage(file.base64, file.mimeType);
                    allLawyers = [...allLawyers, ...lawyers];
                } catch (err: any) {
                    console.error(`Error extracting file ${file.name}:`, err);
                    // Continue with next file instead of stopping
                    setError(prev => prev ? prev + `\n${file.name}: ล้มเหลว` : `${file.name}: ล้มเหลว`);
                }
            }
            setProgress({ current: files.length, total: files.length, fileName: 'เสร็จสิ้น' });
            setExtractedData(allLawyers);
        } catch (err: any) {
            setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
        } finally {
            setIsExtracting(false);
            setTimeout(() => setProgress(null), 2000);
        }
    };

    const handleImport = async () => {
        if (extractedData.length === 0) return;
        setIsImporting(true);
        setError(null);
        setImportProgress({ current: 0, total: extractedData.length });
        
        let accumulatedResult = { success: 0, duplicates: 0, errors: 0, total: extractedData.length };
        const batchSize = 25; // Process in chunks to update UI progress

        try {
            for (let i = 0; i < extractedData.length; i += batchSize) {
                const chunk = extractedData.slice(i, i + batchSize);
                const chunkResult = await importLawyersToRegistry(chunk);
                
                accumulatedResult.success += chunkResult.success;
                accumulatedResult.duplicates += chunkResult.duplicates;
                accumulatedResult.errors += chunkResult.errors;
                
                setImportProgress({ current: Math.min(i + batchSize, extractedData.length), total: extractedData.length });
            }
            setImportResult(accumulatedResult);
        } catch (err: any) {
            setError(err.message || 'เกิดข้อผิดพลาดในการ Import');
        } finally {
            setIsImporting(false);
            setTimeout(() => setImportProgress(null), 2000);
        }
    };

    const updateRow = (index: number, field: keyof ExtractedLawyer, value: string) => {
        setExtractedData(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const deleteRow = (index: number) => {
        setExtractedData(prev => prev.filter((_, i) => i !== index));
    };

    const addRow = () => {
        setExtractedData(prev => [
            ...prev,
            { prefix: 'นาย', firstName: '', lastName: '', licenseNumber: '', licenseType: '' },
        ]);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition"
                        onClick={() => setPreviewImage(null)}
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                    <img
                        src={previewImage}
                        alt="Preview"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg"
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}

            <div className="container mx-auto max-w-5xl px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="inline-flex items-center text-sm text-slate-500 hover:text-[#0B3979] transition-colors mb-4 font-medium">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        กลับหน้าแรก
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-[#0B3979] rounded-xl flex items-center justify-center">
                            <Download className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-[#0B3979]">Registry Import</h1>
                            <p className="text-sm text-slate-500">อัปโหลดเอกสารรายชื่อทนาย → AI อ่านข้อมูล → Import เข้าระบบ</p>
                        </div>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-medium text-amber-700 mt-2">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Super Admin Only
                    </div>
                </div>

                {/* Step 1: Upload */}
                <Card className="shadow-lg border-none mb-6 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-[#0B3979] to-[#1a5bb8] text-white p-5">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                            อัปโหลดเอกสาร
                        </CardTitle>
                        <CardDescription className="text-blue-100 text-sm">
                            รองรับ JPG, PNG, WebP (สูงสุด 10MB ต่อไฟล์)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                        <div
                            className="relative border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#0B3979] hover:bg-blue-50/50 transition-all group"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                        >
                            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3 group-hover:text-[#0B3979] transition-colors" />
                            <p className="text-sm text-slate-600 font-medium">
                                ลากไฟล์มาวางตรงนี้ หรือ <span className="text-[#0B3979] underline">คลิกเพื่อเลือกไฟล์</span>
                            </p>
                            <p className="text-xs text-slate-400 mt-1">สามารถอัปโหลดได้หลายไฟล์พร้อมกัน</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>

                        {/* File Previews */}
                        {files.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {files.map((file, idx) => (
                                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                                        <img
                                            src={file.preview}
                                            alt={file.name}
                                            className="w-full h-28 object-cover cursor-pointer"
                                            onClick={() => setPreviewImage(file.preview)}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                            <button
                                                className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-slate-100"
                                                onClick={() => setPreviewImage(file.preview)}
                                            >
                                                <Eye className="w-4 h-4 text-slate-700" />
                                            </button>
                                            <button
                                                className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-md hover:bg-red-600"
                                                onClick={() => removeFile(idx)}
                                            >
                                                <Trash2 className="w-4 h-4 text-white" />
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate px-2 py-1.5">{file.name}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Button
                            onClick={handleExtract}
                            disabled={files.length === 0 || isExtracting}
                            className="w-full h-11 rounded-xl bg-[#0B3979] hover:bg-[#082a5a] text-white font-semibold"
                        >
                            {isExtracting ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    กำลังอ่านข้อมูลจากเอกสาร...
                                </>
                            ) : (
                                <>
                                    <FileImage className="w-5 h-5 mr-2" />
                                    ดึงข้อมูลจากเอกสาร ({files.length} ไฟล์)
                                </>
                            )}
                        </Button>

                        {/* Progress Bar */}
                        {progress && (
                            <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600 font-medium truncate max-w-[60%]">
                                        {progress.current < progress.total ? (
                                            <>📄 กำลังอ่าน: {progress.fileName}</>
                                        ) : (
                                            <>✅ อ่านเสร็จสิ้น!</>
                                        )}
                                    </span>
                                    <span className="text-[#0B3979] font-bold">
                                        {progress.current}/{progress.total} ไฟล์ ({Math.round((progress.current / progress.total) * 100)}%)
                                    </span>
                                </div>
                                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#0B3979] to-[#1a5bb8] rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${Math.max(2, (progress.current / progress.total) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Step 2: Table */}
                {extractedData.length > 0 && (
                    <Card className="shadow-lg border-none mb-6 overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-5">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                                ตรวจสอบและแก้ไขข้อมูล
                            </CardTitle>
                            <CardDescription className="text-emerald-100 text-sm">
                                พบ {extractedData.length} รายการ — คลิกที่ช่องเพื่อแก้ไข
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50">
                                            <th className="text-left px-4 py-3 font-semibold text-slate-600 w-10">#</th>
                                            <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">คำนำหน้า</th>
                                            <th className="text-left px-4 py-3 font-semibold text-slate-600">ชื่อ</th>
                                            <th className="text-left px-4 py-3 font-semibold text-slate-600">สกุล</th>
                                            <th className="text-left px-4 py-3 font-semibold text-slate-600 w-36">เลขใบอนุญาต</th>
                                            <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">ประเภท</th>
                                            <th className="w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {extractedData.map((lawyer, idx) => (
                                            <tr
                                                key={idx}
                                                className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors"
                                            >
                                                <td className="px-4 py-2 text-slate-400 text-xs">{idx + 1}</td>
                                                <td className="px-3 py-1.5">
                                                    <select
                                                        value={lawyer.prefix}
                                                        onChange={(e) => updateRow(idx, 'prefix', e.target.value)}
                                                        className="w-full h-8 px-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                                                    >
                                                        <option value="นาย">นาย</option>
                                                        <option value="นาง">นาง</option>
                                                        <option value="นางสาว">นางสาว</option>
                                                    </select>
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <Input
                                                        value={lawyer.firstName}
                                                        onChange={(e) => updateRow(idx, 'firstName', e.target.value)}
                                                        className="h-8 text-sm border-slate-200 rounded-lg"
                                                    />
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <Input
                                                        value={lawyer.lastName}
                                                        onChange={(e) => updateRow(idx, 'lastName', e.target.value)}
                                                        className="h-8 text-sm border-slate-200 rounded-lg"
                                                    />
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <Input
                                                        value={lawyer.licenseNumber}
                                                        onChange={(e) => updateRow(idx, 'licenseNumber', e.target.value)}
                                                        className="h-8 text-sm border-slate-200 rounded-lg font-mono"
                                                    />
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <Input
                                                        value={lawyer.licenseType || ''}
                                                        onChange={(e) => updateRow(idx, 'licenseType', e.target.value)}
                                                        className="h-8 text-sm border-slate-200 rounded-lg"
                                                        placeholder="-"
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <button
                                                        onClick={() => deleteRow(idx)}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addRow}
                                    className="text-sm rounded-lg"
                                >
                                    <Plus className="w-4 h-4 mr-1" /> เพิ่มแถว
                                </Button>

                                <Button
                                    onClick={handleImport}
                                    disabled={isImporting || extractedData.length === 0}
                                    className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                >
                                    {isImporting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            กำลัง Import...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4 mr-2" />
                                            Import เข้าระบบ ({extractedData.length} รายการ)
                                        </>
                                    )}
                                </Button>
                            </div>
                            
                            {/* Import Progress Bar */}
                            {importProgress && (
                                <div className="p-4 bg-emerald-50 border-t border-emerald-100">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-emerald-700 font-medium">
                                                {importProgress.current < importProgress.total ? (
                                                    <>⏳ กำลังบันทึกข้อมูลเข้าระบบ...</>
                                                ) : (
                                                    <>✅ บันทึกเสร็จสิ้น!</>
                                                )}
                                            </span>
                                            <span className="text-emerald-700 font-bold">
                                                {importProgress.current}/{importProgress.total} รายการ ({Math.round((importProgress.current / importProgress.total) * 100)}%)
                                            </span>
                                        </div>
                                        <div className="w-full h-3 bg-emerald-200/50 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300 ease-out"
                                                style={{ width: `${Math.max(2, (importProgress.current / importProgress.total) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Result */}
                {importResult && (
                    <Card className="shadow-lg border-none overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                <h3 className="text-lg font-bold text-slate-900">Import เสร็จสิ้น!</h3>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-slate-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-slate-900">{importResult.total}</p>
                                    <p className="text-xs text-slate-500 mt-1">ทั้งหมด</p>
                                </div>
                                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-emerald-600">{importResult.success}</p>
                                    <p className="text-xs text-emerald-600 mt-1">สำเร็จ</p>
                                </div>
                                <div className="bg-amber-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-amber-600">{importResult.duplicates}</p>
                                    <p className="text-xs text-amber-600 mt-1">ซ้ำ (ข้าม)</p>
                                </div>
                                <div className="bg-red-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-red-500">{importResult.errors}</p>
                                    <p className="text-xs text-red-500 mt-1">ข้อผิดพลาด</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
