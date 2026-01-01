'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { getAllArticles } from '@/lib/data';
import { Article } from '@/lib/types';
import { EmptyState } from '@/components/ui/empty-state';
import { useTranslations, useLocale } from 'next-intl';

function ArticleCard({ article }: { article: Article }) {
    const t = useTranslations('HomePage.articles');
    const locale = useLocale();

    // Determine content based on locale
    let title = article.title;
    let description = article.description;

    if (locale === 'en' && article.translations?.en) {
        title = article.translations.en.title || title;
        description = article.translations.en.description || description;
    } else if (locale === 'zh' && article.translations?.zh) {
        title = article.translations.zh.title || title;
        description = article.translations.zh.description || description;
    }

    return (
        <Link href={`/articles/${article.slug}`} className="group block h-full">
            <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white rounded-2xl overflow-hidden h-full flex flex-col">
                <CardContent className="p-0 flex-grow flex flex-col">
                    <div className="relative aspect-[16/10] overflow-hidden">
                        <Image
                            src={article.imageUrl}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                            data-ai-hint={article.imageHint}
                        />
                        <div className="absolute top-3 left-3">
                            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm hover:bg-white text-xs font-medium shadow-sm">
                                {article.category}
                            </Badge>
                        </div>
                    </div>
                    <div className="p-5 flex flex-col flex-grow">
                        <h3 className="font-bold text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
                            {title}
                        </h3>
                        <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-grow">
                            {description}
                        </p>
                        <div className="flex items-center text-primary text-sm font-medium mt-auto">
                            {t('readMore')} <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

export function HomeLatestArticles() {
    const { firestore } = useFirebase();
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const t = useTranslations('HomePage.articles');

    useEffect(() => {
        async function fetchArticles() {
            if (!firestore) return;
            try {
                const fetchedArticles = await getAllArticles(firestore);
                setArticles(fetchedArticles.slice(0, 4));
            } catch (error) {
                console.error("Error fetching articles:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchArticles();
    }, [firestore]);

    if (loading) {
        return (
            <section id="articles" className="w-full py-12 md:py-24 lg:py-32 bg-white">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex justify-between items-center mb-12">
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline text-foreground">
                            {t('title')}
                        </h2>
                    </div>
                    <p>{t('loading')}</p>
                </div>
            </section>
        );
    }



    return (
        <section id="articles" className="w-full py-12 md:py-24 lg:py-32 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex justify-between items-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline text-foreground">
                        {t('title')}
                    </h2>
                    <Link href={`/articles`}>
                        <Button variant="link" className="text-foreground hover:text-primary">
                            {t('viewAll')} <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                {articles.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {articles.map((article) => (
                            <ArticleCard key={article.id} article={article} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        title={t('emptyTitle')}
                        description={t('emptyDescription')}
                    />
                )}

            </div>
        </section>
    );
}
