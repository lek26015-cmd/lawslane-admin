'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send, Trash2, LogIn } from 'lucide-react';
import { ArticleComment } from '@/lib/types';
import Link from 'next/link';

interface ArticleCommentsProps {
    articleId: string;
}

export function ArticleComments({ articleId }: ArticleCommentsProps) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [comments, setComments] = useState<ArticleComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !articleId) return;

        const commentsRef = collection(firestore, 'articleComments');
        const q = query(
            commentsRef,
            where('articleId', '==', articleId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const commentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ArticleComment));
            setComments(commentsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching comments:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, articleId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !firestore || !newComment.trim()) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'articleComments'), {
                articleId,
                userId: user.uid,
                userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
                userAvatar: user.photoURL || '',
                content: newComment.trim(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            setNewComment('');
            toast({
                title: "ส่งความคิดเห็นเรียบร้อย",
                description: "ขอบคุณสำหรับการร่วมแสดงความคิดเห็นของคุณ",
            });
        } catch (error) {
            console.error("Error posting comment:", error);
            toast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถส่งความคิดเห็นได้ในขณะนี้",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'articleComments', commentId));
            toast({
                title: "ลบคอมเมนต์แล้ว",
            });
        } catch (error) {
            console.error("Error deleting comment:", error);
        }
    };

    return (
        <div className="mt-12 space-y-8">
            <div className="flex items-center gap-2 border-b pb-4">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-bold font-headline">ความคิดเห็น ({comments.length})</h3>
            </div>

            {/* Post Comment Form */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                {user ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex gap-4">
                            <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                                <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                                <AvatarFallback>{(user.displayName || 'U').charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-3">
                                <Textarea
                                    placeholder="แสดงความคิดเห็นของคุณ..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className="min-h-[100px] resize-none border-slate-200 focus:border-primary focus:ring-primary rounded-xl"
                                    required
                                />
                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting || !newComment.trim()}
                                        className="gap-2 rounded-full px-6"
                                    >
                                        {isSubmitting ? 'กำลังส่ง...' : (
                                            <>
                                                <Send className="w-4 h-4" /> ส่งความคิดเห็น
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-slate-600 mb-4 font-medium">เฉพาะผู้ที่ลงทะเบียนสมาชิกเท่านั้นที่สามารถแสดงความคิดเห็นได้</p>
                        <div className="flex justify-center gap-3">
                            <Button asChild className="gap-2 rounded-full px-6">
                                <Link href="/register">
                                    สมัครสมาชิก
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="gap-2 rounded-full px-6">
                                <Link href="/login">
                                    <LogIn className="w-4 h-4" /> เข้าสู่ระบบ
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Comments List */}
            <div className="space-y-6">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="flex gap-4 animate-pulse">
                                <div className="w-10 h-10 bg-slate-200 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-slate-200 rounded w-1/4" />
                                    <div className="h-12 bg-slate-200 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-2xl">
                        ยังไม่มีความคิดเห็น มาร่วมเป็นคนแรกที่แสดงความคิดเห็นกันเถอะ!
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-4 group">
                            <Avatar className="w-10 h-10 border shadow-sm">
                                <AvatarImage src={comment.userAvatar || ''} alt={comment.userName} />
                                <AvatarFallback>{comment.userName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group-hover:border-slate-200 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-sm text-foreground">{comment.userName}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {comment.createdAt?.toDate ?
                                                comment.createdAt.toDate().toLocaleDateString('th-TH', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) : 'เพิ่งเมื่อสักครู่'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                                </div>
                                {user && (user.uid === comment.userId || user.email === 'admin@lawslane.com') && (
                                    <button
                                        onClick={() => handleDelete(comment.id)}
                                        className="text-[10px] text-muted-foreground hover:text-destructive mt-1 flex items-center gap-1 ml-2 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" /> ลบความคิดเห็น
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
