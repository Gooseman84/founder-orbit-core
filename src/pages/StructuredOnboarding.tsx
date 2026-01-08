import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Check, Loader2, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Types for form data
interface StructuredOnboardingData {
  entry_trigger: string;
  entry_trigger_other?: string;
  future_vision: string;
  desired_identity: string;
  business_type_preference: string;
  energy_source: string;
  learning_style: string;
  commitment_level: string;
}

// Question options
const ENTRY_TRIGGER_OPTIONS = [
  { value: "ideas-need-clarity", label: "I have ideas but need clarity on what to build" },
  { value: "skills-to-income", label: "I want to turn my skills into income" },
  { value: "tired-of-working-for-others", label: "I'm tired of working for someone else" },
  { value: "capable-of-more", label: "I feel capable of more than I'm doing" },
  { value: "other", label: "Something else" },
];

const DESIRED_IDENTITY_OPTIONS = [
  { value: "focused-builder", label: "The focused builder", subtext: "Turns ideas into reality" },
  { value: "disciplined-executor", label: "The disciplined executor", subtext: "Ships consistently" },
  { value: "confident-decision-maker", label: "The confident decision-maker", subtext: "Commits and moves fast" },
  { value: "financially-free-creator", label: "The financially free creator", subtext: "Builds profitable, sustainable work" },
];

const BUSINESS_TYPE_OPTIONS = [
  { value: "service", label: "Working directly with clients", subtext: "Consulting, freelancing, services" },
  { value: "digital-product", label: "Creating something once, selling it many times", subtext: "Courses, templates, digital products" },
  { value: "saas", label: "Building software people subscribe to", subtext: "SaaS, tools, platforms" },
  { value: "ecommerce", label: "Selling physical products online", subtext: "E-commerce, merchandise" },
  { value: "content", label: "Creating content and building an audience", subtext: "YouTube, newsletter, social media" },
  { value: "not-sure", label: "I'm genuinely not sure - show me options", subtext: "Explore different types" },
];

const ENERGY_SOURCE_OPTIONS = [
  { value: "solving-problems", label: "Solving complex problems" },
  { value: "creating-from-nothing", label: "Creating something from nothing" },
  { value: "seeing-impact", label: "Seeing real impact on people" },
  { value: "learning-mastering", label: "Learning and mastering new skills" },
  { value: "building-systems", label: "Building systems that scale" },
];

const LEARNING_STYLE_OPTIONS = [
  { value: "reading-researching", label: "Reading and researching first" },
  { value: "jumping-in", label: "Jumping in and figuring it out" },
  { value: "watching-examples", label: "Watching examples and tutorials" },
  { value: "talking-through", label: "Talking through ideas with others" },
];

const COMMITMENT_LEVEL_OPTIONS = [
  { value: "ready", label: "I'm ready to take this seriously and do the work" },
  { value: "figuring-out", label: "I want this, but I'm still figuring things out" },
  { value: "exploring", label: "I'm exploring to see if this fits" },
];

// Helper component for card-style radio options
const CardRadioOption = ({ 
  value, 
  label, 
  subtext, 
  isSelected,
  onClick 
}: { 
  value: string; 
  label: string; 
  subtext?: string; 
  isSelected: boolean;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    className={cn(
      "relative flex cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-primary/50",
      isSelected 
        ? "border-primary bg-primary/5" 
        : "border-border bg-card hover:bg-accent/50"
    )}
  >
    <div className="flex items-start gap-3 w-full">
      <div className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 mt-0.5",
        isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
      )}>
        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
      <div className="flex-1">
        <p className={cn(
          "font-medium",
          isSelected ? "text-foreground" : "text-foreground"
        )}>
          {label}
        </p>
        {subtext && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtext}</p>
        )}
      </div>
    </div>
  </div>
);

// Question section wrapper
const QuestionSection = ({ 
  number, 
  isAnswered, 
  children 
}: { 
  number: number; 
  isAnswered: boolean; 
  children: React.ReactNode; 
}) => (
  <Card className={cn(
    "transition-all duration-300",
    isAnswered ? "border-primary/30" : "border-border"
  )}>
    <div className="absolute -left-3 top-6 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-muted">
      {isAnswered ? (
        <Check className="h-3.5 w-3.5 text-primary" />
      ) : (
        <span className="text-xs font-medium text-muted-foreground">{number}</span>
      )}
    </div>
    {children}
  </Card>
);

