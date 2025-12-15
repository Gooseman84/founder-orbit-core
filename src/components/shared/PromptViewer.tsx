import { Button } from "@/components/ui/button";
import { Copy, Check, Download, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PlatformMode } from "@/types/masterPrompt";

interface PromptViewerProps {
  prompt: string;
  filename?: string;
  platformMode?: PlatformMode;
}

const PLATFORM_HEADERS: Record<PlatformMode, string> = {
  strategy: '',
  lovable: `# TrueBlazer MVP Build Prompt for Lovable
# Paste this into Lovable to start building your product
# ---

`,
  cursor: `# TrueBlazer MVP Build Prompt for Cursor
# Use this prompt to guide your development in Cursor IDE
# ---

`,
  v0: `# TrueBlazer UI Prompt for v0.dev
# Paste this into v0 to generate your UI components
# ---

`,
};

const PLATFORM_COPY_LABELS: Record<PlatformMode, string> = {
  strategy: 'Copy',
  lovable: 'Copy for Lovable',
  cursor: 'Copy for Cursor',
  v0: 'Copy for v0',
};

export function PromptViewer({ 
  prompt, 
  filename = "north-star-prompt",
  platformMode = 'strategy'
}: PromptViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Add platform-specific header for builder modes
      const header = PLATFORM_HEADERS[platformMode] || '';
      const textToCopy = header + prompt;
      
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownload = () => {
    try {
      const header = PLATFORM_HEADERS[platformMode] || '';
      const textToDownload = header + prompt;
      
      const blob = new Blob([textToDownload], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Include platform mode in filename for builder prompts
      const modePrefix = platformMode !== 'strategy' ? `-${platformMode}` : '';
      link.download = `${filename}${modePrefix}.txt`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Downloaded successfully!");
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  const copyLabel = PLATFORM_COPY_LABELS[platformMode] || 'Copy';
  const isBuilderMode = platformMode !== 'strategy';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        {/* Platform-specific copy button for builder modes */}
        {isBuilderMode && (
          <Button
            variant="default"
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
                <Sparkles className="h-4 w-4" />
                {copyLabel}
              </>
            )}
          </Button>
        )}
        
        {/* Standard copy button */}
        {!isBuilderMode && (
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
        )}
        
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
