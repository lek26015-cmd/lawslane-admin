/**
 * Lawslane → Lalin (LINE) แจ้งเตือนทันทีเมื่อมีข้อมูลใหม่ใน Firestore
 *
 * ทำงานกับทุกช่องทางที่สร้างเอกสาร (แอปลูกค้า, แอปทนาย, หลังบ้าน, webhook ชำระเงิน)
 * เพราะผูกที่ Firestore โดยตรง ไม่ต้องแก้โค้ดจุดที่สร้างข้อมูล
 *
 * ตั้งค่า (ครั้งเดียว):
 *   firebase functions:secrets:set LALIN_EVENT_SECRET   ← ค่าเดียวกับ LAWSLANE_EVENT_SECRET ใน Vercel ของ lalin-assistant
 */

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { ON_CREATE, ON_UPDATE, sendToLalin } from './events.js';

const LALIN_EVENT_SECRET = defineSecret('LALIN_EVENT_SECRET');
const LALIN_EVENT_URL = 'https://lalin-assistant.vercel.app/api/lawslane-event';

// Firestore (default) อยู่ us-central1 — trigger ต้องอยู่ region เดียวกัน
const OPTIONS = { region: 'us-central1', secrets: [LALIN_EVENT_SECRET], memory: '256MiB', maxInstances: 5, retry: false };

async function forward(collection, id, built) {
  if (!built) return;
  try {
    await sendToLalin({ url: LALIN_EVENT_URL, secret: LALIN_EVENT_SECRET.value(), payload: { ...built, id } });
    logger.info(`sent ${built.event} ${collection}/${id}`);
  } catch (e) {
    // แจ้งเตือนพลาดไม่ควรกระทบระบบหลัก — แค่ log ไว้
    logger.warn(`failed ${built.event} ${collection}/${id}: ${e.message}`);
  }
}

const created = (col) => onDocumentCreated({ ...OPTIONS, document: `${col}/{id}` }, async (event) => {
  await forward(col, event.params.id, ON_CREATE[col](event.data?.data() || {}));
});

const updated = (col) => onDocumentUpdated({ ...OPTIONS, document: `${col}/{id}` }, async (event) => {
  await forward(col, event.params.id, ON_UPDATE[col](event.data?.before?.data(), event.data?.after?.data()));
});

export const lalinNewUser = created('users');
export const lalinNewLawyer = created('lawyerProfiles');
export const lalinNewTicket = created('tickets');
export const lalinNewWithdrawal = created('withdrawals');
export const lalinNewAppointment = created('appointments');
export const lalinNewInterpreterBooking = created('interpreterBookings');
export const lalinNewRegistrationRequest = created('registrationRequests');
export const lalinNewContractRequest = created('contractRequests');
export const lalinNewSmeRequest = created('smeRequests');
export const lalinAppointmentSlip = updated('appointments');
export const lalinInterpreterSlip = updated('interpreterBookings');
export const lalinCapdealSlip = updated('cap-deals');
