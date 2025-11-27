import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  UserIntakeExtended, 
  BusinessArchetype, 
  WorkPreference, 
  PersonalityFlags 
} from "@/types/intake";
import { toast } from "sonner";

export type ExtendedIntakeData = {
  deep_desires: string;
  fears: string;
  identity_statements: string;
  energy_givers: string;
  energy_drainers: string;
  business_archetypes: BusinessArchetype[];
  work_preferences: WorkPreference[];
  personality_flags: PersonalityFlags;
};

const defaultData: ExtendedIntakeData = {
  deep_desires: "",
  fears: "",
  identity_statements: "",
  energy_givers: "",
  energy_drainers: "",
  business_archetypes: [],
  work_preferences: [],
  personality_flags: {
    wants_autopilot: false,
    wants_to_be_face: false,
    wants_predictable_income: false,
    thrives_under_pressure: false,
    prefers_structure: false,
    loves_experimenting: false,
  },
};

export function useExtendedIntake() {
  const { user } = useAuth();
  const [data, setData] = useState<ExtendedIntakeData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  // Load existing data on mount
  useEffect(() => {
    async function loadData() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data: existing, error } = await supabase
          .from("user_intake_extended")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (existing) {
          setExistingId(existing.id);
          setData({
            deep_desires: existing.deep_desires || "",
            fears: existing.fears || "",
            identity_statements: existing.identity_statements || "",
            energy_givers: existing.energy_givers || "",
            energy_drainers: existing.energy_drainers || "",
            business_archetypes: (existing.business_archetypes as BusinessArchetype[]) || [],
            work_preferences: (existing.work_preferences as WorkPreference[]) || [],
            personality_flags: (existing.personality_flags as PersonalityFlags) || defaultData.personality_flags,
          });
        }
      } catch (err) {
        console.error("Error loading extended intake:", err);
        toast.error("Failed to load your profile data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user?.id]);

  // Update a field
  const updateField = useCallback(<K extends keyof ExtendedIntakeData>(
    field: K,
    value: ExtendedIntakeData[K]
  ) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Save current data
  const save = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      toast.error("You must be logged in");
      return false;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        deep_desires: data.deep_desires || null,
        fears: data.fears || null,
        identity_statements: data.identity_statements || null,
        energy_givers: data.energy_givers || null,
        energy_drainers: data.energy_drainers || null,
        business_archetypes: data.business_archetypes,
        work_preferences: data.work_preferences,
        personality_flags: data.personality_flags,
      };

      if (existingId) {
        const { error } = await supabase
          .from("user_intake_extended")
          .update(payload)
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("user_intake_extended")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setExistingId(inserted.id);
      }

      return true;
    } catch (err) {
      console.error("Error saving extended intake:", err);
      toast.error("Failed to save your progress");
      return false;
    } finally {
      setSaving(false);
    }
  }, [user?.id, data, existingId]);

  return {
    data,
    updateField,
    save,
    loading,
    saving,
  };
}
