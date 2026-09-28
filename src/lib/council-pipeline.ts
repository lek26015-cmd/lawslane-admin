import 'server-only';
import { fetchImageBase64, fetchLicenseAnnouncements } from '@/lib/lawyers-council';
import { extractLawyersFromImageData, importLawyersCore, type ImportResult } from '@/lib/registry-core';

/**
 * ระบบดึงประกาศรับใบอนุญาตทนายความจากสภาทนายความ
 *
 *   sync    → หาโพสต์ใหม่ เก็บเป็น registrySources/{postId} (รูปทุกใบสถานะ pending)
 *   process → อ่านรูปทีละใบด้วย Gemini → registrySources/{postId}/rows (รอแอดมินตรวจ)
 *   import  → แอดมินกดนำเข้าหลังตรวจแล้วเท่านั้น → verifiedLawyers (status announced + ลิงก์ต้นฉบับ)
 *
 * ทุก collection ในนี้อ่าน/เขียนผ่าน Admin SDK เท่านั้น (rules catch-all ปิดไว้)
 * ห้ามนำเข้าอัตโนมัติ — cron ทำแค่ sync + process
 */

export const SOURCES = 'registrySources';

export type ImageStatus = 'pending' | 'done' | 'failed';
export type SourceStatus = 'new' | 'extracting' | 'ready' | 'imported';

export interface SourceImage {
    url: string;
    status: ImageStatus;
    rowCount: number;
    error?: string;
}

export interface CouncilSource {
    postId: string;
    title: string;
    link: string;
    publishedAt: string;
    pdfCount: number;
    images: SourceImage[];
    status: SourceStatus;
    rowCount: number;
    importResult?: ImportResult;
    importedAt?: string;
}

export interface SourceRow {
    id: string;
    imageIndex: number;
    prefix: string;
    firstName: string;
    lastName: string;
    licenseNumber: string;
    licenseType: string;
    announcementDate: string;
    excluded: boolean;
}

function thaiDate(iso: string): string {
    return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' });
}

function summarize(images: SourceImage[], current: SourceStatus): Pick<CouncilSource, 'status' | 'rowCount'> {
    const rowCount = images.reduce((n, i) => n + (i.rowCount || 0), 0);
    if (current === 'imported') return { status: 'imported', rowCount };
    const pending = images.filter((i) => i.status === 'pending').length;
    const status: SourceStatus = pending === images.length ? 'new' : pending > 0 ? 'extracting' : 'ready';
    return { status, rowCount };
}

/** หาประกาศใหม่ — ของที่มีอยู่แล้วไม่แตะ (ไม่ทับความคืบหน้า) */
export async function syncCouncilSources(db: FirebaseFirestore.Firestore): Promise<{ added: number; total: number }> {
    const announcements = await fetchLicenseAnnouncements();
    let added = 0;
    for (const a of announcements) {
        const ref = db.collection(SOURCES).doc(a.postId);
        const snap = await ref.get();
        if (snap.exists) continue;
        const images: SourceImage[] = a.images.map((url) => ({ url, status: 'pending', rowCount: 0 }));
        await ref.set({
            ...a,
            images,
            status: images.length ? 'new' : 'ready',
            rowCount: 0,
            createdAt: new Date().toISOString(),
        });
        added++;
    }
    return { added, total: announcements.length };
}

