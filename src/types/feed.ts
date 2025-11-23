// Type definitions for feed items and insights

export type FeedItemType = 
  | 'insight'
  | 'micro_task_suggestion'
  | 'idea_tweak'
  | 'competitor_signal'
  | 'motivation'
  | 'market_trend';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaAction?: string; // URL or action identifier
  xpReward?: number;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface FeedContext {
  userId: string;
  chosenIdeaTitle?: string;
  chosenIdeaDescription?: string;
  businessModelType?: string;
  targetCustomer?: string;
  nicheScore?: number;
  mainRisks?: string[];
  userSkills?: string[];
  userPassions?: string[];
}
