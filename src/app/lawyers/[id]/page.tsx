
'use client';

import { getLawyerById, getLawyerStats } from '@/lib/data';
import { notFound, useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Trophy, BookCopy, Mail, Phone, Scale } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import React, { useState, useEffect } from 'react';
import type { LawyerProfile } from '@/lib/types';
import { useChat } from '@/context/chat-context';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import profileLawyerImg from '@/pic/profile-lawyer.jpg';

export default function LawyerProfilePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { firestore, user } = useFirebase();
    const [lawyer, setLawyer] = useState<LawyerProfile | null>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [isLawyer, setIsLawyer] = useState(false);
    const [stats, setStats] = useState({ responseRate: 0, completedCases: 0 });

    useEffect(() => {
        async function checkUserRole() {
            if (!user || !firestore) return;
            const lawyerDocRef = doc(firestore, "lawyerProfiles", user.uid);
            const lawyerSnap = await getDoc(lawyerDocRef);
            if (lawyerSnap.exists()) {
                setIsLawyer(true);
            }
        }
        checkUserRole();
    }, [user, firestore]);

    useEffect(() => {
        async function fetchLawyer() {
            if (!id || !firestore) return;
            const lawyerData = await getLawyerById(firestore, id);
            if (!lawyerData) {
                notFound();
            }
            setLawyer(lawyerData);
        }
        fetchLawyer();
    }, [id, firestore]);

    useEffect(() => {
        async function fetchReviewsAndStats() {
            if (!id || !firestore) return;

            // Fetch Reviews
            const reviewsRef = collection(firestore, 'reviews');
            const q = query(reviewsRef, where('lawyerId', '==', id), orderBy('createdAt', 'desc'));
            try {
                const snapshot = await getDocs(q);
                const reviewsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    date: doc.data().createdAt?.toDate().toLocaleDateString('th-TH', { year: 'numeric', month: 'long' }) || 'N/A'
                }));
                setReviews(reviewsData);
            } catch (error) {
                console.error("Error fetching reviews:", error);
            }

            // Fetch Stats
            try {
                const lawyerStats = await getLawyerStats(firestore, id);
                setStats({
                    responseRate: lawyerStats.responseRate,
                    completedCases: lawyerStats.completedCases
                });
            } catch (error) {
                console.error("Error fetching stats:", error);
            }
        }
        fetchReviewsAndStats();
    }, [id, firestore]);

    if (!lawyer) {
        return <div>Loading...</div>; // Or a loading skeleton
    }

    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0
        ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviewCount
        : 0;

    // Use mock stats for now, but real reviews
    // const caseWinRate = 92;
    // const totalCases = 150;

    const handleStartChat = () => {
        if (lawyer) {
            if (!user) {
                router.push('/login');
                return;
            }
            router.push(`/payment?type=chat&lawyerId=${lawyer.id}`);
        }
    };

    return (
        <>
            <div className="bg-gray-50 min-h-screen">
                <div className="container mx-auto px-4 md:px-6 py-12">
                    <div className="max-w-4xl mx-auto">
                        <Link href="/lawyers" className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            กลับไปหน้ารายชื่อทนาย
                        </Link>

                        <Card className="overflow-hidden rounded-3xl shadow-sm border-none">
                            <div className="bg-card">
                                <div className="p-8 flex flex-col md:flex-row items-center gap-8">
                                    <div className="relative h-32 w-32 flex-shrink-0">
                                        <Image
                                            src={lawyer.imageUrl || profileLawyerImg}
                                            alt={lawyer.name}
                                            fill
                                            className="rounded-full object-cover border-4 border-white shadow-lg"
                                            data-ai-hint={lawyer.imageHint}
                                            priority
                                        />
                                    </div>
                                    <div className="text-center md:text-left flex-grow">
                                        <h1 className="text-3xl font-bold font-headline text-foreground">{lawyer.name}</h1>
                                        <p className="text-lg text-primary font-semibold mt-1">{lawyer.specialty[0]}</p>
                                        <div className="flex items-center gap-2 mt-2 justify-center md:justify-start">
                                            <div className="flex items-center gap-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Scale key={i} className={`w-5 h-5 ${i < Math.round(averageRating) ? 'text-yellow-500 fill-yellow-500/20' : 'text-gray-300'}`} />
                                                ))}
                                            </div>
                                            <span className="text-muted-foreground">({reviewCount} รีวิว)</span>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                                            {lawyer.specialty.map((spec, index) => (
                                                <Badge key={index} variant="secondary">{spec}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 flex flex-col items-center justify-center gap-3 w-full md:w-40 md:ml-auto">
                                        {isLawyer ? (
                                            <div className="text-center p-2 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800">
                                                บัญชีทนายความไม่สามารถจองคิวได้
                                            </div>
                                        ) : (
                                            <>
                                                <Button asChild className="w-full bg-foreground text-background hover:bg-foreground/90">
                                                    <Link href={`/lawyers/${lawyer.id}/schedule`}>
                                                        <Phone className="mr-2 h-4 w-4" /> นัดปรึกษา
                                                    </Link>
                                                </Button>
                                                <Button onClick={handleStartChat} variant="outline" className="w-full">
                                                    <Mail className="mr-2 h-4 w-4" /> ส่งข้อความ
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8">
                                <Card className="rounded-3xl shadow-sm border-none">
                                    <CardHeader>
                                        <CardTitle>เกี่ยวกับ</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">{lawyer.description}</p>
                                    </CardContent>
                                </Card>

                                <div className="grid md:grid-cols-2 gap-6 mt-6">
                                    <Card className="rounded-3xl shadow-sm border-none">
                                        <CardHeader>
                                            <CardTitle>การศึกษาและใบอนุญาต</CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-muted-foreground space-y-2">
                                            <p>{lawyer.education || "ไม่ระบุข้อมูลการศึกษา"}</p>
                                            <p>ใบอนุญาตให้ว่าความเลขที่ {lawyer.licenseNumber}</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="rounded-3xl shadow-sm border-none">
                                        <CardHeader>
                                            <CardTitle>ประสบการณ์</CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-muted-foreground">
                                            <p>{lawyer.experience || "ไม่ระบุประสบการณ์"}</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card className="mt-6 rounded-3xl shadow-sm border-none">
                                    <CardHeader>
                                        <CardTitle>สถิติการทำงาน</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-4 text-center">
                                            <div className="p-4 bg-secondary/50 rounded-lg">
                                                <Trophy className="mx-auto h-8 w-8 text-yellow-500 mb-2" />
                                                <p className="text-2xl font-bold">{stats.responseRate}%</p>
                                                <p className="text-sm text-muted-foreground">อัตราการตอบกลับ</p>
                                            </div>
                                            <div className="p-4 bg-secondary/50 rounded-lg">
                                                <BookCopy className="mx-auto h-8 w-8 text-foreground/70 mb-2" />
                                                <p className="text-2xl font-bold">{stats.completedCases}</p>
                                                <p className="text-sm text-muted-foreground">คดีที่สำเร็จ</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="mt-6 rounded-3xl shadow-sm border-none">
                                    <CardHeader>
                                        <CardTitle>รีวิวจากผู้ใช้บริการ ({reviewCount})</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-6">
                                            {reviews.length === 0 ? (
                                                <p className="text-center text-muted-foreground py-4">ยังไม่มีรีวิว</p>
                                            ) : (
                                                reviews.map((review, index) => (
                                                    <React.Fragment key={review.id}>
                                                        <div className="flex gap-4">
                                                            <Avatar>
                                                                <AvatarImage src={review.avatar} alt={review.author} />
                                                                <AvatarFallback>{review.author.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between">
                                                                    <p className="font-semibold">{review.author}</p>
                                                                    <span className="text-xs text-muted-foreground">{review.date}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 my-1">
                                                                    {[...Array(5)].map((_, i) => (
                                                                        <Scale key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500/20' : 'text-gray-300'}`} />
                                                                    ))}
                                                                </div>
                                                                <p className="text-sm text-muted-foreground">{review.comment}</p>
                                                            </div>
                                                        </div>
                                                        {index < reviews.length - 1 && <Separator />}
                                                    </React.Fragment>
                                                ))
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}
