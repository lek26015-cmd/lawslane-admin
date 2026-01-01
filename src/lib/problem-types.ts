
export const problemTypeMap: Record<string, string> = {
    'ปัญหาการสื่อสารกับทนาย': 'communication',
    'ปัญหาการชำระเงิน/Escrow': 'payment',
    'ปัญหาทางเทคนิคของระบบ': 'technical',
    'ไม่พอใจคุณภาพบริการ': 'quality',
    'อื่นๆ': 'other',
    // English versions
    'Communication problem with lawyer': 'communication',
    'Payment/Escrow problem': 'payment',
    'System technical problem': 'technical',
    'Dissatisfied with service quality': 'quality',
    'Other': 'other',
    // Chinese versions
    '与律师的沟通问题': 'communication',
    '付款/托管问题': 'payment',
    '系统技术问题': 'technical',
    '对服务质量不满意': 'quality',
    '其他': 'other',
};

export function getProblemTypeKey(problemType: string): string | null {
    return problemTypeMap[problemType] || null;
}
