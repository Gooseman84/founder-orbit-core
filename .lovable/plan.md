
# Implementation Plan: UX Fixes and AI Integration Enhancements

## Executive Summary

This plan addresses four key issues plus one enhancement:
1. **Implementation Kit Access** - Users cannot access the kit after committing to execution
2. **Daily Pulse AI Integration** - The task generation engine doesn't use reflection data OR workspace context
3. **Task Workspace Transfer** - ExecutionTaskCard is missing "Open in Workspace" functionality
4. **Navigation Order** - Align → North Star should come before Build section

---

## Issue 1: Implementation Kit Access During Execution

### Current Problem
When a venture transitions to "executing" state, `Blueprint.tsx` redirects users to `/tasks`. This blocks access to the "Generate Implementation Kit" button.

### Solution
- **Primary location**: Workspace sidebar - shows kit status, generation button, and document links
- **Secondary location**: Tasks page - shows subtle "View Kit Documents" link ONLY if kit exists and is complete
- Generation is ONLY available in Workspace (not Tasks)

### Implementation Steps

#### Step 1.1: Create ImplementationKitStatus Component
**File**: `src/components/implementationKit/ImplementationKitStatus.tsx`

New component that displays:
- "Generate Kit" button if no kit exists (only shown in Workspace context)
- Loading spinner + "Generating..." if status = 'generating'
- List of document links if status = 'complete'
- Error message if status = 'error'

Uses existing `useImplementationKit` hook and shows TechStackDialog when generating.

#### Step 1.2: Add to Workspace Sidebar
**File**: `src/components/workspace/WorkspaceSidebar.tsx`

Add ImplementationKitStatus at the top of the sidebar with `showGenerateButton={true}`.

#### Step 1.3: Add Subtle Link to Tasks Page (View Only)
**File**: `src/pages/Tasks.tsx`

Add minimal "View Kit Documents" link:
- ONLY show if kit exists AND status === 'complete'
- Do NOT show "Generate Kit" button
- Link navigates to Workspace with the kit folder selected

#### Step 1.4: Update Workspace Page
**File**: `src/pages/Workspace.tsx`

Ensure blueprint and venture data is available for the sidebar component.

---

## Issue 2: Daily Pulse AI Integration with Smart Calibration + Workspace Awareness

