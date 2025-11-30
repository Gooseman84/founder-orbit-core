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
import { Button } from "@/components/ui/button";
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
    capital_available?: number | null;
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
  const [capitalAvailable, setCapitalAvailable] = useState<number | "">("");
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

  // Initialize state when drawer opens
  useEffect(() => {
    if (open && section) {
      // Core data
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

      // Extended data
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
        // Extended profile sections
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

        // Check if extended profile exists
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

  const renderContent = () => {
    switch (section) {
      case "passions":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="passions-text">What are you passionate about?</Label>
              <Textarea
                id="passions-text"
                value={passionsText}
                onChange={(e) => setPassionsText(e.target.value)}
                placeholder="Describe what excites and drives you..."
                className="mt-1.5"
                rows={4}
              />
            </div>
            <div>
              <Label>Passion Tags</Label>
              <TagInput
                tags={passionsTags}
                onTagsChange={setPassionsTags}
                placeholder="Add tags..."
              />
            </div>
          </div>
        );

      case "skills":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="skills-text">What are your key skills?</Label>
              <Textarea
                id="skills-text"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                placeholder="Describe your expertise and capabilities..."
                className="mt-1.5"
                rows={4}
              />
            </div>
            <div>
              <Label>Skill Tags</Label>
              <TagInput
                tags={skillsTags}
                onTagsChange={setSkillsTags}
                placeholder="Add tags..."
              />
            </div>
          </div>
        );

      case "constraints":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="time">Hours available per week</Label>
              <Input
                id="time"
                type="number"
                value={timePerWeek}
                onChange={(e) => setTimePerWeek(e.target.value ? Number(e.target.value) : "")}
                placeholder="e.g., 20"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="capital">Capital available ($)</Label>
              <Input
                id="capital"
                type="number"
                value={capitalAvailable}
                onChange={(e) => setCapitalAvailable(e.target.value ? Number(e.target.value) : "")}
                placeholder="e.g., 5000"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Risk Tolerance</Label>
              <Select value={riskTolerance} onValueChange={setRiskTolerance}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select risk tolerance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tech Level</Label>
              <Select value={techLevel} onValueChange={setTechLevel}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select tech level" />
                </SelectTrigger>
                <SelectContent>
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
              <Label htmlFor="lifestyle">Lifestyle Goals</Label>
              <Textarea
                id="lifestyle"
                value={lifestyleGoals}
                onChange={(e) => setLifestyleGoals(e.target.value)}
                placeholder="What does your ideal lifestyle look like?"
                className="mt-1.5"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="vision">Success Vision</Label>
              <Textarea
                id="vision"
                value={successVision}
                onChange={(e) => setSuccessVision(e.target.value)}
                placeholder="How do you define success?"
                className="mt-1.5"
                rows={4}
              />
            </div>
          </div>
        );

      case "deep_desires":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="desires">Deep Desires</Label>
              <Textarea
                id="desires"
                value={deepDesires}
                onChange={(e) => setDeepDesires(e.target.value)}
                placeholder="What do you truly want to achieve?"
                className="mt-1.5"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="fears">Fears</Label>
              <Textarea
                id="fears"
                value={fears}
                onChange={(e) => setFears(e.target.value)}
                placeholder="What are you afraid of?"
                className="mt-1.5"
                rows={4}
              />
            </div>
          </div>
        );

      case "energy":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="givers">Energy Givers</Label>
              <Textarea
                id="givers"
                value={energyGivers}
                onChange={(e) => setEnergyGivers(e.target.value)}
                placeholder="What activities give you energy?"
                className="mt-1.5"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="drainers">Energy Drainers</Label>
              <Textarea
                id="drainers"
                value={energyDrainers}
                onChange={(e) => setEnergyDrainers(e.target.value)}
                placeholder="What activities drain your energy?"
                className="mt-1.5"
                rows={4}
              />
            </div>
          </div>
        );

      case "identity":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="identity">Identity Statements</Label>
              <Textarea
                id="identity"
                value={identityStatements}
                onChange={(e) => setIdentityStatements(e.target.value)}
                placeholder="How do you see yourself? (e.g., 'I am a builder who...')"
                className="mt-1.5"
                rows={6}
              />
            </div>
          </div>
        );

      case "archetypes":
        return (
          <div className="space-y-3">
            <Label>Select business models that appeal to you</Label>
            <div className="grid grid-cols-2 gap-2">
              {ARCHETYPE_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    businessArchetypes.includes(opt.value)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => toggleArrayItem(businessArchetypes, opt.value, setBusinessArchetypes)}
                >
                  <span className="text-sm">{opt.label}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "work_preferences":
        return (
          <div className="space-y-3">
            <Label>Select work types you enjoy</Label>
            <div className="grid grid-cols-2 gap-2">
              {WORK_PREF_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    workPreferences.includes(opt.value)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => toggleArrayItem(workPreferences, opt.value, setWorkPreferences)}
                >
                  <span className="text-sm">{opt.label}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "personality":
        return (
          <div className="space-y-3">
            <Label>Select traits that describe you</Label>
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
                  <Label htmlFor={flag.key} className="cursor-pointer">
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
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>{SECTION_TITLES[section]}</DrawerTitle>
          <DrawerDescription>Make changes to your profile section below.</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto">{renderContent()}</div>
        <DrawerFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
