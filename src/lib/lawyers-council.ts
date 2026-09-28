import 'server-only';

/**
 * อ่านประกาศ "รับใบอนุญาตทนายความใหม่" จากเว็บสภาทนายความ (WordPress REST API สาธารณะ)
 * ประกาศเป็นรูปสแกนตาราง คำนำหน้า / ชื่อ / สกุล / ประเภท — ไม่มีเลขใบอนุญาต
 */

const WP_API = 'https://www.lawyerscouncil.or.th/wp-json/wp/v2/posts';
const USER_AGENT = 'Mozilla/5.0 (compatible; LawslaneRegistryBot/1.0; +https://www.lawslane.com)';

// เอาเฉพาะประกาศรายชื่อผู้รับใบอนุญาต — ประกาศทะเบียนแบบอื่น (เช่น รายชื่อผู้ถูกพักใบอนุญาต)
// ต้องไม่หลุดเข้ามาเป็น "พบชื่อในประกาศรับใบอนุญาต"
const INCLUDE_TITLE = /(การรับใบอนุญาต|ประกาศรายชื่อผู้รับใบอนุญาต|กำหนดนัดรับใบอนุญาต)/;
const EXCLUDE_TITLE = /(เลื่อน|ประมูล|อบรม|ประชุม|ปลอม|ลายมือชื่อ)/;

export interface CouncilAnnouncement {
    postId: string;
    title: string;
    link: string;
    publishedAt: string; // ISO
    images: string[];    // รูปขนาดเต็ม เรียงตามในโพสต์
    pdfCount: number;    // มีไฟล์ PDF แนบ (ต้องทำมือ ระบบอ่านเฉพาะรูป)
}

function decodeEntities(s: string): string {
    return s
        .replace(/&#8211;/g, '–').replace(/&#8220;|&#8221;/g, '"').replace(/&#8217;/g, '’')
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** รูปในเนื้อหาโพสต์ → URL ขนาดเต็ม (ตัด -594x840 ฯลฯ) ไม่ซ้ำ ไม่เอาโลโก้เว็บ */
export function extractImageUrls(html: string): string[] {
    const found = html.match(/https?:\/\/(?:www\.)?lawyerscouncil\.or\.th\/wp-content\/uploads\/[^"'\s)]+?\.(?:jpe?g|png|webp)/gi) || [];
    const out: string[] = [];
    for (const raw of found) {
        const url = raw
            .replace(/^https?:\/\/lawyerscouncil/i, 'https://www.lawyerscouncil')
            .replace(/^http:/i, 'https:')
            .replace(/-\d+x\d+(?=\.(?:jpe?g|png|webp)$)/i, '');
        if (/\/uploads\/2019\/02\/|logo/i.test(url)) continue;
        if (!out.includes(url)) out.push(url);
    }
    return out;
}

export function isLicenseAnnouncement(title: string): boolean {
    return INCLUDE_TITLE.test(title) && !EXCLUDE_TITLE.test(title);
}

/** ประกาศรับใบอนุญาตทั้งหมดที่ API ให้มา (ใหม่ → เก่า) */
export async function fetchLicenseAnnouncements(): Promise<CouncilAnnouncement[]> {
    const results: CouncilAnnouncement[] = [];
    for (let page = 1; page <= 10; page++) {
        const url = `${WP_API}?search=${encodeURIComponent('รับใบอนุญาต')}&per_page=100&page=${page}&_fields=id,date,link,title,content`;
        const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, cache: 'no-store' });
        if (!res.ok) {
            if (page > 1 && res.status === 400) break; // เกินหน้าสุดท้าย
            throw new Error(`Lawyers Council API ${res.status}`);
        }
        const posts: any[] = await res.json();
        for (const p of posts) {
            const title = decodeEntities(String(p?.title?.rendered || '')).trim();
            if (!isLicenseAnnouncement(title)) continue;
            const html = String(p?.content?.rendered || '');
            results.push({
                postId: String(p.id),
                title,
                link: String(p.link || ''),
                publishedAt: new Date(p.date).toISOString(),
                images: extractImageUrls(html),
                pdfCount: new Set(html.match(/href="[^"]+\.pdf"/gi) || []).size,
            });
        }
        const totalPages = Number(res.headers.get('x-wp-totalpages') || '1');
        if (page >= totalPages) break;
    }
    return results;
}

/** ดาวน์โหลดรูปประกาศเป็น base64 (จำกัดขนาดกันไฟล์ผิดปกติ) */
export async function fetchImageBase64(url: string): Promise<{ base64: string; mimeType: string }> {
    if (!/^https:\/\/www\.lawyerscouncil\.or\.th\/wp-content\/uploads\//.test(url)) {
        throw new Error('URL รูปไม่ใช่ของเว็บสภาทนายความ');
    }
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, cache: 'no-store' });
    if (!res.ok) throw new Error(`ดาวน์โหลดรูปไม่ได้ (${res.status})`);
    const mimeType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
    if (!mimeType.startsWith('image/')) throw new Error(`ไม่ใช่รูปภาพ (${mimeType})`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 15 * 1024 * 1024) throw new Error('รูปใหญ่เกิน 15MB');
    return { base64: buf.toString('base64'), mimeType };
}
