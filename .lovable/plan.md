# TrueBlazer Revitalization Plan — Progress

## ✅ Phase 1 — Fix What's Broken (Complete)

- **Step 1**: Fixed JSZip build error — replaced `npm:jszip@3.10.1` with `https://esm.sh/jszip@3.10.1`
- **Step 2**: Cleaned dead code — removed Niche Radar tile, Reflection Streak tile from DiscoveryDashboard; deleted FeedCard, feed types, generate-feed-items & refresh-daily-feed edge functions
- **Step 3**: Fixed DiscoveryDashboard header — changed "Venture Command Center" → "Your Launchpad", updated copy

## ✅ Phase 2 — Simplify the UX (Partial)

- **Step 4**: Wrapped Blueprint route in MainLayout — sidebar now persists
- **Step 5**: Refactored Ideas.tsx (1045→490 lines) — extracted `GeneratedTab`, `LibraryTab`, `ideaUtils.ts`
- **Step 6**: Streamlined DiscoveryDashboard — pending (Next Step card redesign)

## ✅ Phase 4 — Polish (Partial)

- **Step 11**: Added SELECT RLS policy on beta_feedback
- **Step 12**: Added LazyErrorBoundary with retry around lazy-loaded routes

## 🔲 Remaining

- **Step 6**: Streamline DiscoveryDashboard with prominent Next Step card
- **Step 7**: Wire check-in feedback into task generation
- **Step 8**: Venture Timeline component
- **Step 9**: Surface validation progress on ExecutionDashboard
- **Step 10**: Migrate generate-personalized-ideas to Lovable AI gateway
- **Leaked Password Protection**: Project-level auth setting (requires manual config)
