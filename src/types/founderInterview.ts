// src/types/founderInterview.ts
// Types for dynamic founder interview sessions and transcripts

export type InterviewRole = "system" | "ai" | "user";

export interface InterviewTurn {
  role: InterviewRole;
  content: string;
  timestamp: string;
}

export interface FounderInterview {
  id: string;
  userId: string;
  status: "in_progress" | "completed";
  transcript: InterviewTurn[];
  contextSummary?: any; // will be filled by AI later
  createdAt: string;
  updatedAt: string;
}
