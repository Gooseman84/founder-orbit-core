import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Lightbulb, Target, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            FounderOS
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            Your AI-powered operating system for building successful businesses
          </p>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Discover personalized business ideas, validate them with AI, and get actionable tasks to turn your vision into reality.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Idea Generation</h3>
            <p className="text-muted-foreground">
              Get personalized business ideas based on your passions, skills, and constraints.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Idea Validation</h3>
            <p className="text-muted-foreground">
              Analyze market viability, competition, and fit scores for each idea.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Actionable Tasks</h3>
            <p className="text-muted-foreground">
              Get micro-tasks and quests with XP rewards to build momentum.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
