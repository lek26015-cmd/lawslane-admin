'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { uploadEducationMedia } from '@/app/actions/education-upload';
import {
    Upload,
    Video,
    FileText,
    X,
    Check,
    AlertCircle,
    Loader2
} from 'lucide-react';

interface VideoUploaderProps {
    value?: string;
    onChange: (url: string) => void;
    type?: 'video' | 'document';
    accept?: string;
    maxSizeMB?: number;
}

export function VideoUploader({
    value,
    onChange,
    type = 'video',
    accept = 'video/mp4,video/webm,video/quicktime',
    maxSizeMB = 100
}: VideoUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate size
        if (file.size > maxSizeMB * 1024 * 1024) {
            setError(`ไฟล์ใหญ่เกินไป (สูงสุด ${maxSizeMB}MB)`);
            return;
        }

        setError(null);
        setIsUploading(true);
        setProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Simulate progress (since fetch doesn't support progress for uploads natively)
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            // ยิง server action ของ repo นี้ ไม่ข้ามโดเมนกลับไปหา education
            const data = await uploadEducationMedia(formData, type as 'video' | 'image' | 'document');

            clearInterval(progressInterval);

            if (!data.success) {
                throw new Error(data.error || 'Upload failed');
            }

            setProgress(100);
            setUploadedFile({ name: file.name, size: file.size });
            onChange(data.url);

            // Reset progress after a short delay
            setTimeout(() => {
                setProgress(0);
                setIsUploading(false);
            }, 1000);

        } catch (err: any) {
            setError(err.message || 'เกิดข้อผิดพลาดในการอัปโหลด');
            setIsUploading(false);
            setProgress(0);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const clearFile = () => {
        onChange('');
        setUploadedFile(null);
        setError(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
            />

            {/* Current Value Display */}
            {value && !isUploading && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Check className="w-4 h-4 text-green-600" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-800 truncate">
                            {uploadedFile?.name || 'ไฟล์ที่อัปโหลด'}
                        </p>
                        {uploadedFile && (
                            <p className="text-xs text-green-600">
                                {formatFileSize(uploadedFile.size)}
                            </p>
                        )}
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={clearFile}
                        className="text-green-600 hover:text-red-600 hover:bg-red-50"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* Upload Area */}
            {!value && !isUploading && (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="w-full p-6 border-2 border-dashed border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group"
                >
                    <div className="flex flex-col items-center gap-2 text-slate-500 group-hover:text-indigo-600">
                        {type === 'video' ? (
                            <Video className="w-8 h-8" />
                        ) : (
                            <FileText className="w-8 h-8" />
                        )}
                        <div className="text-center">
                            <p className="font-medium">
                                คลิกเพื่ออัปโหลด{type === 'video' ? 'วิดีโอ' : 'เอกสาร'}
                            </p>
                            <p className="text-xs">
                                {type === 'video' ? 'MP4, WebM (สูงสุด 100MB)' : 'PDF, DOC (สูงสุด 10MB)'}
                            </p>
                        </div>
                    </div>
                </button>
            )}

            {/* Uploading State */}
            {isUploading && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                        <span className="text-sm font-medium text-indigo-800">
                            กำลังอัปโหลด...
                        </span>
                        <span className="text-sm text-indigo-600 ml-auto">
                            {progress}%
                        </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-800">{error}</span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setError(null)}
                        className="ml-auto text-red-600 hover:text-red-700"
                    >
                        ปิด
                    </Button>
                </div>
            )}

            {/* URL Input as fallback */}
            {!value && !isUploading && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>หรือ</span>
                    <button
                        type="button"
                        onClick={() => {
                            const url = prompt('ใส่ URL วิดีโอ:');
                            if (url) onChange(url);
                        }}
                        className="text-indigo-500 hover:text-indigo-600 underline"
                    >
                        ใส่ URL โดยตรง
                    </button>
                </div>
            )}
        </div>
    );
}
