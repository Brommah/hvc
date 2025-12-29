export interface Candidate {
  id: string;
  name: string;
  role: string | null;
  status: string | null;
  priority: string | null;
  stratification: string | null;
  hotCandidate: boolean;
  hoursSinceLastActivity: number | null;
  latestCommunication: string | null;
  linkedinProfile: string | null;
  notionUrl: string;
  interviewStatus: string | null;
  aiScore: number | null;
  humanScore: number | null;
  dateAdded: string | null;
  aiProcessedAt: string | null;
  cvVerifiedByLynn: string | null;
  passedHumanFilter: boolean;
  hoursSinceAiReview: number | null;
}

export interface CandidatesResponse {
  success: boolean;
  data: Candidate[];
  timestamp: string;
  error?: string;
}

