import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import jsQR from 'jsqr';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, ScanLine, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SlipVerifierProps {
    isOpen: boolean;
    onClose: () => void;
    slipUrl: string;
    expectedAmount?: number;
    expectedLawyerName?: string;
}

export function SlipVerifier({ isOpen, onClose, slipUrl, expectedAmount, expectedLawyerName }: SlipVerifierProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [verificationData, setVerificationData] = useState<any | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (isOpen && slipUrl) {
            scanQRCode();
        } else {
            setScanResult(null);
            setScanError(null);
        }
    }, [isOpen, slipUrl]);

    const scanQRCode = async () => {
        setIsScanning(true);
        setScanResult(null);
        setScanError(null);
        setVerificationData(null);

        const img = new window.Image();
        img.crossOrigin = "Anonymous";
        img.src = slipUrl;

        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const context = canvas.getContext('2d');
            if (!context) return;

            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0, img.width, img.height);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                setScanResult(code.data);
                verifyWithSlipOK(code.data);
            } else {
                setScanError("ไม่พบ QR Code ในรูปภาพนี้");
                setIsScanning(false);
            }
        };

        img.onerror = () => {
            setScanError("ไม่สามารถโหลดรูปภาพได้");
            setIsScanning(false);
        };
    };

    const verifyWithSlipOK = async (qrData: string) => {
        try {
            const response = await fetch('/api/verify-slip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: qrData }),
            });

            const result = await response.json();

            if (result.success) {
                setVerificationData(result.data);
            } else {
                setScanError(`ตรวจสอบไม่สำเร็จ: ${result.message}`);
            }
        } catch (error) {
            setScanError("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
        } finally {
            setIsScanning(false);
        }
    };

    // Simple parser for PromptPay QR (very basic check)
    const isPromptPay = scanResult?.includes("000201");

    // Extract amount if possible (This is tricky with raw EMVCo data without a full parser library, 
    // but we can look for the amount tag '54' followed by length)
    // For now, we will just display the raw data and a basic verification status.

    const isAmountMatch = verificationData && expectedAmount
        ? Math.abs(verificationData.amount - expectedAmount) < 0.01
        : null;

    // Basic name check: check if expected name is part of the receiver name (case-insensitive)
    // or vice versa, to handle partial matches.
    const isNameMatch = verificationData && expectedLawyerName
        ? verificationData.receiver.displayName.toLowerCase().includes(expectedLawyerName.toLowerCase()) ||
        expectedLawyerName.toLowerCase().includes(verificationData.receiver.displayName.toLowerCase())
        : null;

    const hasMismatch = isAmountMatch === false || isNameMatch === false;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>ตรวจสอบสลิปโอนเงิน</DialogTitle>
                    <DialogDescription>
                        ระบบจะทำการสแกน QR Code และตรวจสอบยอดเงินกับธนาคาร
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-full aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden border">
                            {slipUrl ? (
                                <Image
                                    src={slipUrl}
                                    alt="Slip"
                                    fill
                                    className="object-contain"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    ไม่มีรูปภาพ
                                </div>
                            )}
                        </div>
                        <canvas ref={canvasRef} className="hidden" />
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <ScanLine className="w-5 h-5" />
                                ผลการตรวจสอบ
                            </h3>

                            {isScanning ? (
                                <div className="flex items-center gap-2 text-muted-foreground py-4">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    กำลังตรวจสอบข้อมูลกับธนาคาร...
                                </div>
                            ) : verificationData ? (
                                <div className="space-y-4">
                                    {hasMismatch ? (
                                        <Alert variant="destructive" className="bg-red-50 border-red-200">
                                            <XCircle className="h-4 w-4 text-red-600" />
                                            <AlertTitle className="text-red-800">ข้อมูลไม่ตรงกัน (Mismatch)</AlertTitle>
                                            <AlertDescription className="text-red-700">
                                                พบข้อมูลบางอย่างไม่ตรงกับที่ระบุไว้ กรุณาตรวจสอบด้านล่าง
                                            </AlertDescription>
                                        </Alert>
                                    ) : (
                                        <Alert className="bg-green-50 border-green-200">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            <AlertTitle className="text-green-800">ตรวจสอบสำเร็จ (Verified)</AlertTitle>
                                            <AlertDescription className="text-green-700">
                                                ข้อมูลถูกต้อง ยืนยันโดย SlipOK
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="space-y-3 p-4 bg-slate-50 rounded-lg border text-sm">
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="text-muted-foreground">ผู้โอน:</div>
                                            <div className="col-span-2 font-medium">{verificationData.sender.displayName}</div>

                                            <div className="text-muted-foreground">ผู้รับ:</div>
                                            <div className="col-span-2">
                                                <div className={`font-medium ${isNameMatch === false ? 'text-red-600' : ''}`}>
                                                    {verificationData.receiver.displayName}
                                                </div>
                                                {isNameMatch === false && (
                                                    <div className="text-xs text-red-500 mt-1">
                                                        (ไม่ตรงกับ: {expectedLawyerName})
                                                    </div>
                                                )}
                                            </div>

                                            <div className="text-muted-foreground">ธนาคาร:</div>
                                            <div className="col-span-2 font-medium">
                                                {verificationData.sendingBank} {'->'} {verificationData.receivingBank}
                                            </div>

                                            <div className="text-muted-foreground">ยอดเงิน:</div>
                                            <div className={`col-span-2 font-bold text-lg ${isAmountMatch === false ? 'text-red-600' : 'text-green-600'}`}>
                                                ฿{verificationData.amount.toLocaleString()}
                                                {isAmountMatch === false && (
                                                    <span className="ml-2 text-xs font-normal text-red-500">
                                                        (ไม่ตรงกับยอดที่แจ้ง: ฿{expectedAmount?.toLocaleString()})
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-muted-foreground">วันที่:</div>
                                            <div className="col-span-2 font-medium">
                                                {new Date(verificationData.transDate + 'T' + verificationData.transTime).toLocaleString('th-TH')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : scanError ? (
                                <Alert variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertTitle>ไม่พบข้อมูล หรือ ตรวจสอบไม่สำเร็จ</AlertTitle>
                                    <AlertDescription>
                                        {scanError}
                                    </AlertDescription>
                                </Alert>
                            ) : null}
                        </div>

                        <div className="space-y-2 pt-4 border-t">
                            <h4 className="font-medium text-sm text-muted-foreground">ข้อมูลที่คาดหวัง</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-muted-foreground">ยอดเงิน:</div>
                                <div className="font-medium">฿{expectedAmount?.toLocaleString()}</div>
                                <div className="text-muted-foreground">ผู้รับโอน:</div>
                                <div className="font-medium">{expectedLawyerName || '-'}</div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={onClose}>ปิด</Button>
                            <Button onClick={scanQRCode} disabled={isScanning}>ตรวจสอบอีกครั้ง</Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
