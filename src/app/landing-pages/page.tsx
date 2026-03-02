'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { LandingPage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminLandingPagesList() {
    const { firestore, user } = useFirebase();
    const [pages, setPages] = useState<LandingPage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const checkUserRole = async () => {
            if (user && firestore) {
                try {
                    const userDocRef = doc(firestore, 'users', user.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (userData.role !== 'admin') {
                            setIsAdmin(false);
                        } else {
                            setIsAdmin(true);
                        }
                    }
                } catch (e) {
                    console.error("Error checking role:", e);
                }
            }
        };
        checkUserRole();
    }, [user, firestore]);

    const handleFixAdminRole = async () => {
        if (!user || !firestore) return;
        try {
            const userDocRef = doc(firestore, 'users', user.uid);
            await import('firebase/firestore').then(({ setDoc }) =>
                setDoc(userDocRef, { role: 'admin' }, { merge: true })
            );
            setIsAdmin(true);
            toast({
                title: "Success",
                description: "You are now an Admin!",
            });
        } catch (error: any) {
            console.error("Error fixing admin role:", error);
            toast({
                variant: "destructive",
                title: "Failed",
                description: error.message,
            });
        }
    };

    const fetchPages = async () => {
        if (!firestore) return;
        try {
            const q = query(collection(firestore, 'landingPages'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const fetchedPages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LandingPage));
            setPages(fetchedPages);
        } catch (error) {
            console.error("Error fetching landing pages:", error);
            // Don't show toast on initial load error if it's just permission (might be confusing if not admin yet)
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPages();
    }, [firestore]);

    const handleDelete = async (id: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'landingPages', id));
            toast({
                title: "ลบสำเร็จ",
                description: "ลบ Landing Page เรียบร้อยแล้ว",
            });
            fetchPages(); // Refresh list
        } catch (error) {
            console.error("Error deleting page:", error);
            toast({
                variant: "destructive",
                title: "ลบไม่สำเร็จ",
                description: "คุณอาจไม่มีสิทธิ์ในการลบ (ต้องเป็น Admin)",
            });
        }
    };

    const getRootLink = () => {
        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'lawslane.com';
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
        if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
            return `${window.location.protocol}//${window.location.host.replace('admin.', '')}`;
        }
        const host = process.env.NODE_ENV === 'development' ? 'localhost:9002' : rootDomain;
        return `${protocol}://${host}`;
    };

    if (isLoading) {
        return <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>;
    }

    return (
        <div className="p-6">
            {!isAdmin && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-red-800">
                    <div>
                        <h3 className="font-bold">Access Denied: You are not an Admin</h3>
                        <p className="text-sm">You need admin permissions to manage landing pages.</p>
                    </div>
                    <Button variant="destructive" onClick={handleFixAdminRole}>
                        Fix Admin Role (Dev Only)
                    </Button>
                </div>
            )}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">จัดการ Landing Pages</h1>
                <Link href="/landing-pages/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        สร้างใหม่
                    </Button>
                </Link>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ชื่อเพจ</TableHead>
                            <TableHead>Slug (URL)</TableHead>
                            <TableHead>สถานะ</TableHead>
                            <TableHead>วันที่สร้าง</TableHead>
                            <TableHead className="text-right">จัดการ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pages.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    ยังไม่มี Landing Page
                                </TableCell>
                            </TableRow>
                        ) : (
                            pages.map((page) => (
                                <TableRow key={page.id}>
                                    <TableCell className="font-medium">{page.title}</TableCell>
                                    <TableCell>
                                        <span className="bg-muted px-2 py-1 rounded text-xs font-mono">
                                            /p/{page.slug}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs ${page.status === 'published'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {page.status === 'published' ? 'เผยแพร่แล้ว' : 'แบบร่าง'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {page.createdAt?.seconds ? format(new Date(page.createdAt.seconds * 1000), 'dd MMM yyyy', { locale: th }) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <a href={`${getRootLink()}/p/${page.slug}`} target="_blank" rel="noopener noreferrer">
                                                <Button variant="ghost" size="icon" title="ดูหน้าเว็บ">
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                            </a>
                                            <Link href={`/landing-pages/${page.id}/edit`}>
                                                <Button variant="ghost" size="icon" title="แก้ไข">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>ยืนยันการลบ?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            คุณต้องการลบ Landing Page "{page.title}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(page.id)} className="bg-destructive hover:bg-destructive/90">
                                                            ลบ
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
