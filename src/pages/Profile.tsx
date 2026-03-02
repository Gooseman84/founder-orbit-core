import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useFounderProfile } from "@/hooks/useFounderProfile";
import { useXP } from "@/hooks/useXP";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LevelBadge } from "@/components/shared/LevelBadge";
import { XpProgressBar } from "@/components/shared/XpProgressBar";
import { ProfileEditDrawer, ProfileSection } from "@/components/profile/ProfileEditDrawer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ContextInspector from "@/pages/ContextInspector";
import { PageHelp } from "@/components/shared/PageHelp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronRight,
  AlertCircle,
  Info,
  Trash2,
  Loader2
} from "lucide-react";

const ARCHETYPE_LABELS: Record<string, string> = {
  digital_products: "Digital Products",
  ai_tools: "AI Tools",
  content_brand: "Content Brand",
  saas: "SaaS",
  service_agency: "Service/Agency",
  local_business: "Local Business",
  ecommerce: "E-commerce",
  licensing: "Licensing",
  coaching_consulting: "Coaching/Consulting",
  buying_businesses: "Buying Businesses",
};

const WORK_PREF_LABELS: Record<string, string> = {
  talking_to_people: "Talking to People",
  writing: "Writing",
  designing: "Designing",
  problem_solving: "Problem Solving",
  analyzing_data: "Analyzing Data",
  leading_teams: "Leading Teams",
  selling: "Selling",
  building_systems: "Building Systems",
  creative_work: "Creative Work",
};

const PERSONALITY_FLAG_LABELS: Record<string, string> = {
  wants_autopilot: "Wants Autopilot Business",
  wants_to_be_face: "Wants to Be the Face",
  wants_predictable_income: "Prefers Predictable Income",
  thrives_under_pressure: "Thrives Under Pressure",
  prefers_structure: "Prefers Structure",
  loves_experimenting: "Loves Experimenting",
};

// Reusable gold tag
function GoldTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-mono-tb text-[0.62rem] uppercase border px-2 py-[3px] inline-block"
      style={{
        borderColor: "hsl(43 52% 54% / 0.35)",
        color: "hsl(43 52% 54%)",
        background: "hsl(43 52% 54% / 0.1)",
      }}
    >
      {children}
    </span>
  );
}

