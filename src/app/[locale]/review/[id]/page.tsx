
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getLawyerById } from '@/lib/data';
import type { LawyerProfile } from '@/lib/types';
import { ArrowLeft, Scale } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { useFirebase } from '@/firebase';


function ReviewPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const chatId = params.id as string;
  const lawyerId = searchParams.get('lawyerId');

  const [lawyer, setLawyer] = useState<LawyerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  useEffect(() => {
    async function fetchLawyer() {
      if (!lawyerId || !firestore) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const lawyerData = await getLawyerById(firestore, lawyerId);
      if (!lawyerData) {
        notFound();
      }
      setLawyer(lawyerData);
      setIsLoading(false);
    }
    fetchLawyer();
  }, [lawyerId, firestore]);

  const handleSubmitReview = () => {
    if (rating === 0) {
        toast({
            variant: "destructive",
            title: "กรุณาให้คะแนน",
            description: "โปรดเลือกดาวเพื่อให้คะแนนความพึงพอใจ",
        });
        return;
    }
    // In a real app, this would save the review to the database
    console.log({
      chatId,
      lawyerId,
      rating,
      reviewText,
    });
    
    toast({
        title: "ส่งรีวิวสำเร็จ",
        description: "ขอบคุณสำหรับความคิดเห็นของคุณ! ความคิดเห็นของคุณช่วยให้เราพัฒนาบริการได้ดียิ่งขึ้น",
    });

    // Redirect to the main dashboard after submitting
    setTimeout(() => {
        router.push('/dashboard');
    }, 1500);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]">Loading...</div>;
  }

  if (!lawyer) {
    return notFound();
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-2xl mx-auto">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                กลับไปที่แดชบอร์ด
            </Link>

            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-headline">ให้คะแนนและรีวิว</CardTitle>
                    <CardDescription>
                        คุณกำลังรีวิวการบริการสำหรับเคส "คดี: มรดก"
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col items-center gap-2">
                         <Avatar className="h-20 w-20">
                            <AvatarImage src={lawyer.imageUrl} alt={lawyer.name} />
                            <AvatarFallback>{lawyer.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <p className="font-semibold text-lg">คุณ {lawyer.name}</p>
                    </div>

                    <div className="space-y-3 rounded-lg border p-4">
                        <Label className="font-semibold text-center block">คะแนนความพึงพอใจของคุณ</Label>
                        <div className="flex items-center justify-center gap-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} onClick={() => setRating(star)} className="focus:outline-none">
                                    <Scale className={`w-10 h-10 cursor-pointer transition-all duration-150 ease-in-out ${rating >= star ? 'text-yellow-500 fill-yellow-500/20 scale-110' : 'text-gray-300 hover:text-yellow-500/50 hover:scale-105'}`} />
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="review-text" className="font-semibold">ความคิดเห็นเพิ่มเติม (ถ้ามี)</Label>
                        <Textarea 
                            id="review-text"
                            placeholder={`เล่าประสบการณ์ของคุณในการปรึกษากับคุณ ${lawyer.name}...`}
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            rows={5}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                     <Button onClick={handleSubmitReview} className="w-full" size="lg" disabled={rating === 0}>
                        ส่งรีวิว
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  )
}

export default function ReviewPage() {
    return (
        <Suspense fallback={<div>Loading review page...</div>}>
            <ReviewPageContent />
        </Suspense>
    )
}
