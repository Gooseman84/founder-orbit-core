import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Check } from "lucide-react";

/* ───────────────────────────────────────────
   Scroll-reveal hook
   ─────────────────────────────────────────── */
function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.unobserve(el); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ───────────────────────────────────────────
   Noise overlay (rendered once at page level)
   ─────────────────────────────────────────── */
const noiseUrl = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`;

/* ───────────────────────────────────────────
   MAIN COMPONENT
   ─────────────────────────────────────────── */
const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const goAuth = useCallback(() => navigate("/auth"), [navigate]);

  return (
    <div className="overflow-x-hidden break-words" style={{ background: "var(--ink)", color: "var(--white)", fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>
      {/* Noise overlay */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none", opacity: 0.4,
          backgroundImage: noiseUrl,
        }}
      />

      <Nav onAuth={goAuth} />
      <Hero onAuth={goAuth} />
      <Ticker />
      <Problem />
      <FVSSection />
      <HowItWorks />
      <Mavrik />
      <ExecutionEngine />
      <Moat />
      <Outcomes />
      <Pricing onAuth={goAuth} />
      <WeekOne />
      <FinalCTA onAuth={goAuth} />
      <Footer />
    </div>
  );
};

export default Index;

/* ═══════════════════════════════════════════
   SECTION 1 — NAV
   ═══════════════════════════════════════════ */
function Nav({ onAuth }: { onAuth: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const linkStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", letterSpacing: "0.08em",
    textTransform: "uppercase", color: "var(--white-dim)", textDecoration: "none",
    transition: "color 0.2s",
  };

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className="overflow-hidden"
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: scrolled ? "14px 16px" : "20px 16px",
        background: scrolled ? "rgba(10,10,15,0.92)" : "transparent",
        borderBottom: scrolled ? "1px solid var(--border-subtle)" : "none",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        transition: "all 0.3s",
      }}
    >
      <span className="md:!px-[48px]" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.3rem", flexShrink: 0 }}>
        <span style={{ color: "var(--white)" }}>True</span>
        <span style={{ color: "var(--gold)" }}>Blazer</span>
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div className="hidden md:flex" style={{ gap: 28 }}>
          <a href="#how-it-works" onClick={scrollTo("how-it-works")} style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = "var(--white)")} onMouseLeave={e => (e.currentTarget.style.color = "var(--white-dim)")}>How It Works</a>
          <a href="#fvs" onClick={scrollTo("fvs")} style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = "var(--white)")} onMouseLeave={e => (e.currentTarget.style.color = "var(--white-dim)")}>The FVS</a>
          <a href="#mavrik" onClick={scrollTo("mavrik")} style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = "var(--white)")} onMouseLeave={e => (e.currentTarget.style.color = "var(--white-dim)")}>Mavrik</a>
          <a href="#pricing" onClick={scrollTo("pricing")} style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = "var(--white)")} onMouseLeave={e => (e.currentTarget.style.color = "var(--white-dim)")}>Pricing</a>
        </div>
        <button
          onClick={onAuth}
          style={{
            background: "var(--gold)", color: "var(--ink)", padding: "9px 22px",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: "0.78rem",
            letterSpacing: "0.05em", textTransform: "uppercase", border: "none", cursor: "pointer",
            transition: "background 0.2s", minHeight: 40,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--gold-light)")}
          onMouseLeave={e => (e.currentTarget.style.background = "var(--gold)")}
        >
          Start Free Trial
        </button>
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════════
   SECTION 2 — HERO
   ═══════════════════════════════════════════ */
function Hero({ onAuth }: { onAuth: () => void }) {
  return (
    <section className="px-4 pt-[100px] pb-14 md:px-12 md:pt-[120px] md:pb-20 relative overflow-hidden" style={{ minHeight: "100vh", background: "var(--ink)" }}>
      {/* Radial glow */}
      <div style={{ position: "absolute", top: -200, right: -200, width: 800, height: 800, background: "radial-gradient(circle, rgba(200,168,75,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Eyebrow */}
      <div className="lp-fadeUp" style={{ animationDelay: "0.2s", display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <span style={{ width: 32, height: 1, background: "var(--gold)", flexShrink: 0 }} />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)" }}>
          The System of Record for Your Venture
        </span>
      </div>

      {/* Headline */}
      <h1
        className="lp-fadeUp"
        style={{
          animationDelay: "0.35s", fontFamily: "'Playfair Display', serif", fontWeight: 900,
          fontSize: "clamp(2.6rem, 7vw, 6.5rem)", lineHeight: 1.02, letterSpacing: "-0.02em",
          maxWidth: 900, margin: 0,
        }}
      >
        AI can build<br />
        <em style={{ color: "var(--gold)", fontStyle: "italic", hyphens: "auto" } as React.CSSProperties}>anything.</em><br />
        TrueBlazer holds the context<br />
        that makes it build the right thing.
      </h1>

      {/* Subheading — updated to reflect market validation + execution */}
      <p className="lp-fadeUp text-base sm:text-lg md:text-xl" style={{ animationDelay: "0.5s", marginTop: 28, maxWidth: 580, lineHeight: 1.65, color: "var(--white-dim)" }}>
        Interview data, market signals, financial scores, execution plans, and build specs — all in one place. From validated idea to daily execution, every AI tool you use draws from context that exists nowhere else.
      </p>

      {/* Buttons */}
      <div className="lp-fadeUp flex flex-col sm:flex-row gap-4 sm:gap-6 mt-10 sm:mt-12" style={{ animationDelay: "0.65s", alignItems: "stretch" }}>
        <button
          onClick={onAuth}
          className="w-full sm:w-auto"
          style={{
            position: "relative", overflow: "hidden",
            background: "var(--gold)", color: "var(--ink)", padding: "14px 32px", border: "none",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: "0.9rem",
            letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", minHeight: 48,
          }}
        >
          Start Your Free Trial
        </button>
        <a
          href="#how-it-works"
          onClick={e => { e.preventDefault(); document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }); }}
          className="w-full sm:w-auto text-center sm:text-left py-3 sm:py-0"
          style={{ color: "var(--white-dim)", fontSize: "0.85rem", letterSpacing: "0.04em", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "color 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--white)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--white-dim)")}
        >
          See How It Works <span style={{ transition: "transform 0.2s", display: "inline-block" }}>→</span>
        </a>
      </div>

      {/* Credentials */}
      <div className="lp-fadeUp mt-12 sm:mt-16 pt-8 flex flex-wrap gap-4 sm:gap-10" style={{ animationDelay: "0.8s", borderTop: "1px solid var(--border-subtle)", alignItems: "center" }}>
        {[
          { badge: "CFA", text: "Chartered Financial Analyst methodology" },
          { badge: "CFP", text: "Certified Financial Planner rigor" },
          { badge: "FVS™", text: "Proprietary viability scoring" },
        ].map(c => (
          <div key={c.badge} style={{ display: "flex", gap: 10, fontSize: "0.78rem", color: "var(--silver)", letterSpacing: "0.04em", alignItems: "center" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", background: "var(--gold-dim)", color: "var(--gold)", border: "1px solid var(--lp-border)", padding: "3px 8px", flexShrink: 0 }}>
              {c.badge}
            </span>
            <span className="min-w-0">{c.text}</span>
          </div>
        ))}
      </div>

      {/* Credibility line — consolidated from old SocialProof */}
      <p className="lp-fadeUp mt-10 text-sm sm:text-base" style={{ animationDelay: "0.9s", lineHeight: 1.7, color: "var(--silver)", maxWidth: 700 }}>
        Built by a{" "}
        <span style={{ color: "var(--gold)", fontWeight: 500 }}>CFA Charterholder &amp; CFP</span>{" "}
        who evaluates business models for a living. The only founder intelligence platform designed to be consumed by the AI agents building your product.
      </p>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTION 3 — TICKER
   ═══════════════════════════════════════════ */
function Ticker() {
  const items = [
    { text: "Generic AI tools: ", val: "unfundable in 2026", dir: "down" },
    { text: "Enterprise AI vendors: consolidating to ", val: "fewer", dir: "down" },
    { text: "Defensible AI startups: ", val: "attracting capital", dir: "up" },
    { text: "AI SaaS without moat: ", val: "acqui-hire timeline", dir: "down" },
    { text: "Proprietary data moats: ", val: "outperforming", dir: "up" },
    { text: "Founders with market-validated ideas: ", val: "building with conviction", dir: "up" },
  ];
  const doubled = [...items, ...items];

  return (
    <div className="px-4 py-3 md:px-12 md:py-4" style={{ background: "var(--ink-2)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: 20, overflow: "hidden", alignItems: "center" }}>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", borderRight: "1px solid var(--lp-border)", paddingRight: 20, whiteSpace: "nowrap", flexShrink: 0 }}>
        Market Signal
      </span>
      <div style={{ overflow: "hidden", flex: 1 }}>
        <div style={{ display: "flex", gap: 48, whiteSpace: "nowrap", animation: "lp-ticker 30s linear infinite" }}>
          {doubled.map((it, i) => (
            <span key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "var(--silver)", letterSpacing: "0.04em" }}>
              {it.text}<span style={{ color: it.dir === "up" ? "var(--green)" : "var(--red)" }}>{it.val}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SECTION 4 — PROBLEM
   ═══════════════════════════════════════════ */
function Problem() {
  const { ref, visible } = useReveal();
  const stats = [
    { label: "Startups that fail due to no market need", value: "42%" },
    { label: "Founders who validate before building", value: "18%" },
    { label: "Generic AI SaaS startups filtered out by VCs in 2026", value: "70%" },
    { label: "Average months before founders realize wrong direction", value: "14" },
    { label: "Validated ideas that fail due to no execution discipline", value: "63%" },
  ];

  return (
    <section className="px-4 py-14 md:px-12 md:py-24" style={{ background: "var(--ink-2)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
      <Eyebrow text="The Problem" />

      <div ref={ref} className={`lp-reveal ${visible ? "visible" : ""} grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 mt-10 md:mt-12`}>
        {/* Left */}
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "clamp(1.8rem, 4vw, 3.2rem)", lineHeight: 1.1, margin: 0 }}>
            Agents can build<br />
            <em style={{ color: "var(--gold)", fontStyle: "italic" }}>anything.</em><br />
            They can't tell you what's<br />worth building.
          </h2>
          <div className="mt-6 md:mt-8 text-sm sm:text-base" style={{ lineHeight: 1.75, color: "var(--white-dim)" }}>
            <p style={{ marginBottom: 20 }}>You can build anything now. Lovable. Cursor. v0. The execution tools are commoditized. What isn't commoditized is knowing whether what you're building is actually worth your time, money, and next two years of your life.</p>
            <p style={{ marginBottom: 20 }}>AI chatbots give you ideas. VCs give you opinions. Accelerators give you cohorts. None of them give you a <span style={{ color: "var(--white)", fontWeight: 500 }}>disciplined, financially-grounded verdict</span> on your specific venture — before you're too deep to turn back.</p>
            <p style={{ marginBottom: 20 }}>And even when founders pick the right idea, most still fail — because <span style={{ color: "var(--white)", fontWeight: 500 }}>choosing right without executing daily</span> is just a slower way to stall. The gap isn't just validation. It's sustained execution.</p>
            <p>That's the gap TrueBlazer fills — from market-validated idea to daily coaching that keeps you building.</p>
          </div>
        </div>
        {/* Right — stat table */}
        <div style={{ border: "1px solid var(--border-subtle)" }}>
          {stats.map((s, i) => (
            <div key={i} className="flex justify-between items-center gap-3 px-4 py-4 sm:px-6 sm:py-5" style={{ borderBottom: i < stats.length - 1 ? "1px solid var(--border-subtle)" : "none", background: "var(--ink)", transition: "background 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--ink-3)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--ink)")}
            >
              <span className="text-xs sm:text-sm min-w-0" style={{ color: "var(--silver)" }}>{s.label}</span>
              <span className="text-xl sm:text-2xl flex-shrink-0" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "var(--red)" }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTION 5 — FVS
   ═══════════════════════════════════════════ */
function FVSSection() {
  const { ref, visible } = useReveal();
  const bars = [
    { label: "Market Size", pct: 88 },
    { label: "Unit Economics", pct: 82 },
    { label: "Time to Revenue", pct: 76 },
    { label: "Competitive Density", pct: 71 },
    { label: "Capital Requirements", pct: 90 },
    { label: "Founder–Market Fit", pct: 85 },
  ];
  const dims = [
    { title: "Market Size", desc: "TAM analysis grounded in real category sizing — not optimistic extrapolation. Are there enough people with this problem willing to pay?" },
    { title: "Unit Economics", desc: "LTV/CAC modeling, margin structure, and path to profitability — the numbers that determine whether growth actually creates value." },
    { title: "Time to Revenue", desc: "How many months before first dollar? How many before break-even? Validated against your actual capital constraints and available time." },
    { title: "Competitive Density", desc: "How crowded is the space? Are incumbents entrenched or vulnerable? Where does your differentiation actually hold?" },
    { title: "Capital Requirements", desc: "What does it actually cost to reach viability? Does it match what you have available — or does it require a fundraise you haven't planned for?" },
    { title: "Founder–Market Fit", desc: "Your skills, network, and domain expertise relative to what this venture actually demands. The dimension most founders get wrong." },
  ];

  return (
    <section id="fvs" className="px-4 py-14 md:px-12 md:py-24" style={{ background: "var(--ink)" }}>
      <Eyebrow text="The Financial Viability Score" />
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "clamp(1.8rem, 4vw, 3.2rem)", lineHeight: 1.1, marginTop: 16 }}>
        The verdict. Backed by <em style={{ color: "var(--gold)", fontStyle: "italic" }}>CFA-level</em> rigor.
      </h2>
      <p className="text-sm sm:text-base" style={{ maxWidth: 640, marginTop: 28, lineHeight: 1.7, color: "var(--white-dim)" }}>
        The FVS™ is TrueBlazer's proprietary scoring system — not a vibe check, not a market research report. Six financial dimensions, quantified and weighted, producing a single score that tells you the truth about your venture.
      </p>

      <div ref={ref} className={`lp-reveal ${visible ? "visible" : ""} grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-8 md:gap-12 mt-10 md:mt-12`}>
        {/* Score card */}
        <div className="p-5 sm:p-8 md:p-10" style={{ background: "var(--ink-2)", border: "1px solid var(--lp-border)", position: "relative" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--gold), transparent)" }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", display: "block", marginBottom: 16 }}>Financial Viability Score™</span>
          <div className="text-5xl sm:text-6xl md:text-7xl" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, lineHeight: 1, color: "var(--white)" }}>
            8.2<span className="text-2xl sm:text-3xl md:text-4xl" style={{ color: "var(--gold)" }}>/10</span>
          </div>
          <p style={{ marginTop: 16, fontSize: "0.85rem", color: "var(--silver)", fontStyle: "italic" }}>High viability. Proceed to build phase.</p>
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
            {bars.map((b, i) => (
              <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="w-[100px] sm:w-[140px] flex-shrink-0" style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: "var(--silver)" }}>{b.label}</span>
                <div style={{ flex: 1, height: 3, background: "var(--white-ghost)", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%", background: "var(--gold)", transformOrigin: "left",
                      transform: visible ? "scaleX(1)" : "scaleX(0)",
                      transition: `transform 0.8s ease-out ${i * 0.1}s`,
                      width: `${b.pct}%`,
                    }}
                  />
                </div>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "var(--gold)", width: 28, textAlign: "right" }}>{b.pct}%</span>
              </div>
            ))}
          </div>
        </div>
        {/* Dimension cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {dims.map(d => (
            <div key={d.title} className="p-4 sm:p-6" style={{ background: "var(--ink-2)", border: "1px solid var(--border-subtle)", borderLeft: "2px solid var(--gold)", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--ink-3)"; e.currentTarget.style.borderLeftColor = "var(--gold-light)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--ink-2)"; e.currentTarget.style.borderLeftColor = "var(--gold)"; }}
            >
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: "0.85rem", marginBottom: 6, color: "var(--white)" }}>{d.title}</div>
              <div className="text-xs sm:text-sm" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, color: "var(--silver)", lineHeight: 1.5 }}>{d.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTION 6 — HOW IT WORKS (5 steps)
   ═══════════════════════════════════════════ */
function HowItWorks() {
  const { ref, visible } = useReveal();
  const steps = [
    { num: "01", title: "Mavrik interviews you", desc: "TrueBlazer's AI interview agent doesn't ask generic questions. Mavrik reads between the lines — your motivations, constraints, domain knowledge, and risk tolerance — to build a founder intelligence profile." },
    { num: "02", title: "Market-validated ideas are generated", desc: "Your founder profile intersects with real-world demand signals and cross-industry patterns. TrueBlazer generates personalized venture ideas scored across 6 financial dimensions — not generic brainstorming, but market-validated opportunities." },
    { num: "03", title: "You commit to your North Star", desc: "One venture. Full conviction. You review your scored ideas, compare financial viability, and commit to the one worth building. TrueBlazer enforces focus — no more idea hopping." },
    { num: "04", title: "Your Blueprint + 30-day plan generates", desc: "Once committed, your full venture Blueprint generates: business model, target audience, competitive positioning, and a 30-day execution plan with tasks tailored to your schedule, skills, and constraints." },
    { num: "05", title: "Daily execution coaching keeps you building", desc: "Adaptive daily tasks, streak tracking, XP progression, and AI coaching that reads your full venture context. TrueBlazer doesn't just tell you what to build — it keeps you building." },
  ];

  return (
    <section id="how-it-works" className="px-4 py-16 md:px-12 md:py-24" style={{ background: "var(--ink-2)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
      <Eyebrow text="How It Works" />
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "clamp(1.8rem, 4vw, 3.2rem)", lineHeight: 1.1, marginTop: 16 }}>
        From idea paralysis to <em style={{ color: "var(--gold)", fontStyle: "italic" }}>daily execution.</em>
      </h2>

      <div ref={ref} className={`lp-reveal ${visible ? "visible" : ""} mt-12 md:mt-16`}>
        {/* 5 steps — stacked vertically with timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {steps.map((s, i) => (
            <div key={s.num} className="flex gap-4 sm:gap-6" style={{ position: "relative" }}>
              {/* Timeline bar */}
              <div className="hidden sm:flex" style={{ flexDirection: "column", alignItems: "center", width: 40, flexShrink: 0 }}>
                <div style={{ width: 40, height: 40, border: "1px solid var(--lp-border)", background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold)", fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", flexShrink: 0 }}>{s.num}</div>
                {i < steps.length - 1 && <div style={{ width: 1, flex: 1, background: "var(--border-subtle)" }} />}
              </div>
              {/* Content */}
              <div className="p-5 sm:p-6 flex-1 mb-px" style={{ background: "var(--ink)", transition: "background 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--ink-3)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--ink)")}
              >
                <span className="sm:hidden" style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "var(--gold)", marginBottom: 8, display: "block" }}>Step {s.num}</span>
                <h3 className="text-lg sm:text-xl" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, marginBottom: 10 }}>{s.title}</h3>
                <p className="text-xs sm:text-sm" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, lineHeight: 1.65, color: "var(--silver)" }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTION 7 — MAVRIK
   ═══════════════════════════════════════════ */
function Mavrik() {
  const { ref, visible } = useReveal();
  const features = [
    { title: "Pattern Detection", desc: "Mavrik identifies behavioral patterns — founder type, execution style, risk posture — and flags them in your venture profile for personalized guidance." },
    { title: "Context Intelligence", desc: "Every AI function in TrueBlazer reads your Mavrik interview data. Your blueprint, tasks, and recommendations are all aware of what Mavrik learned." },
    { title: "Longitudinal Memory", desc: "Your founder journey is tracked from idea through launch. The platform gets smarter about you over time — not just about your idea." },
    { title: "Decision-Closure Mechanics", desc: "Mavrik doesn't leave you in a loop. The interview is designed to produce a commit/pivot signal — the most valuable thing a founder can get before investing months of effort." },
  ];

  return (
    <section id="mavrik" className="px-4 py-16 md:px-12 md:py-24 relative overflow-hidden" style={{ background: "var(--ink-2)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
      {/* Watermark */}
      <span className="hidden md:block" style={{ position: "absolute", right: -40, top: "50%", transform: "translateY(-50%)", fontFamily: "'Playfair Display', serif", fontSize: "20rem", fontWeight: 900, color: "rgba(200,168,75,0.03)", letterSpacing: "-0.05em", pointerEvents: "none", lineHeight: 1, whiteSpace: "nowrap" }}>MAVRIK</span>

      <Eyebrow text="Meet Mavrik" />
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "clamp(1.8rem, 4vw, 3.2rem)", lineHeight: 1.1, marginTop: 16 }}>
        The AI that asks the questions you <em style={{ color: "var(--gold)", fontStyle: "italic" }}>haven't</em> asked yourself.
      </h2>

      <div ref={ref} className={`lp-reveal ${visible ? "visible" : ""} grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 mt-10 md:mt-16`}>
        <div className="text-sm sm:text-base" style={{ lineHeight: 1.75, color: "var(--white-dim)" }}>
          <p style={{ marginBottom: 20 }}>Most validation tools ask you to fill out a form. Mavrik conducts a founder interview — an adaptive, intelligent conversation that uncovers the real shape of your venture: what you actually know, what you're assuming, and where the gaps are.</p>
          <p style={{ marginBottom: 20 }}>Every insight Mavrik captures becomes part of your venture's intelligence layer. When your ideas are generated and scored, they're informed by everything Mavrik learned about you — not a generic rubric applied to a template. <span style={{ fontWeight: 500, color: "var(--white)" }}>Personalized analysis, not processed output.</span></p>
          <p>This is the proprietary data moat that separates TrueBlazer from any AI chatbot. You can't replicate 6 months of Mavrik conversation history by starting over somewhere else. The platform compounds as you do.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {features.map(f => (
            <div key={f.title} className="p-4 sm:p-5 flex items-start gap-3 sm:gap-4" style={{ background: "var(--ink)", borderLeft: "2px solid transparent", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderLeftColor = "var(--gold)"; e.currentTarget.style.background = "var(--ink-3)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderLeftColor = "transparent"; e.currentTarget.style.background = "var(--ink)"; }}
            >
              <span style={{ color: "var(--gold)", fontSize: "0.85rem", marginTop: 2, flexShrink: 0 }}>◆</span>
              <div className="min-w-0">
                <span className="text-sm sm:text-base" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: "var(--white)", display: "block", marginBottom: 3 }}>{f.title}</span>
                <span className="text-xs sm:text-sm" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, color: "var(--silver)", lineHeight: 1.55 }}>{f.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTION 7B — EXECUTION ENGINE (NEW)
   ═══════════════════════════════════════════ */
function ExecutionEngine() {
  const { ref, visible } = useReveal();
  const features = [
    { title: "Adaptive Daily Tasks", desc: "AI-generated tasks that read your venture context, energy patterns, and progress — not a generic checklist. Every morning, you know exactly what to work on." },
    { title: "30-Day Venture Plan", desc: "A structured execution roadmap from Day 1 to launch milestone. Updated dynamically as you complete tasks and your venture evolves." },
    { title: "Streak & XP Progression", desc: "Daily check-ins build streaks. Completed tasks earn XP. Milestones unlock badges. The mechanics that turn one-time motivation into compounding discipline." },
    { title: "AI Workspace", desc: "A full document workspace scoped to your venture — specs, notes, research, and AI-generated docs all in one place, all contextually aware." },
  ];

  return (
    <section className="px-4 py-16 md:px-12 md:py-24" style={{ background: "var(--ink)", borderBottom: "1px solid var(--border-subtle)" }}>
      <Eyebrow text="The Execution Engine" />
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "clamp(1.8rem, 4vw, 3.2rem)", lineHeight: 1.1, marginTop: 16 }}>
        Choosing right is <em style={{ color: "var(--gold)", fontStyle: "italic" }}>half</em> the battle.<br />
        Executing daily is the other half.
      </h2>
      <p className="text-sm sm:text-base" style={{ marginTop: 20, maxWidth: 600, lineHeight: 1.7, color: "var(--white-dim)" }}>
        Most platforms stop at "here's your idea." TrueBlazer stays with you through daily execution — the part where most founders quietly quit. This is what justifies the subscription: an AI co-founder that doesn't leave after the pitch.
      </p>

      <div ref={ref} className={`lp-reveal ${visible ? "visible" : ""} grid grid-cols-1 sm:grid-cols-2 gap-px mt-10 md:mt-14`} style={{ background: "var(--border-subtle)" }}>
        {features.map(f => (
          <div key={f.title} className="p-5 sm:p-8" style={{ background: "var(--ink-2)", transition: "background 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--ink-3)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--ink-2)")}
          >
            <span style={{ color: "var(--gold)", fontSize: "0.85rem", marginBottom: 12, display: "block" }}>◆</span>
            <h3 className="text-base sm:text-lg" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, marginBottom: 10, color: "var(--white)" }}>{f.title}</h3>
            <p className="text-xs sm:text-sm" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, lineHeight: 1.65, color: "var(--silver)" }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTION 8 — MOAT (comparison)
   ═══════════════════════════════════════════ */
function Moat() {
  const { ref, visible } = useReveal();
  const rows = [
    ["CFA-level financial scoring", "✗", "✗", "✓"],
    ["Market-validated idea generation", "✗", "✗", "✓"],
    ["Proprietary founder intelligence layer", "✗", "✗", "✓"],
    ["AI interview agent (not a form)", "✗", "✗", "✓"],
    ["Daily execution coaching", "✗", "✗", "✓"],
    ["30-day adaptive venture plans", "✗", "✗", "✓"],
    ["Implementation Kit (build-ready docs)", "✗", "✗", "✓"],
    ["One venture at a time discipline", "✗", "✗", "✓"],
    ["Available to any founder, right now", "✓", "✗ (gatekept)", "✓"],
  ];

  return (
    <section id="compare" className="px-4 py-16 md:px-12 md:py-24" style={{ background: "var(--ink)" }}>
      <Eyebrow text="The Moat" />
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "clamp(1.8rem, 4vw, 3.2rem)", lineHeight: 1.1, marginTop: 16 }}>
        Not another <em style={{ color: "var(--gold)", fontStyle: "italic" }}>AI wrapper.</em>
      </h2>

      <div ref={ref} className={`lp-reveal ${visible ? "visible" : ""}`} style={{ marginTop: 48, border: "1px solid var(--border-subtle)", width: "100%", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              {["Capability", "Generic AI Tools", "Accelerators / VCs", "TrueBlazer"].map((h, i) => (
                <th key={h} className={i === 2 ? "hidden md:table-cell" : ""} style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: i === 3 ? "var(--gold)" : "var(--silver)", padding: "12px 14px", textAlign: "left", borderRight: i < 3 ? "1px solid var(--border-subtle)" : "none", fontWeight: 400 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} style={{ borderBottom: ri < rows.length - 1 ? "1px solid var(--border-subtle)" : "none", transition: "background 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--ink-2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {r.map((cell, ci) => (
                  <td key={ci} className={ci === 2 ? "hidden md:table-cell" : ""} style={{
                    padding: "14px", fontSize: "0.8rem",
                    borderRight: ci < 3 ? "1px solid var(--border-subtle)" : "none",
                    color: ci === 0 ? "var(--white)" : cell === "✓" ? "var(--green)" : cell === "✗" || cell.startsWith("✗") ? "var(--red)" : "var(--silver)",
                    fontFamily: ci > 0 ? "'DM Mono', monospace" : "'DM Sans', sans-serif",
                    background: ci === 3 ? "rgba(200,168,75,0.04)" : "transparent",
                  }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTION 9 — OUTCOMES (merged testimonials)
   ═══════════════════════════════════════════ */
function Outcomes() {
  const { ref, visible } = useReveal();
  const cards = [
    { quote: "I was about to spend $40K building a SaaS I thought was brilliant. TrueBlazer gave me a 4.1 FVS and explained exactly why the unit economics didn't work. Saved me a year and probably my marriage.", name: "Marcus T.", role: "Ex-agency owner, now building with a 8.6 FVS idea" },
    { quote: "I've used every AI tool. TrueBlazer is the only one that asked me hard questions instead of validating whatever I already believed. The Mavrik interview broke me — in the best way.", name: "Priya N.", role: "Solo founder, B2B SaaS, 3 months post-launch" },
    { quote: "The daily execution coaching is what made the difference. I'd validated ideas before but always stalled after week two. The streak mechanic and adaptive tasks kept me shipping every single day.", name: "Dion A.", role: "Non-technical founder, first venture" },
  ];

  return (
    <section className="px-4 py-16 md:px-12 md:py-24" style={{ background: "var(--ink)" }}>
      <Eyebrow text="Founder Outcomes" />
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "clamp(1.8rem, 4vw, 3.2rem)", lineHeight: 1.1, marginTop: 16 }}>
        The signal cuts both <em style={{ color: "var(--gold)", fontStyle: "italic" }}>ways.</em>
      </h2>
      <p className="text-sm sm:text-base" style={{ marginTop: 16, maxWidth: 600, color: "var(--white-dim)", lineHeight: 1.7 }}>
        TrueBlazer doesn't just validate what works. It saves founders from what doesn't. Both outcomes are wins.
      </p>

      <div ref={ref} className={`lp-reveal ${visible ? "visible" : ""} grid grid-cols-1 md:grid-cols-3 gap-px mt-12 md:mt-16`} style={{ background: "var(--border-subtle)" }}>
        {cards.map((c, i) => (
          <div key={i} className="p-5 sm:p-8" style={{ background: "var(--ink)", transition: "background 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--ink-2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--ink)")}
          >
            <div className="text-sm sm:text-base" style={{ lineHeight: 1.7, color: "var(--white-dim)", fontStyle: "italic", marginBottom: 24, position: "relative", paddingTop: 20 }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "3rem", color: "var(--gold)", opacity: 0.4, position: "absolute", top: -16, left: -8 }}>"</span>
              {c.quote}
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", letterSpacing: "0.08em", color: "var(--silver)", textTransform: "uppercase" }}>
              <strong style={{ color: "var(--gold)", display: "block", fontSize: "0.72rem", marginBottom: 2 }}>{c.name}</strong>
              {c.role}
            </div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 16, fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.08em", color: "var(--silver)", opacity: 0.5 }}>
        Illustrative founder journeys based on early-adopter experiences
      </p>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTION 10 — PRICING
   ═══════════════════════════════════════════ */
function Pricing({ onAuth }: { onAuth: () => void }) {
  const { ref, visible } = useReveal();

  const freeFeatures = [
    "Full Mavrik interview session",
    "Market-validated idea generation (3 rounds)",
    "Financial Viability Score™ preview",
    "FVS sub-score breakdown",
    "One venture at a time",
  ];
  const proFeatures = [
    "Full FVS™ with all 6 dimensions unlocked",
    "Unlimited market-validated idea generation",
    "Complete Implementation Kit (4 docs)",
    "Daily execution coaching + adaptive tasks",
    "30-day venture plan with milestone tracking",
    "Streak & XP progression system",
    "AI Workspace with full Mavrik context",
    "Pattern Detection + behavioral insights",
    "Export-ready build prompts for Lovable / Cursor / v0",
  ];

  const ctaBtn: React.CSSProperties = {
    width: "100%", background: "var(--gold)", color: "var(--ink)", border: "none",
    padding: "14px 0", fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
    fontSize: "0.82rem", letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer",
    marginTop: 32, transition: "background 0.2s", minHeight: 48,
  };

  return (
    <section id="pricing" className="px-4 py-16 md:px-12 md:py-24" style={{ background: "var(--ink-2)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
      <Eyebrow text="Pricing" />
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "clamp(1.8rem, 4vw, 3.2rem)", lineHeight: 1.1, marginTop: 16 }}>
        Your first venture decision is <em style={{ color: "var(--gold)", fontStyle: "italic" }}>free.</em>
      </h2>
      <p className="text-sm sm:text-base" style={{ marginTop: 20, color: "var(--white-dim)", maxWidth: 520 }}>
        Seven days to run Mavrik, generate your FVS, and decide if TrueBlazer is your edge. Cancel before the trial ends and pay nothing.
      </p>

      <div ref={ref} className={`lp-reveal ${visible ? "visible" : ""} grid grid-cols-1 md:grid-cols-2 gap-px mt-10 md:mt-14`} style={{ background: "var(--border-subtle)", maxWidth: 800 }}>
        {/* Free */}
        <div className="p-5 sm:p-8 md:p-10" style={{ background: "var(--ink)" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--silver)", display: "block", marginBottom: 20, marginTop: 8 }}>Free Trial</span>
          <div className="text-4xl sm:text-5xl" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900 }}>$0</div>
          <p className="text-xs sm:text-sm" style={{ fontFamily: "'DM Sans', sans-serif", color: "var(--silver)", marginTop: 8, marginBottom: 32 }}>7 days — no charge until trial ends</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {freeFeatures.map(f => (
              <li key={f} className="text-xs sm:text-sm min-w-0" style={{ fontFamily: "'DM Sans', sans-serif", color: "var(--silver)", display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "var(--gold)", fontSize: "0.5rem", marginTop: 6, flexShrink: 0 }}>◆</span>{f}
              </li>
            ))}
          </ul>
          <button onClick={onAuth} style={ctaBtn}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--gold-light)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--gold)")}
          >Start Free Trial</button>
        </div>

        {/* Pro */}
        <div className="p-5 sm:p-8 md:p-10" style={{ background: "var(--ink-2)", border: "1px solid var(--lp-border)", position: "relative" }}>
          <div style={{ position: "absolute", top: -1, left: -1, right: -1, fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.15em", background: "var(--gold)", color: "var(--ink)", textAlign: "center", padding: 6, textTransform: "uppercase" }}>Most Popular</div>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--silver)", display: "block", marginBottom: 20, marginTop: 8 }}>TrueBlazer Pro</span>
          <div className="text-4xl sm:text-5xl" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900 }}>$49</div>
          <p className="text-xs sm:text-sm" style={{ fontFamily: "'DM Sans', sans-serif", color: "var(--silver)", marginTop: 8, marginBottom: 32 }}>per month — billed monthly, cancel anytime</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {proFeatures.map(f => (
              <li key={f} className="text-xs sm:text-sm min-w-0" style={{ fontFamily: "'DM Sans', sans-serif", color: "var(--silver)", display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "var(--gold)", fontSize: "0.5rem", marginTop: 6, flexShrink: 0 }}>◆</span>{f}
              </li>
            ))}
          </ul>
          <button onClick={onAuth} style={ctaBtn}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--gold-light)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--gold)")}
          >Start Free Trial</button>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", letterSpacing: "0.08em", color: "var(--silver)", textAlign: "center", marginTop: 12 }}>
            Card required · charged after 7-day trial · cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTION 11 — FINAL CTA
   ═══════════════════════════════════════════ */
function FinalCTA({ onAuth }: { onAuth: () => void }) {
  return (
    <section className="px-4 py-16 md:px-12 md:py-24 text-center relative overflow-hidden" style={{ background: "var(--ink-2)", borderTop: "1px solid var(--lp-border)" }}>
      <div style={{ position: "absolute", top: -300, left: "50%", transform: "translateX(-50%)", width: 800, height: 800, background: "radial-gradient(circle, rgba(200,168,75,0.08) 0%, transparent 65%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)" }}>The Decision Layer</span>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 4.5rem)", lineHeight: 1.05, letterSpacing: "-0.02em", margin: "24px 0 20px" }}>
          Stop building things<br />that shouldn't<br />be <em style={{ color: "var(--gold)", fontStyle: "italic" }}>built.</em>
        </h2>
        <p className="text-sm sm:text-base" style={{ color: "var(--white-dim)", maxWidth: 480, margin: "0 auto 40px", lineHeight: 1.65 }}>
          In a world where AI can execute anything, the rarest skill is knowing what to build in the first place. That's what TrueBlazer gives you — then keeps you building it, every single day. Start your free trial.
        </p>
        <button onClick={onAuth} className="w-full sm:w-auto" style={{ background: "var(--gold)", color: "var(--ink)", padding: "14px 36px", border: "none", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: "0.9rem", letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", transition: "background 0.2s", minHeight: 48 }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--gold-light)")}
          onMouseLeave={e => (e.currentTarget.style.background = "var(--gold)")}
        >
          Get Your Financial Viability Score
        </button>
        <p style={{ marginTop: 20, fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--silver)", textTransform: "uppercase" }}>
          7-day free trial · CFA-level methodology · Backed by real financial expertise
        </p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   WEEK ONE SECTION
   ═══════════════════════════════════════════ */
function WeekOne() {
  const { ref, visible } = useReveal();

  const deliverables = [
    "Clarity on exactly what to build — based on your expertise and real market demand",
    "5+ market-validated venture ideas scored across 6 financial dimensions",
    "Cross-industry opportunities you'd never discover on your own",
    "A committed North Star venture with a 30-day execution plan",
    "Daily adaptive tasks tailored to your schedule, skills, and network",
    "Build-ready specs you can paste directly into Lovable, Cursor, or v0",
  ];

  return (
    <section className="px-4 py-16 md:px-12 md:py-24" style={{ background: "var(--ink)", borderTop: "1px solid var(--border-subtle)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Eyebrow text="Week One" />
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "clamp(1.8rem, 4vw, 3.2rem)", lineHeight: 1.1, marginTop: 16 }}>
          What gets built into your system of record{" "}
          <span style={{ color: "var(--silver)" }}>in 7 days</span>
        </h2>

        <div ref={ref} className={`lp-reveal ${visible ? "visible" : ""}`} style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 16 }}>
          {deliverables.map((item, index) => (
            <div key={index} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--gold-dim)", border: "1px solid var(--lp-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <Check size={12} style={{ color: "var(--gold)" }} />
              </div>
              <span className="text-sm sm:text-base" style={{ color: "var(--white-dim)", lineHeight: 1.6 }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTION 12 — FOOTER
   ═══════════════════════════════════════════ */
function Footer() {
  const linkStyle: React.CSSProperties = { fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--silver)", textDecoration: "none", transition: "color 0.2s" };

  return (
    <footer className="px-4 py-8 md:px-12 md:py-12" style={{ borderTop: "1px solid var(--border-subtle)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem" }}>
          <span style={{ color: "var(--silver)" }}>True</span>
          <span style={{ color: "var(--gold)" }}>Blazer</span>
        </span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "var(--silver)", letterSpacing: "0.02em" }}>
          TrueBlazer.AI — The system of record for your venture.
        </span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 8 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: "var(--silver)", letterSpacing: "0.04em", opacity: 0.5 }}>
            © {new Date().getFullYear()} TrueBlazer.AI
          </span>
          <div className="flex gap-4 sm:gap-6">
            <a href="/terms" style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = "var(--white)")} onMouseLeave={e => (e.currentTarget.style.color = "var(--silver)")}>Terms</a>
            <a href="/privacy" style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = "var(--white)")} onMouseLeave={e => (e.currentTarget.style.color = "var(--silver)")}>Privacy</a>
            <a href="mailto:support@trueblazer.ai" style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = "var(--white)")} onMouseLeave={e => (e.currentTarget.style.color = "var(--silver)")}>Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════
   SHARED — Eyebrow
   ═══════════════════════════════════════════ */
function Eyebrow({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <span style={{ width: 20, height: 1, background: "var(--gold)", flexShrink: 0 }} />
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)" }}>{text}</span>
    </div>
  );
}
