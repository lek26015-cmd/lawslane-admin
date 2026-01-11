
import { ChatResponse } from "@/ai/flows/chat-flow";
import { ReactElement } from "react";

export interface UserProfile {
  id?: string;
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'lawyer' | 'admin' | 'education_student';
  type: 'บุคคลทั่วไป' | 'SME';
  registeredAt: any;
  status: 'active' | 'suspended' | 'pending';
  avatar?: string;
  permissions?: Record<string, string[]>;
  superAdmin?: boolean;
  notificationPreferences?: {
    email: string;
    notifyOnNewUser: boolean;
    notifyOnNewTicket: boolean;
    notifyOnPayment: boolean;
  };
}

export interface LawyerProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  dob: any;
  gender: 'ชาย' | 'หญิง' | 'อื่นๆ';
  licenseNumber: string;
  address: string;
  serviceProvinces: string[];
  bankName: string;
  bankAccountNumber: string;
  lineId?: string;
  status: 'approved' | 'pending' | 'rejected' | 'suspended';
  rejectionReason?: string;

  // Multi-language description
  description: string;
  descriptionEn?: string;
  descriptionZh?: string;

  // Multi-language education
  education?: string;
  educationEn?: string;
  educationZh?: string;

  // Multi-language experience
  experience?: string;
  experienceEn?: string;
  experienceZh?: string;

  specialty: string[];
  imageUrl: string;
  imageHint: string;
  idCardUrl: string;
  licenseUrl: string;
  joinedAt: any;
  averageRating?: number;
  reviewCount?: number;
  firmId?: string;
  pricing?: {
    appointmentFee: number;     // Fee for in-person appointments
    chatFee: number;             // Fee for chat consultations
    platformFeeRate: number;     // GP rate (default 0.15 = 15%)
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string | ChatResponse;
  needsLawyer?: boolean;
  handoffMessage?: string;
}

export interface HumanChatMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
}


export interface Article {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  imageHint: string;
  content: string;
  publishedAt: any;
  authorName: string;
  coverImage?: string;
  excerpt?: string;
  translations?: {
    en?: {
      title: string;
      description: string;
      content: string;
    };
    zh?: {
      title: string;
      description: string;
      content: string;
    };
  };
  cta?: {
    enabled: boolean;
    text: string;
    url: string;
  } | null;
  tags?: string[];
}

export interface Case {
  id: string;
  title: string;
  lawyer: Pick<LawyerProfile, 'id' | 'name' | 'imageUrl' | 'imageHint'>;
  lastMessage: string;
  lastMessageTimestamp: string;
  status: 'active' | 'closed' | 'pending_payment' | 'rejected' | 'approved' | 'pending';
  hasNewMessage?: boolean;
  color?: 'blue' | 'yellow';
  rejectReason?: string;
  updatedAt: Date;
}

export interface UpcomingAppointment {
  id: string;
  lawyer: Pick<LawyerProfile, 'name' | 'imageUrl' | 'imageHint'>;
  date: Date;
  description: string;
  time: string;
  status?: string;
}

export interface Document {
  id: string;
  name: string;
  status: string;
  isCompleted: boolean;
}

export interface ReportedTicket {
  id: string;
  caseId: string;
  lawyerId: string;
  caseTitle: string;
  problemType: string;
  status: 'pending' | 'resolved';
  reportedAt: Date;
  clientName?: string;
}

// Types for Lawyer Dashboard
export interface LawyerAppointmentRequest {
  id: string;
  clientName: string;
  userId: string; // Added userId
  caseTitle: string;
  description: string;
  requestedAt: Date;
}

export interface LawyerCase {
  id: string;
  title: string;
  clientName: string;
  clientId: string;
  status: 'active' | 'closed' | 'pending_payment';
  lastUpdate: string;
  notifications?: number | 'document';
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  placement: 'Homepage Carousel' | 'Lawyer Page Sidebar' | 'Legal Forms Sidebar';
  status: 'active' | 'draft' | 'expired';
  imageUrl: string;
  imageHint: string;
  href?: string;
  action?: () => void;
  icon?: ReactElement;
  analytics?: {
    clicks: number;
    gender: {
      male: number;
      female: number;
      other: number;
    };
    age: {
      '18-24': number;
      '25-34': number;
      '35-44': number;
      '45-54': number;
      '55+': number;
    };
  };
}

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

export interface AdminNotification {
  id: string;
  type: 'ticket' | 'lawyer_registration' | 'withdrawal';
  title: string;
  message: string;
  createdAt: any; // Firestore Timestamp
  read: boolean;
  link: string; // URL to navigate to
  relatedId?: string; // ID of the ticket/lawyer/withdrawal
}

export interface LandingPage {
  id: string;
  slug: string;
  title: string;
  heroImage: string;
  logo?: string;
  themeColor: string;
  content: string; // Rich text or simplified HTML
  contactInfo: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    lineId?: string;
    facebook?: string;
  };
  status: 'published' | 'draft';
  createdAt: any;
  updatedAt: any;
}

export interface VerifiedLawyer {
  id: string; // Usually the license number or auto-generated
  licenseNumber: string;
  firstName: string;
  lastName: string;
  status: 'active' | 'suspended' | 'struck_off' | 'pending';
  registeredDate: string; // ISO date string or just year
  province: string;
  updatedAt: any;
}

export interface ContractRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  serviceType: string;
  details: string;
  fileUrl?: string;
  fileName?: string;
  status: 'pending' | 'quoted' | 'completed' | 'cancelled';
  createdAt: any;
  updatedAt: any;
}

export interface RegistrationRequest {
  id: string;
  contactName: string;
  companyName: string;
  phone: string;
  email: string;
  registrationType: string;
  details: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: any;
  updatedAt: any;
}

export interface SmeRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  serviceType: string;
  fileUrl?: string;
  fileName?: string;
  status: 'new' | 'contacted' | 'completed';
  createdAt: any;
}

export interface LegalFormAttachment {
  url: string;
  name: string;
  type: 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx';
  language: 'th' | 'en' | 'zh'; // Document language
}

export interface LegalForm {
  id: string;
  title: string; // Primary/fallback title (Thai)
  titleTh?: string; // Thai title
  titleEn?: string; // English title
  titleZh?: string; // Chinese title
  description: string;
  descriptionTh?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  // Deprecated single file fields (kept for backward compatibility if needed, but we will migrate to attachments)
  fileUrl?: string;
  fileName?: string;
  fileType?: 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx';

  attachments: LegalFormAttachment[];

  category: string;
  downloads: number;
  createdAt: any;
}
