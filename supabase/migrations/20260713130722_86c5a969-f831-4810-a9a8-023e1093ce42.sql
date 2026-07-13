
UPDATE public.action_templates
SET deliverable_prompt = $prompt$Produce the ONE-PAGER itself (not advice). Sections in this order: (1) 'The cost of not solving this' — 2-3 lines quantifying the current pain in the buyer's own units (time or dollars), stating each number as ⟨FOUNDER: assumption⟩ if not supplied; (2) 'What changes after this engagement' — 2-3 lines in the same units; (3) 'Payback' — one line, stated as an assumption tied to the founder's own numbers, NOT a benchmark like '90 days' or 'within the first quarter'; (4) 'Honest caveat' — one line naming what could make this not work. NEVER cite industry benchmarks, 'typical' payback windows, testimonials, or invented customer results.$prompt$
WHERE code = 'ps.close.roi_case_one_pager';

UPDATE public.action_templates
SET deliverable_prompt = $prompt$Produce a FILLABLE 5-minute win-teardown WORKSHEET. Do not pretend to know the answers. Exact shape:

WIN TEARDOWN — 5 MINUTES

1. Buyer: ⟨FOUNDER: who bought (name/role/company size)?⟩
2. Trigger: ⟨FOUNDER: what event or pain made them start looking?⟩
3. Channel: [use winning_channel if present in evidence, else ⟨FOUNDER: where the first contact happened⟩]
4. What they cared about: ⟨FOUNDER: the exact pain or outcome they mentioned⟩
5. Price: [use revenue_cents if present, else ⟨FOUNDER: price paid⟩]
6. Why you believe they said yes: ⟨FOUNDER: your best evidence-backed read⟩

End with exactly this line: 'Fill these blanks. I will use the answers to find the next 10 buyers who look like this win.'

Do NOT invent buyer identity, quotes, or motivations.$prompt$
WHERE code = 'ps.repeat.win_teardown';

UPDATE public.action_templates
SET deliverable_prompt = $prompt$Produce a TEST PLAN (not advice). Exact fields: FIXED VARIABLES (buyer segment, offer, core message — unchanged), CHANGED VARIABLE (the channel — do NOT pick it yourself; write '⟨FOUNDER: choose one alternate channel you can legitimately use — email, LinkedIn, community, SMS, or other⟩'), COHORT (5 messages to the same buyer type), OBSERVATION (reply-rate after 72h vs baseline reply-rate on current channel), DECISION THRESHOLD (state a concrete rule such as '>=1 reply in 5 = keep testing; 0 replies = the hook, not the channel, is the problem'). Do NOT invent send-times, buyer work-habits, compliance rules, or operational facts about the buyer segment.$prompt$
WHERE code = 'ps.reply.channel_switch';
