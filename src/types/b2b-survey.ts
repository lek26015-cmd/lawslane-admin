
import { Timestamp } from 'firebase/firestore';

export interface B2BSurveyResponse {
  id: string;
  role: 'executive' | 'inhouse_legal' | 'other';
  contractVolume: '<10' | '10-30' | '31-50' | '>50';
  currentTool: string;
  challenges: string[];
  workspaceHelpfulness: number;
  aiTimeSaved: '<20%' | '20-40%' | '40-60%' | '>60%';
  aiConcerns: string;
  spendTrackingMethod: string;
  spendTrackingNeed: string;
  outsourceInterest: string;
  decisionFactor: string;
  createdAt: Timestamp;
}
