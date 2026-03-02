'use client'

import * as React from 'react'
import {
    Plus,
    Search,
    MoreHorizontal,
    FileText,
    Download,
    Trash2,
    Pencil,
    Eye
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useFirebase } from '@/firebase'
import { getAllLegalForms } from '@/lib/data'
import { deleteDoc, doc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import type { LegalForm } from '@/lib/types'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

export default function AdminFormsPage() {
    const router = useRouter()
    const { firestore } = useFirebase()
    const { toast } = useToast()

    const [forms, setForms] = React.useState<LegalForm[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [searchQuery, setSearchQuery] = React.useState('')

    const fetchForms = React.useCallback(async () => {
        if (!firestore) return
        setIsLoading(true)
        try {
            const data = await getAllLegalForms(firestore)
            // Normalize attachments for legacy data
            const normalizedData = data.map(f => {
                if (!f.attachments || f.attachments.length === 0) {
                    if (f.fileUrl) {
                        return {
                            ...f,
                            attachments: [{
                                url: f.fileUrl,
                                name: f.fileName || 'Document',
                                type: f.fileType || 'pdf'
                            }]
                        };
                    }
                }
                return f;
            });
            setForms(normalizedData)
        } catch (error) {
            console.error("Error fetching forms:", error)
            toast({
                variant: "destructive",
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถโหลดข้อมูลแบบฟอร์มได้",
            })
        } finally {
            setIsLoading(false)
        }
    }, [firestore, toast])

    React.useEffect(() => {
        fetchForms()
    }, [fetchForms])

    const handleDelete = async (id: string) => {
        if (!firestore) return
        if (!confirm('คุณต้องการลบแบบฟอร์มนี้ใช่หรือไม่?')) return

        try {
            await deleteDoc(doc(firestore, 'legalForms', id))
            toast({
                title: "ลบข้อมูลสำเร็จ",
                description: "แบบฟอร์มถูกลบออกจากระบบแล้ว",
            })
            fetchForms()
        } catch (error) {
            console.error("Error deleting form:", error)
            toast({
                variant: "destructive",
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถลบแบบฟอร์มได้",
            })
        }
    }

    const filteredForms = forms.filter(form =>
        form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.category.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:p-8">
            <div className="flex items-center justify-between space-y-2 mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">จัดการแบบฟอร์ม</h2>
                    <p className="text-muted-foreground">
                        รายการแบบฟอร์มกฎหมายทั้งหมดในระบบ
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Link href="/forms/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            เพิ่มแบบฟอร์ม
                        </Button>
                    </Link>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>รายการแบบฟอร์ม</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="ค้นหาแบบฟอร์ม..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <CardDescription>
                        จัดการ แก้ไข และตรวจสอบยอดดาวน์โหลดของแบบฟอร์มต่างๆ
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ชื่อเอกสาร</TableHead>
                                <TableHead>หมวดหมู่</TableHead>
                                <TableHead>ไฟล์</TableHead>
                                <TableHead>ยอดโหลด</TableHead>
                                <TableHead>วันที่สร้าง</TableHead>
                                <TableHead className="text-right">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">
                                        กำลังโหลดข้อมูล...
                                    </TableCell>
                                </TableRow>
                            ) : filteredForms.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                        ไม่พบข้อมูลแบบฟอร์ม
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredForms.map((form) => (
                                    <TableRow key={form.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-blue-500" />
                                                {form.title}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{form.category}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {form.attachments && form.attachments.length > 1 ? (
                                                <Badge variant="outline">{form.attachments.length} ไฟล์</Badge>
                                            ) : (
                                                <span className="uppercase text-xs font-bold text-slate-500">
                                                    {form.attachments?.[0]?.type || form.fileType || 'PDF'}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Download className="h-3 w-3 text-slate-400" />
                                                {form.downloads}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {form.createdAt?.toDate ? format(form.createdAt.toDate(), 'd MMM yy', { locale: th }) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => router.push(`/forms/${form.id}/edit`)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        แก้ไข
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => window.open(form.attachments?.[0]?.url || form.fileUrl, '_blank')}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        ดูไฟล์
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600"
                                                        onClick={() => handleDelete(form.id)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        ลบ
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </main>
    )
}
