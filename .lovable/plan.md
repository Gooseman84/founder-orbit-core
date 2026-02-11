

## Problem

The "Interview ID not found" error occurs because the summary page receives interview insights via navigation state but **without** the interview ID. This happens when the Mavrik interview finishes and navigates to `/discover/summary` -- it passes the `insights` object but omits the `interviewId`. Since insights are found in navigation state, the code skips the database fetch entirely (line 52-56), leaving `interviewId` as `null`. When you click "Update & show me ideas", the correction handler checks for `interviewId` and throws the error.

## Fix

**File: `src/pages/DiscoverSummary.tsx`** (lines 47-57)

Update the `loadInsights` function so that when insights come from navigation state but the interview ID is missing, it fetches the interview ID from the database:

```typescript
const loadInsights = async () => {
  const stateInsights = location.state?.insights as InterviewInsights | undefined;
  const stateInterviewId = location.state?.interviewId as string | undefined;

  if (stateInsights) {
    setInsights(stateInsights);

    if (stateInterviewId) {
      setInterviewId(stateInterviewId);
    } else {
      // Insights came from nav state but no interview ID -- fetch it from DB
      const { data } = await supabase
        .from("founder_interviews")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setInterviewId(data?.id || null);
    }
    setIsLoading(false);
    return;
  }

  // ... rest of DB fetch stays the same
};
```

This is a one-file, ~10-line change. The correction flow will work because the interview ID will always be resolved before the user can tap "Update & show me ideas."