// Section card wrapper
function SectionCard({
  title,
  subtitle,
  onEdit,
  children,
}: {
  title: string;
  subtitle: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="border transition-all duration-200 hover:bg-[hsl(240_10%_10%)]"
      style={{
        background: "hsl(240 12% 7%)",
        borderColor: "hsl(240 10% 14%)",
        borderLeft: "2px solid hsl(43 52% 54%)",
        padding: "24px 28px",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget.style as any).borderLeftColor = "hsl(43 60% 65%)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget.style as any).borderLeftColor = "hsl(43 52% 54%)";
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-2.5">
          <span className="text-[0.7rem] mt-0.5" style={{ color: "hsl(43 52% 54%)" }}>◆</span>
          <div>
            <h3 className="font-sans text-[0.9rem] font-medium" style={{ color: "hsl(40 15% 93%)" }}>
              {title}
            </h3>
            <p className="font-mono-tb text-[0.65rem] uppercase mt-0.5 mb-3" style={{ color: "hsl(220 12% 58%)" }}>
              {subtitle}
            </p>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="font-mono-tb text-[0.62rem] uppercase transition-colors hover:text-primary"
          style={{ color: "hsl(220 12% 58%)" }}
        >
          EDIT
        </button>
      </div>
      <div className="pl-5">{children}</div>
    </div>
  );
}

const Profile = () => {
  const navigate = useNavigate();
  const { profile, loading, error, refresh } = useFounderProfile();
  const { xpSummary, loading: xpLoading } = useXP();

  const [editSection, setEditSection] = useState<ProfileSection | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const openEditor = (section: ProfileSection) => {
    setEditSection(section);
    setDrawerOpen(true);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setIsDeleting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("delete-account");
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      await supabase.auth.signOut();
      toast({ title: "Account deleted", description: "Your account and all data have been permanently removed." });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Deletion failed", description: err.message || "Please try again or contact support.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteConfirmText("");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div
          className="border p-6 flex items-center gap-2"
          style={{ borderColor: "hsl(0 65% 52% / 0.3)", color: "hsl(0 65% 52%)" }}
        >
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const { core, extended, hasCore, hasExtended } = profile;
  const interviewComplete = hasCore;

  const bodyText = "text-[0.85rem] font-light leading-[1.65]";
  const bodyColor = { color: "hsl(220 12% 58%)" };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-[1px]" style={{ background: "hsl(43 52% 54%)" }} />
          <span className="font-mono-tb text-[0.68rem] uppercase tracking-wider" style={{ color: "hsl(43 52% 54%)" }}>
            FOUNDER PROFILE
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-3xl" style={{ color: "hsl(40 15% 93%)" }}>
              Your intelligence layer.
            </h1>
            <p className="font-light text-[0.95rem] mt-2" style={{ color: "hsl(220 12% 58%)" }}>
              Everything below powers your FVS, Mavrik interview, and all AI recommendations.
            </p>
          </div>
          {!xpLoading && xpSummary && (
            <LevelBadge level={xpSummary.level} />
          )}
        </div>
      </div>

      {/* XP Progress */}
      {!xpLoading && xpSummary && (
        <div
          className="border p-5"
          style={{ borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
        >
          <XpProgressBar
            totalXp={xpSummary.totalXp}
            level={xpSummary.level}
            nextLevelXp={xpSummary.nextLevelXp}
            currentLevelMinXp={xpSummary.currentLevelMinXp}
            progressPercent={xpSummary.progressPercent}
          />
        </div>
      )}

      {/* Mavrik Interview Status Card */}
      <div
        className="relative border"
        style={{
          background: "hsl(240 12% 7%)",
          borderColor: "hsl(240 10% 14%)",
          padding: "28px 32px",
        }}
      >
        {/* Top gold accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, hsl(43 52% 54%), transparent)" }} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono-tb text-[0.65rem] uppercase" style={{ color: "hsl(43 52% 54%)" }}>
                  MAVRIK INTERVIEW
                </span>
                {interviewComplete ? (
                  <span
                    className="font-mono-tb text-[0.62rem] uppercase border px-2 py-[3px]"
                    style={{
                      borderColor: "hsl(142 50% 42% / 0.35)",
                      color: "hsl(142 50% 42%)",
                      background: "hsl(142 50% 42% / 0.08)",
                    }}
                  >
                    COMPLETE
                  </span>
                ) : (
                  <span
                    className="font-mono-tb text-[0.62rem] uppercase border px-2 py-[3px]"
                    style={{
                      borderColor: "hsl(43 52% 54% / 0.35)",
                      color: "hsl(43 52% 54%)",
                      background: "hsl(43 52% 54% / 0.1)",
                    }}
                  >
                    NOT STARTED
                  </span>
                )}
              </div>
              <p className={`${bodyText} max-w-lg`} style={bodyColor}>
                {hasCore
                  ? "Each conversation helps Mavrik learn more about you — your strengths, preferences, and blind spots get sharper."
                  : "Have a conversation with your AI co-founder. Mavrik will map your skills, passions, and constraints to generate personalized venture ideas."
                }
              </p>
              {interviewComplete && core?.created_at && (
                <p className="font-mono-tb text-[0.62rem] mt-2" style={{ color: "hsl(220 12% 58%)" }}>
                  Profile created {new Date(core.created_at).toLocaleDateString()}
                </p>
              )}
              {hasCore && (
                <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "hsl(220 12% 58% / 0.7)" }}>
                  <Info className="h-3 w-3" />
                  Your profile data directly powers idea generation, opportunity scoring, and blueprint creation.
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate("/discover")}
            className="shrink-0 border font-mono-tb text-[0.68rem] uppercase transition-colors hover:text-foreground"
            style={{
              borderColor: "hsl(240 10% 14%)",
              color: "hsl(220 12% 58%)",
              padding: "10px 20px",
            }}
          >
            {hasCore ? "TALK TO MAVRIK" : "START INTERVIEW"}
            <ChevronRight className="h-3.5 w-3.5 ml-1.5 inline" />
          </button>
        </div>
      </div>

      {/* Core Profile Sections */}
      {hasCore && core && (
        <>
          {/* Passions */}
          <SectionCard
            title="Passions"
            subtitle="Used for idea matching"
            onEdit={() => openEditor("passions")}
          >
            {core.passions_text && (
              <>
                <p className={bodyText} style={bodyColor}>{core.passions_text}</p>
                <p className="font-mono-tb text-[0.58rem] uppercase mt-2" style={{ color: "hsl(220 12% 58% / 0.6)" }}>
                  Auto-populated from your Mavrik interview · Edit to refine
                </p>
              </>
            )}
            {core.passions_tags && core.passions_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {core.passions_tags.map((tag, i) => (
                  <GoldTag key={i}>{tag}</GoldTag>
                ))}
              </div>
            )}
            {!core.passions_text && (!core.passions_tags || core.passions_tags.length === 0) && (
              <p className="font-display italic" style={{ color: "hsl(220 12% 58%)" }}>No passions added yet</p>
            )}
          </SectionCard>

          {/* Skills */}
          <SectionCard
            title="Skills"
            subtitle="Used for founder-fit scoring"
            onEdit={() => openEditor("skills")}
          >
            {core.skills_text && (
              <>
                <p className={bodyText} style={bodyColor}>{core.skills_text}</p>
                <p className="font-mono-tb text-[0.58rem] uppercase mt-2" style={{ color: "hsl(220 12% 58% / 0.6)" }}>
                  Auto-populated from your Mavrik interview · Edit to refine
                </p>
              </>
            )}
            {core.skills_tags && core.skills_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {core.skills_tags.map((tag, i) => (
                  <GoldTag key={i}>{tag}</GoldTag>
                ))}
              </div>
            )}
            {!core.skills_text && (!core.skills_tags || core.skills_tags.length === 0) && (
              <p className="font-display italic" style={{ color: "hsl(220 12% 58%)" }}>No skills added yet</p>
            )}
          </SectionCard>

          {/* Constraints */}
          <SectionCard
            title="Constraints & Resources"
            subtitle="Used for feasibility analysis"
            onEdit={() => openEditor("constraints")}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "TIME/WEEK", value: core.time_per_week ? `${core.time_per_week} hrs` : "—" },
                { label: "CAPITAL", value: core.capital_available ? `$${core.capital_available.toLocaleString()}` : "—" },
                { label: "RISK TOLERANCE", value: core.risk_tolerance || "—" },
                { label: "TECH LEVEL", value: core.tech_level || "—" },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <p className="font-mono-tb text-[0.62rem] uppercase" style={{ color: "hsl(220 12% 58%)" }}>
                    {item.label}
                  </p>
                  <p className="font-display font-bold text-lg capitalize" style={{ color: "hsl(40 15% 93%)" }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Vision */}
          <SectionCard
            title="Vision & Goals"
            subtitle="Used for lifestyle alignment"
            onEdit={() => openEditor("vision")}
          >
            {core.lifestyle_goals && (
              <div className="mb-4">
                <p className="font-mono-tb text-[0.65rem] uppercase mb-1" style={{ color: "hsl(43 52% 54%)" }}>
                  Lifestyle Goals
                </p>
                <p className={bodyText} style={bodyColor}>{core.lifestyle_goals}</p>
              </div>
            )}
            {core.success_vision && (
              <div>
                <p className="font-mono-tb text-[0.65rem] uppercase mb-1" style={{ color: "hsl(43 52% 54%)" }}>
                  Success Vision
                </p>
                <div
                  className="font-display italic text-[1.1rem] leading-[1.6] pl-5"
                  style={{
                    color: "hsl(40 15% 93%)",
                    borderLeft: "4px solid hsl(43 52% 54%)",
                  }}
                >
                  {core.success_vision}
                </div>
              </div>
            )}
            {!core.lifestyle_goals && !core.success_vision && (
              <p className="font-display italic" style={{ color: "hsl(220 12% 58%)" }}>No vision defined yet</p>
            )}
          </SectionCard>
        </>
      )}

      {/* Extended Profile Sections */}
      {hasExtended && extended && (
        <>
          <div className="pt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-[1px]" style={{ background: "hsl(43 52% 54%)" }} />
              <span className="font-mono-tb text-[0.68rem] uppercase tracking-wider" style={{ color: "hsl(43 52% 54%)" }}>
                EXTENDED PROFILE
              </span>
            </div>
          </div>

          {/* Deep Desires & Fears */}
          <SectionCard
            title="Deep Desires & Fears"
            subtitle="Your inner motivations"
            onEdit={() => openEditor("deep_desires")}
          >
            {extended.deep_desires && (
              <div className="mb-4">
                <p className="font-mono-tb text-[0.65rem] uppercase mb-1" style={{ color: "hsl(43 52% 54%)" }}>Deep Desires</p>
                <p className={`${bodyText} whitespace-pre-wrap`} style={bodyColor}>{extended.deep_desires}</p>
              </div>
            )}
            {extended.fears && (
              <div>
                <p className="font-mono-tb text-[0.65rem] uppercase mb-1" style={{ color: "hsl(43 52% 54%)" }}>Fears</p>
                <p className={`${bodyText} whitespace-pre-wrap`} style={bodyColor}>{extended.fears}</p>
              </div>
            )}
          </SectionCard>

          {/* Energy Profile */}
          <SectionCard
            title="Energy Profile"
            subtitle="What fuels and drains you"
            onEdit={() => openEditor("energy")}
          >
            {extended.energy_givers && (
              <div className="mb-4">
                <p className="font-mono-tb text-[0.65rem] uppercase mb-1" style={{ color: "hsl(43 52% 54%)" }}>Energy Givers</p>
                <p className={`${bodyText} whitespace-pre-wrap`} style={bodyColor}>{extended.energy_givers}</p>
              </div>
            )}
            {extended.energy_drainers && (
              <div>
                <p className="font-mono-tb text-[0.65rem] uppercase mb-1" style={{ color: "hsl(43 52% 54%)" }}>Energy Drainers</p>
                <p className={`${bodyText} whitespace-pre-wrap`} style={bodyColor}>{extended.energy_drainers}</p>
              </div>
            )}
          </SectionCard>

          {/* Identity */}
          {extended.identity_statements && (
            <SectionCard
              title="Identity Statements"
              subtitle="How you see yourself"
              onEdit={() => openEditor("identity")}
            >
              <div
                className="font-display italic text-[1.1rem] leading-[1.6] pl-5 whitespace-pre-wrap"
                style={{
                  color: "hsl(40 15% 93%)",
                  borderLeft: "4px solid hsl(43 52% 54%)",
                }}
              >
                {extended.identity_statements}
              </div>
            </SectionCard>
          )}

          {/* Business Archetypes */}
          {extended.business_archetypes && extended.business_archetypes.length > 0 && (
            <SectionCard
              title="Preferred Business Models"
              subtitle="Types of businesses that appeal to you"
              onEdit={() => openEditor("archetypes")}
            >
              <div className="flex flex-wrap gap-2">
                {extended.business_archetypes.map((arch, i) => (
                  <GoldTag key={i}>{ARCHETYPE_LABELS[arch] || arch}</GoldTag>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Work Preferences */}
          {extended.work_preferences && extended.work_preferences.length > 0 && (
            <SectionCard
              title="Work Preferences"
              subtitle="Types of work you enjoy"
              onEdit={() => openEditor("work_preferences")}
            >
              <div className="flex flex-wrap gap-2">
                {extended.work_preferences.map((pref, i) => (
                  <GoldTag key={i}>{WORK_PREF_LABELS[pref] || pref}</GoldTag>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Personality Flags */}
          {extended.personality_flags && (
            <SectionCard
              title="Personality Traits"
              subtitle="Your working style preferences"
              onEdit={() => openEditor("personality")}
            >
              <div className="flex flex-wrap gap-2">
                {Object.entries(extended.personality_flags)
                  .filter(([_, value]) => value === true)
                  .map(([key]) => (
                    <GoldTag key={key}>{PERSONALITY_FLAG_LABELS[key] || key}</GoldTag>
                  ))}
                {Object.values(extended.personality_flags).every(v => !v) && (
                  <p className="font-display italic" style={{ color: "hsl(220 12% 58%)" }}>No traits selected</p>
                )}
              </div>
            </SectionCard>
          )}
        </>
      )}

      {/* No Profile State */}
      {!hasCore && (
        <div
          className="border p-10 text-center"
          style={{ borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
        >
          <span className="text-[1.5rem] block mb-5" style={{ color: "hsl(43 52% 54%)" }}>◆</span>
          <p className="font-display italic text-lg mb-4" style={{ color: "hsl(220 12% 58%)" }}>
            No profile yet. Complete the onboarding to create your founder profile.
          </p>
          <button
            onClick={() => navigate("/discover")}
            className="bg-primary text-primary-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase px-5 py-2.5 transition-opacity hover:opacity-90"
          >
            START DISCOVERY
          </button>
        </div>
      )}

      {/* What TrueBlazer Knows About You */}
      <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
        <div
          className="border"
          style={{ borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
        >
          <CollapsibleTrigger asChild>
            <button
              className="w-full text-left flex items-center justify-between p-6 transition-colors hover:bg-[hsl(240_10%_10%)]"
            >
              <div className="flex items-center gap-3">
                <span className="text-[0.7rem]" style={{ color: "hsl(43 52% 54%)" }}>◆</span>
                <div>
                  <h3 className="font-sans text-[0.9rem] font-medium" style={{ color: "hsl(40 15% 93%)" }}>
                    What TrueBlazer Knows About You
                  </h3>
                  <p className="flex items-center gap-1 font-mono-tb text-[0.62rem] uppercase mt-1" style={{ color: "hsl(220 12% 58%)" }}>
                    <Info className="h-3 w-3" />
                    The data TrueBlazer uses to personalize your experience
                  </p>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${contextOpen ? 'rotate-90' : ''}`} style={{ color: "hsl(220 12% 58%)" }} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-6 pb-6">
              <ContextInspector />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Edit Drawer */}
      <ProfileEditDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        section={editSection}
        coreData={core}
        extendedData={extended}
        onSaved={refresh}
      />

      {/* Danger Zone */}
      <div
        className="border p-6"
        style={{ borderColor: "hsl(0 65% 52% / 0.3)", background: "hsl(240 12% 7%)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Trash2 className="h-4 w-4" style={{ color: "hsl(0 65% 52%)" }} />
          <h3 className="font-sans text-[0.9rem] font-medium" style={{ color: "hsl(0 65% 52%)" }}>
            Danger Zone
          </h3>
        </div>
        <p className="font-mono-tb text-[0.62rem] uppercase mb-4" style={{ color: "hsl(220 12% 58%)" }}>
          Irreversible actions
        </p>
        <Dialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setDeleteConfirmText(""); }}>
          <DialogTrigger asChild>
            <button
              className="border px-4 py-2 font-mono-tb text-[0.65rem] uppercase transition-colors hover:opacity-80"
              style={{ borderColor: "hsl(0 65% 52% / 0.35)", color: "hsl(0 65% 52%)" }}
            >
              DELETE ACCOUNT
            </button>
          </DialogTrigger>
          <DialogContent style={{ borderRadius: 0 }}>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This permanently deletes all your data and cannot be undone. Type <span className="font-mono font-bold">DELETE</span> to confirm.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="font-mono"
              style={{ borderRadius: 0 }}
            />
            <DialogFooter>
              <button
                onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText(""); }}
                className="border px-4 py-2 font-mono-tb text-[0.65rem] uppercase transition-colors hover:text-foreground"
                style={{ borderColor: "hsl(240 10% 14%)", color: "hsl(220 12% 58%)" }}
              >
                CANCEL
              </button>
              <button
                disabled={deleteConfirmText !== "DELETE" || isDeleting}
                onClick={handleDeleteAccount}
                className="border px-4 py-2 font-mono-tb text-[0.65rem] uppercase transition-colors hover:opacity-80 disabled:opacity-50"
                style={{ borderColor: "hsl(0 65% 52% / 0.35)", color: "hsl(0 65% 52%)" }}
              >
                {isDeleting ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />DELETING...</> : "PERMANENTLY DELETE"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <PageHelp
        title="Founder Profile"
        bullets={[
          "Talk to Mavrik to refine your profile — each conversation improves idea generation and scoring accuracy.",
          "Edit any section directly by clicking EDIT to correct or update what Mavrik learned.",
          "Your constraints (time, capital, risk) directly affect which ideas are recommended and how they're scored.",
          "The Context Inspector at the bottom shows exactly what data Mavrik uses when generating ideas for you.",
          "Extended profile sections (energy, identity, archetypes) unlock more personalized and nuanced recommendations.",
        ]}
      />
    </div>
  );
};

export default Profile;
