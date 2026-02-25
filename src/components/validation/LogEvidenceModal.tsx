import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TextareaWithVoice } from "@/components/ui/textarea-with-voice";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ClipboardEdit } from "lucide-react";

const EVIDENCE_TYPES = [
  "Customer Conversation",
  "Expert Interview",
  "Survey Response",
  "Competitor Observation",
  "Pre-Sale Attempt",
  "Market Signal",
] as const;

interface LogEvidenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missionTitle: string;
  sessionId: string;
  ventureId: string;
  missionId: string;
  onSuccess: () => void;
}

export function LogEvidenceModal({
  open,
  onOpenChange,
  missionTitle,
  sessionId,
  ventureId,
  missionId,
  onSuccess,
}: LogEvidenceModalProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [evidenceType, setEvidenceType] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [keyLearning, setKeyLearning] = useState("");
  const [confirmsOrChallenges, setConfirmsOrChallenges] = useState("");
  const [nextAction, setNextAction] = useState("");

  const resetForm = () => {
    setEvidenceType("");
    setRawNotes("");
    setKeyLearning("");
    setConfirmsOrChallenges("");
    setNextAction("");
  };

  const handleSubmit = async () => {
    if (!evidenceType || !rawNotes.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await invokeAuthedFunction("log-validation-evidence", {
        body: {
          session_id: sessionId,
          venture_id: ventureId,
          mission_id: missionId,
          evidence_type: evidenceType,
          raw_notes: rawNotes.trim(),
          guided_answers: {
            key_learning: keyLearning.trim(),
            confirms_or_challenges: confirmsOrChallenges.trim(),
            next_action: nextAction.trim(),
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Evidence logged",
        description: "Your validation score is updating.",
      });

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast({
        title: "Failed to log evidence",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = evidenceType && rawNotes.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardEdit className="h-4 w-4 text-primary" />
            Log Evidence
          </DialogTitle>
          <DialogDescription className="text-sm">
            {missionTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Evidence Type */}
          <div className="space-y-1.5">
            <Label htmlFor="evidence-type">Evidence Type</Label>
            <Select value={evidenceType} onValueChange={setEvidenceType}>
              <SelectTrigger id="evidence-type">
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {EVIDENCE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Raw Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="raw-notes">
              What happened? What did you observe or hear?
            </Label>
            <TextareaWithVoice
              id="raw-notes"
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder="e.g. Spoke with a product manager at a mid-size SaaS company. She said she spends 3+ hours a week on this exact problem and would pay to solve it."
              rows={4}
            />
          </div>

          {/* Guided Answers */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="key-learning">
                What was the most important thing you learned?
              </Label>
              <Input
                id="key-learning"
                value={keyLearning}
                onChange={(e) => setKeyLearning(e.target.value)}
                placeholder="Key takeaway…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirms-challenges">
                Did this confirm or challenge your original assumption?
              </Label>
              <Input
                id="confirms-challenges"
                value={confirmsOrChallenges}
                onChange={(e) => setConfirmsOrChallenges(e.target.value)}
                placeholder="Confirmed / Challenged / Mixed…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="next-action">
                What will you do differently because of this?
              </Label>
              <Input
                id="next-action"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="Next step…"
              />
            </div>
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Logging…
              </>
            ) : (
              <>
                <ClipboardEdit className="h-4 w-4 mr-2" />
                Log Evidence
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
