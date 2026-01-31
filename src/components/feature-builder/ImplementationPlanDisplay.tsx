import React, { useState } from "react";
import { 
  Download, 
  Copy, 
  Check, 
  Plus, 
  ChevronRight,
  Clock,
  AlertTriangle,
  Database,
  Code,
  Layout,
  Workflow,
  Shield,
  CheckCircle2,
  Circle,
  PlayCircle,
  FileCode,
  Server,
  Layers
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/useAnalytics";
import { cn } from "@/lib/utils";

// Types matching the edge function output
interface ArchitectureComponent {
  name: string;
  path: string;
  purpose: string;
  props?: string[];
}

interface DatabaseChange {
  type: "new_table" | "add_column" | "add_index" | "modify_column";
  name: string;
  columns?: string[];
  indexes?: string[];
  rls?: boolean;
  rls_policies?: string[];
}

interface EdgeFunction {
  name: string;
  method: "POST" | "GET" | "PUT" | "DELETE" | "PATCH";
  purpose: string;
  auth_required: boolean;
  inputs?: Record<string, string>;
  outputs?: Record<string, string>;
}

interface ImplementationPhase {
  phase_number: number;
  name: string;
  description: string;
  deliverables: string[];
  lovable_prompts: string[];
  estimated_hours: number;
  prerequisites: string[];
  test_criteria: string[];
  dependencies?: string[];
}

interface Risk {
  description: string;
  mitigation: string;
  severity: "low" | "medium" | "high";
}

interface Architecture {
  components: ArchitectureComponent[];
  database_changes: DatabaseChange[];
  edge_functions: EdgeFunction[];
  ui_flows: string[];
}

export interface ImplementationPlan {
  feature_id: string;
  architecture: Architecture;
  phases: ImplementationPhase[];
  total_estimated_hours: number;
  risks: Risk[];
}

interface FeatureInput {
  title: string;
  description: string;
  user_stories: string[];
  success_metrics: string[];
  constraints?: string[];
  priority: "critical" | "high" | "medium" | "low";
}

interface ImplementationPlanDisplayProps {
  plan: ImplementationPlan;
  feature?: FeatureInput;
  onStartNew: () => void;
}

type PhaseStatus = "not_started" | "in_progress" | "complete";

export function ImplementationPlanDisplay({ 
  plan, 
  feature,
  onStartNew 
}: ImplementationPlanDisplayProps) {
  const { track } = useAnalytics();
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [phaseStatuses, setPhaseStatuses] = useState<Record<number, PhaseStatus>>(() => {
    const initial: Record<number, PhaseStatus> = {};
    plan.phases.forEach(p => { initial[p.phase_number] = "not_started"; });
    return initial;
  });
  const [checkedPrereqs, setCheckedPrereqs] = useState<Record<string, boolean>>({});
  const [checkedCriteria, setCheckedCriteria] = useState<Record<string, boolean>>({});

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [id]: true }));
      toast({ title: "Copied!", description: "Content copied to clipboard" });
      track("copy_prompt" as any, { feature_id: plan.feature_id, prompt_id: id });
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const generateMarkdown = (): string => {
    let md = `# ${feature?.title || plan.feature_id}\n\n`;
    md += `**Feature ID:** \`${plan.feature_id}\`\n`;
    md += `**Total Estimated Hours:** ${plan.total_estimated_hours}\n`;
    md += `**Priority:** ${feature?.priority || "medium"}\n\n`;

    if (feature) {
      md += `## Overview\n\n`;
      md += `### Description\n${feature.description}\n\n`;
      md += `### User Stories\n`;
      feature.user_stories.forEach((s, i) => { md += `${i + 1}. ${s}\n`; });
      md += `\n### Success Metrics\n`;
      feature.success_metrics.forEach(m => { md += `- ✓ ${m}\n`; });
      if (feature.constraints?.length) {
        md += `\n### Constraints\n`;
        feature.constraints.forEach(c => { md += `- ${c}\n`; });
      }
      md += `\n`;
    }

    md += `## Architecture\n\n`;
    
    if (plan.architecture.components.length) {
      md += `### Components\n`;
      plan.architecture.components.forEach(c => {
        md += `- **${c.name}** (\`${c.path}\`): ${c.purpose}\n`;
      });
      md += `\n`;
    }

    if (plan.architecture.database_changes.length) {
      md += `### Database Changes\n`;
      plan.architecture.database_changes.forEach(d => {
        md += `- **${d.name}** (${d.type})`;
        if (d.rls) md += ` [RLS enabled]`;
        md += `\n`;
        if (d.columns?.length) {
          d.columns.forEach(col => { md += `  - ${col}\n`; });
        }
      });
      md += `\n`;
    }

    if (plan.architecture.edge_functions.length) {
      md += `### Edge Functions\n`;
      plan.architecture.edge_functions.forEach(f => {
        md += `- **${f.name}** (${f.method}): ${f.purpose}`;
        if (f.auth_required) md += ` [Auth required]`;
        md += `\n`;
      });
      md += `\n`;
    }

    if (plan.architecture.ui_flows.length) {
      md += `### UI Flows\n`;
      plan.architecture.ui_flows.forEach((flow, i) => {
        md += `${i + 1}. ${flow}\n`;
      });
      md += `\n`;
    }

    md += `## Implementation Phases\n\n`;
    plan.phases.forEach(phase => {
      md += `### Phase ${phase.phase_number}: ${phase.name}\n`;
      md += `**Estimated Hours:** ${phase.estimated_hours}\n\n`;
      md += `${phase.description}\n\n`;
      
      md += `#### Deliverables\n`;
      phase.deliverables.forEach(d => { md += `- ${d}\n`; });
      
      if (phase.prerequisites.length) {
        md += `\n#### Prerequisites\n`;
        phase.prerequisites.forEach(p => { md += `- [ ] ${p}\n`; });
      }
      
      md += `\n#### Lovable Prompts\n`;
      phase.lovable_prompts.forEach((prompt, i) => {
        md += `\n**Prompt ${i + 1}:**\n\`\`\`\n${prompt}\n\`\`\`\n`;
      });
      
      md += `\n#### Test Criteria\n`;
      phase.test_criteria.forEach(t => { md += `- [ ] ${t}\n`; });
      
      if (phase.dependencies?.length) {
        md += `\n#### Dependencies\n`;
        phase.dependencies.forEach(d => { md += `- ${d}\n`; });
      }
      md += `\n---\n\n`;
    });

    if (plan.risks.length) {
      md += `## Risks\n\n`;
      md += `| Risk | Severity | Mitigation |\n`;
      md += `|------|----------|------------|\n`;
      plan.risks.forEach(r => {
        md += `| ${r.description} | ${r.severity} | ${r.mitigation} |\n`;
      });
    }

    return md;
  };

  const downloadMarkdown = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.feature_id}-implementation-plan.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Plan exported as markdown" });
    track("download_plan" as any, { feature_id: plan.feature_id });
  };

  const copyAllPrompts = async () => {
    const allPrompts = plan.phases
      .flatMap((p, pi) => 
        p.lovable_prompts.map((prompt, i) => 
          `=== Phase ${p.phase_number}: ${p.name} - Prompt ${i + 1} ===\n\n${prompt}`
        )
      )
      .join("\n\n---\n\n");
    await copyToClipboard(allPrompts, "all-prompts");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-destructive text-destructive-foreground";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-white";
      case "low": return "bg-muted text-muted-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-destructive/10 text-destructive border-destructive/30";
      case "medium": return "bg-orange-500/10 text-orange-600 border-orange-500/30";
      case "low": return "bg-muted text-muted-foreground border-muted";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusIcon = (status: PhaseStatus) => {
    switch (status) {
      case "complete": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "in_progress": return <PlayCircle className="w-4 h-4 text-primary" />;
      default: return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const cyclePhaseStatus = (phaseNum: number) => {
    setPhaseStatuses(prev => {
      const current = prev[phaseNum];
      const next: PhaseStatus = 
        current === "not_started" ? "in_progress" :
        current === "in_progress" ? "complete" : "not_started";
      return { ...prev, [phaseNum]: next };
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-2xl md:text-3xl font-bold">
                {feature?.title || plan.feature_id}
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {plan.feature_id}
                </Badge>
                <Badge className="gap-1">
                  <Clock className="w-3 h-3" />
                  {plan.total_estimated_hours}h total
                </Badge>
                {feature?.priority && (
                  <Badge className={getPriorityColor(feature.priority)}>
                    {feature.priority.toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={downloadMarkdown}>
                <Download className="w-4 h-4 mr-1" />
                Download MD
              </Button>
              <Button variant="outline" size="sm" onClick={copyAllPrompts}>
                <Copy className="w-4 h-4 mr-1" />
                Copy All Prompts
              </Button>
              <Button size="sm" onClick={onStartNew}>
                <Plus className="w-4 h-4 mr-1" />
                New Feature
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overview Section */}
      {feature && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="w-5 h-5" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Description</h4>
              <p className="text-sm">{feature.description}</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">User Stories</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {feature.user_stories.map((story, i) => (
                    <li key={i} className="text-foreground">{story}</li>
                  ))}
                </ol>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Success Metrics</h4>
                <ul className="space-y-1 text-sm">
                  {feature.success_metrics.map((metric, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{metric}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {feature.constraints && feature.constraints.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Constraints</h4>
                <ul className="space-y-1 text-sm">
                  {feature.constraints.map((constraint, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                      <span>{constraint}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Architecture Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Architecture Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Components Grid */}
          {plan.architecture.components.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Code className="w-4 h-4" />
                Components ({plan.architecture.components.length})
              </h4>
              <div className="grid md:grid-cols-2 gap-3">
                {plan.architecture.components.map((comp, i) => (
                  <div 
                    key={i} 
                    className="p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors"
                  >
                    <div className="font-medium text-sm">{comp.name}</div>
                    <code className="text-xs text-muted-foreground block mt-1 break-all">
                      {comp.path}
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">{comp.purpose}</p>
                    {comp.props && comp.props.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {comp.props.map((prop, pi) => (
                          <Badge key={pi} variant="secondary" className="text-xs font-mono">
                            {prop}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Database Changes */}
          {plan.architecture.database_changes.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Database Changes ({plan.architecture.database_changes.length})
              </h4>
              <div className="space-y-3">
                {plan.architecture.database_changes.map((change, i) => (
                  <div 
                    key={i} 
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{change.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {change.type.replace("_", " ")}
                      </Badge>
                      {change.rls && (
                        <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                          <Shield className="w-3 h-3 mr-1" />
                          RLS
                        </Badge>
                      )}
                    </div>
                    {change.columns && change.columns.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {change.columns.map((col, ci) => (
                          <code key={ci} className="text-xs text-muted-foreground block">
                            {col}
                          </code>
                        ))}
                      </div>
                    )}
                    {change.rls_policies && change.rls_policies.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Policies:</span>
                        <ul className="mt-1 space-y-0.5">
                          {change.rls_policies.map((policy, pi) => (
                            <li key={pi} className="text-xs text-muted-foreground">
                              • {policy}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edge Functions */}
          {plan.architecture.edge_functions.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Server className="w-4 h-4" />
                Edge Functions ({plan.architecture.edge_functions.length})
              </h4>
              <div className="space-y-2">
                {plan.architecture.edge_functions.map((fn, i) => (
                  <div 
                    key={i} 
                    className="p-3 rounded-lg border bg-card flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="font-medium text-sm">{fn.name}</code>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs font-mono",
                            fn.method === "GET" && "border-green-500/50 text-green-600",
                            fn.method === "POST" && "border-blue-500/50 text-blue-600",
                            fn.method === "PUT" && "border-yellow-500/50 text-yellow-600",
                            fn.method === "DELETE" && "border-red-500/50 text-red-600"
                          )}
                        >
                          {fn.method}
                        </Badge>
                        {fn.auth_required && (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Auth
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{fn.purpose}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UI Flows */}
          {plan.architecture.ui_flows.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Workflow className="w-4 h-4" />
                UI Flows
              </h4>
              <ol className="space-y-2">
                {plan.architecture.ui_flows.map((flow, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{flow}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Implementation Phases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            Implementation Phases ({plan.phases.length})
          </CardTitle>
          <CardDescription>
            Click phase status to track progress. Copy prompts to use in Lovable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={["phase-1"]} className="space-y-3">
            {plan.phases.map((phase) => (
              <AccordionItem 
                key={phase.phase_number} 
                value={`phase-${phase.phase_number}`}
                className="border rounded-lg px-4 data-[state=open]:border-primary/30"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        cyclePhaseStatus(phase.phase_number);
                      }}
                      className="shrink-0"
                    >
                      {getStatusIcon(phaseStatuses[phase.phase_number])}
                    </button>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Badge variant="outline" className="shrink-0">
                        Phase {phase.phase_number}
                      </Badge>
                      <span className="font-medium truncate">{phase.name}</span>
                    </div>
                    <Badge className="shrink-0 gap-1 ml-2">
                      <Clock className="w-3 h-3" />
                      {phase.estimated_hours}h
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-4">
                    {/* Description */}
                    <p className="text-sm text-muted-foreground">{phase.description}</p>

                    {/* Deliverables */}
                    <div>
                      <h5 className="font-medium text-sm mb-2">Deliverables</h5>
                      <ul className="space-y-1">
                        {phase.deliverables.map((d, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Prerequisites */}
                    {phase.prerequisites.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Prerequisites</h5>
                        <ul className="space-y-2">
                          {phase.prerequisites.map((prereq, i) => {
                            const key = `phase-${phase.phase_number}-prereq-${i}`;
                            return (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <Checkbox 
                                  id={key}
                                  checked={checkedPrereqs[key] || false}
                                  onCheckedChange={(checked) => {
                                    setCheckedPrereqs(prev => ({ 
                                      ...prev, 
                                      [key]: checked === true 
                                    }));
                                  }}
                                  className="mt-0.5"
                                />
                                <label htmlFor={key} className="cursor-pointer">
                                  {prereq}
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {/* Lovable Prompts - Highlighted Section */}
                    <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
                      <h5 className="font-semibold text-sm mb-3 flex items-center gap-2 text-primary">
                        <FileCode className="w-4 h-4" />
                        Lovable Prompts ({phase.lovable_prompts.length})
                      </h5>
                      <div className="space-y-3">
                        {phase.lovable_prompts.map((prompt, i) => {
                          const promptKey = `phase-${phase.phase_number}-prompt-${i}`;
                          return (
                            <div key={i} className="relative group">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">
                                  Prompt {i + 1}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1"
                                  onClick={() => copyToClipboard(prompt, promptKey)}
                                >
                                  {copiedStates[promptKey] ? (
                                    <>
                                      <Check className="w-3 h-3 text-green-500" />
                                      <span className="text-xs">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span className="text-xs">Copy</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                              <pre className="p-3 rounded-md bg-background border text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono">
                                {prompt}
                              </pre>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Test Criteria */}
                    <div>
                      <h5 className="font-medium text-sm mb-2">Test Criteria</h5>
                      <ul className="space-y-2">
                        {phase.test_criteria.map((criteria, i) => {
                          const key = `phase-${phase.phase_number}-criteria-${i}`;
                          return (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Checkbox 
                                id={key}
                                checked={checkedCriteria[key] || false}
                                onCheckedChange={(checked) => {
                                  setCheckedCriteria(prev => ({ 
                                    ...prev, 
                                    [key]: checked === true 
                                  }));
                                }}
                                className="mt-0.5"
                              />
                              <label htmlFor={key} className="cursor-pointer">
                                {criteria}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {/* Dependencies */}
                    {phase.dependencies && phase.dependencies.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Dependencies</h5>
                        <div className="flex flex-wrap gap-2">
                          {phase.dependencies.map((dep, i) => (
                            <Badge key={i} variant="secondary" className="font-mono text-xs">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Risk Assessment */}
      {plan.risks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Risk Assessment ({plan.risks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Risk</th>
                    <th className="text-left py-2 px-3 font-medium w-24">Severity</th>
                    <th className="text-left py-2 px-3 font-medium">Mitigation</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.risks.map((risk, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-3 px-3">{risk.description}</td>
                      <td className="py-3 px-3">
                        <Badge 
                          variant="outline" 
                          className={cn("capitalize", getSeverityColor(risk.severity))}
                        >
                          {risk.severity}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{risk.mitigation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Actions */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="outline" onClick={downloadMarkdown} className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Download Full Plan
            </Button>
            <Button onClick={onStartNew} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Start New Feature Request
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ImplementationPlanDisplay;
