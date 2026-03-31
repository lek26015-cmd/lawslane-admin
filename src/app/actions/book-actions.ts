'use server';

import { initAdmin } from '@/lib/firebase-admin';
import { Book, BookOrder } from '@/lib/types';
import { revalidatePath } from 'next/cache';

/**
 * Fetch all books for the bookstore
 */
export async function getBooksAction(): Promise<Book[]> {
    const adminApp = await initAdmin();
    if (!adminApp) throw new Error('Firebase Admin not initialized.');
    const db = adminApp.firestore();

    try {
        const snap = await db.collection('books').orderBy('publishedAt', 'desc').get();
        return snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            publishedAt: doc.data().publishedAt?.toDate ? doc.data().publishedAt.toDate().toISOString() : doc.data().publishedAt
        } as Book));
    } catch (error) {
        console.error("Error fetching books:", error);
        return [];
    }
}

/**
 * Create a new book
 */
export async function createBookAction(bookData: Omit<Book, 'id'>) {
    const adminApp = await initAdmin();
    if (!adminApp) throw new Error('Firebase Admin not initialized.');
    const db = adminApp.firestore();

    try {
        const docRef = await db.collection('books').add({
            ...bookData,
            publishedAt: new Date().toISOString()
        });
        revalidatePath('/books');
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error creating book:", error);
        return { success: false, error: String(error) };
    }
}

/**
 * Update book stock or details
 */
export async function updateBookAction(id: string, updates: Partial<Book>) {
    const adminApp = await initAdmin();
    if (!adminApp) throw new Error('Firebase Admin not initialized.');
    const db = adminApp.firestore();

    try {
        await db.collection('books').doc(id).update(updates);
        revalidatePath('/books');
        return { success: true };
    } catch (error) {
        console.error("Error updating book:", error);
        return { success: false, error: String(error) };
    }
}

/**
 * Delete a book
 */
export async function deleteBookAction(id: string) {
    const adminApp = await initAdmin();
    if (!adminApp) throw new Error('Firebase Admin not initialized.');
    const db = adminApp.firestore();

    try {
        await db.collection('books').doc(id).delete();
        revalidatePath('/books');
        return { success: true };
    } catch (error) {
        console.error("Error deleting book:", error);
        return { success: false, error: String(error) };
    }
}

/**
 * Seed initial books
 */
export async function seedBooksAction() {
    const adminApp = await initAdmin();
    if (!adminApp) throw new Error('Firebase Admin not initialized.');
    const db = adminApp.firestore();

    const snap = await db.collection('books').limit(1).get();
    if (!snap.empty) return { success: false, message: 'Collection not empty' };

    const MOCK_BOOKS = [
        {
          title: 'กฎหมายธุรกิจสำหรับผู้ประกอบการ SME (Business Law for SMEs)',
          author: 'ศ.ดร. นิตินัย ตันมล',
          description: 'คู่มือที่รวบรวมกฎหมายสำคัญที่ผู้ประกอบการ SME ควรรู้ ตั้งแต่การจดทะเบียนบริษัทไปจนถึงสัญญาจ้างงาน',
          price: 450,
          imageUrl: '/images/lawslane-cover-book.png',
          category: 'business',
          stock: 50,
          publishedAt: new Date().toISOString(),
        },
        {
          title: 'เทคนิคการร่างสัญญาและการเจรจาต่อรอง (Contract Drafting Techniques)',
          author: 'ทนายสมชาย สายกฎหมาย',
          description: 'เรียนรู้ศิลปะการร่างสัญญาที่รัดกุมและเทคนิคการเจรจาต่อรองแบบมืออาชีพ',
          price: 590,
          imageUrl: '/images/lawslane-cover-book.png',
          category: 'contract',
          stock: 25,
          publishedAt: new Date().toISOString(),
        }
    ];

    const batch = db.batch();
    MOCK_BOOKS.forEach(book => {
        const ref = db.collection('books').doc();
        batch.set(ref, book);
    });

    await batch.commit();
    revalidatePath('/books');
    return { success: true };
}

/**
 * Fetch all bookstore orders (The "Full Loop" addition)
 */
export async function getBookOrdersAction(): Promise<BookOrder[]> {
    const adminApp = await initAdmin();
    if (!adminApp) throw new Error('Firebase Admin not initialized.');
    const db = adminApp.firestore();

    try {
        const snap = await db.collection('bookOrders').orderBy('createdAt', 'desc').get();
        return snap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
            } as BookOrder;
        });
    } catch (error) {
        console.error("Error fetching book orders:", error);
        return [];
    }
}

/**
 * Update bookstore order status
 */
export async function updateOrderStatusAction(orderId: string, status: BookOrder['status'], trackingNumber?: string) {
    const adminApp = await initAdmin();
    if (!adminApp) throw new Error('Firebase Admin not initialized.');
    const db = adminApp.firestore();

    try {
        const updates: any = { 
            status, 
            updatedAt: new Date().toISOString() 
        };
        if (trackingNumber) updates.trackingNumber = trackingNumber;

        await db.collection('bookOrders').doc(orderId).update(updates);
        revalidatePath('/orders');
        return { success: true };
    } catch (error) {
        console.error("Error updating order status:", error);
        return { success: false, error: String(error) };
    }
}
