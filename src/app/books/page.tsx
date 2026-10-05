'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadToCloudflareImages } from '@/app/actions/upload-cloudflare-images';
import { Book } from '@/lib/types';
import { cn } from '@/lib/utils';
import { 
  getBooksAction, 
  createBookAction, 
  updateBookAction, 
  deleteBookAction
} from '@/app/actions/book-actions';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Plus, 
  Pencil, 
  Trash2, 
  BookOpen, 
  Search,
  Package,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { useAdminLocale } from '@/lib/admin-i18n';

export default function AdminBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const { toast } = useToast();
  const { tx } = useAdminLocale();

  const [formData, setFormData] = useState<{
    title: string; author: string; description: string;
    price: number; originalPrice: number; pageCount: number;
    type: 'ebook' | 'physical' | 'both';
    stock: number; category: string; imageUrl: string;
  }>({
    title: '',
    author: '',
    description: '',
    price: 0,
    // ยกมาจากฟอร์มของ education ตอนรวมหลังบ้าน (Module 2)
    originalPrice: 0,
    pageCount: 0,
    type: 'physical',
    stock: 0,
    category: 'business',
    imageUrl: '/images/lawslane-cover-book.png'
  });
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const handleCoverUpload = async (file: File) => {
    setIsUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const url = await uploadToCloudflareImages(fd);
      setFormData(prev => ({ ...prev, imageUrl: url }));
      toast({ title: tx('อัปโหลดปกสำเร็จ', 'Cover uploaded') });
    } catch (e) {
      toast({ variant: 'destructive', title: tx('อัปโหลดปกไม่สำเร็จ', 'Cover upload failed'), description: String(e) });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const fetchBooks = async () => {
    setIsLoading(true);
    try {
      const data = await getBooksAction();
      setBooks(data);
    } catch (error) {
      toast({ title: tx('เกิดข้อผิดพลาด', 'Error'), description: tx('โหลดรายการหนังสือไม่สำเร็จ', 'Failed to fetch books'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingBook) {
        const res = await updateBookAction(editingBook.id, formData);
        if (res.success) {
          toast({ title: tx('อัปเดตแล้ว', 'Updated'), description: tx('แก้ไขหนังสือเรียบร้อย', 'Book updated successfully') });
          setEditingBook(null);
          setShowAddForm(false);
        }
      } else {
        const res = await createBookAction({ 
          ...formData, 
          publishedAt: new Date().toISOString() 
        } as Omit<Book, 'id'>);
        if (res.success) {
          toast({ title: tx('เพิ่มแล้ว', 'Created'), description: tx('เพิ่มหนังสือเรียบร้อย', 'Book added successfully') });
          setShowAddForm(false);
        }
      }
      fetchBooks();
    } catch (error) {
      toast({ title: tx('เกิดข้อผิดพลาด', 'Error'), description: tx('ดำเนินการไม่สำเร็จ', 'Action failed'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(tx('ยืนยันลบหนังสือเล่มนี้?', 'Are you sure you want to delete this book?'))) return;
    try {
      await deleteBookAction(id);
      toast({ title: tx('ลบแล้ว', 'Deleted'), description: tx('ลบหนังสือแล้ว', 'Book removed') });
      fetchBooks();
    } catch (error) {
      toast({ title: tx('เกิดข้อผิดพลาด', 'Error'), description: tx('ลบไม่สำเร็จ', 'Delete failed'), variant: 'destructive' });
    }
  };

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-blue-600" />
            {tx('คลังหนังสือ', 'Bookstore Inventory')}
          </h1>
          <p className="text-slate-500">{tx('จัดการสต็อกและราคาหนังสือของร้าน Lawslane', 'Manage Lawslane bookstore inventory and pricing')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => {
            setEditingBook(null);
            setFormData({ title: '', author: '', description: '', price: 0, originalPrice: 0, pageCount: 0, type: 'physical' as const, stock: 0, category: 'business', imageUrl: '/images/lawslane-cover-book.png' });
            setShowAddForm(true);
          }}>
            <Plus className="w-4 h-4 mr-2" /> {tx('เพิ่มหนังสือใหม่', 'Add New Book')}
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card className="border-blue-200 bg-blue-50/30 rounded-3xl">
          <CardHeader>
            <CardTitle>{editingBook ? tx('แก้ไขหนังสือ', 'Edit Book') : tx('เพิ่มหนังสือใหม่', 'Add New Book')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>{tx('ชื่อหนังสือ', 'Title')}</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{tx('ผู้เขียน', 'Author')}</Label>
                <Input value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{tx('รายละเอียด', 'Description')}</Label>
                <textarea 
                  className="w-full min-h-[100px] bg-white border border-slate-200 rounded-xl p-3 text-sm"
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>{tx('ราคา (บาท)', 'Price (THB)')}</Label>
                <Input type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} required />
              </div>
              <div className="space-y-2">
                <Label>{tx('สต็อก', 'Stock')}</Label>
                <Input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} required />
              </div>
              <div className="space-y-2">
                <Label>{tx('ราคาเต็ม (ก่อนลด)', 'Original price (before discount)')}</Label>
                <Input type="number" value={formData.originalPrice} onChange={e => setFormData({...formData, originalPrice: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>{tx('จำนวนหน้า', 'Page count')}</Label>
                <Input type="number" value={formData.pageCount} onChange={e => setFormData({...formData, pageCount: Number(e.target.value)})} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{tx('รูปแบบ', 'Format')}</Label>
                <select
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value as 'ebook' | 'physical' | 'both'})}
                >
                  <option value="physical">{tx('หนังสือเล่ม', 'Physical book')}</option>
                  <option value="ebook">E-Book</option>
                  <option value="both">{tx('ทั้ง E-Book และเล่ม', 'Both E-Book and physical')}</option>
                </select>
                <p className="text-xs text-slate-500">{tx('ใช้ตัดสินว่าออเดอร์ต้องขอที่อยู่จัดส่งไหม', 'Determines whether orders require a shipping address')}</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{tx('ปกหนังสือ', 'Book cover')}</Label>
                <div className="flex items-center gap-3">
                  {formData.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={formData.imageUrl} alt={tx('ปกหนังสือ', 'Book cover')} className="w-16 h-24 object-cover rounded-lg border" />
                  ) : null}
                  <div className="flex-1 space-y-2">
                    <Input value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} placeholder="/images/lawslane-cover-book.png" />
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingCover}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }}
                        className="text-xs"
                      />
                      {isUploadingCover && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                    </div>
                    <p className="text-xs text-slate-500">{tx('อัปโหลดขึ้น Cloudflare Images — วาง URL เองก็ได้', 'Uploads to Cloudflare Images — or paste a URL')}</p>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>{tx('ยกเลิก', 'Cancel')}</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingBook ? tx('บันทึกการเปลี่ยนแปลง', 'Save Changes') : tx('สร้างหนังสือ', 'Create Book')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input 
              placeholder={tx('ค้นหาหนังสือ...', 'Search books...')} 
              className="pl-10 h-10 rounded-full bg-slate-50 border-none" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="text-sm font-bold text-slate-400 font-mono">
            {tx('ทั้งหมด', 'COUNT')}: {books.length}
          </div>
        </div>

        {isLoading ? (
          <div className="p-20 text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-slate-500">{tx('กำลังโหลดคลังหนังสือ...', 'Loading bookstore inventory...')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <tr>
                  <th className="px-6 py-4">{tx('ข้อมูลหนังสือ', 'Book Info')}</th>
                  <th className="px-6 py-4">{tx('ราคา', 'Price')}</th>
                  <th className="px-6 py-4">{tx('สต็อก', 'Stock')}</th>
                  <th className="px-6 py-4">{tx('หมวดหมู่', 'Category')}</th>
                  <th className="px-6 py-4 text-right">{tx('จัดการ', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBooks.map(book => (
                  <tr key={book.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-slate-200">
                          <img src={book.imageUrl} alt={book.title} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 leading-snug">{book.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{book.author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 font-bold text-slate-900">
                        <span className="text-slate-400">฿</span>
                        {book.price.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold",
                        book.stock < 10 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                      )}>
                        <Package className="w-3 h-3" />
                        {book.stock}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        {book.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="rounded-xl" aria-label={tx('แก้ไข', 'Edit')} title={tx('แก้ไข', 'Edit')} onClick={() => {
                          setEditingBook(book);
                          setFormData({
                            title: book.title ?? '', author: book.author ?? '', description: book.description ?? '',
                            price: book.price ?? 0, originalPrice: book.originalPrice ?? 0, pageCount: book.pageCount ?? 0,
                            type: book.type ?? 'physical', stock: book.stock ?? 0,
                            category: book.category ?? 'business', imageUrl: book.imageUrl ?? '',
                          });
                          setShowAddForm(true);
                        }}>
                          <Pencil className="w-4 h-4 text-slate-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 rounded-xl" aria-label={tx('ลบ', 'Delete')} title={tx('ลบ', 'Delete')} onClick={() => handleDelete(book.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
