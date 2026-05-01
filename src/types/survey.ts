
import { Timestamp } from 'firebase/firestore';

export interface UnifiedSurveyResponse {
  id: string;
  // Section 1: Profile
  respondentName: string;
  role: string;
  businessType: string;
  businessTypeOther?: string;
  businessSize: string;
  businessDuration: string;
  contractVolume: string;

  // Section 2: Challenges
  challenges: string[]; // รวมหมวดหมู่จากทั้งคู่
  challengesOther?: string;
  currentTool: string;
  initialHandling: string;

  // Section 3: AI & Tech
  aiExpectation: string; // 1-5
  aiTimeSaved: string; // %
  aiConcerns: string;
  preferredChannel: string;

  // Section 4: Services & Marketplace
  hiringObstacles: string[];
  hiringObstaclesOther?: string;
  confidenceFactor: string;
  subscriptionInterest: string;
  outsourceInterest: string;

  createdAt: Timestamp;
}
