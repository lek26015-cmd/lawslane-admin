
import { ChatResponse } from "@/ai/flows/chat-flow";
import { ReactElement } from "react";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'lawyer' | 'admin';
  type: 'บุคคลทั่วไป' | 'SME';
  registeredAt: any;
  status: 'active' | 'suspended';
  avatar?: string;
  permissions?: Record<string, string[]>;
  superAdmin?: boolean;
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
  status: 'approved' | 'pending' | 'rejected';
  description: string;
  specialty: string[];
  imageUrl: string;
  imageHint: string;
  idCardUrl: string;
  licenseUrl: string;
  joinedAt: any;
  averageRating?: number;
  reviewCount?: number;
  firmId?: string;
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
}

export interface Case {
  id: string;
  title: string;
  lawyer: Pick<LawyerProfile, 'id' | 'name' | 'imageUrl' | 'imageHint'>;
  lastMessage: string;
  lastMessageTimestamp: string;
  status: 'active' | 'closed' | 'pending_payment';
  hasNewMessage?: boolean;
  color?: 'blue' | 'yellow';
}

export interface UpcomingAppointment {
  id: string;
  lawyer: Pick<LawyerProfile, 'name' | 'imageUrl' | 'imageHint'>;
  date: Date;
  description: string;
  time: string;
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
  placement: 'Homepage Carousel' | 'Lawyer Page Sidebar';
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
