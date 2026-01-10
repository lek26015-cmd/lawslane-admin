export interface Book {
    id: string;
    title: string;
    description: string;
    price: number;
    coverUrl: string;
    author: string;
    publisher?: string;
    isbn?: string;
    pageCount?: number;
    publishedAt?: Date;
    isDigital: boolean; // true = ebook (pdf), false = physical
    fileUrl?: string; // for ebook
    stock: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Exam {
    id: string;
    title: string;
    description: string;
    price: number; // 0 for free exams
    durationMinutes: number;
    passingScore: number;
    totalQuestions: number;
    coverUrl?: string;
    category: 'license' | 'prosecutor' | 'judge' | 'other';
    difficulty: 'easy' | 'medium' | 'hard';
    createdAt: Date;
    updatedAt: Date;
}

export interface Question {
    id: string;
    examId: string;
    text: string;
    type: 'MULTIPLE_CHOICE' | 'ESSAY'; // Added type
    options?: string[]; // Only for MULTIPLE_CHOICE
    correctOptionIndex?: number; // Only for MULTIPLE_CHOICE
    correctAnswerText?: string; // For ESSAY (Model Answer / ธงคำตอบ)
    explanation?: string;
    order: number;
    subject?: string; // e.g., 'Civil', 'Criminal'
    tags?: string[];
}

export interface ExamAttempt {
    id: string;
    userId: string;
    examId: string;
    startedAt: Date;
    completedAt?: Date;
    score?: number; // Might be null for Essay until graded
    answers: Record<string, number | string>; // questionId -> index (MC) or text (Essay)
    status: 'IN_PROGRESS' | 'COMPLETED' | 'TIMEOUT';
}

export interface RecommendedMaterial {
    title: string;
    type: 'BOOK' | 'ARTICLE' | 'LAW';
    url?: string; // Link to book/article in our platform
    reason: string;
}

export interface AIAnalysisResult {
    questionId: string;
    score: number; // 0-10 or 0-100
    feedback: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
}

export interface ExamResult {
    attemptId: string;
    totalScore: number;
    analysis: AIAnalysisResult[];
    overallFeedback: string;
    recommendedMaterials: RecommendedMaterial[];
}
