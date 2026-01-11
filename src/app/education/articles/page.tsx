'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAllArticles } from '@/lib/data';
import type { Article } from '@/lib/types';
import { ArrowRight, FileText, ArrowLeft, BookOpen } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/firebase';
import { motion } from 'framer-motion';
import { PageHeader } from '../components/page-header';

export default function EducationArticlesPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const { firestore } = useFirebase();

    useEffect(() => {
        async function fetchArticles() {
            if (!firestore) return;
            setIsLoading(true);
            const allArticles = await getAllArticles(firestore);
            setArticles(allArticles);
            setIsLoading(false);
        }
        fetchArticles();
    }, [firestore]);

    const categories = useMemo(() => {
        const allCategories = articles.map(article => article.category);
        return ['all', ...Array.from(new Set(allCategories))];
    }, [articles]);

    const filteredArticles = useMemo(() => {
        return articles.filter(article => {
            const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
            return matchesCategory;
        });
    }, [articles, selectedCategory]);

    return (
        <div className="flex flex-col gap-6">
            {/* Beautiful Page Header */}
            <PageHeader
                title="บทความน่าอ่าน"
                description="รวมบทความกฎหมายที่น่าสนใจสำหรับนักศึกษาและทนายความ พร้อมเคล็ดลับการเตรียมสอบ"
                icon={BookOpen}
                theme="emerald"
                backLink="/education"
                backLabel="กลับหน้าหลัก"
                badge={`${articles.length} บทความ`}
            >
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full md:w-[200px] bg-white/90 border-0 shadow-md">
                        <SelectValue placeholder="เลือกหมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map(category => (
                            <SelectItem key={category} value={category}>
                                {category === 'all' ? 'ทุกหมวดหมู่' : category}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </PageHeader>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2">
                {categories.filter(c => c !== 'all').map(category => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${selectedCategory === category
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                    >
                        {category}
                    </button>
                ))}
                {selectedCategory !== 'all' && (
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        ล้างตัวกรอง
                    </button>
                )}
            </div>

            {/* Articles Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-slate-100 rounded-2xl h-72 animate-pulse" />
                    ))}
                </div>
            ) : filteredArticles.length > 0 ? (
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: { staggerChildren: 0.1 }
                        }
                    }}
                >
                    {filteredArticles.map((article, index) => (
                        <motion.div
                            key={article.id}
                            variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { opacity: 1, y: 0 }
                            }}
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card className="overflow-hidden h-full flex flex-col group rounded-2xl shadow-sm hover:shadow-lg transition-all">
                                <Link href={`/education/articles/${article.slug}`} className="block">
                                    <div className="relative h-48 w-full overflow-hidden">
                                        <Image
                                            src={article.imageUrl}
                                            alt={article.title}
                                            fill
                                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <Badge variant="secondary" className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm">
                                            {article.category}
                                        </Badge>
                                    </div>
                                </Link>
                                <CardHeader className="pb-2">
                                    <CardTitle className="line-clamp-2 text-lg">
                                        <Link href={`/education/articles/${article.slug}`} className="hover:text-primary transition-colors">
                                            {article.title}
                                        </Link>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <CardDescription className="line-clamp-2">{article.description}</CardDescription>
                                </CardContent>
                                <div className="p-6 pt-0">
                                    <Link href={`/education/articles/${article.slug}`}>
                                        <Button variant="link" className="p-0 text-slate-600 hover:text-primary">
                                            อ่านต่อ <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            ) : (
                <div className="text-center py-16 bg-slate-50 rounded-2xl">
                    <FileText className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">ไม่พบบทความ</h3>
                    <p className="mt-2 text-sm text-slate-600">
                        ลองเปลี่ยนหมวดหมู่หรือกลับมาดูใหม่ภายหลัง
                    </p>
                </div>
            )}
        </div>
    );
}
