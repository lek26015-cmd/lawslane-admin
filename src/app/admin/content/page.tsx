
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
    File,
    MoreHorizontal,
    PlusCircle,
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
} from '@/components/ui/tabs';
import Image from 'next/image';
import { getAllAdminArticles } from '@/lib/data';
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
import { Article } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { errorEmitter, FirestorePermissionError } from '@/firebase';


export default function AdminContentPage() {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const [articles, setArticles] = React.useState<Article[]>([]);

    React.useEffect(() => {
        if (!firestore) return;
        getAllAdminArticles(firestore).then(setArticles);
    }, [firestore]);


    const handleDelete = (article: Article) => {
        if (!firestore) return;
        const articleRef = doc(firestore, 'articles', article.id);

        deleteDoc(articleRef).then(() => {
            toast({
                variant: "destructive",
                title: "ลบบทความสำเร็จ",
                description: `บทความ "${article.title}" ได้ถูกลบออกจากระบบแล้ว`,
            });
            setArticles(prev => prev.filter(a => a.id !== article.id));
        }).catch(error => {
            const permissionError = new FirestorePermissionError({
                path: articleRef.path,
                operation: 'delete'
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    };

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>จัดการเนื้อหาและบทความ</CardTitle>
                    <CardDescription>
                        สร้าง, แก้ไข, และจัดการบทความและเนื้อหาอื่นๆ บนเว็บไซต์
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="all">
                        <div className="flex items-center">
                            <div className="ml-auto flex items-center gap-2">
                                <Button size="sm" className="h-8 gap-1" asChild>
                                    <Link href="/admin/content/new">
                                        <PlusCircle className="h-3.5 w-3.5" />
                                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                            สร้างบทความใหม่
                                        </span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                        <TabsContent value="all">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="hidden w-[100px] sm:table-cell">
                                            รูปภาพ
                                        </TableHead>
                                        <TableHead>หัวข้อ</TableHead>
                                        <TableHead>หมวดหมู่</TableHead>
                                        <TableHead>
                                            <span className="sr-only">Actions</span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {articles.map((article) => (
                                        <TableRow key={article.id}>
                                            <TableCell className="hidden sm:table-cell">
                                                <Image
                                                    alt={article.title}
                                                    className="aspect-square rounded-md object-cover"
                                                    height="64"
                                                    src={article.imageUrl}
                                                    width="64"
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {article.title}
                                                <div className="text-xs text-muted-foreground md:hidden">
                                                    {article.category}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <Badge variant="outline">{article.category}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <AlertDialog>
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
                                                                <Link href={`/admin/content/${article.id}/edit`}>แก้ไข</Link>
                                                            </DropdownMenuItem>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>ลบ</DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                การกระทำนี้ไม่สามารถย้อนกลับได้ คุณกำลังจะลบบทความ "{article.title}" ออกจากระบบอย่างถาวร
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(article)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                                ยืนยันการลบ
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
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
                        แสดง <strong>{articles.length}</strong> จาก <strong>{articles.length}</strong> รายการ
                    </div>
                </CardFooter>
            </Card>
        </main>
    )
}
