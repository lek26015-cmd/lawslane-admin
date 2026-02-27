
'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getLawyerById } from '@/lib/data';
import type { LawyerProfile } from '@/lib/types';
import { ArrowLeft, CreditCard, Calendar, User, CheckCircle, QrCode, MessageSquare, Pencil, Loader2, Landmark, Upload } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QRCode from 'qrcode.react';
import generatePayload from 'promptpay-qr';
import { useChat } from '@/context/chat-context';
import { Textarea } from '@/components/ui/textarea';
import { v4 as uuidv4 } from 'uuid';
import { useFirebase } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp, setDoc, getDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { errorEmitter, FirestorePermissionError } from '@/firebase';
import { uploadToR2 } from '@/app/actions/upload-r2';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants';
import { compressImageToBase64 } from '@/lib/image-utils';


function PaymentPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const { setInitialChatMessage } = useChat();
    const { firestore, user, storage } = useFirebase();

    const paymentType = searchParams.get('type') || 'appointment';
    const lawyerId = searchParams.get('lawyerId');
    const chatId = searchParams.get('chatId');
    const amountParam = searchParams.get('amount');
    const dateStr = searchParams.get('date');
    const description = searchParams.get('description');

    const [lawyer, setLawyer] = useState<LawyerProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [promptPayPayload, setPromptPayPayload] = useState('');
    const [initialMessage, setInitialMessage] = useState(description || '');
    const [activeTab, setActiveTab] = useState("bank-transfer");
    const [isWaitingForPayment, setIsWaitingForPayment] = useState(false);
    const [slipFile, setSlipFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null); // Type should be Coupon but using any for quick integration or import it
    const [discountAmount, setDiscountAmount] = useState(0);
    const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);


    const appointmentFee = 3500;
    const chatTicketFee = 500;
    let fee = paymentType === 'chat' ? chatTicketFee : appointmentFee;
    if (paymentType === 'additional' && amountParam) {
        fee = Number(amountParam);
    }
    const finalFee = Math.max(0, fee - discountAmount);
    const title = paymentType === 'chat' ? 'ยืนยันการเปิด Ticket สนทนา' : (paymentType === 'additional' ? 'ชำระค่าบริการเพิ่มเติม' : 'ยืนยันการนัดหมายและชำระเงิน');
    const descriptionText = paymentType === 'chat' ? 'กรุณาตรวจสอบรายละเอียดและดำเนินการชำระเงินค่าเปิด Ticket' : (paymentType === 'additional' ? 'กรุณาชำระค่าบริการเพิ่มเติมตามที่ทนายความร้องขอ' : 'กรุณาตรวจสอบรายละเอียดและดำเนินการชำระเงินค่าปรึกษา');

    useEffect(() => {
        async function fetchLawyer() {
            if (!lawyerId || !firestore) {
                setIsLoading(false);
                return;
            }

            // Check if current user is a lawyer
            if (user) {
                const q = query(collection(firestore, "lawyerProfiles"), where("userId", "==", user.uid));
                const lawyerSnap = await getDocs(q);
                if (!lawyerSnap.empty) {
                    toast({
                        variant: "destructive",
                        title: "ไม่สามารถทำรายการได้",
                        description: "บัญชีทนายความไม่สามารถชำระเงินค่าบริการได้"
                    });
                    router.push('/lawyer-dashboard');
                    return;
                }
            }

            setIsLoading(true);
            const lawyerData = await getLawyerById(firestore, lawyerId);
            setLawyer(lawyerData || null);
            setIsLoading(false);
        }
        fetchLawyer();
    }, [lawyerId, firestore, user, router, toast]);

    useEffect(() => {
        // Use configured PromptPay number or default to company number
        const mobileNumber = process.env.NEXT_PUBLIC_PROMPTPAY_NUMBER || '081-234-5678';
        const payload = generatePayload(mobileNumber, { amount: finalFee });
        setPromptPayPayload(payload);
    }, [finalFee]);

    const uploadSlip = async (file: File, userId: string) => {
        const formData = new FormData();
        formData.append('file', file);
        // Use generic R2 upload action
        return await uploadToR2(formData, 'payment-slips');
    };

    const handleApplyCoupon = async () => {
        if (!couponCode || !firestore) return;
        setIsCheckingCoupon(true);
        try {
            const q = query(
                collection(firestore, 'coupons'),
                where('code', '==', couponCode.toUpperCase()),
                where('isActive', '==', true)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                toast({ variant: 'destructive', title: 'ไม่พบคูปอง', description: 'รหัสคูปองไม่ถูกต้องหรือหมดอายุ' });
                setAppliedCoupon(null);
                setDiscountAmount(0);
                setIsCheckingCoupon(false);
                return;
            }

            const couponData = snapshot.docs[0].data();
            const couponId = snapshot.docs[0].id;

            // Validate Expiry
            if (couponData.expiryDate && couponData.expiryDate.toDate() < new Date()) {
                toast({ variant: 'destructive', title: 'คูปองหมดอายุ', description: 'คูปองนี้หมดอายุแล้ว' });
                setAppliedCoupon(null);
                setDiscountAmount(0);
                setIsCheckingCoupon(false);
                return;
            }

            // Validate Usage Limit
            if (couponData.usageLimit && couponData.usedCount >= couponData.usageLimit) {
                toast({ variant: 'destructive', title: 'คูปองครบจำนวนสิทธิ์แล้ว', description: 'คูปองนี้ถูกใช้จนครบจำนวนสิทธิ์แล้ว' });
                setAppliedCoupon(null);
                setDiscountAmount(0);
                setIsCheckingCoupon(false);
                return;
            }

            // Calculate Discount
            let discount = 0;
            if (couponData.type === 'fixed') {
                discount = couponData.value;
            } else if (couponData.type === 'percent') {
                discount = (fee * couponData.value) / 100;
            }

            setDiscountAmount(discount);
            setAppliedCoupon({ id: couponId, ...couponData });
            toast({ title: 'ใช้คูปองสำเร็จ', description: `คุณได้รับส่วนลด ${new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(discount)}` });

        } catch (error) {
            console.error("Error checking coupon:", error);
            toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถตรวจสอบคูปองได้' });
        } finally {
            setIsCheckingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        setCouponCode('');
        setAppliedCoupon(null);
        setDiscountAmount(0);
    };

    const processPayment = async (isManualTransfer = false) => {
        const targetLawyerUserId = lawyer?.userId || lawyer?.id;
        console.log("Starting processPayment", { isManualTransfer, paymentType, user: user?.uid, lawyer: lawyer?.id, targetLawyerUserId });
        setIsProcessing(true);
        if (!firestore || !user || !lawyer) {
            console.error("Missing dependencies", { firestore: !!firestore, user: !!user, lawyer: !!lawyer });
            toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้" });
            setIsProcessing(false);
            return;
        }

        if (!targetLawyerUserId) {
            console.error("Lawyer data is missing userId and id", lawyer);
            toast({ variant: "destructive", title: "ข้อมูลทนายความไม่ถูกต้อง", description: "ไม่พบข้อมูลผู้ใช้ของทนายความ กรุณาติดต่อผู้ดูแลระบบ" });
            setIsProcessing(false);
            return;
        }

        try {
            let slipUrl = '';
            if (isManualTransfer && slipFile) {
                console.log("Uploading slip...");
                try {
                    // Add timeout to upload
                    const uploadPromise = uploadSlip(slipFile, user.uid);
                    // const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Upload timed out")), 15000)); // 15s timeout

                    slipUrl = await uploadPromise as string; // await Promise.race([uploadPromise, timeoutPromise]) as string;
                    console.log("Slip uploaded:", slipUrl);
                } catch (uploadError) {
                    console.warn("Upload failed or timed out:", uploadError);

                    // Only attempt Base64 fallback for images
                    if (slipFile.type.startsWith('image/')) {
                        try {
                            toast({ title: "กำลังปรับขนาดรูปภาพ...", description: "การอัปโหลดล่าช้า ระบบกำลังย่อไฟล์เพื่อส่งข้อมูล" });
                            slipUrl = await compressImageToBase64(slipFile);
                            console.log("Slip converted to Base64");
                            toast({ title: "กำลังใช้ระบบสำรอง", description: "ใช้การส่งไฟล์แบบสำรองเรียบร้อยแล้ว" });
                        } catch (base64Error) {
                            console.error("Base64 conversion failed:", base64Error);
                            toast({ variant: "destructive", title: "อัปโหลดสลิปไม่สำเร็จ", description: "กรุณาลองใหม่อีกครั้ง หรือไฟล์อาจมีขนาดใหญ่เกินไป" });
                            setIsProcessing(false);
                            return;
                        }
                    } else {
                        // For PDFs or other types, we can't compress, so we must fail
                        toast({ variant: "destructive", title: "อัปโหลดไฟล์ไม่สำเร็จ", description: "การอัปโหลดใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง" });
                        setIsProcessing(false);
                        return;
                    }
                }
            }

            if (paymentType === 'chat') {
                console.log("Processing chat payment...");
                const newChatId = uuidv4();
                const chatRef = doc(firestore, 'chats', newChatId);
                const messagesRef = collection(chatRef, 'messages');

                const chatPayload = {
                    participants: [user.uid, targetLawyerUserId],
                    createdAt: serverTimestamp(),
                    caseTitle: `Ticket สนทนา: ${initialMessage.substring(0, 30)}...`,
                    status: isManualTransfer ? 'pending_payment' : 'active',
                    ...(isManualTransfer && { slipUrl }),
                    lawyerId: lawyer.id, // Add lawyerId for easier querying
                    userId: user.uid, // Add userId for easier querying
                    lastMessage: initialMessage,
                    lastMessageAt: serverTimestamp(),
                    amount: finalFee, // Store the payment amount
                    originalFee: fee,
                    discount: discountAmount,
                    couponCode: appliedCoupon?.code || null,
                    couponId: appliedCoupon?.id || null
                };

                console.log("Creating chat document...", chatPayload);

                await setDoc(chatRef, chatPayload)
                    .catch(serverError => {
                        console.error("Error creating chat:", serverError);
                        const permissionError = new FirestorePermissionError({ path: chatRef.path, operation: 'create', requestResourceData: chatPayload });
                        errorEmitter.emit('permission-error', permissionError);
                        throw serverError; // Re-throw to be caught by outer try-catch
                    });

                console.log("Chat document created.");

                // Always create the initial message
                const messagePayload = {
                    text: initialMessage,
                    senderId: user.uid,
                    timestamp: serverTimestamp(),
                };
                await addDoc(messagesRef, messagePayload)
                    .catch(serverError => {
                        const permissionError = new FirestorePermissionError({ path: messagesRef.path, operation: 'create', requestResourceData: messagePayload });
                        errorEmitter.emit('permission-error', permissionError);
                        throw serverError;
                    });

                if (isManualTransfer) {
                    console.log("Setting payment success (manual)...");
                    setPaymentSuccess(true);
                } else {
                    toast({
                        title: "ชำระเงินสำเร็จ!",
                        description: 'คุณสามารถเริ่มสนทนากับทนายความได้แล้ว',
                    });
                    router.push(`/chat/${newChatId}?lawyerId=${lawyer.id}`);
                }

                if (!isManualTransfer) {
                    // Send Email Notification to Lawyer (Only for instant payment)
                    import('@/app/actions/email').then(({ sendLawyerNewCaseEmail }) => {
                        const caseLink = `${window.location.origin}/chat/${newChatId}?lawyerId=${lawyer.id}&clientId=${user.uid}&view=lawyer`;
                        sendLawyerNewCaseEmail(
                            lawyer.email,
                            lawyer.name,
                            user.displayName || 'ลูกค้า',
                            `Ticket สนทนา: ${initialMessage.substring(0, 30)}...`,
                            caseLink
                        ).then(res => console.log("Email sent:", res));
                    });
                } else {
                    // Notify Admin for Manual Payment
                    import('@/app/actions/admin-notifications').then(({ notifyAdmins }) => {
                        notifyAdmins('payment', {
                            lawyerName: lawyer.name,
                            amount: fee,
                            slipUrl: slipUrl
                        });
                    });
                }
                if (appliedCoupon) {
                    // Update Coupon Usage
                    // Ideally this should be a transaction to be safe concurrently
                    try {
                        const couponRef = doc(firestore, 'coupons', appliedCoupon.id);
                        // We do a simple increment here for MVP. Real app should use transaction/increment
                        await import('firebase/firestore').then(({ increment, updateDoc }) => {
                            updateDoc(couponRef, { usedCount: increment(1) });
                        });
                    } catch (e) { console.error("Failed to update coupon usage", e); }
                }

            } else if (paymentType === 'appointment' && dateStr) {
                console.log("Processing appointment payment...");
                const appointmentRef = collection(firestore, 'appointments');
                const appointmentPayload = {
                    userId: user.uid,
                    lawyerId: lawyer.id,
                    lawyerUserId: targetLawyerUserId,
                    lawyerName: lawyer.name,
                    lawyerImageUrl: lawyer.imageUrl,
                    appointmentDate: new Date(dateStr),
                    description: description,
                    status: (isManualTransfer && finalFee > 0) ? 'pending_payment' : 'pending', // If 0 fee, go straight to pending (awaiting confirmation/acceptance by lawyer, but paid)
                    createdAt: serverTimestamp(),
                    ...(isManualTransfer && { slipUrl }),
                    amount: finalFee,
                    originalFee: fee,
                    discount: discountAmount,
                    couponCode: appliedCoupon?.code || null,
                    couponId: appliedCoupon?.id || null,
                    isFree: finalFee === 0
                };

                console.log("Creating appointment...", appointmentPayload);

                await addDoc(appointmentRef, appointmentPayload)
                    .catch(serverError => {
                        console.error("Error creating appointment:", serverError);
                        const permissionError = new FirestorePermissionError({ path: appointmentRef.path, operation: 'create', requestResourceData: appointmentPayload });
                        errorEmitter.emit('permission-error', permissionError);
                        throw serverError;
                    });


                setPaymentSuccess(true);
                if (!isManualTransfer) {
                    toast({
                        title: "ชำระเงินสำเร็จ!",
                        description: 'เราได้ส่งคำขอนัดหมายของคุณไปยังทนายความแล้ว',
                    });

                    // Send Email Notification for Appointment (Instant)
                    // (Assuming there was email logic here, otherwise add it if needed, but for now focus on blocking manual)
                } else {
                    // Notify Admin for Manual Payment (Appointment)
                    import('@/app/actions/admin-notifications').then(({ notifyAdmins }) => {
                        notifyAdmins('payment', {
                            lawyerName: lawyer.name,
                            amount: fee,
                            slipUrl: slipUrl,
                            type: 'Appointment'
                        });
                    });
                }

                if (appliedCoupon) {
                    try {
                        const couponRef = doc(firestore, 'coupons', appliedCoupon.id);
                        await import('firebase/firestore').then(({ increment, updateDoc }) => {
                            updateDoc(couponRef, { usedCount: increment(1) });
                        });
                    } catch (e) { console.error("Failed to update coupon usage", e); }
                }
            } else if (paymentType === 'additional' && chatId) {
                console.log("Processing additional fee payment for chat:", chatId);
                const chatRef = doc(firestore, 'chats', chatId);

                // Get current amount to add to it
                const chatSnap = await getDoc(chatRef);
                const currentAmount = chatSnap.exists() ? (chatSnap.data().amount || 0) : 0;

                await updateDoc(chatRef, {
                    amount: currentAmount + finalFee,
                    pendingFeeRequest: null, // Clear the request
                    lastPaymentAt: serverTimestamp(),
                    hasNewPayment: true
                });

                // Create a system message in the chat
                const messagesRef = collection(chatRef, 'messages');
                await addDoc(messagesRef, {
                    text: `💳 ลูกความได้ชำระค่าบริการเพิ่มเติมจำนวน ฿${finalFee.toLocaleString()} เรียบร้อยแล้ว`,
                    senderId: 'system',
                    timestamp: serverTimestamp(),
                });

                toast({
                    title: "ชำระเงินสำเร็จ!",
                    description: 'ค่าบริการถูกเพิ่มเข้าไปใน Escrow เรียบร้อยแล้ว',
                });

                if (isManualTransfer) {
                    setPaymentSuccess(true);
                } else {
                    router.push(`/chat/${chatId}?lawyerId=${lawyerId}`);
                }
            }
        } catch (error) {
            console.error("Payment processing error:", error);
            toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: "ไม่สามารถดำเนินการได้ กรุณาลองใหม่อีกครั้ง" });
        } finally {
            setIsProcessing(false);
        }
    }


    const handlePayment = async (e?: React.FormEvent) => {
        e?.preventDefault();
        // Credit Card is currently disabled/removed as per requirements for Real Data
        toast({
            variant: "destructive",
            title: "ยังไม่เปิดให้บริการ",
            description: "ระบบตัดบัตรเครดิตยังไม่เปิดให้บริการในขณะนี้ กรุณาเลือกโอนเงิน",
        });
    };

    const handlePromptPaySelect = () => {
        // For PromptPay, we also require slip upload to verify
        // So we just switch tab to bank-transfer or show a dialog
        toast({
            title: "กรุณาแนบสลิป",
            description: "เมื่อชำระเงินแล้ว กรุณาแนบสลิปในช่อง 'โอนเงิน' เพื่อยืนยัน",
        });
        setActiveTab("bank-transfer");
    };

    const handleBankTransferSubmit = () => {
        if (!slipFile) {
            toast({ variant: 'destructive', title: 'กรุณาแนบสลิปการโอนเงิน' });
            return;
        }
        processPayment(true);
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];

            if (file.size > MAX_FILE_SIZE_BYTES) {
                toast({
                    variant: "destructive",
                    title: "ไฟล์มีขนาดใหญ่เกินไป",
                    description: `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน ${MAX_FILE_SIZE_MB}MB`
                });
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                return;
            }

            setSlipFile(file);
        }
    };


    if (isLoading) {
        return <div className="flex items-center justify-center min-h-[50vh]">Loading...</div>;
    }

    if (!lawyer || (paymentType === 'appointment' && !dateStr)) {
        return (
            <div className="text-center">
                <p className="mb-4">ข้อมูลการชำระเงินไม่ถูกต้อง</p>
                <Link href="/lawyers">
                    <Button variant="outline">กลับไปหน้ารายชื่อทนาย</Button>
                </Link>
            </div>
        );
    }

    if (paymentSuccess) {
        return (
            <Card className="w-full max-w-2xl mx-auto">
                <CardContent className="pt-6 text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">ส่งข้อมูลสำเร็จ!</h2>
                    <p className="text-muted-foreground mb-4">
                        เราได้รับข้อมูลของคุณแล้ว เจ้าหน้าที่จะดำเนินการตรวจสอบและอนุมัติภายใน 24 ชั่วโมง
                    </p>
                    <Button asChild>
                        <Link href="/dashboard">กลับไปที่แดชบอร์ด</Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl font-headline flex items-center gap-3">
                    {title}
                </CardTitle>
                <CardDescription>
                    {descriptionText}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">สรุปรายการ</h3>
                    <Card className="bg-secondary/50 rounded-lg overflow-hidden">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4 mb-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={lawyer.imageUrl} alt={lawyer.name} />
                                    <AvatarFallback>{lawyer.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{paymentType === 'chat' ? 'สนทนากับคุณ' : 'ปรึกษาคุณ'}</p>
                                    <p className="text-lg font-bold">{lawyer.name}</p>
                                </div>
                            </div>
                            <div className="space-y-4 text-sm">
                                {paymentType === 'appointment' ? (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <span><span className="font-semibold">วันที่:</span> {dateStr ? format(new Date(dateStr), 'd MMMM yyyy') : ''}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <User className="w-4 h-4 text-muted-foreground mt-1" />
                                            <span><span className="font-semibold">หัวข้อ:</span> {description}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-start gap-2">
                                            <MessageSquare className="w-4 h-4 text-muted-foreground mt-1" />
                                            <span><span className="font-semibold">บริการ:</span> เปิด Ticket เพื่อเริ่มต้นการสนทนาส่วนตัว</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Pencil className="w-4 h-4 text-muted-foreground mt-1" />
                                            <div className="w-full">
                                                <Label htmlFor="initial-message" className="font-semibold">คำถามแรกถึงทนายความ</Label>
                                                <Textarea
                                                    id="initial-message"
                                                    placeholder="อธิบายปัญหาของคุณโดยย่อ..."
                                                    value={initialMessage}
                                                    onChange={(e) => setInitialMessage(e.target.value)}
                                                    className="mt-1 bg-white"
                                                    rows={4}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="bg-secondary flex-col gap-2">
                            <div className="w-full flex justify-between items-center text-sm">
                                <span>ค่าบริการปกติ</span>
                                <span>{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(fee)}</span>
                            </div>
                            {appliedCoupon && (
                                <div className="w-full flex justify-between items-center text-sm text-green-600">
                                    <span>ส่วนลด ({appliedCoupon.code})</span>
                                    <span>-{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(discountAmount)}</span>
                                </div>
                            )}
                            <div className="w-full flex justify-between items-center font-bold text-lg border-t pt-2 mt-2">
                                <span>ยอดที่ต้องชำระ</span>
                                <span>{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(finalFee)}</span>
                            </div>

                            {/* Coupon Input */}
                            <div className="w-full flex gap-2 pt-2">
                                <Input
                                    placeholder="รหัสคูปองส่วนลด"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                    disabled={!!appliedCoupon || isCheckingCoupon}
                                />
                                {appliedCoupon ? (
                                    <Button variant="outline" onClick={handleRemoveCoupon} className="shrink-0 text-red-500 hover:text-red-600">
                                        ยกเลิก
                                    </Button>
                                ) : (
                                    <Button variant="outline" onClick={handleApplyCoupon} disabled={!couponCode || isCheckingCoupon} className="shrink-0">
                                        {isCheckingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ใช้คูปอง'}
                                    </Button>
                                )}
                            </div>
                        </CardFooter>
                    </Card>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">เลือกวิธีการชำระเงิน</h3>

                    {finalFee === 0 ? (
                        <div className="p-6 border rounded-md bg-white text-center space-y-4">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                            <h4 className="font-bold text-lg">ไม่ต้องชำระเงิน</h4>
                            <p className="text-muted-foreground">คุณได้รับส่วนลดเต็มจำนวน สามารถยืนยันการทำรายการได้ทันที</p>
                            <Button onClick={() => processPayment(true)} className="w-full" size="lg" disabled={isProcessing}>
                                {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังยืนยัน...</> : 'ยืนยันการทำรายการ'}
                            </Button>
                        </div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-1">
                                {/* <TabsTrigger value="credit-card" disabled={isWaitingForPayment}><CreditCard className="mr-2 h-4 w-4" /> บัตรเครดิต</TabsTrigger> */}
                                {/* <TabsTrigger value="promptpay" disabled={isWaitingForPayment}><QrCode className="mr-2 h-4 w-4" /> PromptPay</TabsTrigger> */}
                                <TabsTrigger value="bank-transfer" disabled={isWaitingForPayment}><Landmark className="mr-2 h-4 w-4" /> โอนเงิน</TabsTrigger>
                            </TabsList>
                            <TabsContent value="credit-card" className="mt-4">
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>ระบบตัดบัตรเครดิตอยู่ระหว่างการปรับปรุง</p>
                                    <p>กรุณาเลือกช่องทาง "โอนเงิน" หรือ "PromptPay"</p>
                                </div>
                            </TabsContent>
                            <TabsContent value="promptpay" className="mt-4">
                                <div className="flex flex-col items-center justify-center space-y-4 p-4 border rounded-md bg-white">
                                    {isWaitingForPayment ? (
                                        <div className="flex flex-col items-center justify-center space-y-4 h-[300px]">
                                            <Loader2 className="w-12 h-12 animate-spin text-primary" />
                                            <p className="font-semibold text-lg">กำลังรอการชำระเงิน</p>
                                            <p className="text-sm text-muted-foreground text-center">กรุณาชำระเงินและแนบสลิป</p>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="font-semibold">สแกน QR Code เพื่อชำระเงิน</p>
                                            <div className="p-4 bg-white rounded-lg border">
                                                <QRCode value={promptPayPayload} size={180} />
                                            </div>
                                            <p className="text-sm text-muted-foreground">ยอดชำระ: {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(finalFee)}</p>
                                            <p className="text-xs text-muted-foreground text-center">ใช้แอปพลิเคชันธนาคารของคุณสแกน QR Code นี้เพื่อชำระเงิน เมื่อชำระเงินแล้ว ระบบจะตรวจสอบอัตโนมัติ</p>
                                            <Button onClick={handlePromptPaySelect} className="w-full mt-4" size="lg">
                                                แนบสลิปการโอนเงิน
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </TabsContent>
                            <TabsContent value="bank-transfer" className="mt-4">
                                <div className="space-y-4 p-4 border rounded-md bg-white">
                                    <p className="font-semibold text-center">โอนเงินเพื่อชำระค่าบริการ</p>
                                    <div className="p-4 bg-gray-100 rounded-lg text-center space-y-1">
                                        <p className="text-sm text-muted-foreground">ธนาคารกสิกรไทย</p>
                                        <p className="font-bold text-lg tracking-widest">144-3-46310-7</p>
                                        <p className="font-semibold">วิศรุต บุ่งอุทุม</p>
                                    </div>
                                    <div className="text-center font-bold text-lg">
                                        ยอดที่ต้องชำระ: {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(finalFee)}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="slip-upload">แนบสลิปการโอนเงิน</Label>
                                        <div
                                            className="flex items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {slipFile ? (
                                                <span className="text-sm font-medium text-green-600">{slipFile.name}</span>
                                            ) : (
                                                <div className="text-center text-muted-foreground text-sm">
                                                    <Upload className="mx-auto w-6 h-6 mb-1" />
                                                    คลิกเพื่ออัปโหลด
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            id="slip-upload"
                                            type="file"
                                            accept="image/*,.pdf"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                    <Button onClick={handleBankTransferSubmit} className="w-full" size="lg" disabled={isProcessing || !slipFile}>
                                        {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังส่งข้อมูล...</> : 'แจ้งการชำระเงิน'}
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </CardContent>
        </Card >
    );
}


export default function PaymentPage() {
    return (
        <div className="bg-gray-50 min-h-screen py-12">
            <div className="container mx-auto px-4 md:px-6">
                <Suspense fallback={<div>Loading payment details...</div>}>
                    <PaymentPageContent />
                </Suspense>
            </div>
        </div>
    )
}
