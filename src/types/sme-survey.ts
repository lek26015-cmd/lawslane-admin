
import { Timestamp } from 'firebase/firestore';

export interface SmeSurveyResponse {
  id: string;
  // Section 1: SME Profile
  respondentName: string;
  businessType: string;
  businessTypeOther?: string;
  businessSize: string;
  businessDuration: string;

  // Section 2: Legal Pain Points
  legalProblems: string[];
  legalProblemsOther?: string;
  initialHandling: string;
  hiringObstacles: string[];
  hiringObstaclesOther?: string;

  // Section 3: Technology Acceptance
  aiHelpfulness: string;
  preferredChannel: string;

  // Section 4: UX & Incentives
  confidenceFactor: string;
  subscriptionInterest: string;

  createdAt: Timestamp;
}
