import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { Check, Loader2, ChevronUp, Info, CheckCircle2, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

// Tooltips explaining why we ask each question
const QUESTION_TOOLTIPS: Record<number, string> = {
  1: "Understanding why you're here helps us prioritize what matters most to you.",
  2: "Your vision shapes everything—we'll use this to filter ideas that actually match your goals.",
  3: "Your founder identity shapes which business models will feel natural vs draining.",
  4: "This helps us show you relevant ideas first, but you can explore all types later.",
  5: "Knowing what energizes you helps us suggest work that won't burn you out.",
  6: "We'll tailor how we present information to match how you learn best.",
  7: "Your commitment level helps us suggest appropriately scoped ideas—no judgment here.",
};

// Pre-generate stable confetti data to avoid hydration mismatches
const CONFETTI_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#fbbf24', '#34d399', '#f472b6'];
const CONFETTI_DATA = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  left: `${(i * 2.1 + 7) % 100}%`,
  width: `${(i % 10) + 5}px`,
  height: `${((i * 3) % 10) + 5}px`,
  backgroundColor: CONFETTI_COLORS[i % 5],
  borderRadius: i % 2 === 0 ? '50%' : '0',
  animationDelay: `${(i * 0.01) % 0.5}s`,
  animationDuration: `${((i * 0.04) % 2) + 2}s`,
}));

// Confetti overlay component with stable values
const ConfettiOverlay = () => (
  <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
    {CONFETTI_DATA.map((confetti) => (
      <div
        key={confetti.id}
        className="absolute animate-confetti"
        style={{
          left: confetti.left,
          top: '-5%',
          width: confetti.width,
          height: confetti.height,
          backgroundColor: confetti.backgroundColor,
          borderRadius: confetti.borderRadius,
          animationDelay: confetti.animationDelay,
          animationDuration: confetti.animationDuration,
        }}
      />
    ))}
  </div>
);

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

// Question title with tooltip
const QuestionTitle = ({ 
  children, 
  questionNumber 
}: { 
  children: React.ReactNode; 
  questionNumber: number; 
}) => (
  <div className="flex items-start gap-2">
    <CardTitle className="text-xl flex-1">{children}</CardTitle>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-4 h-4 text-muted-foreground cursor-help mt-1.5 shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="max-w-xs text-sm">
            {QUESTION_TOOLTIPS[questionNumber]}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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

// Simple debounce function
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export default function StructuredOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const hasTrackedStartRef = useRef(false);
  const hasSavedProgressRef = useRef(false);
  
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

  // Track structured onboarding started
  useEffect(() => {
    if (user?.id && !hasTrackedStartRef.current) {
      hasTrackedStartRef.current = true;
      supabase.from('onboarding_analytics').insert({
        user_id: user.id,
        event_type: 'structured_started'
      }).then(({ error }) => {
        if (error) console.error('Failed to track structured_started:', error);
      });
    }
  }, [user?.id]);

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('founder_profiles')
        .select('entry_trigger, future_vision, desired_identity, business_type_preference, energy_source, learning_style, commitment_level_text')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setFormData(prev => ({
          ...prev,
          entry_trigger: data.entry_trigger || "",
          future_vision: data.future_vision || "",
          desired_identity: data.desired_identity || "",
          business_type_preference: data.business_type_preference || "",
          energy_source: data.energy_source || "",
          learning_style: data.learning_style || "",
          commitment_level: data.commitment_level_text || "",
        }));
      }
    };
    
    loadProgress();
  }, [user?.id]);

  // Debounced save progress
  const saveProgress = useCallback(
    debounce(async (data: StructuredOnboardingData, userId: string) => {
      if (!userId) return;
      
      const entryTriggerValue = data.entry_trigger === "other" 
        ? data.entry_trigger_other 
        : data.entry_trigger;

      await supabase
        .from('founder_profiles')
        .upsert({
          user_id: userId,
          entry_trigger: entryTriggerValue || null,
          future_vision: data.future_vision || null,
          desired_identity: data.desired_identity || null,
          business_type_preference: data.business_type_preference || null,
          energy_source: data.energy_source || null,
          learning_style: data.learning_style || null,
          commitment_level_text: data.commitment_level || null,
        }, {
          onConflict: "user_id",
        });
    }, 1500),
    []
  );

  // Save progress as user types
  useEffect(() => {
    if (user?.id && hasSavedProgressRef.current) {
      saveProgress(formData, user.id);
    }
    hasSavedProgressRef.current = true;
  }, [formData, user?.id, saveProgress]);

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

      // Track structured onboarding completed
      const timeSpentSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
      await supabase.from('onboarding_analytics').insert({
        user_id: user.id,
        event_type: 'structured_completed',
        metadata: { time_spent_seconds: timeSpentSeconds }
      });

      // Show celebration and transition
      setShowConfetti(true);
      setTimeout(() => {
        setShowTransition(true);
      }, 800);
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      toast.error("Failed to save your answers. Please try again.");
      setIsSubmitting(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Transition screen after Phase 1 completion
  if (showTransition) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md animate-fade-in">
          <div className="relative">
            <CheckCircle2 className="w-20 h-20 mx-auto text-primary animate-scale-in" />
            <Sparkles className="w-6 h-6 text-yellow-500 absolute top-0 right-1/3 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Great! Now let's get specific.</h2>
            <p className="text-muted-foreground">
              Mavrik will ask you 3-5 targeted questions to understand your unique advantages and constraints.
              This is where the magic happens.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/onboarding/interview')}
            size="lg"
            className="gap-2"
          >
            Continue to Mavrik
            <span className="ml-1">→</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Confetti celebration overlay - uses stable pre-generated values */}
      {showConfetti && <ConfettiOverlay />}

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
            <QuestionTitle questionNumber={1}>What brought you here today?</QuestionTitle>
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
            <QuestionTitle questionNumber={2}>Picture yourself one year from now. What would make you genuinely proud?</QuestionTitle>
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
            <QuestionTitle questionNumber={3}>Which version of you are you ready to build?</QuestionTitle>
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
            <QuestionTitle questionNumber={4}>If you could only pick one, which sounds most exciting?</QuestionTitle>
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
            <QuestionTitle questionNumber={5}>What energizes you most when you're working?</QuestionTitle>
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
            <QuestionTitle questionNumber={6}>How do you prefer to learn?</QuestionTitle>
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
            <QuestionTitle questionNumber={7}>What's your honest commitment level right now?</QuestionTitle>
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
          className="fixed bottom-24 right-4 rounded-full shadow-lg z-40"
          onClick={scrollToTop}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
