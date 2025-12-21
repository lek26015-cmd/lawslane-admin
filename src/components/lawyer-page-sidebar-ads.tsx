'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { getAdsByPlacement } from '@/lib/data';
import type { Ad } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';

export function LawyerPageSidebarAds() {
    const { firestore } = useFirebase();
    const [ads, setAds] = useState<Ad[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchAds() {
            if (!firestore) return;
            try {
                const fetchedAds = await getAdsByPlacement(firestore, 'Lawyer Page Sidebar');
                setAds(fetchedAds);
            } catch (error) {
                console.error("Error fetching sidebar ads:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchAds();
    }, [firestore]);

    if (isLoading) {
        return null; // Or a skeleton loader if preferred
    }

    if (ads.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4 mt-6">
            {ads.map((ad) => (
                <div key={ad.id}>
                    {ad.href ? (
                        <a href={ad.href} target="_blank" rel="noopener noreferrer" className="block group">
                            <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow rounded-3xl">
                                <CardContent className="p-0 relative aspect-[4/5]">
                                    <Image
                                        src={ad.imageUrl}
                                        alt={ad.title}
                                        fill
                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-4">
                                        <h3 className="text-white font-semibold text-lg leading-tight">{ad.title}</h3>
                                        <p className="text-white/80 text-xs mt-1 line-clamp-2">{ad.description}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </a>
                    ) : (
                        <Card className="overflow-hidden border-0 shadow-md rounded-3xl">
                            <CardContent className="p-0 relative aspect-[4/5]">
                                <Image
                                    src={ad.imageUrl}
                                    alt={ad.title}
                                    fill
                                    className="object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-4">
                                    <h3 className="text-white font-semibold text-lg leading-tight">{ad.title}</h3>
                                    <p className="text-white/80 text-xs mt-1 line-clamp-2">{ad.description}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            ))}
        </div>
    );
}
