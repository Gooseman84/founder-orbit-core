import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Loader2, Rocket, AlertCircle, History, Plus, ChevronDown, 
  Lightbulb, X, RefreshCw, FileText, Calendar, Layers
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ImplementationPlanDisplay, ImplementationPlan } from '@/components/feature-builder/ImplementationPlanDisplay';

// Feature templates for quick start
const FEATURE_TEMPLATES = [
  {
    id: 'payment-integration',
    name: 'Payment Integration',
    title: 'Stripe Payment Integration',
    description: 'Integrate Stripe for processing payments, subscriptions, and handling webhooks for payment events.',
    userStories: [
      'As a user, I want to pay for premium features using my credit card',
      'As a user, I want to manage my subscription and billing details',
      'As an admin, I want to see payment analytics and revenue metrics'
    ],
    successMetrics: [
      '99.9% payment processing success rate',
      'Less than 3 seconds for payment confirmation',
      'Support for at least 3 payment methods'
    ]
  },
  {
    id: 'user-auth',
    name: 'User Authentication',
    title: 'Complete Authentication System',
    description: 'Implement a full authentication system with email/password, social logins, password reset, and session management.',
    userStories: [
      'As a user, I want to sign up with my email and password',
      'As a user, I want to sign in with Google or GitHub',
      'As a user, I want to reset my password if I forget it'
    ],
    successMetrics: [
      'Support OAuth with Google and GitHub',
      'Password reset flow under 2 minutes',
      'Session persistence across browser restarts'
    ]
  },
  {
    id: 'file-upload',
    name: 'File Upload System',
    title: 'File Upload & Storage System',
    description: 'Build a file upload system with drag-and-drop, progress tracking, file type validation, and cloud storage integration.',
    userStories: [
      'As a user, I want to drag and drop files to upload them',
      'As a user, I want to see upload progress for large files',
      'As a user, I want to preview uploaded images before saving'
    ],
    successMetrics: [
      'Support files up to 100MB',
      'Real-time upload progress indication',
      'Image preview in under 500ms'
    ]
  },
  {
    id: 'notifications',
    name: 'Notification System',
    title: 'Real-time Notification System',
    description: 'Implement a notification system with in-app notifications, email digests, and push notification support.',
    userStories: [
      'As a user, I want to receive in-app notifications for important updates',
      'As a user, I want to customize which notifications I receive',
      'As a user, I want to see a history of my notifications'
    ],
    successMetrics: [
      'Real-time notification delivery under 1 second',
      'Support for notification preferences per category',
      '7-day notification history retention'
    ]
  }
];

// Character limits
const CHAR_LIMITS = {
  title: 100,
  description: 500,
  userStory: 200,
  successMetric: 150,
  constraint: 150
};

// Progress messages for loading state
const PROGRESS_MESSAGES = [
  { message: 'Analyzing your requirements...', duration: 5000 },
  { message: 'Designing architecture...', duration: 8000 },
  { message: 'Breaking into implementation phases...', duration: 10000 },
  { message: 'Generating Lovable prompts...', duration: 12000 },
  { message: 'Finalizing implementation plan...', duration: 15000 }
];

type PageState = 'form' | 'generating' | 'plan-display';
type Priority = 'critical' | 'high' | 'medium' | 'low';

interface SavedPlan {
  id: string;
  memory_path: string;
  memory_data: ImplementationPlan;
  updated_at: string;
}

interface FormDraft {
  title: string;
  description: string;
  userStories: string[];
  successMetrics: string[];
  constraints: string[];
  priority: Priority;
  savedAt: string;
}

const DRAFT_STORAGE_KEY = 'feature-planner-draft';

