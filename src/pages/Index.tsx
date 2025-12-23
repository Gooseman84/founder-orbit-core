import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { TrueBlazerLogoGradient } from "@/components/shared/TrueBlazerLogo";
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
          <TrueBlazerLogoGradient size="lg" />
          <Button variant="ghost" onClick={() => navigate("/auth")} className="text-muted-foreground hover:text-foreground">
            Sign In
          </Button>
        </div>
      </nav>

      <HeroSection onNavigate={() => navigate("/auth")} />
      <IdentitySection />
      <TransformationSection />
      <FutureSelfSection />
      <WhoThisIsForSection />
      <WeekOneSection />
      <PricingSection onNavigate={() => navigate("/auth")} />
      <FinalCTASection onNavigate={() => navigate("/auth")} />

      <footer className="py-12 px-6 border-t border-border/30">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TrueBlazer.AI — Find your path. Build with purpose.
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

  return (
    <section ref={ref} className="relative pt-32 pb-24 md:pt-40 md:pb-32 px-6 overflow-hidden">
      {/* Cinematic gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className={`container mx-auto max-w-5xl text-center relative z-10 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-10">
          <Flame className="w-4 h-4" />
          Your transformation begins now
        </div>
        
        {/* Main Headline */}
        <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-8 tracking-tight transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          Become the person who builds{" "}
          <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            the life you keep talking about.
          </span>
        </h1>
        
        {/* Subhead */}
        <p className={`text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto leading-relaxed transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          TrueBlazer.AI is your AI cofounder — helping you discover the business you were meant to build and guiding you through every step until it becomes real.
        </p>
        
        {/* CTA */}
        <div className={`flex flex-col items-center gap-4 mt-12 transition-all duration-1000 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <Button 
            variant="gradient" 
            size="lg" 
            className="text-lg px-10 py-7 group min-h-[60px]" 
            onClick={onNavigate}
          >
            Start free — unlock your future
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <p className="text-sm text-muted-foreground">
            No credit card. No pressure. Just clarity.
          </p>
        </div>
      </div>
    </section>
  );
};

