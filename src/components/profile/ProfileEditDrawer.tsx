import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TagInput } from "@/components/onboarding/TagInput";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export type ProfileSection =
  | "passions"
  | "skills"
  | "constraints"
  | "vision"
  | "deep_desires"
  | "energy"
  | "identity"
  | "archetypes"
  | "work_preferences"
  | "personality";

interface ProfileEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: ProfileSection | null;
  coreData: {
    passions_text?: string | null;
    passions_tags?: string[] | null;
    skills_text?: string | null;
    skills_tags?: string[] | null;
    time_per_week?: number | null;
    capital_available?: string | null;
    risk_tolerance?: string | null;
    tech_level?: string | null;
    lifestyle_goals?: string | null;
    success_vision?: string | null;
  } | null;
  extendedData: {
    deep_desires?: string | null;
    fears?: string | null;
    energy_givers?: string | null;
    energy_drainers?: string | null;
    identity_statements?: string | null;
    business_archetypes?: string[] | null;
    work_preferences?: string[] | null;
    personality_flags?: Record<string, boolean> | null;
  } | null;
  onSaved: () => void;
}

const SECTION_TITLES: Record<ProfileSection, string> = {
  passions: "Edit Passions",
  skills: "Edit Skills",
  constraints: "Edit Constraints & Resources",
  vision: "Edit Vision & Goals",
  deep_desires: "Edit Deep Desires & Fears",
  energy: "Edit Energy Profile",
  identity: "Edit Identity Statements",
  archetypes: "Edit Business Archetypes",
  work_preferences: "Edit Work Preferences",
  personality: "Edit Personality Traits",
};

const ARCHETYPE_OPTIONS = [
  { value: "digital_products", label: "Digital Products" },
  { value: "ai_tools", label: "AI Tools" },
  { value: "content_brand", label: "Content Brand" },
  { value: "saas", label: "SaaS" },
  { value: "service_agency", label: "Service/Agency" },
  { value: "local_business", label: "Local Business" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "licensing", label: "Licensing" },
  { value: "coaching_consulting", label: "Coaching/Consulting" },
  { value: "buying_businesses", label: "Buying Businesses" },
];

const WORK_PREF_OPTIONS = [
  { value: "talking_to_people", label: "Talking to People" },
  { value: "writing", label: "Writing" },
  { value: "designing", label: "Designing" },
  { value: "problem_solving", label: "Problem Solving" },
  { value: "analyzing_data", label: "Analyzing Data" },
  { value: "leading_teams", label: "Leading Teams" },
  { value: "selling", label: "Selling" },
  { value: "building_systems", label: "Building Systems" },
  { value: "creative_work", label: "Creative Work" },
];

const PERSONALITY_FLAGS = [
  { key: "wants_autopilot", label: "Wants Autopilot Business" },
  { key: "wants_to_be_face", label: "Wants to Be the Face" },
  { key: "wants_predictable_income", label: "Prefers Predictable Income" },
  { key: "thrives_under_pressure", label: "Thrives Under Pressure" },
  { key: "prefers_structure", label: "Prefers Structure" },
  { key: "loves_experimenting", label: "Loves Experimenting" },
];

