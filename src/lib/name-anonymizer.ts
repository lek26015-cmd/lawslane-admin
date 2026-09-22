/**
 * Anonymize fictional character names in exam text.
 * 
 * Approach: Build a dictionary of common Thai names from known exam patterns,
 * then scan text for "นาย/นาง/นางสาว + known_name" and replace.
 */

const REPLACEMENT_MALE = [
    'วิชัย', 'สมบัติ', 'ประเสริฐ', 'มานะ', 'ธนกร',
    'วรวุฒิ', 'พิชิต', 'อนันต์', 'กิตติ', 'ศักดิ์ชัย',
    'อภิชาต', 'รัฐพล', 'ณัฐพงษ์', 'ภาณุพงศ์', 'จิรวัฒน์',
    'ศรัณย์', 'ปรมินทร์', 'ธีรภัทร', 'เกริกไกร', 'นิธิพล',
    'ชนินทร์', 'อรรถพล', 'ภูวดล', 'วัชรพล', 'พีรพล',
    'กฤษณะ', 'เจษฎา', 'สุทธิพงษ์', 'ธวัชชัย', 'พงศ์พันธุ์',
    'อำนวย', 'ปิยะ', 'วีระ', 'ชาญณรงค์', 'เอกสิทธิ์',
    'บรรพต', 'สุรชาติ', 'พรชัย', 'ไพบูลย์', 'ทวีศักดิ์',
    'วิทยา', 'สมพงษ์', 'นรินทร์', 'พิพัฒน์', 'เกรียงศักดิ์',
    'บุญเลิศ', 'สุเมธ', 'อดิศร', 'สถาพร', 'ชัยรัตน์',
];

const REPLACEMENT_FEMALE = [
    'สุมาลี', 'วิไล', 'ศิริพร', 'ปราณี', 'รัตนา',
    'กัลยา', 'พิมพ์ใจ', 'ดวงใจ', 'อรุณี', 'วรรณา',
    'จันทร์เพ็ญ', 'นภาพร', 'สุกัญญา', 'อัจฉรา', 'พรทิพย์',
    'มณีรัตน์', 'ลัดดา', 'นิตยา', 'สุนันท์', 'ประภาพร',
    'ธัญญา', 'ชุติมา', 'พรรณี', 'สมหญิง', 'อังคณา',
    'เพ็ญศรี', 'สุจิตรา', 'ดารณี', 'กนกวรรณ', 'ภัทรา',
];

// Common Thai fictional names found in law exams
// These are short, simple names that are clearly fictional
const KNOWN_FICTIONAL_NAMES = new Set([
    // Color names
    'แดง', 'ดำ', 'ขาว', 'เขียว', 'เหลือง', 'น้ำเงิน', 'ส้ม', 'ชมพู', 'ม่วง',
    // Gem/precious names
    'แก้ว', 'แหวน', 'เพชร', 'พลอย', 'ทอง', 'เงิน', 'นาก', 'เพ็ญ',
    // Common fictional names
    'สม', 'สมชาย', 'สมศรี', 'สมหมาย', 'สมบุญ', 'สมพร', 'สมศักดิ์',
    'มา', 'มี', 'สุข', 'ทุกข์', 'ดี', 'เก่ง', 'ก้อง', 'เอก', 'โท', 'ตรี',
    'ใหญ่', 'เล็ก', 'อ้วน', 'ผอม', 'สวย', 'งาม', 'หล่อ',
    'บุญ', 'บุญชู', 'บุญมา', 'บุญมี', 'บุญเกิด', 'บุญธรรม',
    'สง่า', 'สว่าง', 'สุวรรณ', 'ศรี', 'มงคล',
    'แป้น', 'แปลง', 'ใบสัก', 'ป้อม', 'ปุ้ย',
    // Number names
    'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า', 'สิบ',
    // Animal names
    'เสือ', 'หมี', 'กระต่าย', 'ปลา', 'นก', 'ช้าง',
    // Modern common names often used in exams
    'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์',
    'วิชา', 'วิชัย', 'วิชาญ', 'ชัยวัฒน์', 'โชคชัย', 'เผือก', 'เย็น',
    'เดช', 'เดชา', 'พิชัย', 'พิชาญ', 'สุชาติ', 'สุชาย',
    'มานพ', 'มานิต', 'ชาลี', 'ชาติชาย',
    'วิน', 'วินัย', 'ประสิทธิ์', 'ประสงค์',
    'โอ', 'ธรรม', 'นิติ', 'นิพนธ์',
]);

