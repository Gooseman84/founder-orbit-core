export interface OnboardingData {
  passions_text: string;
  passions_tags: string[];
  skills_text: string;
  skills_tags: string[];
  tech_level: string;
  time_per_week: number;
  capital_available: number;
  risk_tolerance: string;
  lifestyle_goals: string;
  success_vision: string;
}

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  passions_text: "",
  passions_tags: [],
  skills_text: "",
  skills_tags: [],
  tech_level: "",
  time_per_week: 0,
  capital_available: 0,
  risk_tolerance: "",
  lifestyle_goals: "",
  success_vision: "",
};