### Current Problem
The `generate-daily-execution-tasks` edge function does NOT use:
- Recent daily reflections (energy level, stress level, blockers)
- Previous check-in data (completion status)
- Recent workspace documents (what's already in progress)

### Solution
Enhance the edge function with:
1. Founder state calibration (energy, stress, completion history)
2. Workspace context awareness (avoid duplicate tasks, reference existing work)

### Implementation Steps

#### Step 2.1: Fetch Recent Reflections
**File**: `supabase/functions/generate-daily-execution-tasks/index.ts`

```typescript
// Fetch last 3 daily reflections
const { data: recentReflections } = await supabaseService
  .from("daily_reflections")
  .select("reflection_date, energy_level, stress_level, mood_tags, what_did, blockers, top_priority, ai_summary")
  .eq("user_id", user.id)
  .order("reflection_date", { ascending: false })
  .limit(3);

// Fetch last 3 venture check-ins
const { data: recentCheckins } = await supabaseService
  .from("venture_daily_checkins")
  .select("checkin_date, completion_status, explanation, reflection")
  .eq("venture_id", ventureId)
  .order("checkin_date", { ascending: false })
  .limit(3);
```

#### Step 2.2: Fetch Recent Workspace Documents
```typescript
// Fetch recent workspace documents for this venture (last 7 days)
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const { data: recentWorkspaceDocs } = await supabaseService
  .from("workspace_documents")
  .select("id, title, doc_type, updated_at, source_type, linked_task_id")
  .eq("user_id", user.id)
  .eq("venture_id", ventureId)
  .gte("updated_at", sevenDaysAgo.toISOString())
  .order("updated_at", { ascending: false })
  .limit(10);
```

#### Step 2.3: Build Context Objects
```typescript
const founderState = {
  latestEnergy: recentReflections?.[0]?.energy_level ?? null,
  latestStress: recentReflections?.[0]?.stress_level ?? null,
  latestBlockers: recentReflections?.[0]?.blockers ?? null,
  recentMoods: recentReflections?.[0]?.mood_tags ?? [],
  topPriority: recentReflections?.[0]?.top_priority ?? null,
  yesterdayCompletion: recentCheckins?.[0]?.completion_status ?? null,
  yesterdayExplanation: recentCheckins?.[0]?.explanation ?? null,
};

const workspaceContext = recentWorkspaceDocs?.map(d => ({
  title: d.title,
  docType: d.doc_type,
  updatedAt: d.updated_at,
  sourceType: d.source_type,
})) ?? [];
```

#### Step 2.4: Update AI Prompt with Full Context
```typescript
const workspaceDocsFormatted = workspaceContext.length > 0
  ? workspaceContext.map(d => 
      `- "${d.title}" (${d.docType || 'document'}, last updated ${new Date(d.updatedAt).toLocaleDateString()})`
    ).join('\n')
  : 'No recent workspace activity';

const systemPrompt = `You are an execution-focused task generator for founders. Generate ${taskCount} concrete, actionable tasks for TODAY only.

FOUNDER STATE (use to calibrate strategically):
- Energy Level: ${founderState.latestEnergy ?? 'unknown'}/5
- Stress Level: ${founderState.latestStress ?? 'unknown'}/5  
- Yesterday's Completion: ${founderState.yesterdayCompletion ?? 'unknown'}
- Yesterday's Explanation: ${founderState.yesterdayExplanation ?? 'none'}
- Current Blockers: ${founderState.latestBlockers ?? 'none stated'}
- Top Priority: ${founderState.topPriority ?? 'not specified'}

WORKSPACE CONTEXT (use to avoid duplicate work):
Recent Workspace Documents:
${workspaceDocsFormatted}

SMART CALIBRATION (strategic, not just "easier tasks"):

1. LOW ENERGY + YESTERDAY INCOMPLETE:
   - Suggest a simplified, smaller-scoped version of yesterday's unfinished task
   - Add one quick-win task (5-10 min) for momentum
   - Avoid introducing new complex work

2. HIGH STRESS (> 3):
   - Include one "organizational" task (cleanup, documentation, planning review)
   - Avoid tasks with external dependencies or waiting
   - Focus on tasks the founder fully controls

3. BLOCKERS MENTIONED:
   - First task MUST directly address the stated blocker
   - Keep it small and specific (unblock, not solve everything)
   - Example: "Schedule 15-min call with X to clarify Y" not "Resolve partnership issues"

4. HIGH ENERGY + YESTERDAY COMPLETE:
   - Push slightly harder with a stretch goal
   - Include one task that advances long-term positioning
   - Can suggest more ambitious scope

5. DEFAULT (no data or neutral state):
   - Balance between validation, build, and marketing
   - One quick-win, one medium task, one slightly challenging task

WORKSPACE AWARENESS RULES:
- If a workspace doc exists for yesterday's task, reference it in today's task description
  Example: "Continue work on 'Investor Email Draft v2' - finalize and send"
- Do NOT suggest tasks that duplicate recent workspace activity
  Example: If "Landing Page Copy" doc exists, don't suggest "Write landing page copy"
- Use workspace doc titles as context clues for what's already in progress
- Suggest tasks that BUILD ON existing workspace work, not restart it

TASK REQUIREMENTS:
- Each task must be completable TODAY
- Include specific, measurable outcomes
- Estimated time should be realistic (15-60 min each)
- Categories: validation, build, marketing, ops

Return a JSON array of tasks with this structure:
[
  {
    "id": "uuid-string",
    "title": "Short action-oriented title",
    "description": "Specific what-to-do description. Reference existing workspace docs if relevant.",
    "category": "validation|build|marketing|ops",
    "estimatedMinutes": 30-120,
    "completed": false
  }
]`;
```

---

## Issue 3: Task Workspace Transfer for ExecutionTaskCard

### Current Problem
`ExecutionTaskCard.tsx` only has checkbox, title, description, category, and time estimate. It lacks the "Open in Workspace" functionality.

### Solution
Add "Work on This" button that creates/opens a workspace document linked to the task.

### Implementation Steps

#### Step 3.1: Update ExecutionTaskCard Component
**File**: `src/components/tasks/ExecutionTaskCard.tsx`

Add imports for navigation, auth, XP, and Supabase client.

Update interface to include optional ventureId:
```typescript
interface ExecutionTaskCardProps {
  task: DailyTask;
  ventureId?: string;
  onToggle: (completed: boolean) => void;
  disabled?: boolean;
}
```

Add handleOpenWorkspace function that:
- Checks for existing document linked to this task
- If exists, navigates to it
- If not, creates new document with task details as template
- Awards XP and shows toast

Add "Work on This" button to the UI after the category/time badges.

#### Step 3.2: Update Tasks Page
**File**: `src/pages/Tasks.tsx`

Pass ventureId to ExecutionTaskCard:
```tsx
<ExecutionTaskCard
  key={task.id}
  task={task}
  ventureId={activeVenture?.id}
  onToggle={(completed) => markTaskCompleted(task.id, completed)}
/>
```

---

## Issue 4: Navigation Order - Move Align Above Build

### Current Problem
Navigation order is: Create → Build → Align

### Solution
Reorder to: Create → Align → Build

### Implementation Steps

#### Step 4.1: Update SidebarNav Render Order
**File**: `src/components/layout/SidebarNav.tsx`

Change the render order from:
```tsx
{createItems...}
{buildItems...}
{alignItems...}
```

To:
```tsx
{createItems...}
{alignItems...}
{buildItems...}
```

---

## Technical Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/implementationKit/ImplementationKitStatus.tsx` | Kit status display + generation (Workspace only) |

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/layout/SidebarNav.tsx` | Reorder Align before Build |
| `src/components/tasks/ExecutionTaskCard.tsx` | Add "Work on This" workspace integration |
| `src/pages/Tasks.tsx` | Pass ventureId to ExecutionTaskCard + add subtle kit link |
| `src/components/workspace/WorkspaceSidebar.tsx` | Add ImplementationKitStatus with generation |
| `src/pages/Workspace.tsx` | Pass blueprint/kit data to sidebar |
| `supabase/functions/generate-daily-execution-tasks/index.ts` | Add reflection + workspace context + smart calibration |

### Database Impact
- No schema changes required
- Uses existing tables: `daily_reflections`, `venture_daily_checkins`, `workspace_documents`, `implementation_kits`

### Edge Function Deployment
- `generate-daily-execution-tasks` will be automatically redeployed after changes

---

## Implementation Priority

1. **Navigation Order** (5 min) - Quick fix, high visibility
2. **Task Workspace Transfer** (30 min) - Restores critical functionality  
3. **Daily Pulse Integration** (45 min) - Makes the AI claim accurate with smart calibration + workspace awareness
4. **Implementation Kit Access** (60 min) - New component + integrations

---

## Verification Checklist

After implementation:
- [ ] Navigation shows Create → Align → Build order
- [ ] ExecutionTaskCard has "Work on This" button
- [ ] Clicking "Work on This" creates workspace document and navigates
- [ ] Tasks page shows subtle "View Kit Documents" link when kit is complete
- [ ] Tasks page does NOT show "Generate Kit" button
- [ ] Workspace sidebar shows full Implementation Kit status with generation button
- [ ] Generated tasks reference founder's energy/stress levels
- [ ] Generated tasks reference recent workspace documents
- [ ] AI avoids suggesting tasks that duplicate existing workspace docs
- [ ] AI suggests "Continue work on X" when relevant workspace doc exists
- [ ] Low-energy + incomplete yesterday → simplified task suggestions
- [ ] High stress → includes organizational/cleanup task
- [ ] Blockers mentioned → first task addresses blocker
