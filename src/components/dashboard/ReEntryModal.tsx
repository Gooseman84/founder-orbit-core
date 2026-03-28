import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw, BookOpen } from "lucide-react";

interface ReEntryVenture {
  id: string;
  name: string;
  venture_state: string;
}

interface ReEntryModalProps {
  isOpen: boolean;
  previousVenture: ReEntryVenture | null;
  onStartFresh: () => void;
  onUseExisting: () => void;
  onDismiss: () => void;
}

export function ReEntryModal({
  isOpen,
  previousVenture,
  onStartFresh,
  onUseExisting,
  onDismiss,
}: ReEntryModalProps) {
  const ventureName = previousVenture?.name || "your last venture";
  const isKilled = previousVenture?.venture_state === "killed";

  const headline = isKilled
    ? `${ventureName} ended. Time to find your next move.`
    : `You reviewed ${ventureName}. What's next?`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Welcome back</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground leading-relaxed">{headline}</p>

        <div className="space-y-3 mt-2">
          <button
            onClick={onStartFresh}
            className="w-full rounded-xl border-2 border-primary/20 hover:border-primary/50 bg-card p-4 text-left transition-all hover:bg-primary/5 group"
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <RotateCcw className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Start Fresh with Mavrik</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Run a new interview — update your domain, customer, or direction. Mavrik adapts to what you know now.
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={onUseExisting}
            className="w-full rounded-xl border-2 border-transparent hover:border-muted bg-muted/50 hover:bg-muted p-4 text-left transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-background flex items-center justify-center shrink-0 group-hover:bg-card transition-colors border">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm">Use Existing Profile</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your founder profile is still intact. Browse saved ideas or generate new ones from your existing context.
                </p>
              </div>
            </div>
          </button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="w-full mt-1 text-muted-foreground"
        >
          Decide later
        </Button>
      </DialogContent>
    </Dialog>
  );
}
