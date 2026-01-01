'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/provider';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function DebugAdsPage() {
    const { firestore } = useFirebase();
    const [allAds, setAllAds] = useState<any[]>([]);
    const [filteredAds, setFilteredAds] = useState<any[]>([]);
    const [error, setError] = useState<string>('');
    const [queryError, setQueryError] = useState<string>('');

    useEffect(() => {
        if (!firestore) return;

        const fetchAds = async () => {
            // 1. Fetch ALL ads
            try {
                const adsRef = collection(firestore, 'ads');
                const snapshot = await getDocs(adsRef);
                const adsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllAds(adsData);
            } catch (err: any) {
                console.error("Error fetching all ads:", err);
                setError(err.message);
            }

            // 2. Fetch Filtered ads (Simulate Homepage Query)
            try {
                const adsRef = collection(firestore, 'ads');
                const q = query(adsRef, where('placement', '==', 'Homepage Carousel'), where('status', '==', 'active'));
                const snapshot = await getDocs(q);
                const filteredData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setFilteredAds(filteredData);
            } catch (err: any) {
                console.error("Error fetching filtered ads:", err);
                setQueryError(err.message);
            }
        };

        fetchAds();
    }, [firestore]);

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold mb-4">1. All Ads (Raw Data)</h1>
                {error && <div className="text-red-500 mb-4">Error: {error}</div>}
                <div className="space-y-4">
                    {allAds.map(ad => (
                        <div key={ad.id} className="border p-4 rounded bg-gray-50">
                            <h2 className="font-bold">{ad.title}</h2>
                            <p>Status: <span className="font-mono">{ad.status}</span></p>
                            <p>Placement: <span className="font-mono">{ad.placement}</span></p>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h1 className="text-2xl font-bold mb-4">2. Homepage Query Test</h1>
                <p className="mb-2">Query: <code>placement == 'Homepage Carousel' && status == 'active'</code></p>

                {queryError ? (
                    <div className="p-4 bg-red-100 text-red-700 rounded border border-red-300">
                        <strong>Query Failed!</strong>
                        <p>{queryError}</p>
                        {queryError.includes('index') && <p className="mt-2 font-bold">Possible Cause: Missing Firestore Index</p>}
                    </div>
                ) : (
                    <div className="p-4 bg-green-100 text-green-700 rounded border border-green-300">
                        <strong>Query Success!</strong>
                        <p>Found {filteredAds.length} matching ads.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
