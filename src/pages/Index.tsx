import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { ArrowRight, Sparkles, Target, Zap, Brain, Compass, Lightbulb, Flame, Check } from "lucide-react";

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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            TrueBlazer.AI
          </h1>
          <Button variant="ghost" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>
      </nav>

      <HeroSection onNavigate={() => navigate("/auth")} />
      <AgitateSection />
      <PromiseSection />
      <FeelsSection />
      <ExperiencesSection />
      <SocialProofSection />
      <PricingSection onNavigate={() => navigate("/auth")} />
      <FinalCTASection onNavigate={() => navigate("/auth")} />

      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} TrueBlazer.AI — Find your path. Build with purpose.</p>
        </div>
      </footer>
    </div>
  );
};

const HeroSection = ({ onNavigate }: { onNavigate: () => void }) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section ref={ref} className="pt-32 pb-20 px-6">
      <div className={`container mx-auto max-w-4xl text-center transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-pulse">
          <Sparkles className="w-4 h-4" />
          Your founder journey starts here
        </div>
        
        <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          Find the one idea worth building —{" "}
          <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            and get the system to build it with you.
          </span>
        </h1>
        
        <p className={`text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto leading-relaxed transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          TrueBlazer doesn't drown you in ideas.
          It helps you uncover your calling, choose the right path, and build with unstoppable momentum.
        </p>
        
        <div className={`flex flex-col sm:flex-row gap-4 justify-center mt-10 transition-all duration-1000 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <Button size="lg" className="text-lg px-8 py-6 group hover:scale-105 transition-transform duration-300" onClick={onNavigate}>
            Start free — discover your path
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
        
        <p className={`text-sm text-muted-foreground mt-6 italic transition-all duration-1000 delay-700 ${isVisible ? "opacity-100" : "opacity-0"}`}>
          Your life changes the moment you stop guessing and start building with clarity.
        </p>
      </div>
    </section>
  );
};

const AgitateSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section ref={ref} className="py-24 px-6 bg-muted/30">
      <div className={`container mx-auto max-w-3xl text-center transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        <h2 className="text-3xl md:text-5xl font-bold mb-8">
          You're not lacking intelligence.{" "}
          <span className="text-muted-foreground">You're lacking direction.</span>
        </h2>
        
        <p className={`text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 transition-all duration-1000 delay-200 ${isVisible ? "opacity-100" : "opacity-0"}`}>
          Ideas are everywhere — courses, YouTube, TikTok, X…
          <br />
          What's missing is a way to know which idea fits <em>you</em>, which one will work, and what steps to take next.
          <br /><br />
          The noise is paralyzing. The self-doubt is real. The cost of choosing wrong is high.
        </p>
        
        <p className={`text-xl font-semibold text-primary transition-all duration-1000 delay-400 ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
          TrueBlazer cuts through the noise and helps you commit with confidence.
        </p>
      </div>
    </section>
  );
};

const PromiseSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const pillars = [
    {
      icon: Brain,
      title: "Uncover What You're Built For",
      description: "You'll see yourself more clearly than you ever have — passions, strengths, patterns, blind spots, motivations, and opportunities.",
      tagline: "We don't \"profile.\" We reveal potential."
    },
    {
      icon: Target,
      title: "Choose With Certainty",
      description: "Instead of guessing, doubting, or flipping a coin, TrueBlazer guides you toward the opportunity that aligns with your life, skills, and future.",
      tagline: null
    },
    {
      icon: Zap,
      title: "Build With Daily Progress",
      description: "Once you choose your North Star, everything starts moving — decisions, steps, insights, habits, momentum.",
      tagline: "You don't just dream. You execute."
    }
  ];

  return (
    <section ref={ref} className="py-24 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <p className="text-primary font-semibold mb-4 tracking-wide uppercase text-sm">The Transformation</p>
          <h2 className="text-3xl md:text-5xl font-bold">
            Clarity. Conviction. Momentum.
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {pillars.map((pillar, index) => (
            <div 
              key={pillar.title}
              className={`p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-500 group hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-2 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: `${200 + index * 150}ms` }}
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                <pillar.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-4">{pillar.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{pillar.description}</p>
              {pillar.tagline && (
                <p className="text-sm text-primary mt-4 font-medium">{pillar.tagline}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FeelsSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  const feelings = [
    "Like having a co-founder who understands you deeply",
    "Like the fog finally lifting",
    "Like unlocking the version of you that's confident, decisive, and unstoppable",
    "Like someone organized your brain and handed you the plan"
  ];

  return (
    <section ref={ref} className="py-24 px-6 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className={`text-3xl md:text-5xl font-bold mb-12 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          What TrueBlazer <span className="text-primary">feels</span> like:
        </h2>
        
        <div className="space-y-6 text-lg md:text-xl text-muted-foreground">
          {feelings.map((feeling, index) => (
            <p 
              key={index}
              className={`flex items-center justify-center gap-3 transition-all duration-700 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"}`}
              style={{ transitionDelay: `${300 + index * 150}ms` }}
            >
              <span className="text-primary animate-pulse">✦</span>
              {feeling}
            </p>
          ))}
        </div>
        
        <div className={`mt-12 pt-8 border-t border-border transition-all duration-1000 ${isVisible ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "900ms" }}>
          <p className="text-xl font-medium">
            It's not magic.
            <br />
            <span className="text-primary">It just feels like it.</span>
          </p>
        </div>
      </div>
    </section>
  );
};

const ExperiencesSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const experiences = [
    { icon: Sparkles, title: "Personal Clarity Moments", description: "Insights about you that instantly connect dots and make decisions easy." },
    { icon: Compass, title: "Opportunity Snapshots", description: "A zoomed-out understanding of where your greatest potential lies." },
    { icon: Lightbulb, title: '"Oh damn" Realizations', description: "Those moments where the right idea feels obvious — because it finally is." },
    { icon: Flame, title: "Daily Momentum Nudges", description: "Small steps that keep you building, not drifting." },
    { icon: Target, title: "Focus Anchors", description: "Reminders of your direction so you never feel lost again." }
  ];

  return (
    <section ref={ref} className="py-24 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Your founder journey — <span className="text-primary">guided.</span>
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {experiences.map((exp, index) => (
            <div 
              key={exp.title}
              className={`p-8 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 group ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-95"}`}
              style={{ transitionDelay: `${200 + index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                <exp.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">{exp.title}</h3>
              <p className="text-muted-foreground">{exp.description}</p>
            </div>
          ))}
          
          <div 
            className={`p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center transition-all duration-500 ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-95"}`}
            style={{ transitionDelay: "700ms" }}
          >
            <p className="text-center text-muted-foreground italic">
              No mechanics. No architecture.<br />
              <span className="text-foreground font-medium">Just benefits and emotional truth.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const SocialProofSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  const testimonials = [
    "TrueBlazer made me realize I'd been chasing the wrong ideas for years.",
    "It connected my background, passions, and timing better than I ever could.",
    "For the first time in a decade, I'm building something I believe in."
  ];

  return (
    <section ref={ref} className="py-24 px-6 bg-muted/30">
      <div className="container mx-auto max-w-5xl">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-3xl md:text-4xl font-bold">
            People don't need more ideas —{" "}
            <span className="text-primary">they need the right one.</span>
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((quote, index) => (
            <div 
              key={index}
              className={`p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-lg hover:-translate-y-1 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: `${200 + index * 150}ms` }}
            >
              <p className="text-lg italic text-muted-foreground">"{quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const PricingSection = ({ onNavigate }: { onNavigate: () => void }) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section ref={ref} className="py-24 px-6">
      <div className="container mx-auto max-w-3xl text-center">
        <h2 className={`text-3xl md:text-4xl font-bold mb-4 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          Start free. Unlock more clarity when you're ready.
        </h2>
        
        <div className="mt-12 grid md:grid-cols-2 gap-8">
          <div 
            className={`p-8 rounded-2xl bg-card border border-border text-left hover:border-primary/30 transition-all duration-500 hover:shadow-lg ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"}`}
            style={{ transitionDelay: "200ms" }}
          >
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Free</p>
            <h3 className="text-2xl font-bold mb-6">Discover Yourself</h3>
            <ul className="space-y-3">
              {["Discover yourself", "Reveal aligned directions", "Identify early opportunities"].map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-muted-foreground">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          
          <div 
            className={`p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 text-left relative overflow-hidden hover:shadow-lg hover:shadow-primary/10 transition-all duration-500 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"}`}
            style={{ transitionDelay: "400ms" }}
          >
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold animate-pulse">
              Founding Member
            </div>
            <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">Pro</p>
            <h3 className="text-2xl font-bold mb-6">Go Deeper</h3>
            <p className="text-muted-foreground">
              When you're ready to go deeper, TrueBlazer grows with you.
            </p>
          </div>
        </div>
        
        <Button 
          size="lg" 
          className={`mt-12 text-lg px-8 py-6 group hover:scale-105 transition-all duration-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          style={{ transitionDelay: "600ms" }}
          onClick={onNavigate}
        >
          Start free — let's find your path
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </section>
  );
};

const FinalCTASection = ({ onNavigate }: { onNavigate: () => void }) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3 });

  return (
    <section ref={ref} className="py-24 px-6 bg-gradient-to-t from-primary/10 to-background">
      <div className={`container mx-auto max-w-3xl text-center transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-95"}`}>
        <h2 className="text-3xl md:text-5xl font-bold mb-6">
          Your future deserves clarity.
        </h2>
        
        <p className={`text-xl text-muted-foreground mb-10 transition-all duration-1000 delay-200 ${isVisible ? "opacity-100" : "opacity-0"}`}>
          Give TrueBlazer one evening.
          <br />
          You'll know more about your direction than you've known in years.
        </p>
        
        <Button 
          size="lg" 
          className={`text-lg px-10 py-6 group hover:scale-105 transition-all duration-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}
          style={{ transitionDelay: "400ms" }}
          onClick={onNavigate}
        >
          Start free — skip the noise
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </section>
  );
};

export default Index;
