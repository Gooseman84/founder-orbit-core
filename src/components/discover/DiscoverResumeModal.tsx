// src/components/discover/DiscoverResumeModal.tsx
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play } from "lucide-react";

interface DiscoverResumeModalProps {
  existingInterview: {
    id: string;
    status: string;
    updated_at: string;
    transcript: any[];
  };
  onContinue: () => void;
  onStartFresh: () => void;
}

export function DiscoverResumeModal({
  existingInterview,
  onContinue,
  onStartFresh,
}: DiscoverResumeModalProps) {
  const lastUpdated = format(new Date(existingInterview.updated_at), "MMM d, h:mm a");
  const questionCount = existingInterview.transcript?.filter(
    (t: any) => t.role === "ai"
  ).length || 0;
  const isCompleted = existingInterview.status === "completed";

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCompleted ? "Start a new interview?" : "Continue your interview?"}
          </DialogTitle>
          <DialogDescription>
            {isCompleted
              ? `You completed an interview on ${lastUpdated}. Would you like to start fresh with new questions?`
              : `You have an interview in progress with ${questionCount} questions answered. Last updated ${lastUpdated}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-4">
          {!isCompleted && (
            <Button onClick={onContinue} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Continue where I left off
            </Button>
          )}
          
          <Button
            variant={isCompleted ? "default" : "outline"}
            onClick={onStartFresh}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Start a new interview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
