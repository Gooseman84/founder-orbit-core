import { Button } from "@/components/ui/button";
import { Copy, Check, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PromptViewerProps {
  prompt: string;
  filename?: string;
}

export function PromptViewer({ prompt, filename = "north-star-prompt" }: PromptViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([prompt], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.txt`;
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
    <div className="relative">
      <div className="absolute top-3 right-3 z-10 flex gap-2">
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

      <div className="bg-muted border rounded-lg p-4 overflow-auto max-h-[600px]">
        <pre className="whitespace-pre-wrap font-mono text-sm text-foreground">
          <code>{prompt}</code>
        </pre>
      </div>
    </div>
  );
}