export function ProfileEditDrawer({
  open,
  onOpenChange,
  section,
  coreData,
  extendedData,
  onSaved,
}: ProfileEditDrawerProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Core profile state
  const [passionsText, setPassionsText] = useState("");
  const [passionsTags, setPassionsTags] = useState<string[]>([]);
  const [skillsText, setSkillsText] = useState("");
  const [skillsTags, setSkillsTags] = useState<string[]>([]);
  const [timePerWeek, setTimePerWeek] = useState<number | "">("");
  const [capitalAvailable, setCapitalAvailable] = useState<string>("");
  const [riskTolerance, setRiskTolerance] = useState("");
  const [techLevel, setTechLevel] = useState("");
  const [lifestyleGoals, setLifestyleGoals] = useState("");
  const [successVision, setSuccessVision] = useState("");

  // Extended profile state
  const [deepDesires, setDeepDesires] = useState("");
  const [fears, setFears] = useState("");
  const [energyGivers, setEnergyGivers] = useState("");
  const [energyDrainers, setEnergyDrainers] = useState("");
  const [identityStatements, setIdentityStatements] = useState("");
  const [businessArchetypes, setBusinessArchetypes] = useState<string[]>([]);
  const [workPreferences, setWorkPreferences] = useState<string[]>([]);
  const [personalityFlags, setPersonalityFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open && section) {
      setPassionsText(coreData?.passions_text || "");
      setPassionsTags(coreData?.passions_tags || []);
      setSkillsText(coreData?.skills_text || "");
      setSkillsTags(coreData?.skills_tags || []);
      setTimePerWeek(coreData?.time_per_week || "");
      setCapitalAvailable(coreData?.capital_available || "");
      setRiskTolerance(coreData?.risk_tolerance || "");
      setTechLevel(coreData?.tech_level || "");
      setLifestyleGoals(coreData?.lifestyle_goals || "");
      setSuccessVision(coreData?.success_vision || "");
      setDeepDesires(extendedData?.deep_desires || "");
      setFears(extendedData?.fears || "");
      setEnergyGivers(extendedData?.energy_givers || "");
      setEnergyDrainers(extendedData?.energy_drainers || "");
      setIdentityStatements(extendedData?.identity_statements || "");
      setBusinessArchetypes(extendedData?.business_archetypes || []);
      setWorkPreferences(extendedData?.work_preferences || []);
      setPersonalityFlags(extendedData?.personality_flags || {});
    }
  }, [open, section, coreData, extendedData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const isCoreSection = ["passions", "skills", "constraints", "vision"].includes(section || "");

      if (isCoreSection) {
        const updateData: Record<string, unknown> = {};
        if (section === "passions") {
          updateData.passions_text = passionsText;
          updateData.passions_tags = passionsTags;
        } else if (section === "skills") {
          updateData.skills_text = skillsText;
          updateData.skills_tags = skillsTags;
        } else if (section === "constraints") {
          updateData.time_per_week = timePerWeek || null;
          updateData.capital_available = capitalAvailable || null;
          updateData.risk_tolerance = riskTolerance || null;
          updateData.tech_level = techLevel || null;
        } else if (section === "vision") {
          updateData.lifestyle_goals = lifestyleGoals;
          updateData.success_vision = successVision;
        }
        const { error } = await supabase
          .from("founder_profiles")
          .update(updateData)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const updateData: Record<string, unknown> = {};
        if (section === "deep_desires") {
          updateData.deep_desires = deepDesires;
          updateData.fears = fears;
        } else if (section === "energy") {
          updateData.energy_givers = energyGivers;
          updateData.energy_drainers = energyDrainers;
        } else if (section === "identity") {
          updateData.identity_statements = identityStatements;
        } else if (section === "archetypes") {
          updateData.business_archetypes = businessArchetypes;
        } else if (section === "work_preferences") {
          updateData.work_preferences = workPreferences;
        } else if (section === "personality") {
          updateData.personality_flags = personalityFlags;
        }
        const { data: existing } = await supabase
          .from("user_intake_extended")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (existing) {
          const { error } = await supabase
            .from("user_intake_extended")
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq("user_id", user.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("user_intake_extended")
            .insert({ user_id: user.id, ...updateData });
          if (error) throw error;
        }
      }
      toast({ title: "Profile updated", description: "Your changes have been saved." });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (arr: string[], item: string, setter: (arr: string[]) => void) => {
    if (arr.includes(item)) {
      setter(arr.filter(i => i !== item));
    } else {
      setter([...arr, item]);
    }
  };

  const fieldLabelClass = "font-mono-tb text-[0.65rem] uppercase tracking-wider block mb-1.5";
  const fieldLabelStyle = { color: "hsl(43 52% 54%)" };

  const renderContent = () => {
    switch (section) {
      case "passions":
        return (
          <div className="space-y-4">
            <div>
              <label className={fieldLabelClass} style={fieldLabelStyle}>What are you passionate about?</label>
              <Textarea
                value={passionsText}
                onChange={(e) => setPassionsText(e.target.value)}
                placeholder="Describe what excites and drives you..."
                rows={4}
                style={{ borderRadius: 0, borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
                className="font-light focus:border-primary"
              />
            </div>
            <div>
              <label className={fieldLabelClass} style={fieldLabelStyle}>Passion Tags</label>
              <TagInput tags={passionsTags} onTagsChange={setPassionsTags} placeholder="Add tags..." />
            </div>
          </div>
        );
      case "skills":
        return (
          <div className="space-y-4">
            <div>
              <label className={fieldLabelClass} style={fieldLabelStyle}>What are your key skills?</label>
              <Textarea
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                placeholder="Describe your expertise and capabilities..."
                rows={4}
                style={{ borderRadius: 0, borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
                className="font-light focus:border-primary"
              />
            </div>
            <div>
              <label className={fieldLabelClass} style={fieldLabelStyle}>Skill Tags</label>
              <TagInput tags={skillsTags} onTagsChange={setSkillsTags} placeholder="Add tags..." />
            </div>
          </div>
        );
      case "constraints":
        return (
          <div className="space-y-4">
            <div>
              <label className={fieldLabelClass} style={fieldLabelStyle}>Hours available per week</label>
              <Input
                type="number"
                value={timePerWeek}
                onChange={(e) => setTimePerWeek(e.target.value ? Number(e.target.value) : "")}
                placeholder="e.g., 20"
                style={{ borderRadius: 0, borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
                className="focus:border-primary"
              />
            </div>
            <div>
              <label className={fieldLabelClass} style={fieldLabelStyle}>Capital available ($)</label>
              <Input
                type="number"
                value={capitalAvailable}
                onChange={(e) => setCapitalAvailable(e.target.value)}
                placeholder="e.g., 5000"
                style={{ borderRadius: 0, borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
                className="focus:border-primary"
              />
            </div>
            <div>
              <label className={fieldLabelClass} style={fieldLabelStyle}>Risk Tolerance</label>
              <Select value={riskTolerance} onValueChange={setRiskTolerance}>
                <SelectTrigger style={{ borderRadius: 0, borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}>
                  <SelectValue placeholder="Select risk tolerance" />
                </SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={fieldLabelClass} style={fieldLabelStyle}>Tech Level</label>
              <Select value={techLevel} onValueChange={setTechLevel}>
                <SelectTrigger style={{ borderRadius: 0, borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}>
                  <SelectValue placeholder="Select tech level" />
                </SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value="non-technical">Non-technical</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "vision":
        return (
          <div className="space-y-4">
            <div>
              <label className={fieldLabelClass} style={fieldLabelStyle}>Lifestyle Goals</label>
              <Textarea
                value={lifestyleGoals}
                onChange={(e) => setLifestyleGoals(e.target.value)}
                placeholder="What does your ideal lifestyle look like?"
                rows={4}
                style={{ borderRadius: 0, borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
                className="font-light focus:border-primary"
              />
            </div>
            <div>
              <label className={fieldLabelClass} style={fieldLabelStyle}>Success Vision</label>
              <Textarea
                value={successVision}
                onChange={(e) => setSuccessVision(e.target.value)}
                placeholder="How do you define success?"
                rows={4}
                style={{ borderRadius: 0, borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
                className="font-light focus:border-primary"
              />
            </div>
          </div>
        );
      case "deep_desires":
        return (
          <div className="space-y-4">
            <div>
              <label className={fieldLabelClass} style={fieldLabelStyle}>Deep Desires</label>
              <Textarea
                value={deepDesires}
                onChange={(e) => setDeepDesires(e.target.value)}
                placeholder="What do you truly want to achieve?"
                rows={4}
                style={{ borderRadius: 0, borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
                className="font-light focus:border-primary"
              />
            </div>
            <div>
              <label className={fieldLabelClass} style={fieldLabelStyle}>Fears</label>
              <Textarea
                value={fears}
                onChange={(e) => setFears(e.target.value)}
                placeholder="What are you afraid of?"
                rows={4}
                style={{ borderRadius: 0, borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
                className="font-light focus:border-primary"
              />
            </div>
          </div>
        );
      case "energy":
        return (
          <div className="space-y-4">
            <div>
              <label className={fieldLabelClass} style={fieldLabelStyle}>Energy Givers</label>
              <Textarea
                value={energyGivers}
                onChange={(e) => setEnergyGivers(e.target.value)}
                placeholder="What activities give you energy?"
                rows={4}
                style={{ borderRadius: 0, borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
                className="font-light focus:border-primary"
              />
            </div>
            <div>
              <label className={fieldLabelClass} style={fieldLabelStyle}>Energy Drainers</label>
              <Textarea
                value={energyDrainers}
                onChange={(e) => setEnergyDrainers(e.target.value)}
                placeholder="What activities drain your energy?"
                rows={4}
                style={{ borderRadius: 0, borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
                className="font-light focus:border-primary"
              />
            </div>
          </div>
        );
      case "identity":
        return (
          <div className="space-y-4">
            <div>
              <label className={fieldLabelClass} style={fieldLabelStyle}>Identity Statements</label>
              <Textarea
                value={identityStatements}
                onChange={(e) => setIdentityStatements(e.target.value)}
                placeholder="How do you see yourself? (e.g., 'I am a builder who...')"
                rows={6}
                style={{ borderRadius: 0, borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
                className="font-light focus:border-primary"
              />
            </div>
          </div>
        );
      case "archetypes":
        return (
          <div className="space-y-3">
            <label className={fieldLabelClass} style={fieldLabelStyle}>Select business models that appeal to you</label>
            <div className="grid grid-cols-2 gap-2">
              {ARCHETYPE_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  className="p-3 border cursor-pointer transition-all duration-200"
                  style={{
                    borderColor: businessArchetypes.includes(opt.value)
                      ? "hsl(43 52% 54%)"
                      : "hsl(240 10% 14%)",
                    background: businessArchetypes.includes(opt.value)
                      ? "hsl(43 52% 54% / 0.1)"
                      : "transparent",
                  }}
                  onClick={() => toggleArrayItem(businessArchetypes, opt.value, setBusinessArchetypes)}
                >
                  <span className="text-sm" style={{ color: "hsl(40 15% 93%)" }}>{opt.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case "work_preferences":
        return (
          <div className="space-y-3">
            <label className={fieldLabelClass} style={fieldLabelStyle}>Select work types you enjoy</label>
            <div className="grid grid-cols-2 gap-2">
              {WORK_PREF_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  className="p-3 border cursor-pointer transition-all duration-200"
                  style={{
                    borderColor: workPreferences.includes(opt.value)
                      ? "hsl(43 52% 54%)"
                      : "hsl(240 10% 14%)",
                    background: workPreferences.includes(opt.value)
                      ? "hsl(43 52% 54% / 0.1)"
                      : "transparent",
                  }}
                  onClick={() => toggleArrayItem(workPreferences, opt.value, setWorkPreferences)}
                >
                  <span className="text-sm" style={{ color: "hsl(40 15% 93%)" }}>{opt.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case "personality":
        return (
          <div className="space-y-3">
            <label className={fieldLabelClass} style={fieldLabelStyle}>Select traits that describe you</label>
            <div className="space-y-2">
              {PERSONALITY_FLAGS.map((flag) => (
                <div key={flag.key} className="flex items-center space-x-3">
                  <Checkbox
                    id={flag.key}
                    checked={personalityFlags[flag.key] || false}
                    onCheckedChange={(checked) =>
                      setPersonalityFlags((prev) => ({ ...prev, [flag.key]: !!checked }))
                    }
                  />
                  <Label htmlFor={flag.key} className="cursor-pointer text-sm" style={{ color: "hsl(40 15% 93%)" }}>
                    {flag.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!section) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]" style={{ borderRadius: 0 }}>
        <DrawerHeader>
          <DrawerTitle className="font-display font-bold">{SECTION_TITLES[section]}</DrawerTitle>
          <DrawerDescription className="font-mono-tb text-[0.62rem] uppercase" style={{ color: "hsl(220 12% 58%)" }}>
            Make changes to your profile section below.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto">{renderContent()}</div>
        <DrawerFooter className="gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary text-primary-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase py-3 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />}
            SAVE CHANGES
          </button>
          <DrawerClose asChild>
            <button
              className="w-full border py-3 font-mono-tb text-[0.68rem] uppercase transition-colors hover:text-foreground"
              style={{ borderColor: "hsl(240 10% 14%)", color: "hsl(220 12% 58%)" }}
            >
              CANCEL
            </button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
