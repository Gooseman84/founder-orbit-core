// src/components/discover/RegeneratePanel.tsx
import { useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface RegeneratePanelProps {
  onRegenerate: (feedback: string) => void;
  isRegenerating: boolean;
  className?: string;
}

export function RegeneratePanel({
  onRegenerate,
  isRegenerating,
  className,
}: RegeneratePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleSubmit = () => {
    if (feedback.trim()) {
      onRegenerate(feedback.trim());
    }
  };

  if (!isOpen) {
    return (
      <div className={cn("text-center", className)}>
        <button
          onClick={() => setIsOpen(true)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
        >
          Not seeing the right fit?
        </button>
      </div>
    );
  }

  return (
    <div className={cn("bg-muted/50 rounded-lg p-4 border", className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm">Tell Mavrik what's missing</h4>
        <button
          onClick={() => {
            setIsOpen(false);
            setFeedback("");
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <Textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="E.g., 'I'd like ideas that are more focused on B2B software' or 'None of these leverage my healthcare experience'"
        className="min-h-[80px] resize-none mb-3"
        disabled={isRegenerating}
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsOpen(false);
            setFeedback("");
          }}
          disabled={isRegenerating}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!feedback.trim() || isRegenerating}
        >
          {isRegenerating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate Ideas
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
