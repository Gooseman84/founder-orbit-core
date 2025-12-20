import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { Upload, Loader2, Sparkles, Info } from "lucide-react";

interface ImportIdeaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (ideas: any[]) => void;
}

export function ImportIdeaModal({ open, onOpenChange, onSuccess }: ImportIdeaModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please describe your business idea.",
        variant: "destructive",
      });
      return;
    }

    if (description.length > 8000) {
      toast({
        title: "Description too long",
        description: "Please keep your description under 8000 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await invokeAuthedFunction<{ success?: boolean; ideas?: any[]; error?: string }>("normalize-imported-idea", {
        body: { 
          title: title.trim() || undefined, 
          description: description.trim() 
        },
      });

      if (error) {
        // Handle specific error codes
        const errorMessage = error.message || "Unknown error";

        if (errorMessage.includes("401") || errorMessage.includes("token") || errorMessage.includes("session")) {
          toast({
            title: "Session expired",
            description: "Please sign in again.",
            variant: "destructive",
          });
          return;
        }
          toast({
            title: "Session expired",
            description: "Please sign in again.",
            variant: "destructive",
          });
          return;
        }

        if (errorMessage.includes("429")) {
          toast({
            title: "AI is busy",
            description: "Too many requests. Please try again in a moment.",
            variant: "destructive",
          });
          return;
        }

        if (errorMessage.includes("402") || errorMessage.includes("Payment")) {
          toast({
            title: "AI credits exhausted",
            description: "Please add more credits to continue.",
            variant: "destructive",
          });
          return;
        }

        throw new Error(error.message || "Failed to normalize idea");
      }

      if (!data?.success || !data?.ideas?.length) {
        throw new Error("No variants were generated");
      }

      toast({
        title: `${data.ideas.length} variants generated!`,
        description: "Pick the one that resonates most with you.",
      });

      // Reset form
      setTitle("");
      setDescription("");
      onOpenChange(false);
      
      // Call success callback with the generated ideas
      onSuccess(data.ideas);

    } catch (err: any) {
      console.error("Import idea error:", err);
      toast({
        title: "Failed to import idea",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setTitle("");
      setDescription("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import My Idea
          </DialogTitle>
          <DialogDescription>
            Describe your business idea and we'll normalize it into a structured format, 
            then generate 2–3 strong variants for you to explore.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="idea-title">Title (optional)</Label>
            <Input
              id="idea-title"
              placeholder="e.g., AI-powered invoice automation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="idea-description">
              Describe your idea <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="idea-description"
              placeholder="Tell us about your business idea. What problem does it solve? Who is it for? What makes it unique? The more detail you provide, the better we can analyze and generate variants..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              className="min-h-[150px] resize-y"
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/8000
            </p>
          </div>

          <Alert className="bg-primary/5 border-primary/20">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              We'll normalize your idea and generate <strong>2–3 distinct variants</strong>:
              <ul className="mt-1 ml-4 list-disc text-xs text-muted-foreground">
                <li>Variant A: Your original intent</li>
                <li>Variant B: Best business wedge</li>
                <li>Variant C: Adjacent niche/model</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !description.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Variants
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
