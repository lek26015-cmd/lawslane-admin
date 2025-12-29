'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { getAllArticles } from '@/lib/data';
import type { Article } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

interface RecommendedArticlesProps {
    limit?: number;
}

export function RecommendedArticles({ limit = 3 }: RecommendedArticlesProps) {
    const { firestore } = useFirebase();
    const [articles, setArticles] = useState<Article[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchArticles() {
            if (!firestore) return;
            try {
                const allArticles = await getAllArticles(firestore);
                setArticles(allArticles.slice(0, limit));
            } catch (error) {
                console.error("Error fetching recommended articles:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchArticles();
    }, [firestore, limit]);

    if (isLoading) {
        return null;
    }

    if (articles.length === 0) {
        return null;
    }

    return (
        <div className="w-full">
            <h3 className="flex items-center gap-2 text-lg font-bold text-[#0B3979] mb-4 pl-1">
                <BookOpen className="h-5 w-5" />
                บทความแนะนำ
            </h3>
            <div className="space-y-4">
                {articles.map((article) => (
                    <Link key={article.id} href={`/articles/${article.slug}`} className="block group">
                        <div className="flex gap-4 items-start">
                            <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-slate-100 shadow-sm group-hover:shadow-md transition-all duration-300">
                                <Image
                                    src={article.coverImage || article.imageUrl || '/images/placeholder-article.jpg'}
                                    alt={article.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            </div>
                            <div className="flex-1 min-w-0 py-1">
                                <h4 className="text-sm font-semibold text-slate-800 line-clamp-2 mb-2 leading-snug group-hover:text-[#0B3979] transition-colors">
                                    {article.title}
                                </h4>
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                    {article.excerpt || article.description}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
            <div className="mt-6 pl-1">
                <Link href="/articles" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 hover:text-[#0B3979] hover:border-blue-100 transition-all duration-300">
                    ดูบทความทั้งหมด
                    <span aria-hidden="true">&rarr;</span>
                </Link>
            </div>
        </div>
    );
}
