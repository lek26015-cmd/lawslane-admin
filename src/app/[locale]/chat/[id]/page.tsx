

'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getLawyerById } from '@/lib/data';
import type { LawyerProfile } from '@/lib/types';
import { useFirebase, useUser } from '@/firebase';
// import { useUser } from '@/firebase/auth/use-user';
import { ChatBox } from '@/components/chat/chat-box';
import { uploadFileAction } from '../actions';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileText, Check, Upload, Scale, Ticket, Briefcase, User as UserIcon, DollarSign, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { doc, getDoc, updateDoc, arrayUnion, onSnapshot, serverTimestamp, addDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants';

function ChatPageContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const chatId = params.id as string;
    const lawyerId = searchParams.get('lawyerId');
    const clientId = searchParams.get('clientId'); // For lawyer's view
    const view = searchParams.get('view');
    const additionalFeeRequested = searchParams.get('additionalFeeRequested');

    const [lawyer, setLawyer] = useState<LawyerProfile | null>(null);
    const [client, setClient] = useState<{ id: string, name: string, imageUrl: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [files, setFiles] = useState<{ name: string, url: string, size: number }[]>([]);
    const [chatStatus, setChatStatus] = useState<string>(searchParams.get('status') || 'active');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const isCompleted = chatStatus === 'closed';
    const isLawyerView = view === 'lawyer';
    const [isChatDisabled, setIsChatDisabled] = useState(isCompleted);

    // Review state (for user view)
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState("");

    const { auth, firestore, storage } = useFirebase();
    const { user } = useUser();

    const initialFee = 3500;
    const additionalFee = 1500;
    const totalFee = initialFee + additionalFee;

    // Real-time listener for chat document (status and files)
    useEffect(() => {
        if (!firestore || !chatId || !user) return;

        const chatRef = doc(firestore, 'chats', chatId);
        const unsubscribe = onSnapshot(chatRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setChatStatus(data.status || 'active');
                setIsChatDisabled(data.status === 'closed');
                if (data.files) {
                    setFiles(data.files);
                }
            }
        }, (error) => {
            // Suppress permission errors that might happen during logout race conditions
            if (error.code !== 'permission-denied') {
                console.error("Chat snapshot error:", error);
            }
        });

        return () => unsubscribe();
    }, [firestore, chatId, user]);

    useEffect(() => {
        if (!firestore) return;
        const db = firestore; // Capture non-null firestore
        async function fetchData() {
            setIsLoading(true);
            if (lawyerId) {
                const lawyerData = await getLawyerById(db, lawyerId);
                setLawyer(lawyerData || null);
            }
            if (isLawyerView && clientId) {
                const userDoc = await getDoc(doc(db, 'users', clientId));
                // Note: getDoc takes a DocumentReference, so we need doc(db, 'users', clientId)
                // But wait, the original code had getDoc(doc(db, 'users', clientId)). 
                // Let's fix the previous implementation which might have been slightly off or just verbose.
                const clientRef = doc(db, 'users', clientId);
                const userDocSnap = await getDoc(clientRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setClient({ id: clientId, name: userData.name, imageUrl: userData.avatar || '' });
                }
            }
            setIsLoading(false);
        }
        fetchData();
    }, [lawyerId, clientId, isLawyerView, firestore]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // DEBUG ALERTS
        alert(`Selected file: ${file.name} (${file.size} bytes)`);

        if (!user) {
            alert("Error: User is not logged in!");
            console.error("Upload failed: User not logged in");
            toast({ variant: "destructive", title: "กรุณาเข้าสู่ระบบ", description: "คุณต้องเข้าสู่ระบบก่อนอัปโหลดไฟล์" });
            return;
        }
        if (!storage) {
            alert("Error: Firebase Storage is not initialized! Check your .env.local config.");
            console.error("Upload failed: Storage not initialized");
            toast({ variant: "destructive", title: "ระบบขัดข้อง", description: "ไม่สามารถเชื่อมต่อกับระบบจัดเก็บไฟล์ได้ (Storage is null)" });
            return;
        }
        if (!firestore) {
            alert("Error: Firestore is not initialized!");
            console.error("Upload failed: Firestore not initialized");
            return;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            alert(`File too large! Max ${MAX_FILE_SIZE_MB}MB`);
            toast({
                variant: "destructive",
                title: "ไฟล์มีขนาดใหญ่เกินไป",
                description: `กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน ${MAX_FILE_SIZE_MB}MB`,
            });
            return;
        }

        try {
            toast({ title: "กำลังอัปโหลด...", description: "กรุณารอสักครู่" });

            // Get ID Token for server-side auth (still good practice even for local)
            const idToken = user ? await user.getIdToken() : '';

            const formData = new FormData();
            formData.append('file', file);

            // Call Server Action
            const result = await uploadFileAction(formData, idToken, chatId);

            let downloadUrl = result.fullPath;

            // If it's NOT local, we use the returned fullPath (which is the Public URL for R2)
            // No need to call getDownloadURL for R2

            const fileData = {
                name: file.name,
                url: downloadUrl,
                size: file.size,
                uploadedBy: user.uid,
                uploadedAt: Date.now()
            };

            const chatRef = doc(firestore, 'chats', chatId);
            await updateDoc(chatRef, {
                files: arrayUnion(fileData)
            });

            toast({
                title: "อัปโหลดไฟล์สำเร็จ",
                description: `ไฟล์ "${file.name}" ถูกเพิ่มในรายการแล้ว`,
            });

        } catch (error: any) {
            console.error("Upload error:", error);
            toast({
                variant: "destructive",
                title: "อัปโหลดไม่สำเร็จ",
                description: `เกิดข้อผิดพลาด: ${error.message}`,
            });
        }

        // Reset file input
        if (event.target) {
            event.target.value = '';
        }
    };

    const handleConfirmRelease = async () => {
        if (!firestore) return;

        try {
            const chatRef = doc(firestore, 'chats', chatId);
            await updateDoc(chatRef, {
                status: 'closed',
                closedAt: serverTimestamp()
            });

            toast({
                title: "ดำเนินการสำเร็จ",
                description: "เคสเสร็จสมบูรณ์แล้ว กำลังนำคุณไปยังหน้าให้คะแนน...",
            });

            // Wait a bit for the user to see the toast before redirecting
            // Or rely on the real-time listener to update the UI to "Review" mode
            // But the requirement says "redirect to review page"
            setTimeout(() => {
                router.push(`/review/${chatId}?lawyerId=${lawyerId}`);
            }, 1500);

        } catch (error) {
            console.error("Error closing case:", error);
            toast({
                variant: "destructive",
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถปิดเคสได้ กรุณาลองใหม่อีกครั้ง",
            });
        }
    };

    const handleApproveAdditionalFee = () => {
        toast({
            title: "อนุมัติสำเร็จ",
            description: "ระบบกำลังนำคุณไปหน้าชำระเงินส่วนต่าง (จำลอง)",
        });
        // In real app, would redirect to payment page with correct amount
        router.push(`/payment?lawyerId=${lawyerId}&fee=${additionalFee}`);
    };

    const handleSubmitReview = async () => {
        if (rating === 0) {
            toast({
                variant: "destructive",
                title: "กรุณาให้คะแนน",
                description: "โปรดเลือกดาวเพื่อให้คะแนนความพึงพอใจ",
            });
            return;
        }

        if (!firestore || !user || !lawyerId) {
            toast({
                variant: "destructive",
                title: "เกิดข้อผิดพลาด",
                description: "ไม่พบข้อมูลทนายความ หรือคุณยังไม่ได้เข้าสู่ระบบ",
            });
            return;
        }

        try {
            // 1. Add the review document
            await addDoc(collection(firestore, 'reviews'), {
                lawyerId,
                userId: user.uid,
                author: client?.name || user.displayName || 'Anonymous',
                avatar: client?.imageUrl || user.photoURL || '',
                rating: Number(rating),
                comment: reviewText,
                createdAt: serverTimestamp(),
                caseId: chatId
            });

            // 2. Calculate new average rating and review count
            // We fetch all reviews to ensure accuracy
            const reviewsRef = collection(firestore, 'reviews');
            const q = query(reviewsRef, where('lawyerId', '==', lawyerId));
            const querySnapshot = await getDocs(q);

            const totalReviews = querySnapshot.size;
            const totalRating = querySnapshot.docs.reduce((acc: number, doc: any) => acc + (Number(doc.data().rating) || 0), 0);
            const newAverageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

            console.log(`Updating stats for lawyer ${lawyerId}: Avg ${newAverageRating}, Count ${totalReviews}`);

            // 3. Update lawyer document
            // Use setDoc with merge: true to handle cases where doc might not exist yet or is in a different collection
            const lawyerRef = doc(firestore, 'lawyerProfiles', lawyerId);

            try {
                await setDoc(lawyerRef, {
                    averageRating: newAverageRating,
                    reviewCount: totalReviews
                }, { merge: true });
            } catch (e) {
                console.warn("Could not update lawyerProfiles, trying users collection", e);
                // Fallback to users collection if lawyerProfiles fails (though setDoc should create it)
                // This is just in case of permission issues or logical separation
                const userRef = doc(firestore, 'users', lawyerId);
                await setDoc(userRef, {
                    averageRating: newAverageRating,
                    reviewCount: totalReviews
                }, { merge: true });
            }

            toast({
                title: "ส่งรีวิวสำเร็จ",
                description: "ขอบคุณสำหรับความคิดเห็นของคุณ!",
            });
            router.push('/dashboard');
        } catch (error) {
            console.error("Error submitting review:", error);
            toast({
                variant: "destructive",
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถส่งรีวิวได้ กรุณาลองใหม่อีกครั้ง",
            });
        }
    };

    if (isLoading) {
        return <div>Loading chat...</div>
    }

    const chatPartner = isLawyerView ? client : lawyer;
    if (!chatPartner || !user || !firestore) {
        return <div>Unable to load chat. Missing information.</div>
    }

    const otherUser = {
        name: isLawyerView ? (client?.name ?? 'Client') : (lawyer?.name ?? 'Lawyer'),
        userId: isLawyerView ? (client?.id ?? '') : (lawyer?.userId || lawyer?.id || ''), // Fallback to lawyer.id if userId is missing
        imageUrl: isLawyerView ? (client?.imageUrl ?? "https://picsum.photos/seed/user-avatar/100/100") : (lawyer?.imageUrl ?? ''),
    };


    return (
        <div className="container mx-auto px-4 md:px-6 py-8">
            <div className="mb-4">
                <Link href={isLawyerView ? "/lawyer-dashboard" : "/dashboard"} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    กลับไปที่แดชบอร์ด
                </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <ChatBox firestore={firestore} currentUser={user} otherUser={otherUser} chatId={chatId} isDisabled={isChatDisabled} isLawyerView={isLawyerView} />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    {isLawyerView ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Briefcase className="w-5 h-5" />
                                    ข้อมูลเคส
                                </CardTitle>
                                <CardDescription>เคส: คดีมรดก</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40">
                                    <Avatar>
                                        <AvatarImage src={otherUser.imageUrl} />
                                        <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-muted-foreground">ลูกค้า</p>
                                        <p className="font-bold text-foreground">{otherUser.name}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">สถานะเคส:</span>
                                    <Badge variant={isCompleted ? "secondary" : (additionalFeeRequested ? "destructive" : "default")}>
                                        {isCompleted ? 'เสร็จสิ้น' : (additionalFeeRequested ? 'รออนุมัติค่าใช้จ่าย' : 'กำลังดำเนินการ')}
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">ค่าบริการเริ่มต้น:</span>
                                    <span className="font-semibold">฿{initialFee.toLocaleString()}</span>
                                </div>
                                {additionalFeeRequested && (
                                    <div className="flex justify-between font-bold text-lg">
                                        <span className="text-muted-foreground">ค่าบริการรวม:</span>
                                        <span className="text-foreground">฿{totalFee.toLocaleString()}</span>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                {isCompleted ? (
                                    <Button disabled className="w-full">เคสนี้เสร็จสิ้นแล้ว</Button>
                                ) : (
                                    <Button variant="outline" className="w-full" asChild>
                                        <Link href={`/lawyer-dashboard/close-case/${chatId}?clientName=${client?.name}`}>
                                            ส่งสรุปและปิดเคส
                                        </Link>
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ) : isCompleted ? ( // User view, completed
                        <Card>
                            <CardHeader>
                                <CardTitle>ให้คะแนนและรีวิว</CardTitle>
                                <CardDescription>เคสนี้เสร็จสิ้นแล้ว โปรดให้คะแนนการบริการของคุณ</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2 rounded-lg border p-4">
                                    <Label className="font-semibold text-center block">คะแนนความพึงพอใจ</Label>
                                    <div className="flex items-center justify-center gap-3">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button key={star} onClick={() => setRating(star)} className="focus:outline-none">
                                                <Scale className={`w-8 h-8 cursor-pointer transition-all duration-150 ease-in-out ${rating >= star ? 'text-yellow-500 fill-yellow-500/20 scale-110' : 'text-gray-300 hover:text-yellow-500/50 hover:scale-105'}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="review-text">ความคิดเห็นเพิ่มเติม</Label>
                                    <Textarea
                                        id="review-text"
                                        placeholder="เล่าประสบการณ์ของคุณ..."
                                        value={reviewText}
                                        onChange={(e) => setReviewText(e.target.value)}
                                        rows={4}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleSubmitReview} className="w-full" disabled={rating === 0}>
                                    ส่งรีวิว
                                </Button>
                            </CardFooter>
                        </Card>
                    ) : additionalFeeRequested ? ( // User view, additional fee requested
                        <Card className="border-primary shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="w-6 h-6 text-primary" />
                                    อนุมัติค่าบริการเพิ่มเติม
                                </CardTitle>
                                <CardDescription>ทนายความได้ส่งสรุปเคสและมีการเรียกเก็บค่าบริการเพิ่มเติม</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2 rounded-lg border p-4 bg-secondary/50">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">ค่าบริการเดิมใน Escrow:</span>
                                        <span>฿{initialFee.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">ขอเบิกเพิ่มเติม:</span>
                                        <span>฿{additionalFee.toLocaleString()}</span>
                                    </div>
                                    <hr className="my-2" />
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>ยอดรวมใหม่:</span>
                                        <span>฿{totalFee.toLocaleString()}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground text-center">คุณต้องชำระส่วนต่างจำนวน ฿{additionalFee.toLocaleString()} เพื่อดำเนินการต่อ</p>
                            </CardContent>
                            <CardFooter className="flex-col gap-2">
                                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleApproveAdditionalFee}>
                                    อนุมัติและชำระส่วนต่าง
                                </Button>
                                <Button variant="ghost" className="w-full text-destructive">ปฏิเสธและรายงานปัญหา</Button>
                            </CardFooter>
                        </Card>
                    ) : ( // User view, active
                        <Card>
                            <CardHeader>
                                <CardTitle>สถานะ Escrow</CardTitle>
                                <CardDescription className="flex items-center gap-2 pt-1">
                                    <Ticket className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">Ticket ID: {chatId}</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-muted-foreground">เงินของคุณถูกพักไว้ที่ Lawlane</p>
                                <p className="text-4xl font-bold my-2">฿3,500</p>
                                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                                    เงินจะถูกโอนให้ทนายเมื่อคุณกดยืนยันว่างานเสร็จสิ้น
                                </p>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white">
                                            <Check className="mr-2 h-4 w-4" /> ยืนยันและปล่อยเงินให้ทนาย
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>ยืนยันการจบเคส?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                เมื่อคุณยืนยันและปล่อยเงินให้ทนายแล้ว การสนทนาในเคสนี้จะสิ้นสุดลงและคุณจะไม่สามารถส่งข้อความได้อีก คุณแน่ใจหรือไม่ที่จะดำเนินการต่อ?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleConfirmRelease} className="bg-foreground text-background hover:bg-foreground/90">ยืนยัน</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <Link href={`/help?ticketId=${chatId}`}>
                                    <Button variant="link" className="text-muted-foreground text-xs mt-2">
                                        <AlertTriangle className="mr-1 h-3 w-3" /> รายงานปัญหา
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>เอกสารในคดี</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="space-y-2 text-sm">
                                    {files.length === 0 && (
                                        <p className="text-center text-muted-foreground text-xs py-4">ยังไม่มีเอกสาร</p>
                                    )}
                                    {files.map((file, index) => (
                                        <div key={index} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-100">
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 overflow-hidden flex-1">
                                                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                                <span className="truncate hover:underline text-primary" title={file.name}>{file.name}</span>
                                            </a>
                                            <span className="text-muted-foreground text-xs flex-shrink-0 ml-2">
                                                {(file.size / 1024 / 1024).toFixed(2)}MB
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <Button onClick={handleUploadClick} className="w-full" disabled={isChatDisabled}>
                                    <Upload className="mr-2 h-4 w-4" /> อัปโหลดไฟล์
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}


export default function ChatPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ChatPageContent />
        </Suspense>
    )
}
