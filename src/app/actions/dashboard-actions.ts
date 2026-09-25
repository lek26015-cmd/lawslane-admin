'use server';

import { initAdmin } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import type { Case, UpcomingAppointment, ReportedTicket } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';
import { requireAdmin } from '@/lib/auth-guard';

export async function getUserDashboardData(userId: string) {
    // เดิมไม่มีด่าน — รับ userId แล้วคืนเคส/นัดหมาย/ticket ของผู้ใช้คนนั้น (IDOR)
    // ในหลังบ้านไม่มีหน้าไหนเรียกใช้แล้ว จึงล็อกให้แอดมินที่ดูข้อมูลลูกค้าได้เท่านั้น
    await requireAdmin('users.customers');
    const app = await initAdmin();
    if (!app) {
        throw new Error('Firebase Admin not initialized');
    }

    const db = getFirestore(app);

    // 1. Fetch Cases (Chats)
    const chatsRef = db.collection('chats');

    // Use simple OR logic by fetching twice (admin SDK doesn't support 'OR' queries well yet in all versions, or simple merging is safer)
    // Actually, Admin SDK supports 'OR' in newer versions, but let's stick to safe separate queries merged.
    // Query by participants
    const participantsQuery = await chatsRef.where('participants', 'array-contains', userId).get();
    // Query by userId
    const userIdQuery = await chatsRef.where('userId', '==', userId).get();

    const chatDocs = new Map();
    participantsQuery.docs.forEach(doc => chatDocs.set(doc.id, doc));
    userIdQuery.docs.forEach(doc => chatDocs.set(doc.id, doc));

    const cases: Case[] = [];

    // Helper to get lawyer details
    // Optimization: Cache lawyer profiles to avoid repetitive fetches
    const lawyerCache = new Map();

    const getLawyerDetails = async (lawyerIdParam: string | undefined): Promise<any> => {
        if (!lawyerIdParam) return { id: 'unknown', name: 'Unknown Lawyer', imageUrl: '', imageHint: '' };
        if (lawyerCache.has(lawyerIdParam)) return lawyerCache.get(lawyerIdParam);

        let lawyerData = { id: lawyerIdParam, name: 'Unknown Lawyer', imageUrl: '', imageHint: '' };

        // Try lawyerProfiles first
        const lawyerDoc = await db.collection('lawyerProfiles').doc(lawyerIdParam).get();
        if (lawyerDoc.exists) {
            const d = lawyerDoc.data();
            lawyerData = {
                id: lawyerDoc.id,
                name: d?.name || 'Unknown Lawyer',
                imageUrl: d?.imageUrl || '',
                imageHint: d?.imageHint || ''
            };
        } else {
            // Fallback to users
            const userDoc = await db.collection('users').doc(lawyerIdParam).get();
            if (userDoc.exists) {
                const d = userDoc.data();
                lawyerData = {
                    id: userDoc.id,
                    name: d?.name || 'Unknown Lawyer',
                    imageUrl: '',
                    imageHint: ''
                };
            }
        }
        lawyerCache.set(lawyerIdParam, lawyerData);
        return lawyerData;
    };

    for (const doc of chatDocs.values()) {
        const data = doc.data();

        // Logic to find lawyerId (same as client-side)
        let lawyerId = data.lawyerId;
        if (!lawyerId && data.participants && Array.isArray(data.participants)) {
            lawyerId = data.participants.find((p: string) => p !== userId);
        }

        const lawyer = await getLawyerDetails(lawyerId);

        // Date handling: timestamps from Admin SDK need to be converted to Date or String
        const lastMessageAt = data.lastMessageAt instanceof Timestamp
            ? data.lastMessageAt.toDate().toISOString()
            : new Date().toISOString();

        const updatedAt = data.lastMessageAt instanceof Timestamp
            ? data.lastMessageAt.toDate()
            : (data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date());

        cases.push({
            id: doc.id,
            title: data.caseTitle || '',
            status: data.status || 'active',
            lastMessage: data.lastMessage || '',
            lastMessageTimestamp: lastMessageAt,
            lawyer: lawyer,
            updatedAt: updatedAt, // Note: Case type expects Date object, but for Client Component passing we might need serialization if direct. 
            // However, Next.js Server Actions can return Date objects which are serialized.
            rejectReason: data.rejectReason || '',
        });
    }

    // Sort cases by updated most recent
    cases.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // 2. Fetch Appointments
    const appointmentsRef = db.collection('appointments');
    const aptSnapshot = await appointmentsRef.where('userId', '==', userId).get();

    const appointments: UpcomingAppointment[] = [];
    for (const doc of aptSnapshot.docs) {
        const data = doc.data();
        const lawyer = await getLawyerDetails(data.lawyerId);

        // Filter future only
        const date = data.date instanceof Timestamp ? data.date.toDate() : new Date();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        if (date >= todayStart) {
            appointments.push({
                id: doc.id,
                date: date,
                time: data.timeSlot || 'N/A',
                description: data.description || '',
                lawyer: { name: lawyer.name, imageUrl: lawyer.imageUrl, imageHint: lawyer.imageHint },
                status: data.status || 'pending'
            });
        }
    }

    // 3. Fetch Tickets
    const ticketsRef = db.collection('tickets');
    const ticketSnapshot = await ticketsRef.where('userId', '==', userId).get();

    const tickets: ReportedTicket[] = ticketSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            caseId: data.caseId || '',
            lawyerId: data.lawyerId || '',
            caseTitle: data.caseTitle || '',
            problemType: data.problemType || '',
            status: data.status || 'pending',
            reportedAt: data.reportedAt instanceof Timestamp ? data.reportedAt.toDate() : new Date(),
        };
    });

    return { cases, appointments, tickets };
}
