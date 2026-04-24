'use server';

import { initAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { checkRateLimit } from '@/lib/security/rate-limiter';

import { cookies } from 'next/headers';

export async function getChatDetailsAction(chatId: string) {
    try {
        const adminApp = await initAdmin();
        if (!adminApp) return { success: false, error: 'Firebase Admin not initialized.' };
        const db = adminApp.firestore();

        // AUTH CHECK: Verify requester is a participant OR an admin
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session')?.value;
        if (!sessionCookie) return { success: false, error: 'Unauthorized: No session found.' };

        const decodedToken = await adminApp.auth().verifySessionCookie(sessionCookie);
        const requesterId = decodedToken.uid;
        const isRequesterAdmin = decodedToken.admin === true;

        const chatSnap = await db.collection('chats').doc(chatId).get();
        if (!chatSnap.exists) return { success: false, error: 'Chat not found.' };
        
        const data = chatSnap.data();
        if (!data) return { success: false, error: 'Chat data empty.' };
        
        const participants: string[] = data.participants || [];

        if (!participants.includes(requesterId) && !isRequesterAdmin) {
            console.warn(`[Security] Unauthorized access attempt to chat ${chatId} by user ${requesterId}`);
            return { success: false, error: 'Unauthorized access.' };
        }

        // REPAIR: Ensure lawyerId and clientId are in participants for real-time access
        const lawyerId = data.lawyerId;
        const clientIdFromData = data.clientId || data.userId;
        
        let needsRepair = false;
        if (lawyerId && !participants.includes(lawyerId)) {
            needsRepair = true;
            participants.push(lawyerId);
        }
        if (clientIdFromData && !participants.includes(clientIdFromData)) {
            needsRepair = true;
            participants.push(clientIdFromData);
        }

        if (needsRepair) {
            console.log(`[getChatDetailsAction] Repairing participants for chat ${chatId}`);
            await db.collection('chats').doc(chatId).update({
                participants: admin.firestore.FieldValue.arrayUnion(...participants)
            });
        }

        const clientId = clientIdFromData || participants.find(p => p !== lawyerId);
        
        let clientName = data.clientName || 'ลูกความ';
        
        if (clientId && (clientName === 'ลูกความ' || !clientName)) {
            try {
                // 1. Try Firestore users collection first
                const userDoc = await db.collection('users').doc(clientId).get();
                if (userDoc.exists && userDoc.data()?.name && userDoc.data()?.name !== 'ลูกความ') {
                    clientName = userDoc.data()?.name;
                } else {
                    // 2. Fallback to Firebase Auth (Admin SDK)
                    const userRecord = await adminApp.auth().getUser(clientId);
                    if (userRecord.displayName) {
                        clientName = userRecord.displayName;
                        // Auto-repair the Firestore doc if it exists but has a generic name
                        if (userDoc.exists) {
                            await db.collection('users').doc(clientId).update({ name: clientName });
                        } else {
                            await db.collection('users').doc(clientId).set({
                                uid: clientId,
                                name: clientName,
                                email: userRecord.email,
                                role: 'customer',
                                status: 'active',
                                createdAt: admin.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    }
                }
            } catch (err) {
                console.warn(`[getChatDetailsAction] Auth lookup failed for ${clientId}:`, err);
            }
        }

        return {
            success: true,
            isRequesterAdmin,
            data: JSON.parse(JSON.stringify({
                id: chatSnap.id,
                ...data,
                clientName, // Return the recovered name
                createdAt: data?.createdAt?.toDate(),
                lastMessageAt: data?.lastMessageAt?.toDate()
            }))
        };
    } catch (error: any) {
        console.error("Error fetching chat details action:", error);
        return { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' };
    }
}

/**
 * Ensures a chat document exists between two participants.
 */
export async function ensureChatExistsAction(chatId: string, participants: string[], caseTitle: string = 'คดี: มรดก') {
    try {
        const adminApp = await initAdmin();
        if (!adminApp) return { success: false, error: 'Firebase Admin not initialized.' };
        const db = adminApp.firestore();

        const chatRef = db.collection('chats').doc(chatId);
        const chatSnap = await chatRef.get();

        if (!chatSnap.exists) {
            // NEW: Try to populate names from Auth immediately upon creation
            let clientName = 'ลูกความ';
            const clientId = participants.find(p => p.length > 20); // Basic heuristic for UID vs potential other IDs
            
            if (clientId) {
                try {
                    const userRecord = await adminApp.auth().getUser(clientId);
                    if (userRecord.displayName) clientName = userRecord.displayName;
                } catch (e) {}
            }

            await chatRef.set({
                participants,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                caseTitle,
                clientName,
                status: 'active'
            });
        } else {
            const data = chatSnap.data();
            const existingParticipants = data?.participants || [];
            
            // Check if participants list needs repair
            const missingParticipants = participants.filter(p => !existingParticipants.includes(p));
            if (missingParticipants.length > 0) {
                await chatRef.update({
                    participants: admin.firestore.FieldValue.arrayUnion(...missingParticipants)
                });
            }
        }
        return { success: true };
    } catch (error: any) {
        console.error("Error ensuring chat exists action:", error);
        return { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' };
    }
}

export async function sendChatMessageAction(params: {
    chatId: string,
    text: string,
    senderId: string,
    senderName: string,
    recipientId: string,
    isLawyerView: boolean,
    authToken?: string,
    skipMessageSave?: boolean,
    metadata?: any
}) {
    try {
        const adminApp = await initAdmin();
        if (!adminApp) return { success: false, error: 'Firebase Admin not initialized.' };
        const db = adminApp.firestore();

        const { chatId, text, senderId, senderName, recipientId, isLawyerView, authToken, skipMessageSave, metadata } = params;

        // 0. Auth Verification — verify the caller is who they claim to be
        if (authToken) {
            try {
                const decodedToken = await adminApp.auth().verifyIdToken(authToken);
                if (decodedToken.uid !== senderId) {
                    console.error(`[Auth] Token UID mismatch: token=${decodedToken.uid}, senderId=${senderId}`);
                    return { success: false, error: 'Unauthorized: sender identity mismatch.' };
                }
            } catch (authErr: any) {
                console.error('[Auth] Token verification failed:', authErr.message);
                return { success: false, error: 'Unauthorized: invalid auth token.' };
            }
        } else {
            // No token provided — verify senderId is a participant of the chat as a weaker guard
            const chatSnap = await db.collection('chats').doc(chatId).get();
            if (!chatSnap.exists) return { success: false, error: 'Chat not found.' };
            const participants: string[] = chatSnap.data()?.participants || [];
            if (!participants.includes(senderId)) {
                console.error(`[Auth] senderId ${senderId} is not a participant of chat ${chatId}`);
                return { success: false, error: 'Unauthorized: not a participant of this chat.' };
            }
        }

        // 1. Rate Limiting Protection (10 messages per 5 seconds)
        const rateCheck = await checkRateLimit(senderId, 10, 5000);
        if (!rateCheck.success) {
            return { success: false, error: 'ส่งข้อความบ่อยเกินไป กรุณารอสักครู่ (Rate limit exceeded)' };
        }

        const batch = db.batch();

        // 2. Add message to subcollection if not skipped
        if (!skipMessageSave) {
            const messageRef = db.collection('chats').doc(chatId).collection('messages').doc();
            batch.set(messageRef, {
                text,
                senderId,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                metadata: metadata || null
            });
        }

        // 3. Update parent chat metadata
        //    FIX: When sender writes, clear the RECIPIENT's ReadAt field so UI won't show stale "Read" status.
        const chatRef = db.collection('chats').doc(chatId);
        batch.update(chatRef, {
            lastMessage: text,
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
            hasNewMessage: !isLawyerView,
            ...(isLawyerView
                ? {
                    lawyerReadAt: admin.firestore.FieldValue.serverTimestamp(),
                    lawyerReadStatus: 'read',
                    // Clear client's read status so UI shows "unread" for the new message
                    clientReadAt: admin.firestore.FieldValue.delete(),
                    clientReadStatus: 'unread',
                  }
                : {
                    clientReadAt: admin.firestore.FieldValue.serverTimestamp(),
                    clientReadStatus: 'read',
                    // Clear lawyer's read status so UI shows "unread" for the new message
                    lawyerReadAt: admin.firestore.FieldValue.delete(),
                    lawyerReadStatus: 'unread',
                  }
            )
        });

        // 4. Create In-App Notification
        // Link logic: If lawyer sends -> Client clicks (goes to client view). If client sends -> Lawyer clicks (goes to lawyer view).
        let notificationLink = `/chat/${chatId}`;
        if (isLawyerView) {
             // Notification for client
             notificationLink = `/chat/${chatId}`; 
        } else {
             // Notification for lawyer
             notificationLink = `/chat/${chatId}?view=lawyer`;
        }

        const notificationRef = db.collection('notifications').doc();
        batch.set(notificationRef, {
            type: metadata?.type === 'file_upload' ? 'file_upload' : 'chat_message',
            title: metadata?.type === 'file_upload' ? `เอกสารใหม่จาก ${senderName}` : `ข้อความใหม่จาก ${senderName}`,
            message: text.length > 50 ? text.substring(0, 50) + '...' : text,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
            recipient: recipientId,
            link: notificationLink,
            relatedId: chatId,
            metadata: metadata || null
        });

        await batch.commit();

        // 5. Trigger Real-time Notification (Email/Push)
        // Background process: we want to start this but not let it block the core success if it's slow
        try {
            const now = Date.now();
            const ACTIVE_THRESHOLD_MS = 120 * 1000; // Increased to 2 minutes for better UX

            if (!isLawyerView) {
                // Client sending to Lawyer
                let lawyerEmail = '';
                let lawyerName = '';
                
                // 1. Try lawyerProfiles first
                const lawyerDoc = await db.collection('lawyerProfiles').doc(recipientId).get();
                if (lawyerDoc.exists) {
                    const data = lawyerDoc.data() || {};
                    lawyerEmail = data.email;
                    lawyerName = data.name || 'ทนายความ';
                }
                
                // 2. Fallback to users collection if email is missing (sometimes profile is incomplete)
                if (!lawyerEmail) {
                    const userDoc = await db.collection('users').doc(recipientId).get();
                    if (userDoc.exists) {
                        const data = userDoc.data() || {};
                        lawyerEmail = data.email;
                        if (!lawyerName) lawyerName = data.name || 'ทนายความ';
                    }
                }

                if (lawyerEmail) {
                    const chatDoc = await db.collection('chats').doc(chatId).get();
                    const chatData = chatDoc.data();
                    
                    // Presence check: check both LastSeenAt and lawyerReadAt
                    const lawyerSeenAt = chatData?.lawyerLastSeenAt?.toDate()?.getTime() || 0;
                    const lawyerReadAt = chatData?.lawyerReadAt?.toDate()?.getTime() || 0;
                    const lastActive = Math.max(lawyerSeenAt, lawyerReadAt);
                    
                    const isActive = (now - lastActive) < ACTIVE_THRESHOLD_MS;
                    
                    // Only notify if they haven't been active recently
                    if (!isActive) {
                        const { NotificationService } = await import('@/services/notification-service');
                        await NotificationService.notifyLawyerNewChat({
                            lawyerId: recipientId,
                            lawyerName: lawyerName,
                            lawyerEmail: lawyerEmail,
                            clientName: senderName,
                            messageSnippet: text.substring(0, 100),
                            chatId
                        });
                    }
                } else {
                    console.warn(`[Notification] Skipping email to lawyer ${recipientId}: No email found in profiles or users.`);
                }
            } else {
                // Lawyer sending to Client
                let clientEmail = '';
                let clientName = '';
                
                const clientDoc = await db.collection('users').doc(recipientId).get();
                if (clientDoc.exists) {
                    const clientData = clientDoc.data() || {};
                    clientEmail = clientData.email;
                    clientName = clientData.name || 'ลูกความ';
                }
                
                if (clientEmail) {
                    const chatDoc = await db.collection('chats').doc(chatId).get();
                    const chatData = chatDoc.data();
                    
                    const clientSeenAt = chatData?.clientLastSeenAt?.toDate()?.getTime() || 0;
                    const clientReadAt = chatData?.clientReadAt?.toDate()?.getTime() || 0;
                    const lastActive = Math.max(clientSeenAt, clientReadAt);
                    
                    const isActive = (now - lastActive) < ACTIVE_THRESHOLD_MS;
                    if (!isActive) {
                        const { NotificationService } = await import('@/services/notification-service');
                        await NotificationService.notifyClientNewChat({
                            clientId: recipientId,
                            clientName: clientName,
                            clientEmail: clientEmail,
                            lawyerName: senderName,
                            messageSnippet: text.substring(0, 100),
                            chatId
                        });
                    }
                }
            }
        } catch (notifyErr) {
            console.error("Non-blocking notification error:", notifyErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error sending chat message action:", error);
        return { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' };
    }
}

/**
 * Marks a chat as read by both lawyer or client.
 */
export async function markChatAsReadAction(chatId: string, isLawyerView: boolean = true) {
    try {
        const adminApp = await initAdmin();
        if (!adminApp) return { success: false, error: 'Firebase Admin not initialized.' };
        const db = adminApp.firestore();

        const updateData: any = {};
        if (isLawyerView) {
            updateData.lawyerReadAt = admin.firestore.FieldValue.serverTimestamp();
            updateData.lawyerLastSeenAt = admin.firestore.FieldValue.serverTimestamp(); // Track presence
            updateData.lawyerReadStatus = 'read';
            updateData.hasNewMessage = false;
        } else {
            updateData.clientReadAt = admin.firestore.FieldValue.serverTimestamp();
            updateData.clientLastSeenAt = admin.firestore.FieldValue.serverTimestamp(); // Track presence
            updateData.clientReadStatus = 'read';
        }

        await db.collection('chats').doc(chatId).update(updateData);
        return { success: true };
    } catch (error: any) {
        console.error("Error marking chat as read action:", error);
        return { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' };
    }
}

/**
 * Handles a lawyer's request for a case opening fee.
 */
export async function requestFeeAction(params: {
    chatId: string;
    lawyerId: string;
    lawyerName: string;
    amount: number;
    reason: string;
}) {
    try {
        const adminApp = await initAdmin();
        if (!adminApp) return { success: false, error: 'Firebase Admin not initialized.' };
        const db = adminApp.firestore();

        const { chatId, lawyerId, lawyerName, amount, reason } = params;

        const chatRef = db.collection('chats').doc(chatId);
        const chatSnap = await chatRef.get();
        if (!chatSnap.exists) return { success: false, error: 'Chat not found' };

        const chatData = chatSnap.data();
        const clientId = chatData?.participants?.find((p: string) => p !== lawyerId) || chatData?.userId || chatData?.clientId;

        if (!clientId) return { success: false, error: 'Client not found for this chat' };

        // 1. Update Firestore
        await chatRef.update({
            pendingFeeRequest: {
                amount,
                reason,
                requestedAt: admin.firestore.FieldValue.serverTimestamp()
            },
            lastMessage: `[PROPOSAL] ทนายขอเสนอนัดหมาย/เปิดเคส: ฿${amount.toLocaleString()}`,
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Add System Message to Chat
        const messagesRef = chatRef.collection('messages');
        const newMessageRef = messagesRef.doc();
        await newMessageRef.set({
            chatId: chatId,
            text: `📋 **แจ้งชำระค่าบริการ:** ฿${amount.toLocaleString()}\nรายละเอียด: ${reason}\nกรุณาตรวจสอบและชำระเงิน`,
            senderId: lawyerId,
            senderName: lawyerName,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            type: 'case_proposal',
            metadata: {
                caseTitle: reason,
                amount: amount,
                isManualCase: false 
            }
        });

        // 3. Create In-App Notification
        const notificationRef = db.collection('notifications').doc();
        await notificationRef.set({
            type: 'payment',
            title: `แจ้งชำระค่าบริการ`,
            message: `ทนายความแจ้งชำระค่าบริการ จำนวน ฿${amount.toLocaleString()} - ${reason}`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
            recipient: clientId,
            link: `/payment?chatId=${chatId}&type=consultation`,
            relatedId: chatId
        });

        // 4. Trigger Email Notification
        try {
            const clientDoc = await db.collection('users').doc(clientId).get();
            if (clientDoc.exists) {
                const clientData = clientDoc.data();
                if (clientData?.email) {
                    const { NotificationService } = await import('@/services/notification-service');
                    await NotificationService.notifyClientFeeRequested({
                        clientName: clientData.name || 'ลูกความ',
                        clientEmail: clientData.email,
                        lawyerName,
                        amount,
                        reason,
                        chatId
                    });
                }
            }
        } catch (notifyErr) {
            console.error("Async client fee notification error:", notifyErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error in requestFeeAction:", error);
        return { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' };
    }
}

/**
 * Sends email notifications after a payment is completed.
 * Called from the client-side payment page.
 */
export async function notifyPaymentCompletedAction(params: {
    chatId: string;
    lawyerId: string;
    amount: number;
    caseTitle: string;
    payerName: string;
    isAutoApproved: boolean;
    skipAdminNotification?: boolean;
}) {
    try {
        const adminApp = await initAdmin();
        if (!adminApp) return { success: false, error: 'Firebase Admin not initialized.' };
        const db = adminApp.firestore();

        const { chatId, lawyerId, amount, caseTitle, payerName, isAutoApproved, skipAdminNotification } = params;

        // Fetch lawyer info
        const lawyerDoc = await db.collection('lawyerProfiles').doc(lawyerId).get();
        const lawyerData = lawyerDoc.exists ? lawyerDoc.data() : null;
        const lawyerEmail = lawyerData?.email;
        const lawyerName = lawyerData?.name || 'ทนายความ';

        // Fetch client info from chat
        const chatDoc = await db.collection('chats').doc(chatId).get();
        const chatData = chatDoc.exists ? chatDoc.data() : null;
        const clientId = chatData?.clientId || chatData?.userId;
        let clientEmail = '';
        let clientName = payerName;

        if (clientId) {
            const clientDoc = await db.collection('users').doc(clientId).get();
            if (clientDoc.exists) {
                const cd = clientDoc.data();
                clientEmail = cd?.email || '';
                clientName = cd?.name || payerName;
            }
        }

        const { NotificationService } = await import('@/services/notification-service');

        // Notify lawyer
        if (lawyerEmail) {
            console.log(`[notifyPaymentCompletedAction] Sending email to lawyer: ${lawyerEmail}`);
            await NotificationService.notifyPaymentReceived({
                lawyerName,
                lawyerEmail,
                clientName,
                amount,
                caseTitle: caseTitle || chatData?.caseTitle || 'เคส',
                chatId,
                isAutoApproved,
            });
        } else {
            console.warn(`[notifyPaymentCompletedAction] No lawyer email found for lawyerId: ${lawyerId}`);
        }

        // Confirm to client
        if (clientEmail) {
            console.log(`[notifyPaymentCompletedAction] Sending email to client: ${clientEmail}`);
            await NotificationService.notifyClientPaymentConfirmation({
                clientName,
                clientEmail,
                lawyerName,
                amount,
                caseTitle: caseTitle || chatData?.caseTitle || 'เคส',
                chatId,
                isAutoApproved,
            });
        }

        // Notify Admin only if not skipped
        if (!skipAdminNotification) {
            console.log(`[notifyPaymentCompletedAction] Sending email to admins`);
            await NotificationService.notifyAdminPaymentReceived({
                lawyerName,
                clientName,
                amount,
                caseTitle: caseTitle || chatData?.caseTitle || 'เคส',
                chatId,
                isAutoApproved,
            });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error in notifyPaymentCompletedAction:", error);
        return { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' };
    }
}


/**
 * Atomically marks a single installment as paid within a chat document.
 * - Updates the installment's status, paidAt, and slipUrl
 * - Recalculates paidInstallments count and totalPaid sum
 * - Sets the chat status to 'active' if this is the first installment paid
 */
export async function markInstallmentPaidAction(params: {
    chatId: string;
    installmentIndex: number;
    slipUrl: string;
    slipOkData: any;
    amount: number;
    payerName?: string;
}) {
    try {
        const adminApp = await initAdmin();
        if (!adminApp) return { success: false, error: 'Firebase Admin not initialized.' };
        const db = adminApp.firestore();

        const chatRef = db.collection('chats').doc(params.chatId);
        const chatSnap = await chatRef.get();

        if (!chatSnap.exists) {
            return { success: false, error: 'ไม่พบห้องแชทนี้ในระบบ' };
        }

        const chatData = chatSnap.data()!;
        const installments = chatData.installments || [];

        // Validate index
        if (params.installmentIndex < 0 || params.installmentIndex >= installments.length) {
            return { success: false, error: 'หมายเลขงวดไม่ถูกต้อง' };
        }

        const targetInstallment = installments[params.installmentIndex];

        // Check if already paid
        if (targetInstallment.status === 'paid') {
            return { success: false, error: 'งวดนี้ได้รับการชำระเงินแล้ว' };
        }

        // Enforce sequential payment: all previous installments must be paid
        for (let i = 0; i < params.installmentIndex; i++) {
            if (installments[i].status !== 'paid') {
                return { success: false, error: `กรุณาชำระงวดที่ ${i + 1} ก่อน` };
            }
        }

        // Update the specific installment
        installments[params.installmentIndex] = {
            ...targetInstallment,
            status: 'paid',
            paidAt: new Date().toISOString(),
            slipUrl: params.slipUrl,
            slipOkData: params.slipOkData || null,
        };

        // Recalculate totals
        const paidInstallments = installments.filter((inst: any) => inst.status === 'paid').length;
        const totalPaid = installments
            .filter((inst: any) => inst.status === 'paid')
            .reduce((sum: number, inst: any) => {
                const amt = parseFloat(String(inst.amount).replace(/,/g, ''));
                return sum + (isNaN(amt) ? 0 : amt);
            }, 0);
        const allPaid = paidInstallments === installments.length;
        const isFirstPayment = paidInstallments === 1;

        // Build the update payload
        const updatePayload: any = {
            installments,
            paidInstallments,
            totalPaid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // First installment paid → activate the case
        if (isFirstPayment) {
            updatePayload.status = 'active';
            updatePayload.paidAt = admin.firestore.FieldValue.serverTimestamp();
            updatePayload.lastMessage = `✅ ลูกความชำระเงินงวดที่ 1 เรียบร้อยแล้ว (฿${params.amount.toLocaleString()})`;
            updatePayload.lastMessageAt = admin.firestore.FieldValue.serverTimestamp();
        } else {
            updatePayload.lastMessage = `✅ ลูกความชำระเงินงวดที่ ${params.installmentIndex + 1} เรียบร้อยแล้ว (฿${params.amount.toLocaleString()})`;
            updatePayload.lastMessageAt = admin.firestore.FieldValue.serverTimestamp();
        }

        if (allPaid) {
            updatePayload.lastMessage = `🎉 ลูกความชำระเงินครบทุกงวดแล้ว (฿${totalPaid.toLocaleString()})`;
        }

        // If SlipOK auto-verified, add flag
        if (params.slipOkData) {
            updatePayload.hasNewPayment = false;
        } else {
            updatePayload.hasNewPayment = true; // Needs admin review
        }

        // Store per-installment payment details for admin audit
        updatePayload[`pendingPaymentDetails_installment_${params.installmentIndex}`] = {
            amount: params.amount,
            slipUrl: params.slipUrl,
            slipOkData: params.slipOkData || null,
            type: 'installment',
            installmentIndex: params.installmentIndex,
            submittedAt: new Date().toISOString(),
        };

        await chatRef.update(updatePayload);

        return {
            success: true,
            paidInstallments,
            totalPaid,
            allPaid,
            isFirstPayment,
        };
    } catch (error: any) {
        console.error("Error in markInstallmentPaidAction:", error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกการชำระเงิน กรุณาลองใหม่อีกครั้ง' };
    }
}

/**
 * Removes a file from the chat's files array.
 */
export async function deleteFileAction(chatId: string, fileUrl: string) {
    try {
        const adminApp = await initAdmin();
        if (!adminApp) return { success: false, error: 'Firebase Admin not initialized.' };
        const db = adminApp.firestore();

        const chatRef = db.collection('chats').doc(chatId);
        const chatSnap = await chatRef.get();

        if (!chatSnap.exists) {
            return { success: false, error: 'ไม่พบห้องแชท' };
        }

        const data = chatSnap.data();
        const files = data?.files || [];
        const fileToRemove = files.find((f: any) => f.url === fileUrl);

        if (fileToRemove) {
            await chatRef.update({
                files: admin.firestore.FieldValue.arrayRemove(fileToRemove),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error in deleteFileAction:", error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการลบไฟล์' };
    }
}

/**
 * Sends a test email via NotificationService.
 */
export async function sendEmailAction(chatId: string, to: string, subject: string) {
    try {
        const { NotificationService } = await import('@/services/notification-service');
        const res = await NotificationService.sendEmail(to, subject, `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #2563eb;">Lawslane Notification Test</h2>
                <p>อีเมลฉบับนี้เป็นการทดสอบระบบแจ้งเตือนจากห้องแชท ID: <b>\${chatId}</b></p>
                <p>หากท่านได้รับข้อความนี้ แสดงว่าระบบการส่งอีเมลของ Lawslane ทำงานได้ปกติครับ</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #666;">ส่งเมื่อ: \${new Date().toLocaleString('th-TH')}</p>
            </div>
        `);
        return res;
    } catch (error: any) {
        console.error("Error in sendEmailAction:", error);
        return { success: false, error: error.message };
    }
}
