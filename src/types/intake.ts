export type BusinessArchetype =
  | "digital_products"
  | "ai_tools"
  | "content_brand"
  | "saas"
  | "service_agency"
  | "local_business"
  | "ecommerce"
  | "licensing"
  | "coaching_consulting"
  | "buying_businesses";

export type WorkPreference =
  | "talking_to_people"
  | "writing"
  | "designing"
  | "problem_solving"
  | "analyzing_data"
  | "leading_teams"
  | "selling"
  | "building_systems"
  | "creative_work";

export type PersonalityFlags = {
  wants_autopilot?: boolean;
  wants_to_be_face?: boolean;
  wants_predictable_income?: boolean;
  thrives_under_pressure?: boolean;
  prefers_structure?: boolean;
  loves_experimenting?: boolean;
};

export type UserIntakeExtended = {
  id: string;
  user_id: string;
  deep_desires: string | null;
  fears: string | null;
  identity_statements: string | null;
  energy_givers: string | null;
  energy_drainers: string | null;
  business_archetypes: BusinessArchetype[] | null;
  work_preferences: WorkPreference[] | null;
  personality_flags: PersonalityFlags | null;
  created_at: string;
  updated_at: string;
};
