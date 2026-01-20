import { useState } from 'react';
import { Sparkles, ArrowDownToLine, RefreshCw, Clock, Star, Tag, X, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import type { WorkspaceDocument } from '@/lib/workspaceEngine';
import type { TaskContext } from '@/types/tasks';

export type RefinementType = 'shorter' | 'detailed' | 'different' | 'actionable';

interface WorkspaceAssistantPanelProps {
  document: WorkspaceDocument;
  loading?: boolean;
  onRequestSuggestion: (taskContext?: TaskContext) => void;
  onApplySuggestion: (mode: 'insert' | 'replace') => Promise<void> | void;
  onDismissSuggestion: () => Promise<void> | void;
  onRefineSuggestion?: (refinementType: RefinementType) => void;
  taskContext?: TaskContext;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function WorkspaceAssistantPanel({
  document,
  loading = false,
  onRequestSuggestion,
  onApplySuggestion,
  onDismissSuggestion,
  onRefineSuggestion,
  taskContext,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: WorkspaceAssistantPanelProps) {
  const isMobile = useIsMobile();
  const hasSuggestions = document.ai_suggestions && document.ai_suggestions.trim().length > 0;
  const [applyingMode, setApplyingMode] = useState<'insert' | 'replace' | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleApply = async (mode: 'insert' | 'replace') => {
    setApplyingMode(mode);
    try {
      await onApplySuggestion(mode);
      setShowSuccess(true);
      // Auto-collapse on mobile after successful apply
      setTimeout(() => {
        setShowSuccess(false);
        if (isMobile && onToggleCollapse) {
          onToggleCollapse();
        }
      }, 1500);
    } finally {
      setApplyingMode(null);
    }
  };

  // Collapsed mobile view - just a toggle button
  if (isMobile && isCollapsed) {
    return (
      <Button
        onClick={onToggleCollapse}
        variant="outline"
        className="w-full h-12 flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        <span>AI Assistant</span>
        {hasSuggestions && (
          <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded">
            New suggestion
          </span>
        )}
        <ChevronUp className="w-4 h-4 ml-auto" />
      </Button>
    );
  }

  return (
    <Card className="relative flex flex-col h-full">
      <CardHeader className="pb-3 relative shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 shrink-0" />
              AI Assistant
            </CardTitle>
            <CardDescription className="mt-1">Get AI-powered suggestions for your content</CardDescription>
          </div>
          {/* Close/Collapse buttons for mobile */}
          {isMobile && (
            <div className="flex items-center gap-1 shrink-0">
              {onToggleCollapse && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleCollapse}
                  className="h-11 w-11 touch-manipulation"
                  aria-label="Collapse AI panel"
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              )}
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-11 w-11 touch-manipulation"
                  aria-label="Close AI panel"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 space-y-4 flex flex-col pb-8">
        {/* Success feedback overlay */}
        {showSuccess && (
          <div className="absolute inset-0 bg-background/90 flex items-center justify-center z-10 rounded-lg">
            <div className="text-center">
              <Check className="w-10 h-10 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-primary">Applied successfully!</p>
            </div>
          </div>
        )}

        {/* Task context header if present */}
        {taskContext && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
            <div className="font-semibold text-primary uppercase tracking-wide text-xs mb-1">
              Task Focus
            </div>
            <div className="text-sm font-medium">{taskContext.title}</div>
            {taskContext.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                {taskContext.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {taskContext.estimated_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {taskContext.estimated_minutes} min
                </span>
              )}
              {taskContext.xp_reward && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {taskContext.xp_reward} XP
                </span>
              )}
              {taskContext.category && (
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {taskContext.category}
                </span>
              )}
            </div>
          </div>
        )}

        <Button 
          onClick={() => onRequestSuggestion(taskContext)} 
          disabled={loading} 
          className="w-full h-11 touch-manipulation"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {taskContext ? 'Ask AI to help with this task' : 'Ask AI to help expand this'}
            </>
          )}
        </Button>

        {hasSuggestions && (
          <>
            <div className="border-t pt-4 flex flex-col">
              <p className="text-sm font-medium mb-2">Latest Suggestion:</p>
              <div className="border rounded-md p-3 max-h-[200px] sm:max-h-[250px] overflow-y-auto bg-muted/30">
                <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">
                  {document.ai_suggestions}
                </p>
              </div>
            </div>

            {/* Primary action buttons - Apply and Dismiss */}
            <div className="space-y-2 pt-3 border-t mb-8">
              <Button
                onClick={() => handleApply('insert')}
                size="default"
                disabled={applyingMode !== null}
                className="w-full h-12 touch-manipulation font-medium"
              >
                {applyingMode === 'insert' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Apply to Document
              </Button>
              <Button
                onClick={async () => {
                  setApplyingMode('insert');
                  try {
                    await onDismissSuggestion();
                  } finally {
                    setApplyingMode(null);
                  }
                }}
                variant="outline"
                size="default"
                disabled={applyingMode !== null}
                className="w-full h-12 touch-manipulation"
              >
                <X className="w-4 h-4 mr-2" />
                Dismiss
              </Button>
            </div>

            {/* Refinement buttons */}
            {onRefineSuggestion && !loading && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground font-medium">Refine this suggestion:</p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onRefineSuggestion('shorter')}
                    className="h-8 text-xs touch-manipulation"
                    disabled={loading}
                  >
                    Shorter
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onRefineSuggestion('detailed')}
                    className="h-8 text-xs touch-manipulation"
                    disabled={loading}
                  >
                    More Detail
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onRefineSuggestion('different')}
                    className="h-8 text-xs touch-manipulation"
                    disabled={loading}
                  >
                    Different Angle
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onRefineSuggestion('actionable')}
                    className="h-8 text-xs touch-manipulation"
                    disabled={loading}
                  >
                    More Actionable
                  </Button>
                </div>
              </div>
            )}

            {/* Additional options - collapsed by default */}
            <details className="pt-2 pb-4">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                More options...
              </summary>
              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => handleApply('insert')}
                  variant="ghost"
                  size="sm"
                  disabled={applyingMode !== null}
                  className="w-full h-10 touch-manipulation text-xs"
                >
                  <ArrowDownToLine className="w-3 h-3 mr-2" />
                  Insert at end of document
                </Button>
                <Button
                  onClick={() => handleApply('replace')}
                  variant="ghost"
                  size="sm"
                  disabled={applyingMode !== null}
                  className="w-full h-10 touch-manipulation text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Replace all content
                </Button>
              </div>
            </details>
          </>
        )}

        {!hasSuggestions && !loading && (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div>
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {taskContext
                  ? 'Click above to get AI help completing this task'
                  : 'Click the button above to generate AI suggestions'}
              </p>
            </div>
          </div>
        )}

        {/* Cancel/Done button when no suggestions yet (mobile only) */}
        {isMobile && !hasSuggestions && !loading && onToggleCollapse && (
          <Button
            onClick={onToggleCollapse}
            variant="outline"
            size="sm"
            className="w-full h-11 touch-manipulation"
          >
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