export default function FeaturePlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Page state
  const [pageState, setPageState] = useState<PageState>('form');
  const [progressMessageIndex, setProgressMessageIndex] = useState(0);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [userStories, setUserStories] = useState<string[]>(['']);
  const [successMetrics, setSuccessMetrics] = useState<string[]>(['']);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>('high');
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Plan state
  const [plan, setPlan] = useState<ImplementationPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Persistence state
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Load saved plans on mount
  const loadSavedPlans = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error: fetchError } = await supabase
        .from('agent_memory')
        .select('*')
        .eq('user_id', user.id)
        .like('memory_path', 'features/%/implementation_plan')
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      const parsedPlans: SavedPlan[] = (data || []).map(item => ({
        id: item.id,
        memory_path: item.memory_path,
        memory_data: item.memory_data as unknown as ImplementationPlan,
        updated_at: item.updated_at || ''
      }));
      
      setSavedPlans(parsedPlans);
    } catch (err) {
      console.error('Error loading saved plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  }, [user]);

  // Load draft from localStorage
  const loadDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const draft: FormDraft = JSON.parse(saved);
        setTitle(draft.title);
        setDescription(draft.description);
        setUserStories(draft.userStories.length > 0 ? draft.userStories : ['']);
        setSuccessMetrics(draft.successMetrics.length > 0 ? draft.successMetrics : ['']);
        setConstraints(draft.constraints);
        setPriority(draft.priority);
        setHasDraft(true);
      }
    } catch (err) {
      console.error('Error loading draft:', err);
    }
  }, []);

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    if (!title && !description && userStories.every(s => !s) && successMetrics.every(s => !s)) {
      return; // Don't save empty forms
    }
    
    const draft: FormDraft = {
      title,
      description,
      userStories,
      successMetrics,
      constraints,
      priority,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setHasDraft(true);
  }, [title, description, userStories, successMetrics, constraints, priority]);

  // Clear draft
  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraft(false);
  };

  useEffect(() => {
    loadSavedPlans();
    loadDraft();
  }, [loadSavedPlans, loadDraft]);

  // Auto-save draft on form changes
  useEffect(() => {
    const timer = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timer);
  }, [saveDraft]);

  // Progress message cycling during generation
  useEffect(() => {
    if (pageState !== 'generating') return;
    
    setProgressMessageIndex(0);
    
    const intervals: NodeJS.Timeout[] = [];
    let cumulativeTime = 0;
    
    PROGRESS_MESSAGES.forEach((_, index) => {
      if (index === 0) return;
      cumulativeTime += PROGRESS_MESSAGES[index - 1].duration;
      
      const timeout = setTimeout(() => {
        setProgressMessageIndex(index);
      }, cumulativeTime);
      
      intervals.push(timeout);
    });
    
    return () => intervals.forEach(clearTimeout);
  }, [pageState]);

  const savePlanToMemory = async (planData: ImplementationPlan) => {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('agent_memory')
        .select('id')
        .eq('user_id', user.id)
        .eq('memory_path', `features/${planData.feature_id}/implementation_plan`)
        .maybeSingle();

      const jsonData = JSON.parse(JSON.stringify(planData));

      if (existing) {
        const { error: updateError } = await supabase
          .from('agent_memory')
          .update({
            memory_data: jsonData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('agent_memory')
          .insert([{
            user_id: user.id,
            memory_path: `features/${planData.feature_id}/implementation_plan`,
            memory_data: jsonData
          }]);

        if (insertError) throw insertError;
      }
      
      await loadSavedPlans();
    } catch (err) {
      console.error('Error saving plan to memory:', err);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!title.trim()) {
      errors.title = 'Feature title is required';
    } else if (title.length > CHAR_LIMITS.title) {
      errors.title = `Title must be under ${CHAR_LIMITS.title} characters`;
    }
    
    if (!description.trim()) {
      errors.description = 'Description is required';
    } else if (description.length > CHAR_LIMITS.description) {
      errors.description = `Description must be under ${CHAR_LIMITS.description} characters`;
    }
    
    const validStories = userStories.filter(s => s.trim());
    if (validStories.length === 0) {
      errors.userStories = 'At least one user story is required';
    }
    
    const validMetrics = successMetrics.filter(s => s.trim());
    if (validMetrics.length === 0) {
      errors.successMetrics = 'At least one success metric is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePlan = async () => {
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please sign in to use Feature Planner',
        variant: 'destructive'
      });
      return;
    }

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the highlighted errors',
        variant: 'destructive'
      });
      return;
    }

    setPageState('generating');
    setError(null);

    try {
      const { data, error: apiError } = await supabase.functions.invoke('feature-implementation-agent', {
        body: {
          userId: user.id,
          feature: {
            title,
            description,
            user_stories: userStories.filter(s => s.trim()),
            success_metrics: successMetrics.filter(s => s.trim()),
            constraints: constraints.filter(s => s.trim()),
            priority
          }
        }
      });

      if (apiError) throw apiError;

      setPlan(data.plan);
      await savePlanToMemory(data.plan);
      clearDraft();
      setPageState('plan-display');
      
      toast({
        title: 'Implementation Plan Generated!',
        description: `Created ${data.plan.phases?.length || 0}-phase plan`
      });

    } catch (err: unknown) {
      console.error('Feature planning error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate implementation plan';
      setError(errorMsg);
      setPageState('form');
      toast({
        title: 'Planning Failed',
        description: errorMsg,
        variant: 'destructive'
      });
    }
  };

  const handleLoadPlan = (planId: string) => {
    const selected = savedPlans.find(p => p.id === planId);
    if (selected) {
      setPlan(selected.memory_data);
      setPageState('plan-display');
      toast({
        title: 'Plan Loaded',
        description: `Loaded ${selected.memory_data.feature_id}`
      });
    }
  };

  const handleStartNew = () => {
    setPlan(null);
    setTitle('');
    setDescription('');
    setUserStories(['']);
    setSuccessMetrics(['']);
    setConstraints([]);
    setPriority('high');
    setValidationErrors({});
    setError(null);
    clearDraft();
    setPageState('form');
  };

  const handleApplyTemplate = (templateId: string) => {
    const template = FEATURE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setTitle(template.title);
      setDescription(template.description);
      setUserStories(template.userStories);
      setSuccessMetrics(template.successMetrics);
      setValidationErrors({});
      toast({
        title: 'Template Applied',
        description: `Loaded "${template.name}" template`
      });
    }
  };

  const addUserStory = () => {
    if (userStories.length < 10) {
      setUserStories([...userStories, '']);
    }
  };

  const removeUserStory = (index: number) => {
    if (userStories.length > 1) {
      setUserStories(userStories.filter((_, i) => i !== index));
    }
  };

  const updateUserStory = (index: number, value: string) => {
    const updated = [...userStories];
    updated[index] = value;
    setUserStories(updated);
  };

  const addSuccessMetric = () => {
    if (successMetrics.length < 10) {
      setSuccessMetrics([...successMetrics, '']);
    }
  };

  const removeSuccessMetric = (index: number) => {
    if (successMetrics.length > 1) {
      setSuccessMetrics(successMetrics.filter((_, i) => i !== index));
    }
  };

  const updateSuccessMetric = (index: number, value: string) => {
    const updated = [...successMetrics];
    updated[index] = value;
    setSuccessMetrics(updated);
  };

  const addConstraint = () => {
    if (constraints.length < 5) {
      setConstraints([...constraints, '']);
    }
  };

  const removeConstraint = (index: number) => {
    setConstraints(constraints.filter((_, i) => i !== index));
  };

  const updateConstraint = (index: number, value: string) => {
    const updated = [...constraints];
    updated[index] = value;
    setConstraints(updated);
  };

  // Render loading state
  if (pageState === 'generating') {
    return (
      <TooltipProvider>
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <Card className="border-primary/20">
            <CardContent className="py-16">
              <div className="text-center space-y-6">
                <div className="relative mx-auto w-24 h-24">
                  <Rocket className="h-24 w-24 text-primary animate-bounce" />
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Generating Your Plan</h2>
                  <p className="text-lg text-primary font-medium animate-pulse">
                    {PROGRESS_MESSAGES[progressMessageIndex]?.message}
                  </p>
                </div>
                
                <div className="flex justify-center gap-2">
                  {PROGRESS_MESSAGES.map((_, i) => (
                    <div 
                      key={i}
                      className={`h-2 w-8 rounded-full transition-colors duration-300 ${
                        i <= progressMessageIndex ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  This usually takes 30-60 seconds
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  }

  // Render plan display
  if (pageState === 'plan-display' && plan) {
    return (
      <TooltipProvider>
        <div className="container mx-auto py-8 px-4 max-w-6xl">
          <ImplementationPlanDisplay 
            plan={plan} 
            onStartNew={handleStartNew}
          />
        </div>
      </TooltipProvider>
    );
  }

  // Render form
  return (
    <TooltipProvider>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Rocket className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Feature Implementation Agent</h1>
              <p className="text-muted-foreground">Generate complete implementation plans with AI</p>
            </div>
          </div>
        </div>

        {/* Plan History Section */}
        {savedPlans.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen} className="mb-6">
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">Recent Plans</CardTitle>
                      <Badge variant="secondary">{savedPlans.length}</Badge>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {savedPlans.slice(0, 6).map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleLoadPlan(p.id)}
                        className="flex flex-col items-start gap-2 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium text-sm truncate flex-1">
                            {p.memory_data.feature_id}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(p.updated_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {p.memory_data.phases?.length || 0} phases
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {savedPlans.length > 6 && (
                    <p className="text-sm text-muted-foreground mt-3 text-center">
                      +{savedPlans.length - 6} more plans
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={() => setError(null)}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Draft indicator */}
        {hasDraft && (
          <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
            <span>Draft saved automatically</span>
            <Button variant="ghost" size="sm" onClick={clearDraft}>
              Clear Draft
            </Button>
          </div>
        )}

        {/* Feature Request Form */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Feature Request</CardTitle>
                <CardDescription>
                  Describe the feature you want to build
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select onValueChange={handleApplyTemplate}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Start from template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FEATURE_TEMPLATES.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Feature Title */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="title">Feature Title *</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Lightbulb className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">A clear, concise name for the feature. E.g., "Stripe Payment Integration" or "Real-time Chat System"</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="title"
                placeholder="e.g., Stripe Payment Recovery System"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={CHAR_LIMITS.title}
                className={validationErrors.title ? 'border-destructive' : ''}
              />
              <div className="flex justify-between text-xs">
                {validationErrors.title && (
                  <span className="text-destructive">{validationErrors.title}</span>
                )}
                <span className="text-muted-foreground ml-auto">
                  {title.length}/{CHAR_LIMITS.title}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="description">Description *</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Lightbulb className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Explain what this feature does, why it's needed, and the problem it solves</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                id="description"
                placeholder="Describe what this feature does and why it's needed..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={CHAR_LIMITS.description}
                className={validationErrors.description ? 'border-destructive' : ''}
              />
              <div className="flex justify-between text-xs">
                {validationErrors.description && (
                  <span className="text-destructive">{validationErrors.description}</span>
                )}
                <span className="text-muted-foreground ml-auto">
                  {description.length}/{CHAR_LIMITS.description}
                </span>
              </div>
            </div>

            {/* User Stories */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>User Stories *</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Lightbulb className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Format: "As a [role], I want to [action] so that [benefit]"</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addUserStory}
                  disabled={userStories.length >= 10}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Story
                </Button>
              </div>
              {validationErrors.userStories && (
                <span className="text-xs text-destructive">{validationErrors.userStories}</span>
              )}
              <div className="space-y-2">
                {userStories.map((story, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={index === 0 ? "As a user, I want to..." : "As a [role], I want to..."}
                      value={story}
                      onChange={(e) => updateUserStory(index, e.target.value)}
                      maxLength={CHAR_LIMITS.userStory}
                    />
                    {userStories.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeUserStory(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Success Metrics */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Success Metrics *</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Lightbulb className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Measurable criteria to determine if the feature is successful. E.g., "95% uptime" or "under 2s load time"</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addSuccessMetric}
                  disabled={successMetrics.length >= 10}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Metric
                </Button>
              </div>
              {validationErrors.successMetrics && (
                <span className="text-xs text-destructive">{validationErrors.successMetrics}</span>
              )}
              <div className="space-y-2">
                {successMetrics.map((metric, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={index === 0 ? "95% payment recovery rate" : "Enter success metric..."}
                      value={metric}
                      onChange={(e) => updateSuccessMetric(index, e.target.value)}
                      maxLength={CHAR_LIMITS.successMetric}
                    />
                    {successMetrics.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeSuccessMetric(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Constraints */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Constraints (optional)</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Lightbulb className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Technical or business limitations. E.g., "Must use Stripe webhooks" or "No third-party analytics"</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addConstraint}
                  disabled={constraints.length >= 5}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Constraint
                </Button>
              </div>
              <div className="space-y-2">
                {constraints.map((constraint, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Must use Stripe webhooks..."
                      value={constraint}
                      onChange={(e) => updateConstraint(index, e.target.value)}
                      maxLength={CHAR_LIMITS.constraint}
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeConstraint(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {constraints.length === 0 && (
                  <p className="text-sm text-muted-foreground">No constraints added</p>
                )}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v: Priority) => setPriority(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">🔴 Critical</SelectItem>
                  <SelectItem value="high">🟠 High</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="low">🟢 Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handlePlan}
              disabled={!title || !description}
              className="w-full"
              size="lg"
              variant="gradient"
            >
              <Rocket className="mr-2 h-4 w-4" />
              Generate Implementation Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
