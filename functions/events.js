/**
 * แปลงเอกสาร Firestore ที่เพิ่งสร้าง/เปลี่ยน → payload ที่ส่งให้ Lalin
 * ส่งเฉพาะฟิลด์ที่ข้อความแจ้งเตือนใช้ (ไม่ส่งเลขบัญชี/เบอร์โทร/เอกสารแนบ ออกนอกระบบ)
 */

const pick = (obj, keys) => Object.fromEntries(keys.filter(k => obj?.[k] !== undefined && obj?.[k] !== null).map(k => [k, obj[k]]));

function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

function thaiLabel(v, withTime = false) {
  const d = toDate(v);
  if (!d) return undefined;
  return d.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/** collection → (data) => { event, data } | null  (สำหรับเอกสารใหม่) */
export const ON_CREATE = {
  users: (d) => (d.role === 'customer' || !d.role) ? { event: 'new_user', data: pick(d, ['name', 'type']) } : null,
  lawyerProfiles: (d) => ({ event: 'new_lawyer', data: pick(d, ['name', 'licenseNumber']) }),
  tickets: (d) => ({ event: 'new_ticket', data: { ...pick(d, ['problemType', 'clientName']), description: (d.description || '').slice(0, 200) } }),
  withdrawals: (d) => ({ event: 'new_withdrawal', data: pick(d, ['amount', 'lawyerName']) }),
  appointments: (d) => ({ event: 'new_appointment', data: { ...pick(d, ['timeSlot']), dateLabel: thaiLabel(d.date), description: (d.description || '').slice(0, 120) } }),
  interpreterBookings: (d) => ({ event: 'new_interpreter_booking', data: { ...pick(d, ['interpreterName', 'serviceType']), startLabel: thaiLabel(d.startAt, true) } }),
  registrationRequests: (d) => ({ event: 'new_registration_request', data: pick(d, ['companyName', 'registrationType', 'contactName']) }),
  contractRequests: (d) => ({ event: 'new_contract_request', data: pick(d, ['name', 'serviceType']) }),
  smeRequests: (d) => ({ event: 'new_sme_request', data: pick(d, ['name', 'serviceType']) }),
};

/** collection → (before, after) => { event, data } | null  (สลิปใหม่รอตรวจ) */
export const ON_UPDATE = {
  appointments: (b, a) => (b?.status !== 'pending_payment' && a?.status === 'pending_payment')
    ? { event: 'new_payment_slip', data: { kind: 'นัดหมายทนาย' } } : null,
  interpreterBookings: (b, a) => (!b?.hasNewPayment && a?.hasNewPayment === true)
    ? { event: 'new_payment_slip', data: { kind: 'จองล่าม' } } : null,
  'cap-deals': (b, a) => (!b?.hasNewPayment && a?.hasNewPayment === true)
    ? { event: 'new_payment_slip', data: { kind: 'CapDeal' } } : null,
};

export async function sendToLalin({ url, secret, payload, fetchImpl = fetch }) {
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-lalin-secret': secret },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Lalin responded ${res.status}`);
}
