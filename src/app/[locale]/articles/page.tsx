
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAllArticles } from '@/lib/data';
import type { Article } from '@/lib/types';
import { ArrowRight, Search, FileText, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/firebase';
import { useLocale, useTranslations } from 'next-intl';

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { firestore } = useFirebase();
  const locale = useLocale();
  const t = useTranslations('HomePage.articles'); // Reusing homepage keys where possible

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
      const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) || article.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [articles, searchTerm, selectedCategory]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="w-full bg-slate-900 py-12 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-slate-900/90 to-slate-900/50" />
          <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] rounded-full bg-indigo-500/10 blur-3xl" />

          {/* Decorative Lines SVG */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 40L40 0H20L0 20M40 40V20L20 40" stroke="white" strokeWidth="1" fill="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
          <div className="absolute top-0 right-0 w-2/3 h-full opacity-10">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
              <path d="M0 100 C 20 0 50 0 100 100 Z" fill="none" stroke="white" strokeWidth="0.5" />
              <path d="M0 100 C 20 0 50 0 100 100 Z" fill="none" stroke="white" strokeWidth="0.5" transform="translate(0, -10)" opacity="0.8" />
              <path d="M0 100 C 20 0 50 0 100 100 Z" fill="none" stroke="white" strokeWidth="0.5" transform="translate(0, -20)" opacity="0.6" />
            </svg>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <Link href="/" className="inline-flex items-center text-sm text-slate-300 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('viewAll').replace('ดูทั้งหมด', 'กลับไปหน้าแรก').replace('View All', 'Back to Home').replace('查看全部', '返回首页')}
            {/* Fallback/Hack for "Back to Home" if key missing, or just hardcode "Back to Home" with t() if available */}
          </Link>

          <h1 className="text-3xl md:text-5xl font-bold tracking-tight font-headline text-white mb-4">
            {t('title')}
          </h1>


          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-12 w-full bg-white/10 border-slate-700 text-white rounded-xl px-4 text-base shadow-sm hover:bg-white/20 transition-all focus:ring-0 focus:ring-offset-0 border-transparent placeholder:text-slate-300">
                  <SelectValue placeholder="เลือกหมวดหมู่บทความ" className="placeholder:text-slate-400" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {categories.map(category => (
                    <SelectItem key={category} value={category} className="cursor-pointer py-3 text-base">
                      {category === 'all' ? 'All Articles' : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags / Pills */}
          <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
            <span className="text-sm font-medium text-slate-400 self-center mr-2">Tag:</span>
            {categories.filter(c => c !== 'all').map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
              >
                {category}
              </button>
            ))}
            {selectedCategory !== 'all' && (
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="flex flex-col rounded-3xl shadow-sm border-none">
                <div className="animate-pulse bg-gray-200 h-48 w-full"></div>
                <CardHeader>
                  <div className="animate-pulse bg-gray-200 h-6 w-3/4 rounded"></div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="animate-pulse bg-gray-200 h-4 w-full rounded mb-2"></div>
                  <div className="animate-pulse bg-gray-200 h-4 w-5/6 rounded"></div>
                </CardContent>
                <div className="p-6 pt-0">
                  <div className="animate-pulse bg-gray-200 h-5 w-20 rounded-full"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredArticles.map((article) => {
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
                <Card key={article.id} className="overflow-hidden h-full flex flex-col group rounded-3xl shadow-sm border-none">
                  <Link href={`/articles/${article.slug}`} className="block">
                    <div className="relative h-48 w-full">
                      <Image
                        src={article.imageUrl}
                        alt={title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        data-ai-hint={article.imageHint}
                      />
                      <div className="absolute inset-0 bg-black/20"></div>
                      <Badge variant="secondary" className="absolute top-3 right-3">{article.category}</Badge>
                    </div>
                  </Link>
                  <CardHeader>
                    <CardTitle>
                      <Link href={`/articles/${article.slug}`} className="hover:text-primary transition-colors">
                        {title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <CardDescription>{description}</CardDescription>
                  </CardContent>
                  <div className="p-6 pt-0">
                    <Link href={`/articles/${article.slug}`}>
                      <Button variant="link" className="p-0 text-foreground">
                        {t('readMore')} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">{t('emptyTitle')}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('emptyDescription')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