// Words that look like names but aren't
const NOT_NAMES = new Set([
    'ความ', 'หน้า', 'จ้าง', 'ทหาร', 'ช่าง', 'แพทย์',
    'ประกัน', 'ธนาคาร', 'สภา', 'พราน', 'หมู่', 'ร้อย',
    'พยาบาล', 'แบบ', 'อำเภอ', 'ตำรวจ', 'ทะเบียน',
    'กรัฐมนตรี', 'กเทศมนตรี', 'กองค์การ', 'กสมาคม', 'กสภา',
    'พล',
]);

function isThai(ch: string): boolean {
    const code = ch.charCodeAt(0);
    return code >= 0x0E01 && code <= 0x0E5B;
}

function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

export function anonymizeNames(text: string, examId: string): string {
    if (!text) return '';
    
    const seed = simpleHash(examId);
    const prefixes = ['นางสาว', 'นาง', 'นาย'];
    
    // Step 1: Find all prefix positions and check if a known name follows
    type Match = { start: number; prefixLen: number; name: string; prefix: string };
    const matches: Match[] = [];
    
    for (const prefix of prefixes) {
        let searchFrom = 0;
        while (true) {
            const idx = text.indexOf(prefix, searchFrom);
            if (idx === -1) break;
            searchFrom = idx + 1; // Move forward by 1 to avoid infinite loop
            
            // Must not be part of compound words like "ทนาย" (lawyer)
            // Only skip if preceded by specific chars that form compounds
            if (idx > 0) {
                const charBefore = text[idx - 1];
                // "ท" before "นาย" = "ทนาย" (lawyer) - skip
                // "ต้อง" before "นาง" etc - skip in specific compounds
                if (charBefore === 'ท') continue;
            }
            
            // Get the text after prefix (skip optional space)
            let nameStart = idx + prefix.length;
            if (nameStart < text.length && text[nameStart] === ' ') nameStart++;
            
            // Try to match against known names (longest first)
            const afterPrefix = text.substring(nameStart, nameStart + 15);
            
            let matched = '';
            for (const knownName of KNOWN_FICTIONAL_NAMES) {
                if (afterPrefix.startsWith(knownName) && knownName.length > matched.length) {
                    // Make sure it's not a NOT_NAME
                    if (!NOT_NAMES.has(knownName)) {
                        matched = knownName;
                    }
                }
            }
            
            if (matched) {
                matches.push({
                    start: idx,
                    prefixLen: nameStart - idx, // includes space
                    name: matched,
                    prefix,
                });
            }
        }
    }
    
    if (matches.length === 0) return text;
    
    // Step 2: Build consistent name mapping
    const uniqueNames = [...new Set(matches.map(m => m.name))];
    const nameMap = new Map<string, string>();
    let maleIdx = seed % REPLACEMENT_MALE.length;
    let femaleIdx = seed % REPLACEMENT_FEMALE.length;
    
    for (const name of uniqueNames) {
        const usage = matches.find(m => m.name === name);
        const isFemale = usage && (usage.prefix === 'นาง' || usage.prefix === 'นางสาว');
        
        let newName: string;
        if (isFemale) {
            newName = REPLACEMENT_FEMALE[femaleIdx % REPLACEMENT_FEMALE.length];
            femaleIdx++;
            if (newName === name) { femaleIdx++; newName = REPLACEMENT_FEMALE[femaleIdx % REPLACEMENT_FEMALE.length]; }
        } else {
            newName = REPLACEMENT_MALE[maleIdx % REPLACEMENT_MALE.length];
            maleIdx++;
            if (newName === name) { maleIdx++; newName = REPLACEMENT_MALE[maleIdx % REPLACEMENT_MALE.length]; }
        }
        nameMap.set(name, newName);
    }
    
    // Step 3: Build result left-to-right to handle position shifts correctly
    matches.sort((a, b) => a.start - b.start);
    
    let result = '';
    let lastEnd = 0;
    
    for (const m of matches) {
        const nameStart = m.start + m.prefixLen;
        const nameEnd = nameStart + m.name.length;
        const replacement = nameMap.get(m.name) || m.name;
        
        // Add text between last match and this one (including prefix)
        result += text.substring(lastEnd, nameStart);
        // Add replacement name
        result += replacement;
        lastEnd = nameEnd;
    }
    
    // Add remaining text after last match
    result += text.substring(lastEnd);
    
    return result;
}

export function anonymizeExamTexts(texts: string[], examId: string): string[] {
    if (texts.length === 0) return [];
    const separator = '\n\n===EXAM_SEP===\n\n';
    const combined = texts.join(separator);
    const result = anonymizeNames(combined, examId);
    return result.split(separator);
}