export default function StructuredOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const [formData, setFormData] = useState<StructuredOnboardingData>({
    entry_trigger: "",
    entry_trigger_other: "",
    future_vision: "",
    desired_identity: "",
    business_type_preference: "",
    energy_source: "",
    learning_style: "",
    commitment_level: "",
  });

  // Track scroll position for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Count answered questions
  const answeredCount = [
    formData.entry_trigger && (formData.entry_trigger !== "other" || formData.entry_trigger_other),
    formData.future_vision.trim(),
    formData.desired_identity,
    formData.business_type_preference,
    formData.energy_source,
    formData.learning_style,
    formData.commitment_level,
  ].filter(Boolean).length;

  const isComplete = answeredCount === 7;

  const handleSubmit = async () => {
    if (!user?.id || !isComplete) return;

    setIsSubmitting(true);
    try {
      // Prepare entry_trigger value
      const entryTriggerValue = formData.entry_trigger === "other" 
        ? formData.entry_trigger_other 
        : formData.entry_trigger;

      const { error } = await supabase
        .from("founder_profiles")
        .upsert({
          user_id: user.id,
          entry_trigger: entryTriggerValue,
          future_vision: formData.future_vision,
          desired_identity: formData.desired_identity,
          business_type_preference: formData.business_type_preference,
          energy_source: formData.energy_source,
          learning_style: formData.learning_style,
          commitment_level_text: formData.commitment_level,
          structured_onboarding_completed_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (error) throw error;

      toast.success("Got it! Now let's get to know you better...");
      
      // Redirect after 1 second
      setTimeout(() => {
        navigate("/onboarding/interview");
      }, 1000);
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      toast.error("Failed to save your answers. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-2xl py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Let's get started</h1>
              <p className="text-sm text-muted-foreground">
                Question {Math.min(answeredCount + 1, 7)} of 7
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <div
                    key={n}
                    className={cn(
                      "h-2 w-6 rounded-full transition-colors",
                      n <= answeredCount ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="container max-w-2xl py-8 space-y-8 pb-32">
        {/* Question 1: Entry Trigger */}
        <QuestionSection number={1} isAnswered={!!formData.entry_trigger && (formData.entry_trigger !== "other" || !!formData.entry_trigger_other)}>
          <CardHeader>
            <CardTitle className="text-xl">What brought you here today?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={formData.entry_trigger}
              onValueChange={(value) => setFormData(prev => ({ ...prev, entry_trigger: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select what resonates most..." />
              </SelectTrigger>
              <SelectContent>
                {ENTRY_TRIGGER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {formData.entry_trigger === "other" && (
              <Input
                placeholder="Tell us what brought you here..."
                value={formData.entry_trigger_other}
                onChange={(e) => setFormData(prev => ({ ...prev, entry_trigger_other: e.target.value }))}
                className="mt-3"
              />
            )}
          </CardContent>
        </QuestionSection>

        {/* Question 2: Future Vision */}
        <QuestionSection number={2} isAnswered={!!formData.future_vision.trim()}>
          <CardHeader>
            <CardTitle className="text-xl">Picture yourself one year from now. What would make you genuinely proud?</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="No perfect answer needed. Just what feels true."
              value={formData.future_vision}
              onChange={(e) => setFormData(prev => ({ ...prev, future_vision: e.target.value }))}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </QuestionSection>

        {/* Question 3: Desired Identity */}
        <QuestionSection number={3} isAnswered={!!formData.desired_identity}>
          <CardHeader>
            <CardTitle className="text-xl">Which version of you are you ready to build?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {DESIRED_IDENTITY_OPTIONS.map((option) => (
                <CardRadioOption
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  subtext={option.subtext}
                  isSelected={formData.desired_identity === option.value}
                  onClick={() => setFormData(prev => ({ ...prev, desired_identity: option.value }))}
                />
              ))}
            </div>
          </CardContent>
        </QuestionSection>

        {/* Question 4: Business Type Preference */}
        <QuestionSection number={4} isAnswered={!!formData.business_type_preference}>
          <CardHeader>
            <CardTitle className="text-xl">If you could only pick one, which sounds most exciting?</CardTitle>
            <CardDescription>
              This helps us show you relevant ideas first. You can always explore other types later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {BUSINESS_TYPE_OPTIONS.map((option) => (
                <CardRadioOption
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  subtext={option.subtext}
                  isSelected={formData.business_type_preference === option.value}
                  onClick={() => setFormData(prev => ({ ...prev, business_type_preference: option.value }))}
                />
              ))}
            </div>
          </CardContent>
        </QuestionSection>

        {/* Question 5: Energy Source */}
        <QuestionSection number={5} isAnswered={!!formData.energy_source}>
          <CardHeader>
            <CardTitle className="text-xl">What energizes you most when you're working?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {ENERGY_SOURCE_OPTIONS.map((option) => (
                <CardRadioOption
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  isSelected={formData.energy_source === option.value}
                  onClick={() => setFormData(prev => ({ ...prev, energy_source: option.value }))}
                />
              ))}
            </div>
          </CardContent>
        </QuestionSection>

        {/* Question 6: Learning Style */}
        <QuestionSection number={6} isAnswered={!!formData.learning_style}>
          <CardHeader>
            <CardTitle className="text-xl">How do you prefer to learn?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {LEARNING_STYLE_OPTIONS.map((option) => (
                <CardRadioOption
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  isSelected={formData.learning_style === option.value}
                  onClick={() => setFormData(prev => ({ ...prev, learning_style: option.value }))}
                />
              ))}
            </div>
          </CardContent>
        </QuestionSection>

        {/* Question 7: Commitment Level */}
        <QuestionSection number={7} isAnswered={!!formData.commitment_level}>
          <CardHeader>
            <CardTitle className="text-xl">What's your honest commitment level right now?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {COMMITMENT_LEVEL_OPTIONS.map((option) => (
                <CardRadioOption
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  isSelected={formData.commitment_level === option.value}
                  onClick={() => setFormData(prev => ({ ...prev, commitment_level: option.value }))}
                />
              ))}
            </div>
          </CardContent>
        </QuestionSection>
      </div>

      {/* Sticky Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-4">
        <div className="container max-w-2xl flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {isComplete ? "All questions answered!" : `${7 - answeredCount} question${7 - answeredCount === 1 ? "" : "s"} remaining`}
          </p>
          <Button
            onClick={handleSubmit}
            disabled={!isComplete || isSubmitting}
            size="lg"
            className="min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-20 right-4 z-50 rounded-full shadow-lg"
          onClick={scrollToTop}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
