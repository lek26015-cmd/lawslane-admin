
export const specialtyMap: Record<string, string> = {
    'คดีฉ้อโกง SMEs': 'smeFraud',
    'คดีแพ่งและพาณิชย์': 'civilCommercial',
    'การผิดสัญญา': 'contractBreach',
    'อสังหาริมทรัพย์': 'realEstate',
    'ครอบครัวและมรดก': 'familyInheritance',
    'คดีอาญา': 'criminal',
    'กฎหมายแรงงาน': 'labor',
    'ทรัพย์สินทางปัญญา': 'intellectualProperty',
    'กฎหมายธุรกิจ': 'business',
    // Fallbacks for variations
    'คดีแพ่ง': 'civilCommercial',
    'คดีพาณิชย์': 'civilCommercial',
};

export function getSpecialtyKey(thaiSpecialty: string): string | null {
    return specialtyMap[thaiSpecialty] || null;
}
