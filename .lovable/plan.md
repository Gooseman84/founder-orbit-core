

## Diagnosis: Why Your Imported Idea Disappears from the Library

After investigating the code, the root cause is a **stale cache problem combined with a navigation race condition**:

1. When you import an idea, `handleImportSuccess` invalidates the ideas cache AND auto-navigates you to the idea detail page 500ms later
2. The navigation unmounts the Ideas page before the cache refetch completes
3. When you vet the idea on the IdeaDetail page, the vetting mutation (`analyzeIdea`) does NOT invalidate the `["ideas", userId]` query -- it only invalidates `["idea-analysis", ideaId]`
4. When you navigate back to Ideas, React Query may serve the old cached list that was fetched before the import completed

Additionally, there's a secondary issue: the `financial_viability_scores` table is **missing an UPDATE RLS policy**, which could cause silent errors during FVS recalculation and potentially block parts of the detail page flow.

## Plan

### 1. Fix cache invalidation after vetting (useIdeaDetail.tsx)

Add `queryClient.invalidateQueries({ queryKey: ["ideas", user?.id] })` to the `analyzeIdea` mutation's `onSuccess` handler. This ensures the library list refreshes after vetting.

### 2. Fix navigation race condition in handleImportSuccess (Ideas.tsx)

Instead of blindly navigating after 500ms, wait for the cache invalidation to settle before navigating. Use `await queryClient.invalidateQueries(...)` and then navigate.

### 3. Add missing UPDATE RLS policy on financial_viability_scores

Create a database migration to add an UPDATE policy so the `update-fvs-from-validation` flow works correctly:
```sql
CREATE POLICY "Users can update their own financial viability scores"
  ON public.financial_viability_scores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 4. Force refetch on Ideas page mount

Add a `refetchOnMount: "always"` option to the `useIdeas` query so that every time the user navigates to the Ideas page, it fetches fresh data rather than relying on potentially stale cache.

---

### Technical Details

**Files to modify:**
- `src/hooks/useIdeaDetail.tsx` -- Add ideas list cache invalidation to `analyzeIdea.onSuccess`
- `src/hooks/useIdeas.tsx` -- Add `refetchOnMount: "always"` to the query options
- `src/pages/Ideas.tsx` -- Fix `handleImportSuccess` to await invalidation before navigating
- Database migration -- Add UPDATE policy on `financial_viability_scores`

