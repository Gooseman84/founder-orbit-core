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
      agent_decisions: {
        Row: {
          agent_name: string
          approved: boolean | null
          approved_at: string | null
          confidence: number | null
          created_at: string | null
          decision_type: string
          id: string
          inputs: Json
          outputs: Json
          reasoning: string | null
          requires_approval: boolean | null
          risk_level: string | null
          user_id: string
        }
        Insert: {
          agent_name: string
          approved?: boolean | null
          approved_at?: string | null
          confidence?: number | null
          created_at?: string | null
          decision_type: string
          id?: string
          inputs: Json
          outputs: Json
          reasoning?: string | null
          requires_approval?: boolean | null
          risk_level?: string | null
          user_id: string
        }
        Update: {
          agent_name?: string
          approved?: boolean | null
          approved_at?: string | null
          confidence?: number | null
          created_at?: string | null
          decision_type?: string
          id?: string
          inputs?: Json
          outputs?: Json
          reasoning?: string | null
          requires_approval?: boolean | null
          risk_level?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_memory: {
        Row: {
          created_at: string | null
          id: string
          memory_data: Json
          memory_path: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          memory_data: Json
          memory_path: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          memory_data?: Json
          memory_path?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_code: string
          created_at: string
          description: string
          icon: string
          id: string
          title: string
          xp_reward: number
        }
        Insert: {
          badge_code: string
          created_at?: string
          description: string
          icon: string
          id?: string
          title: string
          xp_reward?: number
        }
        Update: {
          badge_code?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
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
      daily_reflections: {
        Row: {
          ai_micro_actions: Json | null
          ai_suggested_task: Json | null
          ai_summary: string | null
          ai_theme: string | null
          blockers: string | null
          created_at: string
          energy_level: number | null
          id: string
          metadata: Json | null
          mood_tags: string[] | null
          reflection_date: string
          stress_level: number | null
          top_priority: string | null
          updated_at: string
          user_id: string
          what_did: string | null
          what_felt: string | null
          what_learned: string | null
        }
        Insert: {
          ai_micro_actions?: Json | null
          ai_suggested_task?: Json | null
          ai_summary?: string | null
          ai_theme?: string | null
          blockers?: string | null
          created_at?: string
          energy_level?: number | null
          id?: string
          metadata?: Json | null
          mood_tags?: string[] | null
          reflection_date?: string
          stress_level?: number | null
          top_priority?: string | null
          updated_at?: string
          user_id: string
          what_did?: string | null
          what_felt?: string | null
          what_learned?: string | null
        }
        Update: {
          ai_micro_actions?: Json | null
          ai_suggested_task?: Json | null
          ai_summary?: string | null
          ai_theme?: string | null
          blockers?: string | null
          created_at?: string
          energy_level?: number | null
          id?: string
          metadata?: Json | null
          mood_tags?: string[] | null
          reflection_date?: string
          stress_level?: number | null
          top_priority?: string | null
          updated_at?: string
          user_id?: string
          what_did?: string | null
          what_felt?: string | null
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
      founder_blueprints: {
        Row: {
          ai_recommendations: Json | null
          ai_summary: string | null
          capital_available: number | null
          created_at: string | null
          current_commitments: string | null
          distribution_channels: string | null
          energy_pattern: string | null
          focus_quarters: Json | null
          id: string
          income_target: number | null
          last_refreshed_at: string | null
          life_time_horizon: string | null
          life_vision: string | null
          monetization_strategy: string | null
          non_negotiables: string | null
          north_star_idea_id: string | null
          north_star_one_liner: string | null
          offer_model: string | null
          preferred_work_style: string | null
          problem_statement: string | null
          promise_statement: string | null
          risk_profile: string | null
          runway_notes: string | null
          status: string
          strengths: string | null
          success_metrics: Json | null
          target_audience: string | null
          time_available_hours_per_week: number | null
          traction_definition: string | null
          unfair_advantage: string | null
          updated_at: string | null
          user_id: string
          validation_stage: string | null
          version: number
          weaknesses: string | null
        }
        Insert: {
          ai_recommendations?: Json | null
          ai_summary?: string | null
          capital_available?: number | null
          created_at?: string | null
          current_commitments?: string | null
          distribution_channels?: string | null
          energy_pattern?: string | null
          focus_quarters?: Json | null
          id?: string
          income_target?: number | null
          last_refreshed_at?: string | null
          life_time_horizon?: string | null
          life_vision?: string | null
          monetization_strategy?: string | null
          non_negotiables?: string | null
          north_star_idea_id?: string | null
          north_star_one_liner?: string | null
          offer_model?: string | null
          preferred_work_style?: string | null
          problem_statement?: string | null
          promise_statement?: string | null
          risk_profile?: string | null
          runway_notes?: string | null
          status?: string
          strengths?: string | null
          success_metrics?: Json | null
          target_audience?: string | null
          time_available_hours_per_week?: number | null
          traction_definition?: string | null
          unfair_advantage?: string | null
          updated_at?: string | null
          user_id: string
          validation_stage?: string | null
          version?: number
          weaknesses?: string | null
        }
        Update: {
          ai_recommendations?: Json | null
          ai_summary?: string | null
          capital_available?: number | null
          created_at?: string | null
          current_commitments?: string | null
          distribution_channels?: string | null
          energy_pattern?: string | null
          focus_quarters?: Json | null
          id?: string
          income_target?: number | null
          last_refreshed_at?: string | null
          life_time_horizon?: string | null
          life_vision?: string | null
          monetization_strategy?: string | null
          non_negotiables?: string | null
          north_star_idea_id?: string | null
          north_star_one_liner?: string | null
          offer_model?: string | null
          preferred_work_style?: string | null
          problem_statement?: string | null
          promise_statement?: string | null
          risk_profile?: string | null
          runway_notes?: string | null
          status?: string
          strengths?: string | null
          success_metrics?: Json | null
          target_audience?: string | null
          time_available_hours_per_week?: number | null
          traction_definition?: string | null
          unfair_advantage?: string | null
          updated_at?: string | null
          user_id?: string
          validation_stage?: string | null
          version?: number
          weaknesses?: string | null
        }
        Relationships: []
      }
      founder_generated_ideas: {
        Row: {
          created_at: string | null
          id: string
          idea: Json
          idea_id: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          idea: Json
          idea_id: string
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          idea?: Json
          idea_id?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      founder_interviews: {
        Row: {
          context_summary: Json | null
          created_at: string | null
          id: string
          status: string
          transcript: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context_summary?: Json | null
          created_at?: string | null
          id?: string
          status?: string
          transcript?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context_summary?: Json | null
          created_at?: string | null
          id?: string
          status?: string
          transcript?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      founder_profiles: {
        Row: {
          business_type_preference: string | null
          capital_available: number | null
          commitment_level: number | null
          commitment_level_text: string | null
          context_summary: Json | null
          created_at: string
          creator_platforms: string[] | null
          desired_identity: string | null
          edgy_mode: string | null
          energy_source: string | null
          entry_trigger: string | null
          future_vision: string | null
          hours_per_week: number | null
          id: string
          interview_completed_at: string | null
          learning_style: string | null
          lifestyle_goals: string | null
          open_to_memetic_ideas: boolean | null
          open_to_personas: boolean | null
          passions_tags: string[] | null
          passions_text: string | null
          profile: Json
          risk_tolerance: string | null
          skills_tags: string[] | null
          skills_text: string | null
          structured_onboarding_completed_at: string | null
          success_vision: string | null
          tech_level: string | null
          time_per_week: number | null
          updated_at: string
          user_id: string
          wants_money_systems: boolean | null
          work_personality: string[] | null
        }
        Insert: {
          business_type_preference?: string | null
          capital_available?: number | null
          commitment_level?: number | null
          commitment_level_text?: string | null
          context_summary?: Json | null
          created_at?: string
          creator_platforms?: string[] | null
          desired_identity?: string | null
          edgy_mode?: string | null
          energy_source?: string | null
          entry_trigger?: string | null
          future_vision?: string | null
          hours_per_week?: number | null
          id?: string
          interview_completed_at?: string | null
          learning_style?: string | null
          lifestyle_goals?: string | null
          open_to_memetic_ideas?: boolean | null
          open_to_personas?: boolean | null
          passions_tags?: string[] | null
          passions_text?: string | null
          profile?: Json
          risk_tolerance?: string | null
          skills_tags?: string[] | null
          skills_text?: string | null
          structured_onboarding_completed_at?: string | null
          success_vision?: string | null
          tech_level?: string | null
          time_per_week?: number | null
          updated_at?: string
          user_id: string
          wants_money_systems?: boolean | null
          work_personality?: string[] | null
        }
        Update: {
          business_type_preference?: string | null
          capital_available?: number | null
          commitment_level?: number | null
          commitment_level_text?: string | null
          context_summary?: Json | null
          created_at?: string
          creator_platforms?: string[] | null
          desired_identity?: string | null
          edgy_mode?: string | null
          energy_source?: string | null
          entry_trigger?: string | null
          future_vision?: string | null
          hours_per_week?: number | null
          id?: string
          interview_completed_at?: string | null
          learning_style?: string | null
          lifestyle_goals?: string | null
          open_to_memetic_ideas?: boolean | null
          open_to_personas?: boolean | null
          passions_tags?: string[] | null
          passions_text?: string | null
          profile?: Json
          risk_tolerance?: string | null
          skills_tags?: string[] | null
          skills_text?: string | null
          structured_onboarding_completed_at?: string | null
          success_vision?: string | null
          tech_level?: string | null
          time_per_week?: number | null
          updated_at?: string
          user_id?: string
          wants_money_systems?: boolean | null
          work_personality?: string[] | null
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
          automation_density: number | null
          autonomy_level: number | null
          business_model_type: string | null
          category: string | null
          chaos_factor: number | null
          complexity: string | null
          constraint_fit_score: number | null
          created_at: string
          culture_tailwind: number | null
          description: string | null
          engine_version: string | null
          fit_scores: Json | null
          fusion_metadata: Json | null
          id: string
          leverage_score: number | null
          lifestyle_fit_score: number | null
          mode: string | null
          normalized: Json | null
          overall_fit_score: number | null
          parent_idea_ids: string[] | null
          passion_fit_score: number | null
          platform: string | null
          shock_factor: number | null
          skill_fit_score: number | null
          source_meta: Json
          source_type: Database["public"]["Enums"]["idea_source_type"]
          status: string | null
          target_customer: string | null
          time_to_first_dollar: string | null
          title: string
          user_id: string
          virality_potential: number | null
        }
        Insert: {
          automation_density?: number | null
          autonomy_level?: number | null
          business_model_type?: string | null
          category?: string | null
          chaos_factor?: number | null
          complexity?: string | null
          constraint_fit_score?: number | null
          created_at?: string
          culture_tailwind?: number | null
          description?: string | null
          engine_version?: string | null
          fit_scores?: Json | null
          fusion_metadata?: Json | null
          id?: string
          leverage_score?: number | null
          lifestyle_fit_score?: number | null
          mode?: string | null
          normalized?: Json | null
          overall_fit_score?: number | null
          parent_idea_ids?: string[] | null
          passion_fit_score?: number | null
          platform?: string | null
          shock_factor?: number | null
          skill_fit_score?: number | null
          source_meta?: Json
          source_type?: Database["public"]["Enums"]["idea_source_type"]
          status?: string | null
          target_customer?: string | null
          time_to_first_dollar?: string | null
          title: string
          user_id: string
          virality_potential?: number | null
        }
        Update: {
          automation_density?: number | null
          autonomy_level?: number | null
          business_model_type?: string | null
          category?: string | null
          chaos_factor?: number | null
          complexity?: string | null
          constraint_fit_score?: number | null
          created_at?: string
          culture_tailwind?: number | null
          description?: string | null
          engine_version?: string | null
          fit_scores?: Json | null
          fusion_metadata?: Json | null
          id?: string
          leverage_score?: number | null
          lifestyle_fit_score?: number | null
          mode?: string | null
          normalized?: Json | null
          overall_fit_score?: number | null
          parent_idea_ids?: string[] | null
          passion_fit_score?: number | null
          platform?: string | null
          shock_factor?: number | null
          skill_fit_score?: number | null
          source_meta?: Json
          source_type?: Database["public"]["Enums"]["idea_source_type"]
          status?: string | null
          target_customer?: string | null
          time_to_first_dollar?: string | null
          title?: string
          user_id?: string
          virality_potential?: number | null
        }
        Relationships: []
      }
      market_signal_domains: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          is_active: boolean | null
          priority: string
          subreddits: string[]
        }
        Insert: {
          created_at?: string | null
          domain: string
          id?: string
          is_active?: boolean | null
          priority: string
          subreddits?: string[]
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          is_active?: boolean | null
          priority?: string
          subreddits?: string[]
        }
        Relationships: []
      }
      market_signal_runs: {
        Row: {
          created_at: string | null
          founder_profile_snapshot: Json | null
          id: string
          selected_domains: string[]
          selected_subreddits: string[]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          founder_profile_snapshot?: Json | null
          id?: string
          selected_domains: string[]
          selected_subreddits: string[]
          user_id: string
        }
        Update: {
          created_at?: string | null
          founder_profile_snapshot?: Json | null
          id?: string
          selected_domains?: string[]
          selected_subreddits?: string[]
          user_id?: string
        }
        Relationships: []
      }
      master_prompts: {
        Row: {
          context_hash: string | null
          created_at: string
          id: string
          idea_id: string
          platform_mode: string | null
          platform_target: string | null
          prompt_body: string
          source_updated_at: string | null
          user_id: string
        }
        Insert: {
          context_hash?: string | null
          created_at?: string
          id?: string
          idea_id: string
          platform_mode?: string | null
          platform_target?: string | null
          prompt_body: string
          source_updated_at?: string | null
          user_id: string
        }
        Update: {
          context_hash?: string | null
          created_at?: string
          id?: string
          idea_id?: string
          platform_mode?: string | null
          platform_target?: string | null
          prompt_body?: string
          source_updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      milestones: {
        Row: {
          created_at: string
          description: string
          id: string
          milestone_code: string
          title: string
          trigger_type: string
          trigger_value: number
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          milestone_code: string
          title: string
          trigger_type: string
          trigger_value: number
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          milestone_code?: string
          title?: string
          trigger_type?: string
          trigger_value?: number
          xp_reward?: number
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
      onboarding_analytics: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      opportunity_scores: {
        Row: {
          created_at: string
          explanation: string | null
          id: string
          idea_id: string
          recommendations: Json | null
          sub_scores: Json | null
          total_score: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          explanation?: string | null
          id?: string
          idea_id: string
          recommendations?: Json | null
          sub_scores?: Json | null
          total_score?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          explanation?: string | null
          id?: string
          idea_id?: string
          recommendations?: Json | null
          sub_scores?: Json | null
          total_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_scores_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
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
      support_tickets: {
        Row: {
          admin_response: string | null
          created_at: string
          id: string
          message: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
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
          source: string | null
          status: string | null
          title: string
          type: string | null
          user_id: string
          venture_id: string | null
          week_number: number | null
          workspace_document_id: string | null
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
          source?: string | null
          status?: string | null
          title: string
          type?: string | null
          user_id: string
          venture_id?: string | null
          week_number?: number | null
          workspace_document_id?: string | null
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
          source?: string | null
          status?: string | null
          title?: string
          type?: string | null
          user_id?: string
          venture_id?: string | null
          week_number?: number | null
          workspace_document_id?: string | null
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
          {
            foreignKeyName: "tasks_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_document_id_fkey"
            columns: ["workspace_document_id"]
            isOneToOne: false
            referencedRelation: "workspace_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_intake_extended: {
        Row: {
          business_archetypes: Json | null
          created_at: string
          deep_desires: string | null
          energy_drainers: string | null
          energy_givers: string | null
          fears: string | null
          id: string
          identity_statements: string | null
          personality_flags: Json | null
          updated_at: string
          user_id: string
          work_preferences: Json | null
        }
        Insert: {
          business_archetypes?: Json | null
          created_at?: string
          deep_desires?: string | null
          energy_drainers?: string | null
          energy_givers?: string | null
          fears?: string | null
          id?: string
          identity_statements?: string | null
          personality_flags?: Json | null
          updated_at?: string
          user_id: string
          work_preferences?: Json | null
        }
        Update: {
          business_archetypes?: Json | null
          created_at?: string
          deep_desires?: string | null
          energy_drainers?: string | null
          energy_givers?: string | null
          fears?: string | null
          id?: string
          identity_statements?: string | null
          personality_flags?: Json | null
          updated_at?: string
          user_id?: string
          work_preferences?: Json | null
        }
        Relationships: []
      }
      user_milestones: {
        Row: {
          earned_at: string
          id: string
          milestone_id: string
          user_id: string
        }
        Insert: {
          earned_at?: string
          id?: string
          milestone_id: string
          user_id: string
        }
        Update: {
          earned_at?: string
          id?: string
          milestone_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_milestones_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          cancel_at: string | null
          created_at: string | null
          current_period_end: string | null
          id: string
          plan: string
          renewal_period: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan?: string
          renewal_period?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan?: string
          renewal_period?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      venture_daily_checkins: {
        Row: {
          checkin_date: string
          completion_status: string
          created_at: string
          explanation: string | null
          id: string
          reflection: string | null
          user_id: string
          venture_id: string
        }
        Insert: {
          checkin_date?: string
          completion_status: string
          created_at?: string
          explanation?: string | null
          id?: string
          reflection?: string | null
          user_id: string
          venture_id: string
        }
        Update: {
          checkin_date?: string
          completion_status?: string
          created_at?: string
          explanation?: string | null
          id?: string
          reflection?: string | null
          user_id?: string
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_daily_checkins_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_daily_tasks: {
        Row: {
          append_count: number
          created_at: string
          id: string
          task_date: string
          tasks: Json
          updated_at: string
          user_id: string
          venture_id: string
        }
        Insert: {
          append_count?: number
          created_at?: string
          id?: string
          task_date?: string
          tasks?: Json
          updated_at?: string
          user_id: string
          venture_id: string
        }
        Update: {
          append_count?: number
          created_at?: string
          id?: string
          task_date?: string
          tasks?: Json
          updated_at?: string
          user_id?: string
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_daily_tasks_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_plans: {
        Row: {
          ai_raw: Json | null
          created_at: string
          end_date: string
          id: string
          plan_type: string
          start_date: string
          summary: string | null
          updated_at: string
          user_id: string
          venture_id: string
        }
        Insert: {
          ai_raw?: Json | null
          created_at?: string
          end_date: string
          id?: string
          plan_type?: string
          start_date: string
          summary?: string | null
          updated_at?: string
          user_id: string
          venture_id: string
        }
        Update: {
          ai_raw?: Json | null
          created_at?: string
          end_date?: string
          id?: string
          plan_type?: string
          start_date?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_plans_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      ventures: {
        Row: {
          commitment_end_at: string | null
          commitment_start_at: string | null
          commitment_window_days: number | null
          created_at: string
          id: string
          idea_id: string | null
          name: string
          status: string
          success_metric: string | null
          updated_at: string
          user_id: string
          venture_state: Database["public"]["Enums"]["venture_state"]
        }
        Insert: {
          commitment_end_at?: string | null
          commitment_start_at?: string | null
          commitment_window_days?: number | null
          created_at?: string
          id?: string
          idea_id?: string | null
          name: string
          status?: string
          success_metric?: string | null
          updated_at?: string
          user_id: string
          venture_state?: Database["public"]["Enums"]["venture_state"]
        }
        Update: {
          commitment_end_at?: string | null
          commitment_start_at?: string | null
          commitment_window_days?: number | null
          created_at?: string
          id?: string
          idea_id?: string | null
          name?: string
          status?: string
          success_metric?: string | null
          updated_at?: string
          user_id?: string
          venture_state?: Database["public"]["Enums"]["venture_state"]
        }
        Relationships: [
          {
            foreignKeyName: "ventures_idea_id_fkey"
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
          folder_id: string | null
          id: string
          idea_id: string | null
          linked_task_id: string | null
          metadata: Json | null
          source_id: string | null
          source_type: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          venture_id: string | null
        }
        Insert: {
          ai_suggestions?: string | null
          content?: string | null
          created_at?: string
          doc_type?: string | null
          folder_id?: string | null
          id?: string
          idea_id?: string | null
          linked_task_id?: string | null
          metadata?: Json | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          venture_id?: string | null
        }
        Update: {
          ai_suggestions?: string | null
          content?: string | null
          created_at?: string
          doc_type?: string | null
          folder_id?: string | null
          id?: string
          idea_id?: string | null
          linked_task_id?: string | null
          metadata?: Json | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          venture_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "workspace_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_documents_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_documents_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_folder_id: string | null
          updated_at: string
          user_id: string
          venture_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_folder_id?: string | null
          updated_at?: string
          user_id: string
          venture_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_folder_id?: string | null
          updated_at?: string
          user_id?: string
          venture_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "workspace_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_folders_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
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
      get_user_subscription: {
        Args: { p_user_id: string }
        Returns: {
          cancel_at: string
          created_at: string
          current_period_end: string
          id: string
          plan: string
          renewal_period: string
          status: string
          user_id: string
        }[]
      }
      get_user_total_xp: { Args: { p_user_id: string }; Returns: number }
    }
    Enums: {
      idea_source_type: "generated" | "market_signal" | "imported" | "fused"
      venture_state:
        | "inactive"
        | "committed"
        | "executing"
        | "reviewed"
        | "killed"
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
    Enums: {
      idea_source_type: ["generated", "market_signal", "imported", "fused"],
      venture_state: [
        "inactive",
        "committed",
        "executing",
        "reviewed",
        "killed",
      ],
    },
  },
} as const
