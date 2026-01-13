import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Rocket, CheckCircle2, Clock, AlertCircle, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Phase {
  phase_number: number;
  name: string;
  description: string;
  deliverables: string[];
  lovable_prompts: string[];
  estimated_hours: number;
  prerequisites: string[];
  test_criteria: string[];
  dependencies: string[];
}

interface Risk {
  description: string;
  mitigation: string;
  severity: 'low' | 'medium' | 'high';
}

interface Architecture {
  components: { name: string; path: string; purpose: string; props: string[] }[];
  database_changes: { type: string; name: string; columns: string[]; indexes: string[]; rls: boolean; rls_policies: string[] }[];
  edge_functions: { name: string; method: string; purpose: string; auth_required: boolean; inputs: Record<string, string>; outputs: Record<string, string> }[];
  ui_flows: string[];
}

interface ImplementationPlan {
  feature_id: string;
  architecture: Architecture;
  phases: Phase[];
  total_estimated_hours: number;
  risks: Risk[];
}

type Priority = 'critical' | 'high' | 'medium' | 'low';

export default function FeaturePlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [userStories, setUserStories] = useState('');
  const [successMetrics, setSuccessMetrics] = useState('');
  const [constraints, setConstraints] = useState('');
  const [priority, setPriority] = useState<Priority>('high');
  
  // Agent state
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<ImplementationPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePlan = async () => {
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please sign in to use Feature Planner',
        variant: 'destructive'
      });
      return;
    }

    if (!title || !description || !userStories || !successMetrics) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setPlanning(true);
    setError(null);
    setPlan(null);

    try {
      const { data, error: apiError } = await supabase.functions.invoke('feature-implementation-agent', {
        body: {
          userId: user.id,
          feature: {
            title,
            description,
            user_stories: userStories.split('\n').filter(s => s.trim()),
            success_metrics: successMetrics.split('\n').filter(s => s.trim()),
            constraints: constraints ? constraints.split('\n').filter(s => s.trim()) : [],
            priority
          }
        }
      });

      if (apiError) throw apiError;

      setPlan(data.plan);
      toast({
        title: 'Implementation Plan Generated!',
        description: `Created ${data.plan.phases?.length || 0}-phase plan`
      });

    } catch (err: unknown) {
      console.error('Feature planning error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate implementation plan';
      setError(errorMsg);
      toast({
        title: 'Planning Failed',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setPlanning(false);
    }
  };

  const handleCopyPrompt = (prompt: string, phaseNum: number) => {
    navigator.clipboard.writeText(prompt);
    toast({
      title: 'Copied!',
      description: `Phase ${phaseNum} prompt copied to clipboard`
    });
  };

  const getPriorityColor = (p: string): "destructive" | "default" | "secondary" | "outline" => {
    switch (p) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getRiskColor = (severity: string): "destructive" | "default" | "secondary" | "outline" => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Request</CardTitle>
            <CardDescription>
              Describe the feature you want to build
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Feature Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Stripe Payment Recovery System"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what this feature does and why it's needed..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="user-stories">User Stories * (one per line)</Label>
              <Textarea
                id="user-stories"
                placeholder="As a user, I want to...
As an admin, I need to..."
                value={userStories}
                onChange={(e) => setUserStories(e.target.value)}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="success-metrics">Success Metrics * (one per line)</Label>
              <Textarea
                id="success-metrics"
                placeholder="95% payment recovery rate
< 2 second response time"
                value={successMetrics}
                onChange={(e) => setSuccessMetrics(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="constraints">Constraints (one per line, optional)</Label>
              <Textarea
                id="constraints"
                placeholder="Must use Stripe webhooks
Must support retry logic"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v: Priority) => setPriority(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handlePlan}
              disabled={planning || !title || !description || !userStories || !successMetrics}
              className="w-full"
              size="lg"
            >
              {planning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Generate Implementation Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Implementation Plan</CardTitle>
              <CardDescription>
                AI-generated phased implementation with Lovable prompts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!plan && !error && !planning && (
                <div className="text-center text-muted-foreground py-12">
                  <Rocket className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Submit a feature request to see the implementation plan</p>
                </div>
              )}

              {planning && (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                  <p className="text-muted-foreground">Analyzing feature requirements...</p>
                  <p className="text-sm text-muted-foreground mt-2">This may take 30-60 seconds</p>
                </div>
              )}

              {plan && (
                <div className="space-y-6">
                  {/* Overview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">
                        {plan.feature_id}
                      </h3>
                      <Badge variant={getPriorityColor(priority)}>
                        {priority}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{plan.total_estimated_hours} hours total</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span>{plan.phases?.length || 0} phases</span>
                      </div>
                    </div>
                  </div>

                  {/* Architecture Overview */}
                  {plan.architecture && (
                    <div className="border rounded-lg p-4 space-y-2">
                      <h4 className="font-semibold">Architecture</h4>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground">Components</div>
                          <div className="font-mono">{plan.architecture.components?.length || 0}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">DB Changes</div>
                          <div className="font-mono">{plan.architecture.database_changes?.length || 0}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Edge Functions</div>
                          <div className="font-mono">{plan.architecture.edge_functions?.length || 0}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Phases */}
                  {plan.phases && plan.phases.length > 0 && (
                    <Accordion type="single" collapsible className="w-full">
                      {plan.phases.map((phase: Phase) => (
                        <AccordionItem key={phase.phase_number} value={`phase-${phase.phase_number}`}>
                          <AccordionTrigger>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Phase {phase.phase_number}</Badge>
                              <span className="font-semibold">{phase.name}</span>
                              <span className="text-sm text-muted-foreground ml-auto mr-4">
                                {phase.estimated_hours}h
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              <p className="text-sm">{phase.description}</p>

                              {phase.deliverables && phase.deliverables.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-semibold mb-2">Deliverables:</h5>
                                  <ul className="list-disc list-inside text-sm space-y-1">
                                    {phase.deliverables.map((d: string, i: number) => (
                                      <li key={i}>{d}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {phase.lovable_prompts && phase.lovable_prompts.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-semibold mb-2">Lovable Prompts:</h5>
                                  {phase.lovable_prompts.map((prompt: string, i: number) => (
                                    <div key={i} className="relative mb-3">
                                      <Textarea
                                        value={prompt}
                                        readOnly
                                        rows={8}
                                        className="text-xs font-mono resize-none"
                                      />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="absolute top-2 right-2"
                                        onClick={() => handleCopyPrompt(prompt, phase.phase_number)}
                                      >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {phase.test_criteria && phase.test_criteria.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-semibold mb-2">Test Criteria:</h5>
                                  <ul className="list-disc list-inside text-sm space-y-1">
                                    {phase.test_criteria.map((t: string, i: number) => (
                                      <li key={i}>{t}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}

                  {/* Risks */}
                  {plan.risks && plan.risks.length > 0 && (
                    <div className="border rounded-lg p-4 space-y-2">
                      <h4 className="font-semibold">Risks & Mitigations</h4>
                      <div className="space-y-2">
                        {plan.risks.map((risk: Risk, i: number) => (
                          <div key={i} className="text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={getRiskColor(risk.severity)}>
                                {risk.severity}
                              </Badge>
                              <span className="font-medium">{risk.description}</span>
                            </div>
                            <p className="text-muted-foreground ml-2">
                              Mitigation: {risk.mitigation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
