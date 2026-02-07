import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { ArrowRight, Sparkles, Target, Zap, Brain, Compass, Lightbulb, Flame, Check, User, Clock, Rocket, Repeat, Crown } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            TrueBlazer.AI
          </h1>
          <Button variant="ghost" onClick={() => navigate("/auth")} className="text-muted-foreground hover:text-foreground">
            Sign In
          </Button>
        </div>
      </nav>

      <HeroSection onNavigate={() => navigate("/auth")} />
      <SocialProofSection />
      <ProblemSolutionSection />
      <TransformationSection />
      <WhoThisIsForSection />
      <WeekOneSection />
      <PricingSection onNavigate={() => navigate("/auth")} />
      <FinalCTASection onNavigate={() => navigate("/auth")} />

      <footer className="py-12 px-6 border-t border-border/30">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground" suppressHydrationWarning>
            © 2026 TrueBlazer.AI — Know what to build. Build it right.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const HeroSection = ({ onNavigate }: { onNavigate: () => void }) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const scrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section ref={ref} className="relative pt-32 pb-16 md:pt-40 md:pb-24 px-6 overflow-hidden">
      {/* Cinematic gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className={`container mx-auto max-w-5xl text-center relative z-10 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-10">
          <Target className="w-4 h-4" />
          Founder Intelligence Platform
        </div>
        
        {/* Main Headline */}
        <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-8 tracking-tight transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          AI can build anything.{" "}
          <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            TrueBlazer tells you what's worth building.
          </span>
        </h1>
        
        {/* Subhead */}
        <p className={`text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto leading-relaxed transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          The founder intelligence platform that validates your business idea, stress-tests your model, and gives you a clear go/no-go before you write a single line of code.
        </p>
        
        {/* CTAs */}
        <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 transition-all duration-1000 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <Button 
            variant="gradient" 
            size="lg" 
            className="text-lg px-10 py-7 group min-h-[60px]" 
            onClick={onNavigate}
          >
            Validate Your Idea
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="text-lg px-8 py-7 min-h-[60px] border-border/50 hover:border-primary/50 hover:bg-primary/5" 
            onClick={scrollToHowItWorks}
          >
            See How It Works
          </Button>
        </div>
      </div>
    </section>
  );
};

const SocialProofSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3 });

  return (
    <section ref={ref} className="py-8 md:py-12 px-6 border-y border-border/20 bg-muted/10">
      <div className={`container mx-auto max-w-4xl text-center transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
        <p className="text-muted-foreground text-sm md:text-base">
          Built by a <span className="text-foreground font-medium">CFA Charterholder & CFP</span> who evaluates business models for a living.
        </p>
      </div>
    </section>
  );
};

const ProblemSolutionSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section ref={ref} className="py-20 md:py-28 px-6">
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
            The Real Problem Isn't Building.{" "}
            <span className="text-muted-foreground">It's Choosing.</span>
          </h2>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* Problem Column */}
          <div 
            className={`p-8 lg:p-10 rounded-3xl bg-muted/50 border border-border/50 transition-all duration-700 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"}`}
            style={{ transitionDelay: "200ms" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-muted-foreground/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">The Problem</span>
            </div>
            
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                AI coding tools made building easy. But <span className="text-foreground font-medium">90% of startups still fail.</span>
              </p>
              <p>
                Why? Because founders skip the most important step: figuring out if their idea is actually worth building.
              </p>
              <p>
                Every week spent building the wrong thing is a week you'll never get back. And no amount of vibe coding can fix a fundamentally flawed business model.
              </p>
            </div>
          </div>

          {/* Solution Column */}
          <div 
            className={`p-8 lg:p-10 rounded-3xl bg-gradient-to-br from-primary/5 via-card to-card border border-primary/20 transition-all duration-700 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"}`}
            style={{ transitionDelay: "400ms" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-primary uppercase tracking-wide">The Solution</span>
            </div>
            
            <div className="space-y-4 text-foreground/80 leading-relaxed">
              <p>
                <span className="text-foreground font-medium">TrueBlazer is the due diligence layer</span> between having an idea and committing to build it.
              </p>
              <p>
                We combine AI-powered analysis with the financial rigor of a CFA Charterholder to give you the one thing every founder needs:
              </p>
              <p className="text-primary font-semibold text-lg">
                Confidence that you're building something people will actually pay for.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


const TransformationSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const steps = [
    {
      step: "01",
      label: "DISCOVER",
      icon: Compass,
      title: "Discover What to Build",
      description: "Our AI co-founder interviews you to uncover your unfair advantages, real constraints, and the ideas hiding in your expertise. No generic brainstorming—personalized recommendations based on who you are."
    },
    {
      step: "02",
      label: "VALIDATE",
      icon: Target,
      title: "Validate Before You Invest",
      description: "Stress-test your concept against market demand, unit economics, competitive landscape, and your personal constraints. Get a Financial Viability Score that tells you if this idea can actually make money."
    },
    {
      step: "03",
      label: "EXECUTE",
      icon: Rocket,
      title: "Build With Confidence",
      description: "Get a complete implementation blueprint ready for Lovable, Cursor, or any AI coding tool. Plus your SaaS Vibe Coding Kit with architecture specs, vertical slice plans, and ready-to-paste prompts."
    }
  ];

  return (
    <section ref={ref} id="how-it-works" className="py-24 md:py-32 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className={`text-center mb-20 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <p className="text-primary font-semibold mb-4 tracking-wide uppercase text-sm">How It Works</p>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold">
            From idea to implementation in three steps.
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 relative">
          {/* Flow arrows (desktop only) */}
          <div className="hidden md:block absolute top-1/2 left-[calc(33.333%-1rem)] -translate-y-1/2 w-8 z-10">
            <div className={`flex items-center justify-center transition-all duration-700 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`} style={{ transitionDelay: "500ms" }}>
              <ArrowRight className="w-6 h-6 text-primary/60" />
            </div>
          </div>
          <div className="hidden md:block absolute top-1/2 left-[calc(66.666%-1rem)] -translate-y-1/2 w-8 z-10">
            <div className={`flex items-center justify-center transition-all duration-700 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`} style={{ transitionDelay: "700ms" }}>
              <ArrowRight className="w-6 h-6 text-primary/60" />
            </div>
          </div>
          
          {steps.map((item, index) => (
            <div 
              key={item.title}
              className={`relative p-8 lg:p-10 rounded-3xl bg-card border border-border hover:border-primary/40 transition-all duration-500 group hover:shadow-[0_20px_60px_rgba(255,106,0,0.1)] hover:-translate-y-2 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: `${200 + index * 150}ms` }}
            >
              {/* Step label badge */}
              <div className="absolute -top-3 left-8 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wider">
                {item.label}
              </div>
              
              {/* Step number */}
              <span className="absolute -top-4 right-8 text-6xl font-bold text-primary/10 group-hover:text-primary/20 transition-colors">
                {item.step}
              </span>
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mt-4 mb-6 group-hover:scale-110 transition-transform duration-300">
                <item.icon className="w-8 h-8 text-primary" />
              </div>
              
              <h3 className="text-xl lg:text-2xl font-bold mb-4">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.description}</p>
              
              {/* Mobile flow arrow */}
              {index < steps.length - 1 && (
                <div className="md:hidden flex justify-center mt-6 -mb-12">
                  <div className={`w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-500 ${isVisible ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: `${400 + index * 150}ms` }}>
                    <ArrowRight className="w-4 h-4 text-primary rotate-90" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};


const WhoThisIsForSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const identities = [
    {
      icon: Clock,
      title: "The Side-Hustle Strategist",
      description: "You have 10-15 hours a week and zero room for wasted effort. TrueBlazer finds the idea that fits your schedule, skills, and financial goals."
    },
    {
      icon: User,
      title: "The Domain Expert",
      description: "You've spent years in your industry and see problems everywhere. TrueBlazer turns your insider knowledge into a validated business concept."
    },
    {
      icon: Target,
      title: "The Analytical Builder",
      description: "You don't trust gut feelings — you trust data. TrueBlazer gives you financial viability scores, market analysis, and a clear go/no-go before you invest a dime."
    },
    {
      icon: Repeat,
      title: "The Idea Hoarder",
      description: "You have 47 ideas in a Google Doc and have started none. TrueBlazer forces focus: one venture at a time, validated before you build."
    }
  ];

  return (
    <section ref={ref} className="py-24 md:py-32 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold">
            Built for founders who{" "}
            <span className="text-muted-foreground">think before they build.</span>
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {identities.map((identity, index) => (
            <div 
              key={identity.title}
              className={`p-8 lg:p-10 rounded-3xl bg-card border border-border hover:border-primary/40 transition-all duration-500 group hover:shadow-[0_20px_60px_rgba(255,106,0,0.08)] hover:-translate-y-1 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: `${200 + index * 100}ms` }}
            >
              <div className="flex items-start gap-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <identity.icon className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl lg:text-2xl font-bold mb-2">{identity.title}</h3>
                  <p className="text-muted-foreground text-lg">{identity.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const WeekOneSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  const deliverables = [
    "A personalized Mavrik interview that uncovers your unfair advantages",
    "3-5 venture ideas ranked by how well they fit YOUR specific profile",
    "Financial Viability Scores on your top ideas",
    "A validated Blueprint with market analysis and competitive positioning",
    "Implementation-ready specs for Lovable, Cursor, or your preferred coding tool"
  ];

  return (
    <section ref={ref} id="week-one" className="py-24 md:py-32 px-6 bg-gradient-to-b from-muted/20 to-background">
      <div className="container mx-auto max-w-4xl text-center">
        <div className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6">
            What you walk away with{" "}
            <span className="text-muted-foreground">in 7 days</span>
          </h2>
        </div>
        
        <div className={`mt-12 p-8 lg:p-12 rounded-3xl bg-card border border-border transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="space-y-5">
            {deliverables.map((item, index) => (
              <div 
                key={index}
                className={`flex items-center gap-4 text-left transition-all duration-700 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"}`}
                style={{ transitionDelay: `${400 + index * 100}ms` }}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <p className="text-lg md:text-xl text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const PricingSection = ({ onNavigate }: { onNavigate: () => void }) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  const features = [
    "Mavrik AI Interview (personalized idea discovery)",
    "Unlimited Idea Generation & Scoring",
    "Financial Viability Scores with full breakdown",
    "Venture Blueprints & Validation",
    "SaaS Vibe Coding Kit (implementation specs)",
    "Workspace & Document Library",
    "Voice-to-Text across all inputs"
  ];

  return (
    <section ref={ref} className="py-24 md:py-32 px-6">
      <div className="container mx-auto max-w-4xl">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6">
            One plan.{" "}
            <span className="text-muted-foreground">No upsell maze.</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Try free for 7 days. Cancel anytime.
          </p>
        </div>
        
        {/* Pricing Card */}
        <div 
          className={`relative p-8 md:p-12 rounded-3xl bg-card border border-primary/30 transition-all duration-1000 delay-200 hover:border-primary/50 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          style={{ boxShadow: "0 0 80px rgba(255, 106, 0, 0.08)" }}
        >
          {/* Glow effect */}
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-primary/20 to-transparent opacity-50 pointer-events-none" />
          
          <div className="relative z-10">
            {/* Plan header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold">TrueBlazer Pro</h3>
                </div>
                <p className="text-muted-foreground">Everything you need to validate and build your venture.</p>
              </div>
              
              <div className="text-left md:text-right">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl md:text-5xl font-bold">$29</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">or $199/year (save 43%)</p>
              </div>
            </div>
            
            {/* Features grid */}
            <div className="grid md:grid-cols-2 gap-4 mb-10">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className={`flex items-center gap-3 transition-all duration-500 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-5"}`}
                  style={{ transitionDelay: `${400 + index * 80}ms` }}
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>
            
            {/* CTA */}
            <div className="flex flex-col items-center gap-4">
              <Button 
                variant="gradient" 
                size="lg" 
                className="w-full md:w-auto text-lg px-12 py-7 group min-h-[60px]" 
                onClick={onNavigate}
              >
                Start Your 7-Day Trial
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <p className="text-sm text-muted-foreground">
                No credit card required. Cancel in 2 clicks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const FinalCTASection = ({ onNavigate }: { onNavigate: () => void }) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section ref={ref} className="py-24 md:py-32 px-6 relative overflow-hidden">
      {/* Dramatic gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-background to-background pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      
      <div className={`container mx-auto max-w-4xl text-center relative z-10 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
          Your next idea deserves more than{" "}
          <span className="text-muted-foreground">a Google Doc.</span>
        </h2>
        
        <p className={`text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto transition-all duration-1000 delay-200 ${isVisible ? "opacity-100" : "opacity-0"}`}>
          In 7 days, you'll know exactly what to build, why it will work, and how to start. Free.
        </p>
        
        <div className={`flex flex-col items-center gap-4 transition-all duration-1000 delay-400 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <Button 
            variant="gradient" 
            size="lg" 
            className="text-lg px-12 py-8 group min-h-[64px] shadow-2xl shadow-primary/20" 
            onClick={onNavigate}
          >
            Validate Your Idea
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Index;
