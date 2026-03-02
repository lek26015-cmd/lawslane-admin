
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    File,
    MoreHorizontal,
    PlusCircle,
    BarChart2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import Image from 'next/image';
import { getAllAds } from '@/lib/data';
import type { Ad } from '@/lib/types';
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
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { errorEmitter, FirestorePermissionError } from '@/firebase';


export default function AdminAdsPage() {
    const router = useRouter();
    const [allAds, setAllAds] = React.useState<Ad[]>([]);
    const [filteredAds, setFilteredAds] = React.useState<Ad[]>([]);
    const [activeTab, setActiveTab] = React.useState('all');
    const [deletingAd, setDeletingAd] = React.useState<{ id: string, title: string } | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const { toast } = useToast();
    const { firestore } = useFirebase();

    React.useEffect(() => {
        if (!firestore) return;
        getAllAds(firestore).then(ads => {
            setAllAds(ads);
            setFilteredAds(ads);
        });
    }, [firestore]);

    React.useEffect(() => {
        if (activeTab === 'all') {
            setFilteredAds(allAds);
        } else {
            setFilteredAds(allAds.filter(ad => ad.placement === activeTab));
        }
    }, [activeTab, allAds]);

    const confirmDeleteAd = () => {
        if (!firestore || !deletingAd) return;

        const adRef = doc(firestore, 'ads', deletingAd.id);
        deleteDoc(adRef).then(() => {
            toast({
                title: "ลบโฆษณาสำเร็จ",
                description: `โฆษณา "${deletingAd.title}" ได้ถูกลบออกจากระบบแล้ว`,
                variant: "destructive"
            });
            setAllAds(prev => prev.filter(ad => ad.id !== deletingAd.id));
            setIsDeleteDialogOpen(false);
            setDeletingAd(null);
        }).catch(error => {
            const permissionError = new FirestorePermissionError({
                path: adRef.path,
                operation: 'delete'
            });
            errorEmitter.emit('permission-error', permissionError);
            setIsDeleteDialogOpen(false);
        });
    }

    return (
        <main className="flex flex-1 flex-col gap-4 p-4">
            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>จัดการโฆษณา</CardTitle>
                    <CardDescription>
                        จัดการแบนเนอร์และแคมเปญโฆษณาทุกตำแหน่งบนแพลตฟอร์ม
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="all" onValueChange={setActiveTab}>
                        <div className="flex items-center">
                            <TabsList>
                                <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
                                <TabsTrigger value="Homepage Carousel">แบนเนอร์หน้าแรก</TabsTrigger>
                                <TabsTrigger value="Lawyer Page Sidebar">ไซด์บาร์หน้าทนาย</TabsTrigger>
                            </TabsList>
                            <div className="ml-auto flex items-center gap-2">
                                <Button size="sm" className="h-8 gap-1" asChild>
                                    <Link href="/ads/new">
                                        <PlusCircle className="h-3.5 w-3.5" />
                                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                            เพิ่มโฆษณาใหม่
                                        </span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                        <TabsContent value={activeTab}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="hidden w-[100px] sm:table-cell">
                                            รูปภาพ
                                        </TableHead>
                                        <TableHead>หัวข้อ</TableHead>
                                        <TableHead>ตำแหน่ง</TableHead>
                                        <TableHead>สถานะ</TableHead>
                                        <TableHead className="text-right">จำนวนคลิก</TableHead>
                                        <TableHead>
                                            <span className="sr-only">Actions</span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAds.map((ad) => (
                                        <TableRow
                                            key={ad.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => router.push(`/ads/${ad.id}`)}
                                        >
                                            <TableCell className="hidden sm:table-cell">
                                                <Image
                                                    alt={ad.title}
                                                    className="aspect-square rounded-md object-contain bg-white p-1"
                                                    height="64"
                                                    src={ad.imageUrl}
                                                    width="64"
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <Link href={`/ads/${ad.id}`} className="hover:underline">
                                                    {ad.title}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{ad.placement}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={ad.status === 'active' ? 'secondary' : 'outline'}>{ad.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {ad.analytics?.clicks.toLocaleString() || 0}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            aria-haspopup="true"
                                                            size="icon"
                                                            variant="ghost"
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Toggle menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/ads/${ad.id}`}>ดูสถิติ</Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/ads/${ad.id}/edit`}>แก้ไข</Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onSelect={(e) => {
                                                                e.preventDefault();
                                                                setDeletingAd({ id: ad.id, title: ad.title });
                                                                setIsDeleteDialogOpen(true);
                                                            }}
                                                        >
                                                            ลบ
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                </CardContent>
                <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        แสดง <strong>{filteredAds.length}</strong> จาก <strong>{allAds.length}</strong> รายการ
                    </div>
                </CardFooter>
            </Card>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
                        <AlertDialogDescription>
                            การกระทำนี้ไม่สามารถย้อนกลับได้ คุณกำลังจะลบโฆษณา "{deletingAd?.title}" ออกจากระบบอย่างถาวร
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteAd} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">ยืนยันการลบ</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    )
}
