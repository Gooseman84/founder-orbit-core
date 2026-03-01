

## Audit Results and Fix Plan

### What Went Wrong

**Issue 1: Architecture Contract and Vertical Slice Plan saved with empty content**
- The database has all 4 document records, but Architecture Contract and Vertical Slice Plan have `content_length: 0`.
- The `callAI` function in the edge function uses `max_completion_tokens: 4096` and does not validate that the AI response contains actual content. When the model returns an empty or malformed response, it gets saved as an empty string.

**Issue 2: Launch Playbook not shown in Workspace sidebar**
- The `ImplementationKitQuickAccess` component in `WorkspaceSidebar.tsx` hardcodes only 3 documents (North Star Spec, Architecture Contract, Vertical Slice Plan). The Launch Playbook is excluded from the list.

---

### Fix Plan

#### 1. Harden the `callAI` helper (edge function)

In `supabase/functions/generate-implementation-kit/index.ts`:

- Increase `max_completion_tokens` from `4096` to `8192` to accommodate the Architecture Contract and Vertical Slice Plan prompts, which are significantly longer than the North Star Spec.
- Add content validation after parsing the AI response: if the returned content is empty or under a minimum threshold (e.g., 100 characters), throw an error with a descriptive message so the catch block marks the kit as `error` instead of saving empty documents.
- Add a retry mechanism (1 retry on empty response) before failing.

#### 2. Add Launch Playbook to Workspace sidebar

In `src/components/workspace/WorkspaceSidebar.tsx`, update the `ImplementationKitQuickAccess` component's document array (around line 106) to include the Launch Playbook:

```typescript
const documents = [
  { id: kit.north_star_spec_id, name: "North Star Spec" },
  { id: kit.architecture_contract_id, name: "Architecture Contract" },
  { id: kit.vertical_slice_plan_id, name: "Vertical Slice Plan" },
  { id: (kit as any).launch_playbook_id, name: "Launch Playbook" },
].filter(doc => doc.id);
```

The `(kit as any)` cast is needed because the auto-generated types may not include `launch_playbook_id` yet, matching the pattern already used in `ImplementationKitCard.tsx`.

#### 3. Fix the ImplementationKit TypeScript type alignment

In `src/types/implementationKit.ts`, confirm the `launch_playbook_id` field is present in the `ImplementationKit` interface (it already is). The `(kit as any)` cast in both the sidebar and card components can remain until the auto-generated Supabase types catch up.

---

### Technical Details

**Files to modify:**
- `supabase/functions/generate-implementation-kit/index.ts` — harden `callAI` with higher token limit, content validation, and retry
- `src/components/workspace/WorkspaceSidebar.tsx` — add Launch Playbook to the Implementation Kit quick access list

**No database changes needed.** The `launch_playbook_id` column already exists on the `implementation_kits` table and is populated correctly.

