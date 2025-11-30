import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFounderProfile } from "@/hooks/useFounderProfile";
import { useXP } from "@/hooks/useXP";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LevelBadge } from "@/components/shared/LevelBadge";
import { XpProgressBar } from "@/components/shared/XpProgressBar";
import { ProfileEditDrawer, ProfileSection } from "@/components/profile/ProfileEditDrawer";
import { 
  User, 
  Heart, 
  Briefcase, 
  Clock, 
  Target,
  Sparkles,
  Zap,
  Brain,
  Lightbulb,
  Edit,
  ChevronRight,
  AlertCircle
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

const Profile = () => {
  const navigate = useNavigate();
  const { profile, loading, error, refresh } = useFounderProfile();
  const { xpSummary, loading: xpLoading } = useXP();
  
  const [editSection, setEditSection] = useState<ProfileSection | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openEditor = (section: ProfileSection) => {
    setEditSection(section);
    setDrawerOpen(true);
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
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { core, extended, hasCore, hasExtended } = profile;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with XP */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8 text-primary" />
            Your Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Your founder identity and preferences
          </p>
        </div>
        {!xpLoading && xpSummary && (
          <LevelBadge level={xpSummary.level} />
        )}
      </div>

      {/* XP Progress */}
      {!xpLoading && xpSummary && (
        <Card>
          <CardContent className="pt-6">
            <XpProgressBar
              totalXp={xpSummary.totalXp}
              level={xpSummary.level}
              nextLevelXp={xpSummary.nextLevelXp}
              currentLevelMinXp={xpSummary.currentLevelMinXp}
              progressPercent={xpSummary.progressPercent}
            />
          </CardContent>
        </Card>
      )}

      {/* Extended Profile CTA (if not completed) */}
      {hasCore && !hasExtended && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-6 w-6 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold">Complete Your Extended Profile</h3>
                  <p className="text-sm text-muted-foreground">
                    Get more personalized ideas by sharing your deeper motivations, energy patterns, and work preferences.
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate("/onboarding/extended")}>
                Complete Now
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Core Profile - Passions & Skills */}
      {hasCore && core && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Passions
                </CardTitle>
                <CardDescription>What drives and excites you</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => openEditor("passions")}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {core.passions_text && (
                <p className="text-foreground">{core.passions_text}</p>
              )}
              {core.passions_tags && core.passions_tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {core.passions_tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              )}
              {!core.passions_text && (!core.passions_tags || core.passions_tags.length === 0) && (
                <p className="text-muted-foreground italic">No passions added yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Skills
                </CardTitle>
                <CardDescription>Your expertise and capabilities</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => openEditor("skills")}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {core.skills_text && (
                <p className="text-foreground">{core.skills_text}</p>
              )}
              {core.skills_tags && core.skills_tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {core.skills_tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              )}
              {!core.skills_text && (!core.skills_tags || core.skills_tags.length === 0) && (
                <p className="text-muted-foreground italic">No skills added yet</p>
              )}
            </CardContent>
          </Card>

          {/* Constraints */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Constraints & Resources
                </CardTitle>
                <CardDescription>Your current situation and limits</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => openEditor("constraints")}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Time/Week</p>
                  <p className="font-medium">{core.time_per_week ? `${core.time_per_week} hrs` : "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Capital</p>
                  <p className="font-medium">{core.capital_available ? `$${core.capital_available.toLocaleString()}` : "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Risk Tolerance</p>
                  <p className="font-medium capitalize">{core.risk_tolerance || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Tech Level</p>
                  <p className="font-medium capitalize">{core.tech_level || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vision & Goals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Vision & Goals
                </CardTitle>
                <CardDescription>What success looks like for you</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => openEditor("vision")}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {core.lifestyle_goals && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Lifestyle Goals</p>
                  <p className="text-foreground">{core.lifestyle_goals}</p>
                </div>
              )}
              {core.success_vision && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Success Vision</p>
                  <p className="text-foreground">{core.success_vision}</p>
                </div>
              )}
              {!core.lifestyle_goals && !core.success_vision && (
                <p className="text-muted-foreground italic">No vision defined yet</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Extended Profile Sections */}
      {hasExtended && extended && (
        <>
          <div className="pt-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              Extended Profile
            </h2>
          </div>

          {/* Deep Desires & Fears */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Deep Desires & Fears
                </CardTitle>
                <CardDescription>Your inner motivations</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => openEditor("deep_desires")}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {extended.deep_desires && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Deep Desires</p>
                  <p className="text-foreground whitespace-pre-wrap">{extended.deep_desires}</p>
                </div>
              )}
              {extended.fears && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Fears</p>
                  <p className="text-foreground whitespace-pre-wrap">{extended.fears}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Energy Profile */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Energy Profile
                </CardTitle>
                <CardDescription>What fuels and drains you</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => openEditor("energy")}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {extended.energy_givers && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Energy Givers</p>
                  <p className="text-foreground whitespace-pre-wrap">{extended.energy_givers}</p>
                </div>
              )}
              {extended.energy_drainers && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Energy Drainers</p>
                  <p className="text-foreground whitespace-pre-wrap">{extended.energy_drainers}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Identity */}
          {extended.identity_statements && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Identity Statements
                  </CardTitle>
                  <CardDescription>How you see yourself</CardDescription>
                </div>
              <Button variant="ghost" size="sm" onClick={() => openEditor("identity")}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{extended.identity_statements}</p>
              </CardContent>
            </Card>
          )}

          {/* Business Archetypes */}
          {extended.business_archetypes && extended.business_archetypes.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Preferred Business Models
                  </CardTitle>
                  <CardDescription>Types of businesses that appeal to you</CardDescription>
                </div>
              <Button variant="ghost" size="sm" onClick={() => openEditor("archetypes")}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                  {extended.business_archetypes.map((arch, i) => (
                    <Badge key={i} variant="outline">
                      {ARCHETYPE_LABELS[arch] || arch}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Work Preferences */}
          {extended.work_preferences && extended.work_preferences.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Work Preferences
                  </CardTitle>
                  <CardDescription>Types of work you enjoy</CardDescription>
                </div>
              <Button variant="ghost" size="sm" onClick={() => openEditor("work_preferences")}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                  {extended.work_preferences.map((pref, i) => (
                    <Badge key={i} variant="outline">
                      {WORK_PREF_LABELS[pref] || pref}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Personality Flags */}
          {extended.personality_flags && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Personality Traits
                  </CardTitle>
                  <CardDescription>Your working style preferences</CardDescription>
                </div>
              <Button variant="ghost" size="sm" onClick={() => openEditor("personality")}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                  {Object.entries(extended.personality_flags)
                    .filter(([_, value]) => value === true)
                    .map(([key]) => (
                      <Badge key={key} variant="secondary">
                        {PERSONALITY_FLAG_LABELS[key] || key}
                      </Badge>
                    ))}
                  {Object.values(extended.personality_flags).every(v => !v) && (
                    <p className="text-muted-foreground italic">No traits selected</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* No Profile State */}
      {!hasCore && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Profile Yet</h3>
              <p className="text-muted-foreground mb-4">
                Complete the onboarding to create your founder profile.
              </p>
              <Button onClick={() => navigate("/onboarding")}>
                Start Onboarding
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Drawer */}
      <ProfileEditDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        section={editSection}
        coreData={core}
        extendedData={extended}
        onSaved={refresh}
      />
    </div>
  );
};

export default Profile;
