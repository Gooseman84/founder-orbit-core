# AI Contracts & Response Formats

This document defines the expected input/output formats for AI-powered features in TrueBlazer.AI.

## Generate Ideas

**Endpoint/Function:** `generate-ideas`

**Input:**
```json
{
  "profile": {
    "passions_text": "string",
    "passions_tags": ["string"],
    "skills_text": "string",
    "skills_tags": ["string"],
    "tech_level": "string",
    "time_per_week": "number",
    "capital_available": "number",
    "risk_tolerance": "low" | "medium" | "high",
    "lifestyle_goals": "string",
    "success_vision": "string"
  }
}
```

**Output:**
```json
{
  "ideas": [
    {
      "title": "string",
      "description": "string",
      "business_model_type": "string",
      "target_customer": "string",
      "time_to_first_dollar": "string",
      "complexity": "Low" | "Medium" | "High",
      "passion_fit_score": "number (0-100)",
      "skill_fit_score": "number (0-100)",
      "constraint_fit_score": "number (0-100)",
      "lifestyle_fit_score": "number (0-100)",
      "overall_fit_score": "number (0-100)"
    }
  ]
}
```

## Analyze Idea

**Endpoint/Function:** `analyze-idea`

**Input:**
```json
{
  "idea": {
    "title": "string",
    "description": "string",
    "business_model_type": "string",
    "target_customer": "string"
  },
  "profile": {
    "passions_text": "string",
    "skills_text": "string",
    "constraints": "object"
  }
}
```

**Output:**
```json
{
  "niche_score": "number (0-100)",
  "market_overview": "string",
  "problem_intensity": "string",
  "competition_snapshot": "string",
  "pricing_range": "string",
  "main_risks": ["string"],
  "brutal_take": "string",
  "suggested_modifications": "string"
}
```

## Generate Master Prompt (North Star)

**Endpoint/Function:** `generate-master-prompt`

**Input:**
```json
{
  "profile": "object",
  "chosen_idea": "object",
  "analysis": "object"
}
```

**Output:**
```json
{
  "master_prompt": "string (comprehensive guidance prompt for the founder's journey)"
}
```

## Generate Feed Items

**Endpoint/Function:** `generate-feed-items`

**Input:**
```json
{
  "profile": "object",
  "current_idea": "object",
  "recent_activity": ["object"]
}
```

**Output:**
```json
{
  "feed_items": [
    {
      "type": "insight" | "competitor_signal" | "idea_tweak" | "motivation",
      "title": "string",
      "content": "string",
      "action_label": "string (optional)",
      "action_url": "string (optional)"
    }
  ]
}
```

## Generate Micro Tasks

**Endpoint/Function:** `generate-micro-tasks`

**Input:**
```json
{
  "profile": "object",
  "idea": "object",
  "completed_tasks": ["object"]
}
```

**Output:**
```json
{
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "category": "string",
      "estimated_minutes": "number",
      "xp_reward": "number"
    }
  ]
}
```

## Daily Pulse Check

**Endpoint/Function:** `daily-pulse-check`

**Input:**
```json
{
  "profile": "object",
  "recent_progress": "object"
}
```

**Output:**
```json
{
  "question": "string",
  "follow_up_suggestions": ["string"]
}
```

## Generate Venture Plan (30-Day Plan)

**Endpoint/Function:** `generate-venture-plan`

**Input:**
```json
{
  "ventureId": "uuid",
  "planType": "30_day",
  "startDate": "YYYY-MM-DD (optional, defaults to today)"
}
```

**Output:**
```json
{
  "plan": {
    "id": "uuid",
    "user_id": "uuid",
    "venture_id": "uuid",
    "plan_type": "30_day",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "summary": "string (2-3 sentence overview)",
    "ai_raw": {
      "summary": "string",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "weeks": [
        {
          "weekNumber": 1,
          "theme": "Foundation & Validation",
          "summary": "Focus for this week",
          "tasks": [
            {
              "title": "string",
              "description": "string",
              "weekNumber": 1,
              "suggestedDueOffsetDays": 3,
              "estimatedMinutes": 30,
              "category": "validation | build | marketing | systems | ops | other"
            }
          ]
        }
      ]
    },
    "created_at": "timestamp",
    "updated_at": "timestamp"
  },
  "tasksCreated": ["task-id-1", "task-id-2", ...]
}
```

**Plan Design Principles:**
- Week 1: Foundation & Validation - Clarify offer, quick validation signals
- Week 2: Build & Test - Create MVP, get feedback
- Week 3: Launch & Learn - Soft launch, gather testimonials
- Week 4: Scale & Systematize - Double down on what works

**Task Constraints:**
- 5-10 tasks per week
- 15-60 minutes per task
- Respects founder's hoursPerWeek, riskTolerance, and energy patterns
- Categories: validation, build, marketing, systems, ops, other

---

## Implementation Notes

- All AI calls should go through Supabase Edge Functions
- Use Lovable AI Gateway (google/gemini-2.5-flash model by default)
- Always validate input schemas before sending to AI
- Handle rate limits (429) and payment errors (402) gracefully
- Use tool calling for structured output extraction when needed
