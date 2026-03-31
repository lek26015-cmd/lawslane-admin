'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Book } from '@/lib/types';
import { cn } from '@/lib/utils';
import { 
  getBooksAction, 
  createBookAction, 
  updateBookAction, 
  deleteBookAction,
  seedBooksAction 
} from '@/app/actions/book-actions';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Plus, 
  Pencil, 
  Trash2, 
  BookOpen, 
  RefreshCcw, 
  Search,
  Package,
  DollarSign,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function AdminBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    price: 0,
    stock: 0,
    category: 'business',
    imageUrl: '/images/lawslane-cover-book.png'
  });

  const fetchBooks = async () => {
    setIsLoading(true);
    try {
      const data = await getBooksAction();
      setBooks(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch books", variant: "destructive" });
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
          toast({ title: "Updated", description: "Book updated successfully" });
          setEditingBook(null);
          setShowAddForm(false);
        }
      } else {
        const res = await createBookAction({ 
          ...formData, 
          publishedAt: new Date().toISOString() 
        } as Omit<Book, 'id'>);
        if (res.success) {
          toast({ title: "Created", description: "Book added successfully" });
          setShowAddForm(false);
        }
      }
      fetchBooks();
    } catch (error) {
      toast({ title: "Error", description: "Action failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;
    try {
      await deleteBookAction(id);
      toast({ title: "Deleted", description: "Book removed" });
      fetchBooks();
    } catch (error) {
      toast({ title: "Error", description: "Delete failed", variant: "destructive" });
    }
  };

  const handleSeed = async () => {
    setIsLoading(true);
    const res = await seedBooksAction();
    if (res.success) {
      toast({ title: "Seeded", description: "Mock data added" });
      fetchBooks();
    } else {
      toast({ title: "Notice", description: res.message || "Seeding failed" });
    }
    setIsLoading(false);
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
            Bookstore Inventory
          </h1>
          <p className="text-slate-500">Manage Lawslane bookstore inventory and pricing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeed} disabled={isLoading}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Sync Mocks
          </Button>
          <Button onClick={() => {
            setEditingBook(null);
            setFormData({ title: '', author: '', description: '', price: 0, stock: 0, category: 'business', imageUrl: '/images/lawslane-cover-book.png' });
            setShowAddForm(true);
          }}>
            <Plus className="w-4 h-4 mr-2" /> Add New Book
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card className="border-blue-200 bg-blue-50/30 rounded-3xl">
          <CardHeader>
            <CardTitle>{editingBook ? 'Edit Book' : 'Add New Book'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Author</Label>
                <Input value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <textarea 
                  className="w-full min-h-[100px] bg-white border border-slate-200 rounded-xl p-3 text-sm"
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Price (THB)</Label>
                <Input type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} required />
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Image URL / Path</Label>
                <Input value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} placeholder="/images/lawslane-cover-book.png" />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingBook ? 'Save Changes' : 'Create Book'}
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
              placeholder="Search books..." 
              className="pl-10 h-10 rounded-full bg-slate-50 border-none" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="text-sm font-bold text-slate-400 font-mono">
            COUNT: {books.length}
          </div>
        </div>

        {isLoading ? (
          <div className="p-20 text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-slate-500">Loading bookstore inventory...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <tr>
                  <th className="px-6 py-4">Book Info</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-right">Actions</th>
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
                        <DollarSign className="w-3.5 h-3.5 text-slate-400" />
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
                        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => {
                          setEditingBook(book);
                          setFormData(book);
                          setShowAddForm(true);
                        }}>
                          <Pencil className="w-4 h-4 text-slate-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 rounded-xl" onClick={() => handleDelete(book.id)}>
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
