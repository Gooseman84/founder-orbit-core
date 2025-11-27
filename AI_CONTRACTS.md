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

---

## Implementation Notes

- All AI calls should go through Supabase Edge Functions
- Use Lovable AI Gateway (google/gemini-2.5-flash model by default)
- Always validate input schemas before sending to AI
- Handle rate limits (429) and payment errors (402) gracefully
- Use tool calling for structured output extraction when needed
