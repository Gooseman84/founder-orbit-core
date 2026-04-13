

# Landing Page Copy Audit: Alignment with TrueBlazer's Actual Product

## What's Working Well
- **"System of Record" positioning** — strong, accurate, differentiated
- **FVS section** — well-explained, compelling, matches the product
- **Mavrik section** — accurately describes the interview experience
- **Final CTA** — "Stop building things that shouldn't be built" is sharp
- **Gold & Ink aesthetic** — premium, matches the in-app experience

## What's Misaligned or Missing

### 1. V2's Core Differentiator Is Invisible
The v2 rebuild is about **market-validated ventures** — intersecting founder intelligence with real-world demand signals. The landing page doesn't mention market validation, problem discovery, or demand signals anywhere except the ticker. The copy reads like v1: "we interview you and score your idea." The actual product now discovers validated problems, generates market-signal ideas, and scores them against real data. This is the biggest gap.

### 2. How It Works Is Outdated (3-Step → Actual 5-Step)
Current copy: Interview → FVS → Implementation Kit.
Actual flow: Interview → AI-Generated Ideas (with market validation) → Commit to North Star → Blueprint + 30-Day Plan → Execution Dashboard.
The landing page skips the entire idea generation, commitment, and execution coaching phases — which are arguably the most compelling parts of the product.

### 3. Two Duplicate Testimonial Sections
`SocialProof` (Sarah K., Marcus D., Priya R.) and `Outcomes` (Marcus T., Priya N., Dion A.) are both fabricated testimonial sections with similar-sounding quotes and overlapping names. This creates a credibility risk and wastes scroll depth. Should consolidate into one section with clearly labeled early-adopter or illustrative quotes.

### 4. Execution Layer Not Mentioned
The product has daily check-ins, streak tracking, XP/badges, adaptive task generation, a 30-day venture plan, and a workspace. None of this is on the landing page. For founders who are "execution-constrained" (the stated target persona), this is a major selling point being left on the table.

### 5. Week One Deliverables Are Good But Underweight
"5 personalized venture ideas scored across 6 financial dimensions" is accurate but doesn't mention they're market-validated or cross-industry. "Build-ready specs" is accurate but could emphasize the agent-ready output angle more.

### 6. Pricing Copy vs. Actual Product
The free tier lists "Limited idea exploration" — vague. The pro tier mentions "Implementation Kit (4 docs)" but doesn't mention the execution dashboard, daily coaching, or workspace — the features that justify $49/mo ongoing vs. a one-time report.

## Proposed Changes

### A. Update Hero subheading
Add market validation angle: "Interview data, market signals, financial scores, and build specs — all in one place."

### B. Rewrite How It Works to 5 steps
1. Mavrik interviews you
2. Market-validated ideas are generated
3. You commit to your North Star venture
4. Your Blueprint + 30-day plan generates
5. Daily execution coaching keeps you building

### C. Merge testimonial sections
Remove the `SocialProof` component. Keep `Outcomes` as the single testimonial section, positioned after Moat. Add a small disclaimer like "Illustrative founder journeys" if these aren't real users.

### D. Add an "Execution Engine" section
Between Mavrik and Moat, add a section highlighting: daily tasks, streak mechanics, adaptive coaching, workspace, 30-day plans. This is what justifies the subscription and differentiates from a one-time report.

### E. Update Pricing feature lists
- Free: mention "Market-validated idea generation" instead of "Limited idea exploration"
- Pro: add "Daily execution coaching", "30-day venture plan", "Streak & XP progression"

### F. Update Problem section copy
Add a line about how even validated ideas fail without execution discipline. Connects the "idea paralysis" problem to the "execution gap" that TrueBlazer also solves.

### G. Update Moat table
Add rows for: "Market-validated idea generation", "Daily execution coaching", "30-day adaptive plans"

## Technical Details
- All changes are in `src/pages/Index.tsx`
- No database or backend changes needed
- Removes the `SocialProof` component entirely
- Adds a new `ExecutionEngine` section component
- Updates copy in Hero, Problem, HowItWorks, Moat, Pricing, WeekOne sections

