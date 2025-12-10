// supabase/functions/normalize-founder-profile/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Keep this type in sync with src/types/founderProfile.ts
// (duplicated here because edge functions can't import frontend code)

type RiskTolerance = "low" | "medium" | "high";
type Runway = "0_3_months" | "3_12_months" | "12_plus_months";

// EPIC v6 types
type WorkPersonality = "builder" | "creator" | "automation" | "faceless" | "dealmaker" | "quiet_assassin";
type CreatorPlatform = "tiktok" | "instagram" | "youtube" | "x" | "linkedin" | "email" | "none";
type EdgyMode = "safe" | "bold" | "unhinged";

type FounderProfile = {
  userId: string;
  passionsText: string;
  passionDomains: string[];
  passionDomainsOther?: string | null;
  skillsText: string;
  skillTags: string[];
  skillSpikes: {
    salesPersuasion: number;
    contentTeaching: number;
    opsSystems: number;
    productCreativity: number;
    numbersAnalysis: number;
  };
  hoursPerWeek: number;
  availableCapital: number;
  riskTolerance: RiskTolerance;
  runway: Runway;
  urgencyVsUpside: number;
  lifestyleGoalsText: string;
  visionOfSuccessText: string;
  lifestyleNonNegotiables: string[];
  primaryDesires: string[];
  energyGiversText: string;
  energyDrainersText: string;
  antiVisionText: string;
  legacyStatementText: string;
  fearStatementText: string;
  businessArchetypes: string[];
  founderRoles: string[];
  workStylePreferences: string[];
  commitmentLevel: number;
  marketSegmentsUnderstood: string[];
  existingNetworkChannels: string[];
  hellNoFilters: string[];
  // EPIC v6 fields
  workPersonality: WorkPersonality[];
  creatorPlatforms: CreatorPlatform[];
  edgyMode: EdgyMode;
  wantsMoneySystems: boolean;
  openToPersonas: boolean;
  openToMemeticIdeas: boolean;
  createdAt: string;
  updatedAt: string;
};

