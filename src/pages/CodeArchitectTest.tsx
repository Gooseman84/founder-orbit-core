import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Copy, Bug, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AnalysisResult {
  analysis: {
    root_cause: string;
    explanation: string;
    fix_plan: {
      steps: string[];
    };
    confidence: number;
    risk_level: string;
  };
  lovable_prompt: string;
  estimated_time: string;
  requires_approval: boolean;
  error?: string;
}

export default function CodeArchitectTest() {
  const { user } = useAuth();
  const [issueDescription, setIssueDescription] = useState('');
  const [errorLogs, setErrorLogs] = useState('');
  const [affectedFiles, setAffectedFiles] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    if (!user) return;
    
    setAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('code-architect-agent', {
        body: {
          userId: user.id,
          task: {
            type: 'analyze_bug',
            context: {
              issue_description: issueDescription,
              error_logs: errorLogs.split('\n').filter(l => l.trim()),
              affected_files: affectedFiles.split('\n').filter(f => f.trim()),
              severity
            }
          }
        }
      });

      if (error) throw error;
      setResult(data);
    } catch (err) {
      console.error('Analysis failed:', err);
      setResult({ error: err instanceof Error ? err.message : 'Unknown error' } as AnalysisResult);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (result?.lovable_prompt) {
      navigator.clipboard.writeText(result.lovable_prompt);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Lovable prompt copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getSeverityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'bg-red-500 hover:bg-red-600';
      case 'high': return 'bg-orange-500 hover:bg-orange-600';
      case 'medium': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'low': return 'bg-green-500 hover:bg-green-600';
      default: return '';
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Bug className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Code Architect Agent - Test Interface</h1>
      </div>
      
      <p className="text-muted-foreground">
        Manually trigger bug analysis and generate Lovable-ready fix prompts.
      </p>
      
      <Card className="p-6">
        <div className="space-y-5">
          <div>
            <Label htmlFor="issue">Issue Description</Label>
            <Textarea
              id="issue"
              placeholder="Describe the bug, e.g., 'Blueprint commitment fails when venture has no success_metric set'"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              rows={3}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="errors">Error Logs (one per line)</Label>
            <Textarea
              id="errors"
              placeholder="Paste error messages from Supabase logs..."
              value={errorLogs}
              onChange={(e) => setErrorLogs(e.target.value)}
              rows={4}
              className="mt-1.5 font-mono text-sm"
            />
          </div>

          <div>
            <Label htmlFor="files">Affected Files (optional, one per line)</Label>
            <Textarea
              id="files"
              placeholder="/src/hooks/useBlueprint.ts"
              value={affectedFiles}
              onChange={(e) => setAffectedFiles(e.target.value)}
              rows={2}
              className="mt-1.5 font-mono text-sm"
            />
          </div>

          <div>
            <Label>Severity</Label>
            <div className="flex gap-2 mt-2">
              {(['critical', 'high', 'medium', 'low'] as const).map(s => (
                <Badge
                  key={s}
                  variant={severity === s ? 'default' : 'outline'}
                  className={`cursor-pointer capitalize ${severity === s ? getSeverityColor(s) : ''}`}
                  onClick={() => setSeverity(s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleAnalyze} 
            disabled={analyzing || !issueDescription}
            className="w-full sm:w-auto"
          >
            {analyzing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Analyzing...
              </>
            ) : (
              <>
                <Bug className="mr-2 h-4 w-4" />
                Analyze Bug
              </>
            )}
          </Button>
        </div>
      </Card>

      {result && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Analysis Result</h2>
          
          {result.error ? (
            <div className="text-destructive bg-destructive/10 p-4 rounded-lg">
              Error: {result.error}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg">Root Cause</h3>
                <p className="text-muted-foreground mt-1">{result.analysis?.root_cause}</p>
              </div>

              <div>
                <h3 className="font-semibold text-lg">Explanation</h3>
                <p className="text-muted-foreground whitespace-pre-wrap mt-1">
                  {result.analysis?.explanation}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg">Fix Plan</h3>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                  {result.analysis?.fix_plan?.steps?.map((step: string, i: number) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Lovable Prompt (Copy & Paste)</h3>
                <Textarea
                  value={result.lovable_prompt || ''}
                  readOnly
                  rows={12}
                  className="font-mono text-sm bg-muted"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Badge variant={result.analysis?.confidence >= 80 ? 'default' : 'secondary'}>
                  Confidence: {result.analysis?.confidence}%
                </Badge>
                <Badge variant="outline">
                  Risk: {result.analysis?.risk_level}
                </Badge>
                <Badge variant="outline">
                  Est. Time: {result.estimated_time}
                </Badge>
                <Badge variant={result.requires_approval ? 'destructive' : 'default'}>
                  {result.requires_approval ? 'Requires Approval' : 'Auto-Approved'}
                </Badge>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