/** อ่านรูปใบที่ index ของประกาศ — รันซ้ำได้ (ลบแถวเดิมของรูปนั้นก่อน) */
export async function processSourceImage(
    db: FirebaseFirestore.Firestore,
    postId: string,
    index: number,
): Promise<SourceImage> {
    const ref = db.collection(SOURCES).doc(postId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('ไม่พบประกาศนี้');
    const source = snap.data() as CouncilSource;
    if (source.status === 'imported') throw new Error('ประกาศนี้นำเข้าแล้ว');
    const image = source.images[index];
    if (!image) throw new Error('ไม่พบรูปนี้');

    let updated: SourceImage;
    try {
        const { base64, mimeType } = await fetchImageBase64(image.url);
        const lawyers = await extractLawyersFromImageData(base64, mimeType);

        const rowsCol = ref.collection('rows');
        const old = await rowsCol.where('imageIndex', '==', index).get();
        const batch = db.batch();
        old.docs.forEach((d) => batch.delete(d.ref));
        const fallbackDate = thaiDate(source.publishedAt);
        for (const l of lawyers) {
            if (!l.firstName || !l.lastName) continue;
            batch.set(rowsCol.doc(), {
                imageIndex: index,
                prefix: l.prefix || '',
                firstName: l.firstName,
                lastName: l.lastName,
                // registry-core ล้างเลขทิ้งแล้วถ้าเอกสารไม่มีคอลัมน์เลข — ประกาศพวกนี้ไม่มีเลข จึงเป็น '' เสมอ
                licenseNumber: l.licenseNumber || '',
                licenseType: l.licenseType || '',
                announcementDate: l.announcementDate || fallbackDate,
                excluded: false,
            });
        }
        await batch.commit();
        updated = { url: image.url, status: 'done', rowCount: lawyers.filter((l) => l.firstName && l.lastName).length };
    } catch (err: any) {
        console.error('[council] process image failed', postId, index, err?.message);
        updated = { url: image.url, status: 'failed', rowCount: 0, error: String(err?.message || err).slice(0, 300) };
    }

    await db.runTransaction(async (tx) => {
        const fresh = (await tx.get(ref)).data() as CouncilSource;
        const images = [...fresh.images];
        images[index] = updated;
        tx.update(ref, { images, ...summarize(images, fresh.status), updatedAt: new Date().toISOString() });
    });
    return updated;
}

/** อ่านรูปที่ค้าง (pending) จากประกาศใหม่ไปเก่า สูงสุด max ใบ — ใช้ใน cron */
export async function processPendingImages(db: FirebaseFirestore.Firestore, max: number): Promise<number> {
    const snap = await db.collection(SOURCES).where('status', 'in', ['new', 'extracting']).get();
    const sources = snap.docs
        .map((d) => d.data() as CouncilSource)
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    let processed = 0;
    for (const s of sources) {
        for (let i = 0; i < s.images.length && processed < max; i++) {
            if (s.images[i].status !== 'pending') continue;
            await processSourceImage(db, s.postId, i);
            processed++;
        }
        if (processed >= max) break;
    }
    return processed;
}

export async function listSources(db: FirebaseFirestore.Firestore): Promise<CouncilSource[]> {
    const snap = await db.collection(SOURCES).orderBy('publishedAt', 'desc').get();
    return snap.docs.map((d) => {
        const s = d.data() as CouncilSource;
        return {
            postId: s.postId, title: s.title, link: s.link, publishedAt: s.publishedAt, pdfCount: s.pdfCount || 0,
            images: s.images || [], status: s.status, rowCount: s.rowCount || 0,
            importResult: s.importResult, importedAt: s.importedAt,
        };
    });
}

export async function getSourceRows(db: FirebaseFirestore.Firestore, postId: string): Promise<SourceRow[]> {
    const snap = await db.collection(SOURCES).doc(postId).collection('rows').get();
    return snap.docs
        .map((d) => {
            const r = d.data();
            return {
                id: d.id, imageIndex: r.imageIndex ?? 0, prefix: r.prefix || '', firstName: r.firstName || '',
                lastName: r.lastName || '', licenseNumber: r.licenseNumber || '', licenseType: r.licenseType || '',
                announcementDate: r.announcementDate || '', excluded: !!r.excluded,
            };
        })
        .sort((a, b) => a.imageIndex - b.imageIndex);
}

const EDITABLE: (keyof SourceRow)[] = ['prefix', 'firstName', 'lastName', 'licenseType', 'announcementDate', 'excluded'];

/** แก้แถวที่ AI อ่านผิด / ติ๊กไม่นำเข้า — แก้เลขใบอนุญาตที่นี่ไม่ได้ (ประกาศไม่มีเลข) */
export async function updateSourceRow(
    db: FirebaseFirestore.Firestore,
    postId: string,
    rowId: string,
    patch: Partial<SourceRow>,
): Promise<void> {
    const clean: Record<string, unknown> = {};
    for (const k of EDITABLE) {
        if (!(k in patch)) continue;
        const v = patch[k];
        clean[k] = k === 'excluded' ? !!v : String(v ?? '').trim().slice(0, 100);
    }
    if (Object.keys(clean).length) {
        await db.collection(SOURCES).doc(postId).collection('rows').doc(rowId).update(clean);
    }
}

/** นำเข้าแถวที่ไม่ได้ติ๊กออก — ต้องอ่านรูปครบก่อน */
export async function importSource(db: FirebaseFirestore.Firestore, postId: string): Promise<ImportResult> {
    const ref = db.collection(SOURCES).doc(postId);
    const source = (await ref.get()).data() as CouncilSource | undefined;
    if (!source) throw new Error('ไม่พบประกาศนี้');
    if (source.status === 'imported') throw new Error('ประกาศนี้นำเข้าแล้ว');
    if (source.images.some((i) => i.status === 'pending')) throw new Error('ยังอ่านรูปไม่ครบ');

    const rows = (await getSourceRows(db, postId)).filter((r) => !r.excluded);
    const result = await importLawyersCore(db, rows.map((r) => ({
        prefix: r.prefix,
        firstName: r.firstName,
        lastName: r.lastName,
        licenseNumber: '', // ประกาศรับใบอนุญาตไม่มีเลข — ไม่รับเลขจากแหล่งนี้เด็ดขาด
        licenseType: r.licenseType,
        announcementDate: r.announcementDate,
        sourceUrl: source.link,
    })));
    await ref.update({ status: 'imported', importResult: result, importedAt: new Date().toISOString() });
    return result;
}
