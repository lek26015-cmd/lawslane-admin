/** ป้ายสถานะค่าทนาย (lawyerPayments) สำหรับหน้าหลังบ้าน — ใช้ได้ทั้ง client/server */
export function lawyerPaymentStatusLabel(p: { status: string; payoutStatus: string }): string {
    if (p.status === 'pending_review') return 'สลิปรอตรวจ';
    if (p.status === 'rejected') return 'สลิปไม่ผ่าน';
    if (p.status === 'refund_pending') return 'รอคืนเงินลูกความ';
    if (p.status === 'refunded') return 'คืนเงินแล้ว';
    if (p.payoutStatus === 'held') return 'ชำระแล้ว · รอปิดเคส';
    if (p.payoutStatus === 'due') return 'รอโอนให้ทนาย';
    if (p.payoutStatus === 'paid') return 'โอนให้ทนายแล้ว';
    return p.status || '—';
}
