import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Download, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PromptViewerProps {
  promptBody: string;
  ideaTitle?: string;
}

export function PromptViewer({ promptBody, ideaTitle }: PromptViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptBody);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([promptBody], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `north-star-${ideaTitle?.toLowerCase().replace(/\s+/g, "-") || "prompt"}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Downloaded successfully!");
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Your North Star Master Prompt</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      <div className="bg-muted rounded-lg p-4 max-h-[500px] overflow-y-auto">
        <pre className="whitespace-pre-wrap font-mono text-sm text-foreground">
          {promptBody}
        </pre>
      </div>
    </Card>
  );
}
