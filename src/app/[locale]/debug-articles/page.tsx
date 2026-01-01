'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';

export default function DebugArticlesPage() {
    const { firestore } = useFirebase();
    const [articles, setArticles] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchArticles() {
            if (!firestore) return;
            try {
                const articlesRef = collection(firestore, 'articles');
                // Fetch WITHOUT orderBy to see if data exists
                const querySnapshot = await getDocs(articlesRef);
                const fetchedArticles = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    // Try to format date, handle errors
                    publishedAtFormatted: doc.data().publishedAt?.toDate?.()?.toISOString() || 'Invalid Date'
                }));
                setArticles(fetchedArticles);
            } catch (err: any) {
                console.error("Error fetching articles:", err);
                setError(err.message);
            }
        }

        fetchArticles();
    }, [firestore]);

    const handleSeed = async () => {
        if (!firestore) return;
        try {
            const articlesRef = collection(firestore, 'articles');
            await addDoc(articlesRef, {
                title: 'กฎหมายมรดกเบื้องต้น',
                slug: 'inheritance-law-basic',
                content: 'มรดก คือ ทรัพย์สินทุกชนิดของผู้ตาย ตลอดจนสิทธิหน้าที่และความรับผิดต่างๆ... (ข้อมูลตัวอย่าง) การแบ่งมรดกจะแบ่งให้ทายาทโดยธรรม 6 ลำดับ ได้แก่ 1. ผู้สืบสันดาน 2. บิดามารดา 3. พี่น้องร่วมบิดามารดา...',
                publishedAt: new Date(),
                imageUrl: 'https://placehold.co/600x400',
                category: 'Civil Law'
            });
            alert('Seeded article successfully!');
            window.location.reload();
        } catch (e: any) {
            console.error(e);
            alert('Error seeding: ' + e.message);
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Debug Articles</h1>
            <button onClick={handleSeed} className="bg-blue-500 text-white px-4 py-2 rounded mb-4 mr-4">
                Seed Inheritance Article
            </button>
            <button onClick={async () => {
                if (!firestore) return;
                try {
                    await addDoc(collection(firestore, 'articles'), {
                        title: 'หลักการร่างสัญญาเบื้องต้น',
                        slug: 'contract-drafting-basics',
                        content: 'สัญญา คือ นิติกรรมสองฝ่ายที่เกิดขึ้นจากการตกลงกัน... การร่างสัญญาที่ดีควรมีความชัดเจน ระบุคู่สัญญา สิทธิหน้าที่ และเงื่อนไขการเลิกสัญญาให้ครบถ้วน...',
                        publishedAt: new Date(),
                        imageUrl: 'https://placehold.co/600x400',
                        category: 'Civil Law'
                    });
                    alert('Seeded Contract article successfully!');
                    window.location.reload();
                } catch (e: any) { alert(e.message); }
            }} className="bg-green-500 text-white px-4 py-2 rounded mb-4">
                Seed Contract Article
            </button>
            {error && <div className="text-red-500 mb-4">Error: {error}</div>}
            <div className="space-y-4">
                {articles.map(article => (
                    <div key={article.id} className="border p-4 rounded shadow">
                        <h2 className="font-bold">{article.title}</h2>
                        <p>ID: {article.id}</p>
                        <p>Slug: {article.slug}</p>
                        <p>Published At (Raw): {JSON.stringify(article.publishedAt)}</p>
                        <p>Published At (Formatted): {article.publishedAtFormatted}</p>
                        <img src={article.imageUrl} alt={article.title} className="w-32 h-20 object-cover mt-2" />
                    </div>
                ))}
            </div>
        </div>
    );
}