// Very permissive raw schema with coercion, then we normalize manually
const rawSchema = z.object({
  userId: z.string().min(1, "userId is required"),

  passionsText: z.string().trim().max(5000).optional(),
  passionDomains: z.array(z.string().trim()).max(50).optional(),
  passionDomainsOther: z.string().trim().max(500).optional().nullable(),

  skillsText: z.string().trim().max(5000).optional(),
  skillTags: z.array(z.string().trim()).max(50).optional(),
  skillSpikes: z
    .object({
      salesPersuasion: z.coerce.number().int().min(1).max(5).optional(),
      contentTeaching: z.coerce.number().int().min(1).max(5).optional(),
      opsSystems: z.coerce.number().int().min(1).max(5).optional(),
      productCreativity: z.coerce.number().int().min(1).max(5).optional(),
      numbersAnalysis: z.coerce.number().int().min(1).max(5).optional(),
    })
    .partial()
    .optional(),

  hoursPerWeek: z.coerce.number().int().min(0).max(168).optional(),
  availableCapital: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  riskTolerance: z.enum(["low", "medium", "high"]).optional(),
  runway: z.enum(["0_3_months", "3_12_months", "12_plus_months"]).optional(),
  urgencyVsUpside: z.coerce.number().int().min(1).max(5).optional(),

  lifestyleGoalsText: z.string().trim().max(5000).optional(),
  visionOfSuccessText: z.string().trim().max(5000).optional(),
  lifestyleNonNegotiables: z.array(z.string().trim()).max(20).optional(),

  primaryDesires: z.array(z.string().trim()).max(20).optional(),
  energyGiversText: z.string().trim().max(5000).optional(),
  energyDrainersText: z.string().trim().max(5000).optional(),
  antiVisionText: z.string().trim().max(5000).optional(),
  legacyStatementText: z.string().trim().max(5000).optional(),
  fearStatementText: z.string().trim().max(5000).optional(),

  businessArchetypes: z.array(z.string().trim()).max(20).optional(),
  founderRoles: z.array(z.string().trim()).max(10).optional(),
  workStylePreferences: z.array(z.string().trim()).max(20).optional(),
  commitmentLevel: z.coerce.number().int().min(0).max(5).optional(),

  marketSegmentsUnderstood: z.array(z.string().trim()).max(50).optional(),
  existingNetworkChannels: z.array(z.string().trim()).max(50).optional(),
  hellNoFilters: z.array(z.string().trim()).max(50).optional(),

  // EPIC v6 fields
  workPersonality: z.array(z.enum(["builder", "creator", "automation", "faceless", "dealmaker", "quiet_assassin"])).max(6).optional(),
  creatorPlatforms: z.array(z.enum(["tiktok", "instagram", "youtube", "x", "linkedin", "email", "none"])).max(7).optional(),
  edgyMode: z.enum(["safe", "bold", "unhinged"]).optional(),
  wantsMoneySystems: z.boolean().optional(),
  openToPersonas: z.boolean().optional(),
  openToMemeticIdeas: z.boolean().optional(),

  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

function buildProfile(raw: z.infer<typeof rawSchema>): FounderProfile {
  const now = new Date().toISOString();

  const defaultSpikes = {
    salesPersuasion: 3,
    contentTeaching: 3,
    opsSystems: 3,
    productCreativity: 3,
    numbersAnalysis: 3,
  } as const;

  const spikes = raw.skillSpikes ?? {};

  return {
    userId: raw.userId,
    passionsText: raw.passionsText ?? "",
    passionDomains: raw.passionDomains ?? [],
    passionDomainsOther: raw.passionDomainsOther ?? null,
    skillsText: raw.skillsText ?? "",
    skillTags: raw.skillTags ?? [],
    skillSpikes: {
      salesPersuasion: spikes.salesPersuasion ?? defaultSpikes.salesPersuasion,
      contentTeaching: spikes.contentTeaching ?? defaultSpikes.contentTeaching,
      opsSystems: spikes.opsSystems ?? defaultSpikes.opsSystems,
      productCreativity: spikes.productCreativity ?? defaultSpikes.productCreativity,
      numbersAnalysis: spikes.numbersAnalysis ?? defaultSpikes.numbersAnalysis,
    },
    hoursPerWeek: raw.hoursPerWeek ?? 0,
    availableCapital: raw.availableCapital ?? 0,
    riskTolerance: (raw.riskTolerance ?? "medium") as RiskTolerance,
    runway: (raw.runway ?? "3_12_months") as Runway,
    urgencyVsUpside: raw.urgencyVsUpside ?? 3,
    lifestyleGoalsText: raw.lifestyleGoalsText ?? "",
    visionOfSuccessText: raw.visionOfSuccessText ?? "",
    lifestyleNonNegotiables: raw.lifestyleNonNegotiables ?? [],
    primaryDesires: raw.primaryDesires ?? [],
    energyGiversText: raw.energyGiversText ?? "",
    energyDrainersText: raw.energyDrainersText ?? "",
    antiVisionText: raw.antiVisionText ?? "",
    legacyStatementText: raw.legacyStatementText ?? "",
    fearStatementText: raw.fearStatementText ?? "",
    businessArchetypes: raw.businessArchetypes ?? [],
    founderRoles: raw.founderRoles ?? [],
    workStylePreferences: raw.workStylePreferences ?? [],
    commitmentLevel: raw.commitmentLevel ?? 0,
    marketSegmentsUnderstood: raw.marketSegmentsUnderstood ?? [],
    existingNetworkChannels: raw.existingNetworkChannels ?? [],
    hellNoFilters: raw.hellNoFilters ?? [],
    // EPIC v6 fields
    workPersonality: (raw.workPersonality ?? []) as WorkPersonality[],
    creatorPlatforms: (raw.creatorPlatforms ?? []) as CreatorPlatform[],
    edgyMode: (raw.edgyMode ?? "bold") as EdgyMode,
    wantsMoneySystems: raw.wantsMoneySystems ?? false,
    openToPersonas: raw.openToPersonas ?? false,
    openToMemeticIdeas: raw.openToMemeticIdeas ?? false,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const json = await req.json().catch(() => null);
    if (!json || typeof json !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = rawSchema.parse(json);
    const profile = buildProfile(parsed);

    return new Response(
      JSON.stringify({ profile }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("normalize-founder-profile error", err);

    if (err instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: err.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
