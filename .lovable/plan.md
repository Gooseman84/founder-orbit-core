

## Fix: Blueprint generation fails despite JSON cleaning

### Problem

The edge function logs prove that `cleanAIJsonResponse` IS working -- the cleaned text starts with `{` (valid JSON start). But `JSON.parse` still throws. This means:

- The markdown fence stripping works fine
- The JSON **content itself** is malformed (likely trailing commas, unescaped characters, or other subtle syntax errors that the AI produces)
- The current code also doesn't log the actual parse error message (`err` is caught but never logged), making debugging harder

### Solution

Two-pronged fix applied to both `generate-blueprint` and `refresh-blueprint`:

**1. Add `response_format: { type: "json_object" }` to the AI API call**

This is an OpenAI-compatible parameter supported by the Lovable AI gateway. It instructs the model to:
- Return raw, valid JSON (no markdown fences)
- Enforce JSON syntax correctness at the token level

This eliminates the root cause entirely -- no more fence stripping needed, no more malformed JSON.

**2. Keep `cleanAIJsonResponse` as a safety net + log the actual error**

If the model somehow still returns wrapped JSON, the cleaning catches it. Additionally, the actual `err.message` from `JSON.parse` will be logged so we can see exactly what character/position fails.

### Files Changed

**`supabase/functions/generate-blueprint/index.ts`**
- Add `response_format: { type: "json_object" }` to the API request body (around line 873)
- Log `err.message` in the catch block (line 929)

**`supabase/functions/refresh-blueprint/index.ts`**
- Add `response_format: { type: "json_object" }` to the API request body
- Log `parseError.message` in the catch block

Both functions will be redeployed after changes.

### Verification
- Blueprint generation should complete without parse errors
- Logs should show clean JSON without ` ```json ` fences
- The "Building Your Blueprint" stepper should complete all 8 steps and redirect to the Blueprint page

