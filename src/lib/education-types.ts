export interface Book {
    id: string;
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    coverUrl: string;
    author: string;
    publisher?: string;
    isbn?: string;
    pageCount?: number;
    publishedAt?: Date;
    isDigital: boolean; // true = ebook (pdf), false = physical
    fileUrl?: string; // for ebook
    stock: number;
    category?: string; // e.g., 'Civil Law', 'Criminal Law'
    type?: 'ebook' | 'physical' | 'both';
    status?: 'draft' | 'published';
    level?: string; // e.g., 'Bachelor', 'Bar Exam', 'Lawyer License'
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
    status?: 'draft' | 'published';
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

export interface AnswerResult {
    questionId: string;
    questionText: string;
    questionType: 'MULTIPLE_CHOICE' | 'ESSAY';
    studentAnswer: string | number;
    correctAnswer?: string | number;
    isCorrect?: boolean;
    aiScore: number;
    aiFeedback?: string;
    aiStrengths?: string[];
    aiWeaknesses?: string[];
    aiSuggestions?: string[];
}

export interface ExamAttempt {
    id: string;
    userId?: string;
    userName?: string;
    examId: string;
    startedAt: Date;
    completedAt?: Date;
    score?: number; // Might be null for Essay until graded
    totalScore?: number;
    maxScore?: number;
    passingScore?: number;
    passed?: boolean;
    examTitle?: string;
    answers: AnswerResult[];
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

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';

export interface OrderItem {
    id: string; // Product ID (Book ID, Exam ID, or Course ID)
    title: string;
    type: 'BOOK' | 'EXAM' | 'COURSE';
    price: number;
    quantity: number;
    coverUrl?: string;
}

export interface Order {
    id: string;
    userId: string;
    items: OrderItem[];
    totalAmount: number;
    status: OrderStatus;
    shippingInfo?: {
        name: string;
        phone: string;
        address: string;
        trackingNumber?: string;
        carrier?: string;
    };
    paymentSlipUrl?: string; // URL to uploaded slip
    createdAt: Date;
    updatedAt: Date;
}

// Course Types
export interface CourseLessonAttachment {
    id: string;
    name: string;
    url: string;
    type: 'pdf' | 'doc' | 'link' | 'other';
}

export interface CourseLesson {
    id: string;
    type: 'lesson';
    title: string;
    durationMinutes: number;
    videoUrl?: string; // For streaming
    isFreePreview: boolean; // Can watch without buying
    completed?: boolean; // For user progress
    attachments?: CourseLessonAttachment[];
    order: number;
}

export interface CourseQuizItem {
    id: string;
    type: 'quiz';
    title: string;
    examId: string; // Link to an existing exam
    passingRequired: boolean; // Must pass to continue
    order: number;
}

export type CourseModuleItem = CourseLesson | CourseQuizItem;

export interface CourseModule {
    id: string;
    title: string;
    description?: string;
    items: CourseModuleItem[]; // Mixed lessons and quizzes
    lessons: CourseLesson[]; // Deprecated, kept for backward compatibility
}

export interface Course {
    id: string;
    title: string;
    description: string;
    longDescription?: string; // HTML or Markdown
    price: number;
    originalPrice?: number;
    status?: 'draft' | 'published';
    coverUrl: string;
    instructor: {
        name: string;
        avatarUrl?: string;
        bio?: string;
    };
    category: string; // e.g., 'Civil Law', 'Exam Prep'
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    totalDurationMinutes: number;
    totalLessons: number;
    rating?: number;
    reviewCount?: number;
    modules: CourseModule[];
    linkedExamIds?: string[];
    createdAt: Date;
    updatedAt: Date;
}


export type Module = CourseModule;
export type Lesson = CourseLesson;
