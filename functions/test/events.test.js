import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ON_CREATE, ON_UPDATE, sendToLalin } from '../events.js';

test('ไม่ส่งข้อมูลอ่อนไหว (เลขบัญชี/เบอร์) ออกไป', () => {
  const w = ON_CREATE.withdrawals({ amount: 5000, lawyerName: 'ก', accountNumber: '123', bankName: 'KBank' });
  assert.deepEqual(w, { event: 'new_withdrawal', data: { amount: 5000, lawyerName: 'ก' } });
  const l = ON_CREATE.lawyerProfiles({ name: 'ข', licenseNumber: '9', phone: '08', idCardUrl: 'x' });
  assert.deepEqual(l.data, { name: 'ข', licenseNumber: '9' });
});

test('ผู้ใช้ใหม่แจ้งเฉพาะลูกค้า (ทนายแจ้งผ่าน lawyerProfiles แล้ว)', () => {
  assert.equal(ON_CREATE.users({ role: 'lawyer', name: 'x' }), null);
  assert.equal(ON_CREATE.users({ role: 'customer', name: 'x' }).event, 'new_user');
});

test('สลิปแจ้งเฉพาะตอนเปลี่ยนเข้าสถานะรอตรวจ', () => {
  assert.equal(ON_UPDATE.appointments({ status: 'pending' }, { status: 'pending_payment' }).event, 'new_payment_slip');
  assert.equal(ON_UPDATE.appointments({ status: 'pending_payment' }, { status: 'pending_payment' }), null);
  assert.equal(ON_UPDATE.interpreterBookings({ hasNewPayment: true }, { hasNewPayment: true }), null);
  assert.equal(ON_UPDATE['cap-deals']({}, { hasNewPayment: true }).data.kind, 'CapDeal');
});

test('ส่งพร้อม secret header', async () => {
  let seen;
  await sendToLalin({ url: 'https://x/y', secret: 's', payload: { event: 'e' }, fetchImpl: async (u, o) => { seen = { u, o }; return { ok: true }; } });
  assert.equal(seen.o.headers['x-lalin-secret'], 's');
  await assert.rejects(sendToLalin({ url: 'u', secret: 's', payload: {}, fetchImpl: async () => ({ ok: false, status: 401 }) }), /401/);
});
