export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      check_ins: {
        Row: {
          created_at: string
          feelings: string | null
          id: string
          user_id: string
          what_did: string | null
          what_learned: string | null
        }
        Insert: {
          created_at?: string
          feelings?: string | null
          id?: string
          user_id: string
          what_did?: string | null
          what_learned?: string | null
        }
        Update: {
          created_at?: string
          feelings?: string | null
          id?: string
          user_id?: string
          what_did?: string | null
          what_learned?: string | null
        }
        Relationships: []
      }
      daily_streaks: {
        Row: {
          current_streak: number
          id: string
          last_completed_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_completed_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_completed_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_items: {
        Row: {
          body: string
          created_at: string
          cta_action: string | null
          cta_label: string | null
          id: string
          idea_id: string | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
          xp_reward: number | null
        }
        Insert: {
          body: string
          created_at?: string
          cta_action?: string | null
          cta_label?: string | null
          id?: string
          idea_id?: string | null
          metadata?: Json | null
          title: string
          type: string
          user_id: string
          xp_reward?: number | null
        }
        Update: {
          body?: string
          created_at?: string
          cta_action?: string | null
          cta_label?: string | null
          id?: string
          idea_id?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      founder_profiles: {
        Row: {
          capital_available: number | null
          created_at: string
          id: string
          lifestyle_goals: string | null
          passions_tags: string[] | null
          passions_text: string | null
          risk_tolerance: string | null
          skills_tags: string[] | null
          skills_text: string | null
          success_vision: string | null
          tech_level: string | null
          time_per_week: number | null
          user_id: string
        }
        Insert: {
          capital_available?: number | null
          created_at?: string
          id?: string
          lifestyle_goals?: string | null
          passions_tags?: string[] | null
          passions_text?: string | null
          risk_tolerance?: string | null
          skills_tags?: string[] | null
          skills_text?: string | null
          success_vision?: string | null
          tech_level?: string | null
          time_per_week?: number | null
          user_id: string
        }
        Update: {
          capital_available?: number | null
          created_at?: string
          id?: string
          lifestyle_goals?: string | null
          passions_tags?: string[] | null
          passions_text?: string | null
          risk_tolerance?: string | null
          skills_tags?: string[] | null
          skills_text?: string | null
          success_vision?: string | null
          tech_level?: string | null
          time_per_week?: number | null
          user_id?: string
        }
        Relationships: []
      }
      idea_analysis: {
        Row: {
          biggest_risks: Json | null
          brutal_honesty: string | null
          competition_snapshot: string | null
          created_at: string
          elevator_pitch: string | null
          id: string
          idea_id: string
          ideal_customer_profile: string | null
          market_insight: string | null
          niche_score: number | null
          pricing_power: string | null
          problem_intensity: string | null
          recommendations: Json | null
          success_likelihood: string | null
          unfair_advantages: Json | null
          user_id: string
        }
        Insert: {
          biggest_risks?: Json | null
          brutal_honesty?: string | null
          competition_snapshot?: string | null
          created_at?: string
          elevator_pitch?: string | null
          id?: string
          idea_id: string
          ideal_customer_profile?: string | null
          market_insight?: string | null
          niche_score?: number | null
          pricing_power?: string | null
          problem_intensity?: string | null
          recommendations?: Json | null
          success_likelihood?: string | null
          unfair_advantages?: Json | null
          user_id: string
        }
        Update: {
          biggest_risks?: Json | null
          brutal_honesty?: string | null
          competition_snapshot?: string | null
          created_at?: string
          elevator_pitch?: string | null
          id?: string
          idea_id?: string
          ideal_customer_profile?: string | null
          market_insight?: string | null
          niche_score?: number | null
          pricing_power?: string | null
          problem_intensity?: string | null
          recommendations?: Json | null
          success_likelihood?: string | null
          unfair_advantages?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_analysis_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: true
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          business_model_type: string | null
          complexity: string | null
          constraint_fit_score: number | null
          created_at: string
          description: string | null
          id: string
          lifestyle_fit_score: number | null
          overall_fit_score: number | null
          passion_fit_score: number | null
          skill_fit_score: number | null
          status: string | null
          target_customer: string | null
          time_to_first_dollar: string | null
          title: string
          user_id: string
        }
        Insert: {
          business_model_type?: string | null
          complexity?: string | null
          constraint_fit_score?: number | null
          created_at?: string
          description?: string | null
          id?: string
          lifestyle_fit_score?: number | null
          overall_fit_score?: number | null
          passion_fit_score?: number | null
          skill_fit_score?: number | null
          status?: string | null
          target_customer?: string | null
          time_to_first_dollar?: string | null
          title: string
          user_id: string
        }
        Update: {
          business_model_type?: string | null
          complexity?: string | null
          constraint_fit_score?: number | null
          created_at?: string
          description?: string | null
          id?: string
          lifestyle_fit_score?: number | null
          overall_fit_score?: number | null
          passion_fit_score?: number | null
          skill_fit_score?: number | null
          status?: string | null
          target_customer?: string | null
          time_to_first_dollar?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      master_prompts: {
        Row: {
          created_at: string
          id: string
          idea_id: string
          platform_target: string | null
          prompt_body: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id: string
          platform_target?: string | null
          prompt_body: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string
          platform_target?: string | null
          prompt_body?: string
          user_id?: string
        }
        Relationships: []
      }
      niche_radar: {
        Row: {
          created_at: string
          description: string
          id: string
          idea_id: string | null
          metadata: Json | null
          priority_score: number | null
          recommended_action: string | null
          signal_type: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          idea_id?: string | null
          metadata?: Json | null
          priority_score?: number | null
          recommended_action?: string | null
          signal_type: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          idea_id?: string | null
          metadata?: Json | null
          priority_score?: number | null
          recommended_action?: string | null
          signal_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      pulse_checks: {
        Row: {
          ai_insight: string | null
          created_at: string
          emotional_state: string | null
          energy_level: number | null
          id: string
          metadata: Json | null
          recommended_action: string | null
          reflection: string | null
          stress_level: number | null
          user_id: string
        }
        Insert: {
          ai_insight?: string | null
          created_at?: string
          emotional_state?: string | null
          energy_level?: number | null
          id?: string
          metadata?: Json | null
          recommended_action?: string | null
          reflection?: string | null
          stress_level?: number | null
          user_id: string
        }
        Update: {
          ai_insight?: string | null
          created_at?: string
          emotional_state?: string | null
          energy_level?: number | null
          id?: string
          metadata?: Json | null
          recommended_action?: string | null
          reflection?: string | null
          stress_level?: number | null
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_minutes: number | null
          feed_item_id: string | null
          id: string
          idea_id: string | null
          metadata: Json | null
          status: string | null
          title: string
          type: string | null
          user_id: string
          xp_reward: number | null
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          feed_item_id?: string | null
          id?: string
          idea_id?: string | null
          metadata?: Json | null
          status?: string | null
          title: string
          type?: string | null
          user_id: string
          xp_reward?: number | null
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          feed_item_id?: string | null
          id?: string
          idea_id?: string | null
          metadata?: Json | null
          status?: string | null
          title?: string
          type?: string | null
          user_id?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_documents: {
        Row: {
          ai_suggestions: string | null
          content: string | null
          created_at: string
          doc_type: string | null
          id: string
          idea_id: string | null
          metadata: Json | null
          source_id: string | null
          source_type: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_suggestions?: string | null
          content?: string | null
          created_at?: string
          doc_type?: string | null
          id?: string
          idea_id?: string | null
          metadata?: Json | null
          source_id?: string | null
          source_type?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_suggestions?: string | null
          content?: string | null
          created_at?: string
          doc_type?: string | null
          id?: string
          idea_id?: string | null
          metadata?: Json | null
          source_id?: string | null
          source_type?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          amount: number
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_total_xp: { Args: { p_user_id: string }; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
