/**
 * Strip model answer / ธงคำตอบ from questionText
 */
export function stripAnswerFromQuestion(text: string): { question: string; extractedAnswer: string } {
    if (!text) return { question: '', extractedAnswer: '' };
    
    const patterns = [
        /\n\n\s*วินิจฉัย\s*\n/,
        /\n\s*ธงคำตอบ\s*\n/,
        /\n\s*ธงคำตอบ/,
        /\n\s*เฉลย\s*\n/,
        /\n\n\s*หลักกฎหมาย\s*\n/,
        /\n\n\s*คำตอบ\s*\n/,
        // Also handle cases where ธงคำตอบ appears without preceding newline
        /(?<=[\.\?])\s*ธงคำตอบ/,
    ];
    
    let splitIndex = -1;
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match.index !== undefined) {
            if (splitIndex === -1 || match.index < splitIndex) {
                splitIndex = match.index;
            }
        }
    }
    
    if (splitIndex > 0) {
        return {
            question: text.substring(0, splitIndex).trim(),
            extractedAnswer: text.substring(splitIndex).trim(),
        };
    }
    
    return { question: text, extractedAnswer: '' };
}

/**
 * Format exam text for better readability
 * Adds line breaks at logical positions where PDF extraction lost them
 */
export function formatExamText(text: string): string {
    if (!text) return '';
    
    let formatted = text;
    
    // Add line break before question numbers: "ข้อ 1", "ข้อ 2"
    formatted = formatted.replace(/(?<!\n)(\s*ข้อ\s+\d+)/g, '\n\n$1');
    
    // Add line break before sub-items: ก), ข), ค), ง), (ก), (ข)
    formatted = formatted.replace(/(?<!\n)\s+([(]?[ก-ฮ][).])/g, '\n\n$1');
    
    // Add line break before numbered items: 1), 2), 1., 2.
    formatted = formatted.replace(/(?<!\n)\s+(\d+[).])\s/g, '\n$1 ');
    
    // Add line break before legal section markers
    formatted = formatted.replace(/(?<!\n)(มาตรา\s+\d+)/g, '\n\n$1');
    
    // Add line break before "ธงคำตอบ", "วินิจฉัย", "หลักกฎหมาย", "คำตอบ"
    formatted = formatted.replace(/(?<!\n)\s*(ธงคำตอบ|วินิจฉัย|หลักกฎหมาย|เฉลย|คำตอบ)\s/g, '\n\n$1 ');
    
    // Add line break before dash items: –, -
    formatted = formatted.replace(/(?<!\n)\s+([–\-]\s*[ก-๛])/g, '\n$1');
    
    // Clean up excessive newlines (max 2)
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Clean up leading whitespace
    formatted = formatted.trim();
    
    return formatted;
}
