import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
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
    <div className="min-h-screen bg-background text-foreground">
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

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Your founder journey starts here
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            Find the one idea worth building —{" "}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              and get the system to build it with you.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto leading-relaxed">
            TrueBlazer doesn't drown you in ideas.
            It helps you uncover your calling, choose the right path, and build with unstoppable momentum.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Button size="lg" className="text-lg px-8 py-6 group" onClick={() => navigate("/auth")}>
              Start free — discover your path
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-6 italic">
            Your life changes the moment you stop guessing and start building with clarity.
          </p>
        </div>
      </section>

      {/* Agitate the Pain */}
      <section className="py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-8">
            You're not lacking intelligence.{" "}
            <span className="text-muted-foreground">You're lacking direction.</span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8">
            Ideas are everywhere — courses, YouTube, TikTok, X…
            <br />
            What's missing is a way to know which idea fits <em>you</em>, which one will work, and what steps to take next.
            <br /><br />
            The noise is paralyzing. The self-doubt is real. The cost of choosing wrong is high.
          </p>
          
          <p className="text-xl font-semibold text-primary">
            TrueBlazer cuts through the noise and helps you commit with confidence.
          </p>
        </div>
      </section>

      {/* The Promise - 3 Pillars */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-primary font-semibold mb-4 tracking-wide uppercase text-sm">The Transformation</p>
            <h2 className="text-3xl md:text-5xl font-bold">
              Clarity. Conviction. Momentum.
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors group">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Brain className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-4">Uncover What You're Built For</h3>
              <p className="text-muted-foreground leading-relaxed">
                You'll see yourself more clearly than you ever have — passions, strengths, patterns, blind spots, motivations, and opportunities.
              </p>
              <p className="text-sm text-primary mt-4 font-medium">
                We don't "profile." We reveal potential.
              </p>
            </div>
            
            <div className="p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors group">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Target className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-4">Choose With Certainty</h3>
              <p className="text-muted-foreground leading-relaxed">
                Instead of guessing, doubting, or flipping a coin, TrueBlazer guides you toward the opportunity that aligns with your life, skills, and future.
              </p>
            </div>
            
            <div className="p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors group">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Zap className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-4">Build With Daily Progress</h3>
              <p className="text-muted-foreground leading-relaxed">
                Once you choose your North Star, everything starts moving — decisions, steps, insights, habits, momentum.
              </p>
              <p className="text-sm text-primary mt-4 font-medium">
                You don't just dream. You execute.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Feels */}
      <section className="py-24 px-6 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-12">
            What TrueBlazer <span className="text-primary">feels</span> like:
          </h2>
          
          <div className="space-y-6 text-lg md:text-xl text-muted-foreground">
            <p className="flex items-center justify-center gap-3">
              <span className="text-primary">✦</span>
              Like having a co-founder who understands you deeply
            </p>
            <p className="flex items-center justify-center gap-3">
              <span className="text-primary">✦</span>
              Like the fog finally lifting
            </p>
            <p className="flex items-center justify-center gap-3">
              <span className="text-primary">✦</span>
              Like unlocking the version of you that's confident, decisive, and unstoppable
            </p>
            <p className="flex items-center justify-center gap-3">
              <span className="text-primary">✦</span>
              Like someone organized your brain and handed you the plan
            </p>
          </div>
          
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-xl font-medium">
              It's not magic.
              <br />
              <span className="text-primary">It just feels like it.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Tease the App - Experiences Grid */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Your founder journey — <span className="text-primary">guided.</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ExperienceCard 
              icon={<Sparkles className="w-6 h-6" />}
              title="Personal Clarity Moments"
              description="Insights about you that instantly connect dots and make decisions easy."
            />
            <ExperienceCard 
              icon={<Compass className="w-6 h-6" />}
              title="Opportunity Snapshots"
              description="A zoomed-out understanding of where your greatest potential lies."
            />
            <ExperienceCard 
              icon={<Lightbulb className="w-6 h-6" />}
              title={'"Oh damn" Realizations'}
              description="Those moments where the right idea feels obvious — because it finally is."
            />
            <ExperienceCard 
              icon={<Flame className="w-6 h-6" />}
              title="Daily Momentum Nudges"
              description="Small steps that keep you building, not drifting."
            />
            <ExperienceCard 
              icon={<Target className="w-6 h-6" />}
              title="Focus Anchors"
              description="Reminders of your direction so you never feel lost again."
            />
            <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
              <p className="text-center text-muted-foreground italic">
                No mechanics. No architecture.<br />
                <span className="text-foreground font-medium">Just benefits and emotional truth.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              People don't need more ideas —{" "}
              <span className="text-primary">they need the right one.</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard 
              quote="TrueBlazer made me realize I'd been chasing the wrong ideas for years."
            />
            <TestimonialCard 
              quote="It connected my background, passions, and timing better than I ever could."
            />
            <TestimonialCard 
              quote="For the first time in a decade, I'm building something I believe in."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start free. Unlock more clarity when you're ready.
          </h2>
          
          <div className="mt-12 grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl bg-card border border-border text-left">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Free</p>
              <h3 className="text-2xl font-bold mb-6">Discover Yourself</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-muted-foreground">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  Discover yourself
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  Reveal aligned directions
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  Identify early opportunities
                </li>
              </ul>
            </div>
            
            <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 text-left relative overflow-hidden">
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                Founding Member
              </div>
              <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">Pro</p>
              <h3 className="text-2xl font-bold mb-6">Go Deeper</h3>
              <p className="text-muted-foreground">
                When you're ready to go deeper, TrueBlazer grows with you.
              </p>
            </div>
          </div>
          
          <Button size="lg" className="mt-12 text-lg px-8 py-6 group" onClick={() => navigate("/auth")}>
            Start free — let's find your path
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-gradient-to-t from-primary/10 to-background">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Your future deserves clarity.
          </h2>
          
          <p className="text-xl text-muted-foreground mb-10">
            Give TrueBlazer one evening.
            <br />
            You'll know more about your direction than you've known in years.
          </p>
          
          <Button size="lg" className="text-lg px-10 py-6 group" onClick={() => navigate("/auth")}>
            Start free — skip the noise
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} TrueBlazer.AI — Find your path. Build with purpose.</p>
        </div>
      </footer>
    </div>
  );
};

const ExperienceCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="p-8 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-lg group">
    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary group-hover:bg-primary/20 transition-colors">
      {icon}
    </div>
    <h3 className="text-lg font-bold mb-2">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

const TestimonialCard = ({ quote }: { quote: string }) => (
  <div className="p-6 rounded-2xl bg-card border border-border">
    <p className="text-lg italic text-muted-foreground">"{quote}"</p>
  </div>
);

export default Index;