const IdentitySection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section ref={ref} className="py-24 md:py-32 px-6 bg-gradient-to-b from-muted/20 to-background">
      <div className={`container mx-auto max-w-4xl text-center transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        <p className="text-primary font-semibold mb-4 tracking-wide uppercase text-sm">This is about who you're becoming</p>
        
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-10 leading-tight">
          Your future is calling.{" "}
          <span className="text-muted-foreground">Stop putting it on hold.</span>
        </h2>
        
        <div className={`text-lg md:text-xl text-muted-foreground leading-relaxed space-y-6 max-w-3xl mx-auto transition-all duration-1000 delay-200 ${isVisible ? "opacity-100" : "opacity-0"}`}>
          <p>
            Most people wait for the perfect idea, the perfect moment, the perfect plan.
          </p>
          <p>
            But momentum comes from <span className="text-foreground font-medium">clarity</span> — and clarity comes from knowing who you are, what you're capable of, and what you're meant to build.
          </p>
          <p className="text-foreground">
            TrueBlazer learns your story, your strengths, your time, your resources, and your desires…
            <br />
            <span className="text-primary font-semibold">Then it shows you the version of you who's already doing it.</span>
          </p>
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
      icon: Brain,
      title: "Discover Yourself",
      description: "Uncover your passions, skills, risk tolerance, lifestyle goals, and hidden strengths. See yourself more clearly than ever before."
    },
    {
      step: "02",
      icon: Lightbulb,
      title: "Find Your Business",
      description: "Unlock idea streams, creator plays, SaaS angles, faceless brands, niche opportunities, and unexpected paths designed just for you."
    },
    {
      step: "03",
      icon: Rocket,
      title: "Build Your Future",
      description: "With a Blueprint, tasks, daily guidance, and AI support — TrueBlazer turns \"I think I could do this…\" into \"I'm actually doing it.\""
    }
  ];

  return (
    <section ref={ref} className="py-24 md:py-32 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className={`text-center mb-20 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <p className="text-primary font-semibold mb-4 tracking-wide uppercase text-sm">The Transformation</p>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold">
            Three steps to a new life.
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((item, index) => (
            <div 
              key={item.title}
              className={`relative p-8 lg:p-10 rounded-3xl bg-card border border-border hover:border-primary/40 transition-all duration-500 group hover:shadow-[0_20px_60px_rgba(255,106,0,0.1)] hover:-translate-y-2 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: `${200 + index * 150}ms` }}
            >
              {/* Step number */}
              <span className="absolute -top-4 left-8 text-6xl font-bold text-primary/10 group-hover:text-primary/20 transition-colors">
                {item.step}
              </span>
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                <item.icon className="w-8 h-8 text-primary" />
              </div>
              
              <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FutureSelfSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  const visions = [
    "You wake up excited again.",
    "You're building something that's yours.",
    "You're no longer guessing — you have a plan.",
    "You're in motion, not stuck.",
    "Your business is growing because you are growing.",
    "You feel proud of who you're becoming."
  ];

  return (
    <section ref={ref} className="py-24 md:py-32 px-6 bg-gradient-to-b from-background via-muted/30 to-background relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto max-w-4xl text-center relative z-10">
        <p className={`text-primary font-semibold mb-4 tracking-wide uppercase text-sm transition-all duration-1000 ${isVisible ? "opacity-100" : "opacity-0"}`}>
          Meet your future self
        </p>
        
        <h2 className={`text-3xl md:text-5xl lg:text-6xl font-bold mb-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          Picture your life{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">12 months from now.</span>
        </h2>
        
        <div className="space-y-5 text-xl md:text-2xl">
          {visions.map((vision, index) => (
            <p 
              key={index}
              className={`flex items-center justify-center gap-4 text-muted-foreground transition-all duration-700 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"}`}
              style={{ transitionDelay: `${300 + index * 100}ms` }}
            >
              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              <span className="hover:text-foreground transition-colors">{vision}</span>
            </p>
          ))}
        </div>
        
        <div className={`mt-16 p-8 rounded-3xl bg-card border border-primary/20 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`} style={{ transitionDelay: "900ms" }}>
          <p className="text-xl md:text-2xl font-medium">
            TrueBlazer doesn't just give you ideas.
            <br />
            <span className="text-primary font-bold">It gives you a path.</span>
          </p>
        </div>
      </div>
    </section>
  );
};

const WhoThisIsForSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const identities = [
    {
      icon: User,
      title: "The 9-to-5 Builder",
      description: "You want something of your own. You're done making others rich."
    },
    {
      icon: Sparkles,
      title: "The Creator With Untapped Potential",
      description: "You know there's a business inside you waiting to come out."
    },
    {
      icon: Clock,
      title: "The High-Performer With Zero Time",
      description: "You need clarity, not chaos. Every hour matters."
    },
    {
      icon: Repeat,
      title: "The Serial Starter",
      description: "This time, you finish. This time, it's different."
    }
  ];

  return (
    <section ref={ref} className="py-24 md:py-32 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <p className="text-primary font-semibold mb-4 tracking-wide uppercase text-sm">Identity Resonance</p>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold">
            TrueBlazer is built for the ones{" "}
            <span className="text-muted-foreground">who refuse to settle.</span>
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
    "A crystal-clear Founder Profile",
    "20–40 ideas built around your strengths",
    "1–2 Blueprinted businesses ready to explore",
    "A 30-day action plan",
    "A sense of direction you haven't felt in years"
  ];

  return (
    <section ref={ref} id="week-one" className="py-24 md:py-32 px-6 bg-gradient-to-b from-muted/20 to-background">
      <div className="container mx-auto max-w-4xl text-center">
        <div className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <p className="text-primary font-semibold mb-4 tracking-wide uppercase text-sm">Power Proof</p>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6">
            In your first 7 days,{" "}
            <span className="text-muted-foreground">you'll walk away with:</span>
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
    "Full Founder Profile",
    "Unlimited Idea Generation",
    "Idea Library & Scoring",
    "Blueprints & Workspace",
    "Tasks & Daily Pulse",
    "Progress & XP Tracking"
  ];

  return (
    <section ref={ref} className="py-24 md:py-32 px-6">
      <div className="container mx-auto max-w-4xl">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <p className="text-primary font-semibold mb-4 tracking-wide uppercase text-sm">Pricing</p>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6">
            Simple, sane pricing{" "}
            <span className="text-muted-foreground">for builders.</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free. Upgrade only when you know it's helping you build the life you want.
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
                  <h3 className="text-2xl md:text-3xl font-bold">Founder Mode</h3>
                </div>
                <p className="text-muted-foreground">Everything you need to find and build your business.</p>
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
                Start free — unlock TrueBlazer
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <p className="text-sm text-muted-foreground">
                No contracts. Cancel anytime in 2 clicks.
              </p>
            </div>
          </div>
        </div>
        
        {/* Secondary link */}
        <div className={`text-center mt-8 transition-all duration-1000 delay-600 ${isVisible ? "opacity-100" : "opacity-0"}`}>
          <a 
            href="#week-one"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("week-one")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            See what you can build in 7 days
            <ArrowRight className="w-4 h-4" />
          </a>
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
        <p className="text-primary font-semibold mb-4 tracking-wide uppercase text-sm">Call to Rise</p>
        
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
          Everything you want exists on the other side of{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">courage.</span>
        </h2>
        
        <p className={`text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto transition-all duration-1000 delay-200 ${isVisible ? "opacity-100" : "opacity-0"}`}>
          Let TrueBlazer show you the version of you who's already winning.
        </p>
        
        <div className={`flex flex-col items-center gap-4 transition-all duration-1000 delay-400 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <Button 
            variant="gradient" 
            size="lg" 
            className="text-lg px-12 py-8 group min-h-[64px] shadow-2xl shadow-primary/20" 
            onClick={onNavigate}
          >
            Start free — step into your future
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <p className="text-muted-foreground font-medium">
            No risk. Big upside.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Index;
