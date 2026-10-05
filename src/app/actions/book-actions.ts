'use server';

import { initAdmin } from '@/lib/firebase-admin';
import { Book, StoreOrder } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { requireAdmin, AuthError } from '@/lib/auth-guard';
import { FieldPath } from 'firebase-admin/firestore';

function toPlain(data: FirebaseFirestore.DocumentData): Record<string, unknown> {
    return Object.fromEntries(Object.entries(data).map(([k, v]) => [
        k,
        v && typeof v === 'object' && typeof (v as { toDate?: unknown }).toDate === 'function'
            ? (v as { toDate: () => Date }).toDate().toISOString()
            : v,
    ]));
}

const ALLOWED_ORDER_STATUSES: StoreOrder['status'][] = ['PENDING', 'PAID', 'REJECTED', 'SHIPPING', 'COMPLETED', 'DELIVERED'];

/**
 * Fetch all books for the bookstore
 */
export async function getBooksAction(): Promise<Book[]> {
    await requireAdmin('store.books');
    const adminApp = await initAdmin();
    if (!adminApp) throw new Error('Firebase Admin not initialized.');
    const db = adminApp.firestore();

    try {
        const snap = await db.collection('books').orderBy('publishedAt', 'desc').get();
        // แปลง Timestamp ทุกฟิลด์เป็น ISO — เดิมแปลงแค่ publishedAt หนังสือที่มี createdAt/updatedAt
        // (Timestamp) ทำให้ server action ส่งผลลัพธ์ไม่ได้ทั้งรายการ → หน้าแสดง "Failed to fetch books"
        return snap.docs.map(doc => ({
            id: doc.id,
            ...toPlain(doc.data()),
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
    await requireAdmin('store.books');
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
    await requireAdmin('store.books');
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
    await requireAdmin('store.books');
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

export interface GetStoreOrdersParams {
    /** id ของเอกสารตัวสุดท้ายในหน้าก่อนหน้า — null/undefined = หน้าแรก */
    cursor?: string | null;
    pageSize?: number;
    status?: StoreOrder['status'];
    /** ค้นหาด้วย userId แบบตรงทั้งหมดเท่านั้น (ดูหมายเหตุด้านล่าง) */
    searchTerm?: string;
}

export interface StoreOrdersPage {
    items: StoreOrder[];
    nextCursor: string | null;
}

function mapOrderDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): StoreOrder {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
    } as StoreOrder;
}

/**
 * Fetch store orders (books/courses/exams) from lawlanes-education แบบแบ่งหน้า
 *
 * แต่ก่อนอ่านจาก `bookOrders` ซึ่งไม่มีใครเขียนอีกต่อไป — education เขียนออเดอร์จริง
 * (ตอนซื้อหนังสือ/คอร์ส/ข้อสอบ) ลง `orders` เสมอ (ดู lawlanes-education/api/education/orders)
 * `bookOrders` ว่างเปล่าใน production แล้ว จึงสลับมาอ่าน `orders` ตรงๆ แทนโดยไม่ต้อง migrate ข้อมูล
 *
 * เดิมดึงมาทีเดียว 500 รายการ (limit(500) ไม่มี cursor) — เปลี่ยนเป็น cursor-based pagination
 * ที่นี่ cursor เป็นแค่ id ของเอกสารตัวสุดท้าย แล้วอ่าน snapshot นั้นมาใช้กับ startAfter() ตรงๆ
 * (ง่ายกว่าประกอบ field values เอง และ cost แค่ 1 read ต่อการเปลี่ยนหน้า)
 *
 * ค้นหา: รองรับแค่ userId แบบตรงทั้งหมด (exact match) เพราะออเดอร์ไม่มี field ชื่อลูกค้าที่
 * normalize เป็นตัวพิมพ์เล็กไว้ค้นแบบ prefix ได้ (มีแค่ shippingInfo.name ของออเดอร์ที่มี
 * จัดส่งจริง ซึ่งยังไม่ได้ backfill) — ออเดอร์สินค้าดิจิทัล (ไม่มี shippingInfo) ค้นได้แค่ทาง
 * userId เท่านั้นอยู่ดี จึงเลือก userId เป็นทางเดียวที่ค้นได้แน่นอนสำหรับ v1 นี้
 */
export async function getStoreOrdersAction(params: GetStoreOrdersParams = {}): Promise<StoreOrdersPage> {
    await requireAdmin('store.orders');
    const { cursor = null, pageSize = 25, status, searchTerm } = params;
    const adminApp = await initAdmin();
    if (!adminApp) throw new Error('Firebase Admin not initialized.');
    const db = adminApp.firestore();

    try {
        let q: FirebaseFirestore.Query = db.collection('orders');

        const trimmedSearch = searchTerm?.trim();
        if (trimmedSearch) {
            q = q.where('userId', '==', trimmedSearch);
        } else if (status) {
            q = q.where('status', '==', status);
        }

        q = q.orderBy('createdAt', 'desc').orderBy(FieldPath.documentId());

        if (cursor) {
            const cursorSnap = await db.collection('orders').doc(cursor).get();
            if (cursorSnap.exists) {
                q = q.startAfter(cursorSnap);
            }
        }

        q = q.limit(pageSize);

        const snap = await q.get();
        const items = snap.docs.map(mapOrderDoc);
        const nextCursor = snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1].id : null;

        return { items, nextCursor };
    } catch (error) {
        console.error("Error fetching store orders:", error);
        return { items: [], nextCursor: null };
    }
}

/**
 * Update a store order's status
 *
 * ใช้ค่าสถานะเดียวกับที่ lawlanes-education กำหนดไว้ (PATCH /api/education/orders/[id])
 * เพราะ my-ebooks entitlement ของฝั่ง education เช็คสตริงเป๊ะๆ พวกนี้ — ถ้าเขียนสถานะอื่นไป
 * ลูกค้าจะไม่ได้รับสิทธิ์เข้าถึงอีบุ๊ก/คอร์สที่ซื้อ
 */
export async function updateOrderStatusAction(orderId: string, status: StoreOrder['status'], trackingNumber?: string) {
    await requireAdmin('store.orders');
    if (!ALLOWED_ORDER_STATUSES.includes(status)) {
        return { success: false, error: `Invalid status: ${status}` };
    }
    const adminApp = await initAdmin();
    if (!adminApp) throw new Error('Firebase Admin not initialized.');
    const db = adminApp.firestore();

    try {
        const updates: any = {
            status,
            updatedAt: new Date().toISOString()
        };
        if (trackingNumber) updates.trackingNumber = trackingNumber;

        await db.collection('orders').doc(orderId).update(updates);
        revalidatePath('/orders');
        return { success: true };
    } catch (error) {
        console.error("Error updating order status:", error);
        return { success: false, error: String(error) };
    }
}
