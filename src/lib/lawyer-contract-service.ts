import 'server-only';
import * as admin from 'firebase-admin';

/**
 * Creates a Capdeal contract document and posts a system message to the chat.
 * 
 * เรียกเมื่อค่าทนายก้อนแรกของเคสชำระแล้ว
 * (สำเนาจาก Lawslane/src/lib/contract-service.ts — เรียกตอนแอดมินยืนยันสลิปค่าทนายก้อนแรก แก้ฝั่งใดต้องแก้อีกฝั่งด้วย)
 */
export async function createContractFromChat(
    db: admin.firestore.Firestore,
    params: {
        chatId: string;
        chatData: any;
        amount: number;
        messagesRef?: admin.firestore.CollectionReference;
    }
) {
    const { chatId, chatData, amount } = params;

    const lawyerId = chatData.lawyerId ||
        chatData.participants?.find((p: string) => p !== (chatData.clientId || chatData.userId));
    const clientId = chatData.clientId || chatData.userId;

    // Fetch names for the contract document
    let clientName = 'ลูกความ';
    let lawyerName = 'ทนายความ';
    try {
        if (clientId) {
            const cDoc = await db.collection('users').doc(clientId).get();
            if (cDoc.exists) clientName = cDoc.data()?.name || clientName;
        }
        if (lawyerId) {
            const lDoc = await db.collection('lawyerProfiles').doc(lawyerId).get();
            if (lDoc.exists) lawyerName = lDoc.data()?.name || lawyerName;
        }
    } catch (_) {}

    // Create contract document
    const contractRef = db.collection('contracts').doc();
    const contractId = contractRef.id;

    await contractRef.set({
        userId: clientId || '',
        lawyerId: lawyerId || '',
        chatId,
        title: chatData.caseTitle || chatData.title || 'สัญญาจ้างทนายความ',
        task: chatData.caseTitle || chatData.title || 'การดำเนินคดีทางกฎหมาย',
        description: chatData.description || '',
        price: chatData.amount || amount,
        installments: chatData.installments || [],
        clientName,
        lawyerName,
        clientInfo: chatData.clientInfo || null,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Post system message
    const messagesRef = params.messagesRef || db.collection('chats').doc(chatId).collection('messages');
    const numInstallments = chatData.installments?.length || 0;
    const totalAmount = chatData.amount || amount || 0;

    await messagesRef.add({
        chatId,
        text: `📄 **สัญญาจ้างทนายความ (ฉบับทางการ)**\n\nระบบได้ออกสัญญาจ้างทนายความอิเล็กทรอนิกส์ให้คุณแล้ว ทั้งทนายความและลูกความสามารถตรวจสอบรายละเอียดและลงนามแบบดิจิทัลได้ที่ลิงก์ด้านล่าง:\n\n**รายละเอียดสัญญา:**\n- หัวข้อ: Ticket สนทนา: ${chatData.caseTitle || chatData.title || ''}\n- ยอดรวม: ฿${totalAmount.toLocaleString()}${numInstallments > 0 ? `\n- จำนวนงวด: ${numInstallments} งวด` : ''}\n\n*หมายเหตุ: สัญญานี้มีผลผูกพันตามกฎหมายหลังจากทั้งสองฝ่ายลงนามแล้ว*`,
        senderId: 'system',
        senderName: 'System',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'capdeal_contract',
        metadata: { contractId }
    });

    return contractId;
}
