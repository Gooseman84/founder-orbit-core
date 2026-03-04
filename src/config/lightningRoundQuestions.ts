// src/config/lightningRoundQuestions.ts
// Defines the 10 Lightning Round questions shown in the Typeform-style flow.
// Each question_id maps to a founder_profiles column via the save-lightning-round edge function.

export type InputType = "slider" | "single_select" | "multi_select" | "range_select" | "yes_no";

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  unit?: string;
  labels: Record<number, string>;
}

export interface SelectOption {
  value: string;
  label: string;
  emoji?: string;
}

export interface LightningRoundQuestion {
  id: string;
  text: string;
  subtext?: string;
  inputType: InputType;
  options?: SelectOption[];
  sliderConfig?: SliderConfig;
  required: boolean;
}

export interface LightningRoundResponse {
  question_id: string;
  value: string | number | boolean | string[];
}

export const LIGHTNING_ROUND_QUESTIONS: LightningRoundQuestion[] = [
  {
    id: "hours_per_week",
    text: "How many hours per week can you commit?",
    subtext: "Be honest — this shapes everything we recommend.",
    inputType: "slider",
    sliderConfig: {
      min: 1,
      max: 60,
      step: 1,
      unit: "hrs",
      labels: {
        5: "Side hustle",
        15: "Part-time",
        30: "Serious",
        45: "Full-time",
        60: "All in",
      },
    },
    required: true,
  },
  {
    id: "capital_available",
    text: "What's your starting budget?",
    subtext: "We'll match ideas to your actual resources.",
    inputType: "single_select",
    options: [
      { value: "0", label: "$0 — Bootstrap only", emoji: "🪶" },
      { value: "500", label: "Under $500", emoji: "💵" },
      { value: "5000", label: "$500 – $5K", emoji: "💰" },
      { value: "25000", label: "$5K – $25K", emoji: "🏦" },
      { value: "100000", label: "$25K+", emoji: "🚀" },
    ],
    required: false,
  },
  {
    id: "risk_tolerance",
    text: "How much risk can you stomach?",
    subtext: "No wrong answer — this is about your comfort zone.",
    inputType: "single_select",
    options: [
      { value: "low", label: "Keep it safe", emoji: "🛡️" },
      { value: "medium", label: "Calculated bets", emoji: "🎯" },
      { value: "high", label: "Swing big", emoji: "⚡" },
      { value: "yolo", label: "Full send", emoji: "🔥" },
    ],
    required: true,
  },
  {
    id: "work_personality",
    text: "How do you work best?",
    subtext: "Pick all that apply.",
    inputType: "multi_select",
    options: [
      { value: "solo", label: "Solo operator", emoji: "🎧" },
      { value: "collaborator", label: "Collaborator", emoji: "🤝" },
      { value: "builder", label: "Builder / maker", emoji: "🔨" },
      { value: "strategist", label: "Strategist", emoji: "♟️" },
      { value: "creative", label: "Creative / storyteller", emoji: "🎨" },
      { value: "systems", label: "Systems thinker", emoji: "⚙️" },
    ],
    required: true,
  },
  {
    id: "lifestyle_goals",
    text: "What does success look like for your lifestyle?",
    inputType: "single_select",
    options: [
      { value: "freedom", label: "Location freedom", emoji: "🌍" },
      { value: "income", label: "Maximum income", emoji: "📈" },
      { value: "impact", label: "Meaningful impact", emoji: "💡" },
      { value: "balance", label: "Work-life balance", emoji: "⚖️" },
      { value: "empire", label: "Build an empire", emoji: "🏰" },
    ],
    required: false,
  },
  {
    id: "success_vision",
    text: "Where do you want to be in 12 months?",
    inputType: "single_select",
    options: [
      { value: "first_dollar", label: "First dollar earned", emoji: "🪙" },
      { value: "replace_income", label: "Replace my income", emoji: "💼" },
      { value: "profitable_product", label: "Profitable product", emoji: "📦" },
      { value: "funded_startup", label: "Funded startup", emoji: "🦄" },
      { value: "passive_income", label: "Passive income stream", emoji: "🏖️" },
    ],
    required: false,
  },
  {
    id: "creator_platforms",
    text: "Which platforms are you active on?",
    subtext: "Pick all that apply — or skip if none.",
    inputType: "multi_select",
    options: [
      { value: "twitter", label: "X / Twitter", emoji: "🐦" },
      { value: "youtube", label: "YouTube", emoji: "📺" },
      { value: "tiktok", label: "TikTok", emoji: "🎵" },
      { value: "linkedin", label: "LinkedIn", emoji: "💼" },
      { value: "newsletter", label: "Newsletter", emoji: "📧" },
      { value: "none", label: "None yet", emoji: "🆕" },
    ],
    required: false,
  },
  {
    id: "edgy_mode",
    text: "How edgy should your ideas be?",
    subtext: "This controls the creativity dial.",
    inputType: "single_select",
    options: [
      { value: "safe", label: "Keep it professional", emoji: "👔" },
      { value: "moderate", label: "A little spicy", emoji: "🌶️" },
      { value: "edgy", label: "Push boundaries", emoji: "⚡" },
      { value: "unhinged", label: "Full chaos mode", emoji: "🤯" },
    ],
    required: false,
  },
  {
    id: "hell_no_filters",
    text: "Any hard no's?",
    subtext: "We'll never suggest these. Pick all that apply.",
    inputType: "multi_select",
    options: [
      { value: "dropshipping", label: "Dropshipping", emoji: "📦" },
      { value: "mlm", label: "MLM / network marketing", emoji: "🔺" },
      { value: "crypto", label: "Crypto / Web3", emoji: "🪙" },
      { value: "adult", label: "Adult content", emoji: "🔞" },
      { value: "gambling", label: "Gambling", emoji: "🎰" },
      { value: "none", label: "No filters — show me everything", emoji: "🌊" },
    ],
    required: false,
  },
  {
    id: "commitment_level",
    text: "How serious are you right now?",
    subtext: "Be real — it helps us calibrate.",
    inputType: "slider",
    sliderConfig: {
      min: 1,
      max: 10,
      step: 1,
      labels: {
        1: "Just curious",
        4: "Exploring",
        7: "Ready to act",
        10: "All in",
      },
    },
    required: false,
  },
];
