'use client';

import { useParams, useRouter } from 'next/navigation';
import { Link } from '@/navigation';
import { contractService } from '@/services/contractService';
import { useUser } from '@/firebase/provider';
import { TurnstileWidget } from '@/components/turnstile-widget';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Loader2,
    AlertTriangle,
    CheckCircle,
    Plus,
    Shield,
    FileSignature,
    ArrowRight,
    Sparkles,
    X,
    Share2,
    Link as LinkIcon,
    LogIn,
    ShieldCheck,
    HelpCircle
} from 'lucide-react';



import { useToast } from '@/hooks/use-toast';
import { FadeIn } from '@/components/fade-in';
import { generateContractPDF } from '@/lib/contract-pdf';

interface ContractData {
    employer: string;
    employerId: string;
    employerAddress: string;
    contractor: string;
    contractorId: string;
    contractorAddress: string;
    task: string;
    price: number;
    deposit: number;
    deadline: string;
    paymentTerms: string;
    missingInfo: string[];
    riskyTerms: string[];
}



export default function ScreenshotToContractPage() {
    const { locale } = useParams();
    const { user } = useUser();
    const [images, setImages] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [contractData, setContractData] = useState<ContractData | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Consent state
    const [showPdpaDialog, setShowPdpaDialog] = useState(false);
    const [pdpaConsent, setPdpaConsent] = useState(false);
    const [acceptPrivacy, setAcceptPrivacy] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [acceptAiDisclaimer, setAcceptAiDisclaimer] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [showLoginDialog, setShowLoginDialog] = useState(false);

    // Cookie name for consent
    const CONSENT_COOKIE = 'lawslane_contract_consent';

    // Storage keys
    const CONTRACT_DATA_KEY = 'lawslane_contract_draft';
    const IMAGES_KEY = 'lawslane_contract_images';

    // Check cookie for existing consent on mount AND restore contract data
    React.useEffect(() => {
        setMounted(true);

        // Read consent from cookie
        const cookies = document.cookie.split(';');
        const consentCookie = cookies.find(c => c.trim().startsWith(CONSENT_COOKIE + '='));
        if (consentCookie) {
            const value = consentCookie.split('=')[1];
            if (value === 'accepted') {
                setAcceptPrivacy(true);
                setAcceptTerms(true);
                setAcceptAiDisclaimer(true);
                setPdpaConsent(true);
                setTurnstileToken('cookie-verified');
            }
        }

        // Restore contract data from sessionStorage (for after login redirect)
        const savedContractData = sessionStorage.getItem(CONTRACT_DATA_KEY);
        const savedImages = sessionStorage.getItem(IMAGES_KEY);

        if (savedContractData) {
            try {
                setContractData(JSON.parse(savedContractData));
                sessionStorage.removeItem(CONTRACT_DATA_KEY);
            } catch (e) {
                console.error('Failed to restore contract data:', e);
            }
        }

        if (savedImages) {
            try {
                setImages(JSON.parse(savedImages));
                sessionStorage.removeItem(IMAGES_KEY);
            } catch (e) {
                console.error('Failed to restore images:', e);
            }
        }
    }, []);

    // Save consent to cookie (valid for 30 days)
    const saveConsentToCookie = () => {
        const expires = new Date();
        expires.setDate(expires.getDate() + 30);
        document.cookie = `${CONSENT_COOKIE}=accepted; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    };

    const allConsentsAccepted = acceptPrivacy && acceptTerms && acceptAiDisclaimer && turnstileToken;

    // Handle clicking upload button - show consent first if not accepted
    const handleUploadClick = () => {
        if (!allConsentsAccepted) {
            setShowPdpaDialog(true);
            return;
        }
        fileInputRef.current?.click();
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setContractData(null); // Reset previous data when new images are uploaded

            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (reader.result) {
                        setImages(prev => [...prev, reader.result as string]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        if (images.length <= 1) {
            setContractData(null);
        }
    };

    const processImage = async () => {
        if (images.length === 0) return;

        setIsProcessing(true);
        try {
            // Send all images
            const response = await fetch('/api/ai/contract-draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ images, locale }), // Send array of images and locale
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to process images');
            }

            const data = await response.json();
            setContractData(data);
        } catch (error: any) {
            console.error('Processing error:', error);
            toast({
                title: "เกิดข้อผิดพลาด",
                description: error.message || "ไม่สามารถสร้างสัญญาจากรูปภาพได้ โปรดลองอีกครั้ง",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpsell = () => {
        toast({
            title: "ส่งเรื่องให้ทนายตรวจสอบ",
            description: "ระบบกำลังส่งข้อมูลให้ทนายความผู้เชี่ยวชาญ (จำลอง)",
        });
    };

    const handleInputChange = (field: keyof ContractData, value: string | number) => {
        if (!contractData) return;
        setContractData({
            ...contractData,
            [field]: value
        });
    };

    const handleBackToUpload = () => {
        setContractData(null);
    };

    const handleCreateContract = async () => {
        if (!contractData) return;

        // Check if user is logged in
        if (!user) {
            setShowLoginDialog(true);
            return;
        }

        proceedCreateContract();
    };

    const handleLoginRedirect = () => {
        // Save current data to sessionStorage before redirect
        if (contractData) {
            sessionStorage.setItem(CONTRACT_DATA_KEY, JSON.stringify(contractData));
        }
        if (images.length > 0) {
            sessionStorage.setItem(IMAGES_KEY, JSON.stringify(images));
        }

        setShowLoginDialog(false);
        router.push(`/${locale}/login?redirect=/services/contracts/screenshot`);
    };

    const proceedCreateContract = async () => {
        if (!contractData) return;
        setIsCreating(true);
        try {
            // Build employer object, only including defined fields
            const employer: Record<string, string> = { name: contractData.employer || '' };
            if (contractData.employerId) employer.id_card = contractData.employerId;
            if (contractData.employerAddress) employer.address = contractData.employerAddress;

            // Build contractor object, only including defined fields
            const contractor: Record<string, string> = { name: contractData.contractor || '' };
            if (contractData.contractorId) contractor.id_card = contractData.contractorId;
            if (contractData.contractorAddress) contractor.address = contractData.contractorAddress;

            const id = await contractService.createContract({
                title: 'สัญญาจ้างทำของ',
                employer: employer as any,
                contractor: contractor as any,
                task: contractData.task || '',
                price: contractData.price || 0,
                deposit: contractData.deposit || 0,
                deadline: contractData.deadline || '',
                paymentTerms: contractData.paymentTerms || '',
                status: 'draft',
                ownerId: user?.uid || 'anonymous',
            });

            toast({
                title: "สร้างสัญญาสำเร็จ",
                description: "กำลังนำคุณไปยังหน้าสัญญา...",
                className: "bg-green-600 text-white border-none",
            });

            router.push(`/${locale}/contract/${id}`);
        } catch (error) {
            console.error('Error creating contract:', error);
            toast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถสร้างสัญญาได้ กรุณาลองใหม่อีกครั้ง",
                variant: 'destructive',
            });
        } finally {
            setIsCreating(false);
        }
    };

    const handleAcceptPdpa = () => {
        setAcceptPrivacy(true);
        setAcceptTerms(true);
        setAcceptAiDisclaimer(true);
        setPdpaConsent(true);
        setShowPdpaDialog(false);
        // Save consent to cookie
        saveConsentToCookie();
        // Open file input after consent
        setTimeout(() => {
            fileInputRef.current?.click();
        }, 100);
    };

    return (
        <>
            {/* Consent Dialog */}
            <Dialog open={showPdpaDialog} onOpenChange={setShowPdpaDialog}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <ShieldCheck className="w-6 h-6 text-blue-600" />
                            ยินยอมก่อนใช้งาน
                        </DialogTitle>
                        <DialogDescription>
                            กรุณาอ่านและยอมรับเงื่อนไขทั้งหมดก่อนใช้งานบริการ
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Privacy Policy */}
                        <div className="flex items-start space-x-3 p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
                            <Checkbox
                                id="privacy"
                                checked={acceptPrivacy}
                                onCheckedChange={(checked) => setAcceptPrivacy(checked === true)}
                            />
                            <div className="flex-1">
                                <label htmlFor="privacy" className="font-medium text-slate-800 cursor-pointer">
                                    นโยบายความเป็นส่วนตัว (PDPA)
                                </label>
                                <p className="text-sm text-slate-500 mt-1">
                                    ข้าพเจ้ายินยอมให้เก็บรวบรวมข้อมูลส่วนบุคคล เช่น ชื่อ ที่อยู่ เลขบัตรประชาชน
                                    และลายเซ็นอิเล็กทรอนิกส์ เพื่อจัดเก็บและดำเนินการตามสัญญา
                                </p>
                            </div>
                        </div>

                        {/* Terms of Service */}
                        <div className="flex items-start space-x-3 p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
                            <Checkbox
                                id="terms"
                                checked={acceptTerms}
                                onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                            />
                            <div className="flex-1">
                                <label htmlFor="terms" className="font-medium text-slate-800 cursor-pointer">
                                    ข้อกำหนดการใช้งาน
                                </label>
                                <p className="text-sm text-slate-500 mt-1">
                                    ข้าพเจ้ายอมรับเงื่อนไขการใช้บริการ รวมถึงข้อจำกัดในการใช้งาน
                                    และความรับผิดชอบในการใช้บริการอย่างถูกต้อง
                                </p>
                            </div>
                        </div>

                        {/* AI Disclaimer */}
                        <div className="flex items-start space-x-3 p-4 rounded-2xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors shadow-sm">
                            <Checkbox
                                id="ai-disclaimer"
                                checked={acceptAiDisclaimer}
                                onCheckedChange={(checked) => setAcceptAiDisclaimer(checked === true)}
                            />
                            <div className="flex-1">
                                <label htmlFor="ai-disclaimer" className="font-medium text-amber-800 cursor-pointer">
                                    ข้อจำกัดความรับผิดของ AI
                                </label>
                                <p className="text-sm text-amber-700 mt-1">
                                    ข้าพเจ้าเข้าใจว่าสัญญาที่สร้างโดย AI เป็นเพียงร่างเบื้องต้น
                                    <strong>ไม่ใช่คำแนะนำทางกฎหมาย</strong> ควรตรวจสอบกับทนายความก่อนใช้จริง
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Turnstile CAPTCHA - shows after all checkboxes are checked */}
                    {acceptPrivacy && acceptTerms && acceptAiDisclaimer && !turnstileToken && (
                        <div className="py-4 border-t">
                            <p className="text-sm text-slate-600 mb-3 text-center">ยืนยันว่าคุณไม่ใช่ Robot</p>
                            <TurnstileWidget onVerify={(token) => setTurnstileToken(token)} />
                        </div>
                    )}

                    {/* Turnstile verified badge */}
                    {turnstileToken && (
                        <div className="py-3 flex items-center justify-center gap-2 text-green-600 border-t">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">ยืนยันตัวตนสำเร็จ</span>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            className="rounded-full px-6"
                            onClick={() => setShowPdpaDialog(false)}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            onClick={handleAcceptPdpa}
                            disabled={!acceptPrivacy || !acceptTerms || !acceptAiDisclaimer || !turnstileToken}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-6"
                        >
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            ยินยอมและดำเนินการต่อ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
                <DialogContent className="max-w-md rounded-[2rem] border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <LogIn className="w-6 h-6 text-blue-600" />
                            ต้องเข้าสู่ระบบ
                        </DialogTitle>
                        <DialogDescription>
                            ฟีเจอร์ &quot;สร้างลิงก์สัญญาออนไลน์&quot; ต้องเข้าสู่ระบบก่อนใช้งาน
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 shadow-sm">
                            <p className="text-sm text-blue-800">
                                💡 <strong>หมายเหตุ:</strong> หากคุณต้องการบันทึกเป็น PDF แทน
                                สามารถกด &quot;ยกเลิก&quot; แล้วเลือกปุ่ม &quot;บันทึก PDF&quot; ได้เลย
                                โดยไม่ต้องเข้าสู่ระบบ
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            className="rounded-full px-6"
                            onClick={() => setShowLoginDialog(false)}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            onClick={handleLoginRedirect}
                            className="bg-blue-600 hover:bg-blue-700 rounded-full px-6"
                        >
                            <LogIn className="w-4 h-4 mr-2" />
                            เข้าสู่ระบบ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
                {/* Hero Section */}
                <div className="relative bg-[#0B2555] pt-28 pb-48 overflow-hidden">
                    {/* Modern Glow Effects */}
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
                    <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/30 blur-[120px] rounded-[100%]" />
                    <div className="absolute top-20 -right-32 w-[500px] h-[500px] bg-blue-400/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob" />
                    <div className="absolute -bottom-20 -left-32 w-[400px] h-[400px] bg-cyan-400/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000" />

                    {/* Decorative Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

                    <div className="container mx-auto max-w-5xl px-4 relative z-10">
                        <FadeIn direction="up">
                            <div className="text-center space-y-6">
                                {/* Badge */}
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-blue-200 text-sm font-medium mb-4 backdrop-blur-md">
                                    <Sparkles className="w-4 h-4 text-yellow-400" />
                                    <span>AI-Powered Legal Assistant</span>
                                </div>

                                <h1
                                    className="font-bold text-white font-headline tracking-tighter leading-[1.1]"
                                    style={{ fontSize: 'clamp(4rem, 10vw, 7.5rem)' }}
                                >
                                    แคปแล้ว<span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500 drop-shadow-lg">ดีล!</span>
                                </h1>

                                <p className="text-blue-100/90 text-lg md:text-2xl max-w-2xl mx-auto leading-relaxed font-light">
                                    เปลี่ยนแชทที่คุยงานให้เป็นสัญญาที่ถูกต้องตามกฎหมาย<br className="hidden md:block" />
                                    ปกป้องสิทธิ์ของคุณง่ายๆ <span className="text-yellow-400 font-medium">ใน 3 วินาที</span>
                                </p>

                                <div className="pt-4">
                                    <Link
                                        href={`/help`}
                                        className="inline-flex items-center gap-2 text-blue-200 hover:text-white transition-colors text-sm"
                                    >
                                        <HelpCircle className="w-4 h-4" />
                                        <span>คู่มือการใช้งานและคำถามที่พบบ่อย (FAQ)</span>
                                    </Link>
                                </div>

                                {/* Feature pills */}
                                <div className="flex flex-wrap justify-center gap-3 pt-8">
                                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl px-5 py-2.5 text-sm text-white shadow-xl shadow-black/10">
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                        <span className="font-medium">ฟรี ไม่มีค่าใช้จ่าย</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl px-5 py-2.5 text-sm text-white shadow-xl shadow-black/10">
                                        <Shield className="w-5 h-5 text-blue-400" />
                                        <span className="font-medium">ปลอดภัย เข้ารหัส</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl px-5 py-2.5 text-sm text-white shadow-xl shadow-black/10">
                                        <FileSignature className="w-5 h-5 text-yellow-400" />
                                        <span className="font-medium">PDF พร้อมใช้งาน</span>
                                    </div>
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>

                {/* Main Content Overlap - Single Column */}
                <div className="container mx-auto max-w-2xl px-4 md:px-6 -mt-20 relative z-20 pb-20">
                    {/* Show Upload Section when no contract */}
                    {!contractData ? (
                        <FadeIn direction="up" delay={200}>
                            <Card className="border border-white/40 shadow-2xl shadow-blue-900/10 rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-2xl ring-1 ring-black/5">
                                <CardHeader className="bg-white/50 border-b border-slate-100/50 p-8 pb-6">
                                    <CardTitle className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-blue-700 shadow-sm border border-blue-100">
                                            <FileSignature className="w-6 h-6" />
                                        </div>
                                        อัปโหลดรูปแชทเพื่อเริ่มร่างสัญญา
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-8 p-8 max-w-xl mx-auto">
                                    <div className="w-full grid grid-cols-2 gap-4">
                                        {images.map((img, index) => (
                                            <div key={index} className="relative aspect-square rounded-2xl border-2 border-transparent hover:border-blue-400 overflow-hidden group shadow-sm transition-all">
                                                <img src={img} alt={`Uploaded chat ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                                                    className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 backdrop-blur-md"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}

                                        <div
                                            className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50/50 hover:border-blue-400 hover:shadow-inner group overflow-hidden
                                            ${images.length === 0 ? 'col-span-2 aspect-[16/9] bg-slate-50/50 border-slate-300/80 hover:border-blue-500 rounded-3xl' : 'border-slate-300/80 bg-slate-50/30'}`}
                                            onClick={handleUploadClick}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-50/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="space-y-4 p-6 relative z-10">
                                                <div className="w-16 h-16 mx-auto rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                                                    <Plus className="w-8 h-8 text-blue-500" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-700 text-lg">
                                                        {images.length > 0 ? 'เพิ่มรูปภาพ' : 'คลิกเพื่ออัปโหลดรูปแชทของคุณ'}
                                                    </p>
                                                    {images.length === 0 && (
                                                        <p className="text-sm text-slate-500 mt-2">รองรับหลายรูปภาพ (PNG, JPG)</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />

                                    <Button
                                        onClick={processImage}
                                        disabled={images.length === 0 || isProcessing}
                                        className="w-full bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white shadow-xl shadow-blue-900/20 rounded-2xl py-7 text-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] border border-blue-600/50 disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="w-6 h-6 mr-3 animate-spin text-blue-200" />
                                                กำลังวิเคราะห์แชทด้วย AI...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-6 h-6 mr-3 text-yellow-300" />
                                                สร้างร่างสัญญาอัจฉริยะ
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </FadeIn>
                    ) : (
                        /* Show Contract Result when ready */
                        <FadeIn direction="up" className="space-y-6 max-w-3xl mx-auto">
                            {/* Back Button */}
                            <Button
                                variant="ghost"
                                onClick={handleBackToUpload}
                                className="text-slate-600 hover:text-slate-800 mb-0 -ml-2 hover:bg-white/50 rounded-full"
                            >
                                <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                กลับไปอัปโหลดใหม่
                            </Button>

                            {/* Contract Draft */}
                            <Card className="border border-white/60 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white/90 backdrop-blur-xl ring-1 ring-slate-900/5">
                                <CardHeader className="border-b border-slate-100/80 p-6 md:p-8 bg-white/50">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
                                            <div className="p-2.5 rounded-2xl bg-blue-100/50 text-blue-700 border border-blue-100 shadow-sm">
                                                <FileSignature className="w-6 h-6" />
                                            </div>
                                            ร่างสัญญาฉบับย่อ
                                        </CardTitle>
                                        <div className="px-3 py-1 rounded-full bg-emerald-100/50 border border-emerald-200 text-emerald-700 text-sm font-medium flex items-center gap-1.5 shadow-sm">
                                            <CheckCircle className="w-4 h-4" />
                                            สร้างสำเร็จ
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 p-6 md:p-8">
                                    {/* Alerts */}
                                    {contractData.missingInfo.length > 0 && (
                                        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 animate-in slide-in-from-bottom-2">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-orange-100 rounded-full text-orange-600 mt-0.5">
                                                    <AlertTriangle className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-orange-800 text-sm">⚠️ ข้อมูลที่ไม่พบในแชท</h4>
                                                    <ul className="mt-2 space-y-1">
                                                        {contractData.missingInfo.map((info, i) => (
                                                            <li key={i} className="text-sm text-orange-700 flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                                                {info}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {contractData.riskyTerms.length > 0 && (
                                        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 animate-in slide-in-from-bottom-2">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-red-100 rounded-full text-red-600 mt-0.5">
                                                    <Shield className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-red-800 text-sm">⛔️ ข้อความที่มีความเสี่ยง!</h4>
                                                    <ul className="mt-2 space-y-1">
                                                        {contractData.riskyTerms.map((term, i) => (
                                                            <li key={i} className="text-sm text-red-700 flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                                                {term}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <Button
                                                        variant="link"
                                                        className="text-red-600 p-0 h-auto font-semibold mt-3 text-sm hover:text-red-700 group"
                                                        onClick={handleUpsell}
                                                    >
                                                        ให้ทนายช่วยตรวจแก้ (เริ่มต้น 500฿) <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Warning to use real legal names */}
                                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-amber-100 rounded-full text-amber-600 mt-0.5">
                                                <AlertTriangle className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-amber-800 text-sm">⚠️ กรุณาตรวจสอบข้อมูล</h4>
                                                <p className="text-sm text-amber-700 mt-1">
                                                    ข้อมูลด้านล่างดึงจากแชท อาจไม่ใช่ชื่อจริง กรุณาแก้ไขให้เป็น<strong>ชื่อ-นามสกุลตามบัตรประชาชน</strong>ก่อนสร้าง PDF
                                                </p>
                                                <p className="text-sm text-amber-600 mt-1">
                                                    ช่องที่แสดง <span className="font-mono bg-amber-100 px-1 rounded">_______</span> = ไม่พบข้อมูลในแชท ต้องกรอกเอง
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Form Fields */}
                                    {/* ผู้ว่าจ้าง Section */}
                                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                                        <h4 className="font-semibold text-slate-700 text-sm">👤 ผู้ว่าจ้าง</h4>
                                        <div className="space-y-2">
                                            <Label className="text-slate-600">ชื่อ-นามสกุล <span className="text-red-500">*</span></Label>
                                            <Input
                                                value={contractData.employer}
                                                onChange={(e) => handleInputChange('employer', e.target.value)}
                                                placeholder="ชื่อ-นามสกุลตามบัตรประชาชน"
                                                className={`bg-white rounded-xl ${!contractData.employer ? 'border-amber-400 bg-amber-50' : ''}`}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-slate-600">เลขบัตรประชาชน</Label>
                                                <Input
                                                    value={contractData.employerId || ''}
                                                    onChange={(e) => handleInputChange('employerId', e.target.value)}
                                                    placeholder="x-xxxx-xxxxx-xx-x"
                                                    className="bg-white rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-600">ที่อยู่</Label>
                                                <Input
                                                    value={contractData.employerAddress || ''}
                                                    onChange={(e) => handleInputChange('employerAddress', e.target.value)}
                                                    placeholder="ที่อยู่ตามบัตรประชาชน"
                                                    className="bg-white rounded-xl"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ผู้รับจ้าง Section */}
                                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                                        <h4 className="font-semibold text-slate-700 text-sm">🔧 ผู้รับจ้าง</h4>
                                        <div className="space-y-2">
                                            <Label className="text-slate-600">ชื่อ-นามสกุล <span className="text-red-500">*</span></Label>
                                            <Input
                                                value={contractData.contractor}
                                                onChange={(e) => handleInputChange('contractor', e.target.value)}
                                                placeholder="ชื่อ-นามสกุลตามบัตรประชาชน"
                                                className={`bg-white rounded-xl ${!contractData.contractor ? 'border-amber-400 bg-amber-50' : ''}`}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-slate-600">เลขบัตรประชาชน</Label>
                                                <Input
                                                    value={contractData.contractorId || ''}
                                                    onChange={(e) => handleInputChange('contractorId', e.target.value)}
                                                    placeholder="x-xxxx-xxxxx-xx-x"
                                                    className="bg-white rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-600">ที่อยู่</Label>
                                                <Input
                                                    value={contractData.contractorAddress || ''}
                                                    onChange={(e) => handleInputChange('contractorAddress', e.target.value)}
                                                    placeholder="ที่อยู่ตามบัตรประชาชน"
                                                    className="bg-white rounded-xl"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-600">ขอบเขตงาน <span className="text-red-500">*</span></Label>
                                        <Textarea
                                            value={contractData.task}
                                            onChange={(e) => handleInputChange('task', e.target.value)}
                                            rows={3}
                                            placeholder="รายละเอียดงานที่ต้องทำ"
                                            className={`bg-white resize-none rounded-xl ${!contractData.task ? 'border-amber-400 bg-amber-50' : ''}`}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-600">ราคารวม (บาท) <span className="text-red-500">*</span></Label>
                                            <Input
                                                value={contractData.price || ''}
                                                onChange={(e) => handleInputChange('price', Number(e.target.value))}
                                                type="number"
                                                placeholder="0"
                                                className={`bg-white rounded-xl ${!contractData.price ? 'border-amber-400 bg-amber-50' : ''}`}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-600">มัดจำ (บาท)</Label>
                                            <Input
                                                value={contractData.deposit || ''}
                                                onChange={(e) => handleInputChange('deposit', Number(e.target.value))}
                                                type="number"
                                                placeholder="0"
                                                className="bg-white rounded-xl"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-600">กำหนดส่งงาน <span className="text-red-500">*</span></Label>
                                        <Input
                                            value={contractData.deadline}
                                            onChange={(e) => handleInputChange('deadline', e.target.value)}
                                            placeholder="เช่น วันที่ 15 กุมภาพันธ์ 2569"
                                            className={`bg-white rounded-xl ${!contractData.deadline ? 'border-amber-400 bg-amber-50' : ''}`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-600">เงื่อนไขการชำระเงิน</Label>
                                        <Input
                                            value={contractData.paymentTerms}
                                            onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                                            placeholder="เช่น ชำระส่วนที่เหลือเมื่องานเสร็จ"
                                            className={`bg-white rounded-xl ${!contractData.paymentTerms ? 'border-amber-400 bg-amber-50' : ''}`}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                        <Button
                                            onClick={handleCreateContract}
                                            disabled={isCreating}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full h-12 text-lg shadow-lg shadow-blue-900/10 transition-all hover:-translate-y-1"
                                        >
                                            {isCreating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Share2 className="w-5 h-5 mr-2" />}
                                            สร้างลิงก์สัญญาออนไลน์
                                        </Button>
                                        <Button
                                            onClick={() => contractData && generateContractPDF(contractData)}
                                            className="w-full bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full h-12 text-lg transition-all hover:-translate-y-1"
                                        >
                                            <CheckCircle className="w-5 h-5 mr-2" />
                                            โหลด PDF เท่านั้น
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </FadeIn>
                    )}
                </div>
            </div >
        </>
    );
}
