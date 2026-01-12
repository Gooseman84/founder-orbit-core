import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Bug, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface AnalysisResult {
  rootCause: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  affectedFiles: string[];
  fixPrompt: string;
  estimatedFixTime: string;
  testingSteps: string[];
}

export default function CodeArchitectTest() {
  const { user } = useAuth();
  const [bugDescription, setBugDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [affectedFiles, setAffectedFiles] = useState('');
  const [severity, setSeverity] = useState<'high' | 'medium' | 'low'>('medium');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    if (!user || !bugDescription) return;

    setAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      const { data, error: apiError } = await supabase.functions.invoke('code-architect-agent', {
        body: {
          userId: user.id,
          bugDescription,
          errorMessage: errorMessage || undefined,
          affectedFiles: affectedFiles || undefined,
          severity
        }
      });

      if (apiError) throw apiError;

      if (data?.success && data?.analysis) {
        setResult(data.analysis);
        toast.success('Bug analysis complete!');
      } else {
        throw new Error(data?.error || 'Unknown error from Code Architect');
      }
    } catch (err: any) {
      console.error('Code Architect error:', err);
      setError(err.message || 'Failed to analyze bug');
      toast.error('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!result?.fixPrompt) return;
    
    try {
      await navigator.clipboard.writeText(result.fixPrompt);
      setCopied(true);
      toast.success('Fix prompt copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const getRiskBadgeVariant = (risk: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (risk) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      default: return 'outline';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Bug className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Code Architect Agent</h1>
        </div>
        <p className="text-muted-foreground">
          Analyze bugs and generate production-ready Lovable fix prompts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Bug Report</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Issue Description <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Describe what's broken. Example: 'When I click Save Idea, I get a blank screen'"
                value={bugDescription}
                onChange={(e) => setBugDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Error Logs (optional)</label>
              <Textarea
                placeholder="Paste error messages from console or logs"
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                rows={4}
                className="resize-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Affected Files (optional)</label>
              <Textarea
                placeholder="/src/pages/Ideas.tsx, /src/hooks/useIdeas.ts"
                value={affectedFiles}
                onChange={(e) => setAffectedFiles(e.target.value)}
                rows={2}
                className="resize-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank to let the agent infer files from the error
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <Select value={severity} onValueChange={(v: 'high' | 'medium' | 'low') => setSeverity(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 High - Blocking user flow</SelectItem>
                  <SelectItem value="medium">🟡 Medium - Degraded experience</SelectItem>
                  <SelectItem value="low">🟢 Low - Minor issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!bugDescription || analyzing || !user}
              className="w-full"
              size="lg"
            >
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Bug...
                </>
              ) : (
                <>
                  <Bug className="mr-2 h-4 w-4" />
                  Analyze Bug
                </>
              )}
            </Button>

            {!user && (
              <p className="text-sm text-muted-foreground text-center">
                Please sign in to use the Code Architect Agent
              </p>
            )}
          </div>
        </Card>

        {/* Results Panel */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!result && !error && !analyzing && (
            <div className="text-center text-muted-foreground py-12">
              <Bug className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Submit a bug report to see analysis results</p>
            </div>
          )}

          {analyzing && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Analyzing bug with Claude...</p>
              <p className="text-sm text-muted-foreground mt-2">This may take 10-30 seconds</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">Analysis Complete</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                  <p className={`text-2xl font-bold ${getConfidenceColor(result.confidence)}`}>
                    {result.confidence}%
                  </p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Risk Level</p>
                  <Badge variant={getRiskBadgeVariant(result.riskLevel)} className="mt-1">
                    {result.riskLevel}
                  </Badge>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Est. Time</p>
                  <p className="text-sm font-medium">{result.estimatedFixTime}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Root Cause</h3>
                <p className="text-sm bg-muted p-3 rounded">{result.rootCause}</p>
              </div>

              {result.affectedFiles && result.affectedFiles.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Affected Files</h3>
                  <div className="space-y-1">
                    {result.affectedFiles.map((file: string, i: number) => (
                      <div key={i} className="text-sm font-mono bg-muted px-3 py-1 rounded">
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Lovable Fix Prompt</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyPrompt}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={result.fixPrompt}
                  readOnly
                  rows={12}
                  className="resize-none font-mono text-xs bg-muted"
                />
              </div>

              {result.testingSteps && result.testingSteps.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Testing Steps</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm bg-muted p-3 rounded">
                    {result.testingSteps.map((step: string, i: number) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
