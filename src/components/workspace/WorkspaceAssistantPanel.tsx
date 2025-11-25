import { Sparkles, ArrowDownToLine, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WorkspaceDocument } from '@/lib/workspaceEngine';

interface WorkspaceAssistantPanelProps {
  document: WorkspaceDocument;
  loading?: boolean;
  onRequestSuggestion: () => void;
  onApplySuggestion: (mode: 'insert' | 'replace') => void;
}

export function WorkspaceAssistantPanel({
  document,
  loading = false,
  onRequestSuggestion,
  onApplySuggestion,
}: WorkspaceAssistantPanelProps) {
  const hasSuggestions = document.ai_suggestions && document.ai_suggestions.trim().length > 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI Assistant
        </CardTitle>
        <CardDescription>Get AI-powered suggestions for your content</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col">
        <Button onClick={onRequestSuggestion} disabled={loading} className="w-full">
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Ask AI to help expand this
            </>
          )}
        </Button>

        {hasSuggestions && (
          <>
            <div className="border-t pt-4 flex-1 flex flex-col">
              <p className="text-sm font-medium mb-2">Latest Suggestion:</p>
              <ScrollArea className="flex-1 border rounded-md p-3">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {document.ai_suggestions}
                </p>
              </ScrollArea>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                onClick={() => onApplySuggestion('insert')}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <ArrowDownToLine className="w-4 h-4 mr-2" />
                Insert at cursor
              </Button>
              <Button
                onClick={() => onApplySuggestion('replace')}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Replace all content
              </Button>
            </div>
          </>
        )}

        {!hasSuggestions && !loading && (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div>
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click the button above to generate AI suggestions
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
