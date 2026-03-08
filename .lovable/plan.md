

# Fix: Mavrik Interview Stopping After Question 2

## Problem

The interview stops showing new questions after question 2 due to two conflicting behaviors:

1. The system prompt contains contradictory instructions: an early section says "Return ONLY the question text, no JSON" but a later OUTPUT CONTRACT section says to return `{ "question": "..." }` JSON. The AI model follows the later instruction and wraps questions in JSON starting around question 2-3.

2. The frontend in `Discover.tsx` filters out any AI message that starts with `{` (a filter meant to hide raw JSON summaries). This silently removes the JSON-wrapped questions from the visible transcript, making it look like the interview stopped.

3. The edge function stores the raw AI response into the transcript without unwrapping JSON, so the problem persists across page reloads.

## Solution

Two changes, both in the edge function (`supabase/functions/dynamic-founder-interview/index.ts`):

### Change 1: Remove the contradictory OUTPUT CONTRACT for question mode

Delete the OUTPUT CONTRACT block (lines 226-246) that instructs the AI to return `{ "question": "..." }` JSON. The existing RESPONSE FORMAT section (lines 112-120) already correctly says to return plain text. This eliminates the conflict at the source.

### Change 2: Add server-side JSON unwrapping as a safety net

After the AI response is received (around line 877), add a guard that detects if the response is JSON-wrapped (e.g., `{ "question": "What..." }`) and extracts just the question text before storing it in the transcript. This prevents any future model drift from breaking the interview.

```typescript
// After getting the raw question from the AI response:
let question = data.choices?.[0]?.message?.content?.trim?.() || "...fallback...";

// Safety net: unwrap if model returned JSON
if (question.startsWith("{")) {
  try {
    const parsed = JSON.parse(question);
    if (parsed.question) question = parsed.question;
  } catch { /* not valid JSON, use as-is */ }
}
```

### No frontend changes needed

The existing filter in `Discover.tsx` that removes `{`-prefixed AI messages is a reasonable safety measure for summary mode responses. With the server-side fix, question-mode responses will always be plain text by the time they reach the frontend.

## Technical Details

- **Files modified**: `supabase/functions/dynamic-founder-interview/index.ts`
- **Deployment**: Edge function will be redeployed after changes
- **Risk**: Low -- only removes a contradictory instruction and adds a defensive unwrap

