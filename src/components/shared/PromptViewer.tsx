import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Download, Sparkles, Save, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PlatformMode } from "@/types/masterPrompt";

interface PromptViewerProps {
  prompt: string;
  filename?: string;
  platformMode?: PlatformMode;
  isEditable?: boolean;
  onSave?: (editedPrompt: string) => Promise<void>;
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
  platformMode = 'strategy',
  isEditable = true,
  onSave
}: PromptViewerProps) {
  const [copied, setCopied] = useState(false);
  const [localContent, setLocalContent] = useState(prompt);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset local content when prompt changes (e.g., on regenerate or mode switch)
  useEffect(() => {
    setLocalContent(prompt);
    setHasChanges(false);
  }, [prompt]);

  // Track if content has changed
  useEffect(() => {
    setHasChanges(localContent !== prompt);
  }, [localContent, prompt]);

  // Auto-save with debounce
  const debouncedSave = useCallback(async () => {
    if (!onSave || !hasChanges || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(localContent);
      setHasChanges(false);
      toast.success("Prompt saved");
    } catch (error) {
      toast.error("Failed to save prompt");
    } finally {
      setIsSaving(false);
    }
  }, [onSave, localContent, hasChanges, isSaving]);

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!hasChanges || !onSave) return;
    
    const timer = setTimeout(() => {
      debouncedSave();
    }, 2000);

    return () => clearTimeout(timer);
  }, [localContent, hasChanges, onSave, debouncedSave]);

  const handleCopy = async () => {
    try {
      const header = PLATFORM_HEADERS[platformMode] || '';
      const textToCopy = header + localContent;
      
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
      const textToDownload = header + localContent;
      
      const blob = new Blob([textToDownload], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
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

  const handleManualSave = async () => {
    if (!onSave || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(localContent);
      setHasChanges(false);
      toast.success("Prompt saved");
    } catch (error) {
      toast.error("Failed to save prompt");
    } finally {
      setIsSaving(false);
    }
  };

  const copyLabel = PLATFORM_COPY_LABELS[platformMode] || 'Copy';
  const isBuilderMode = platformMode !== 'strategy';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        {/* Save button - show when editable and has changes */}
        {isEditable && onSave && hasChanges && (
          <Button
            variant="default"
            size="sm"
            onClick={handleManualSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save
              </>
            )}
          </Button>
        )}

        {/* Platform-specific copy button for builder modes */}
        {isBuilderMode && (
          <Button
            variant={hasChanges ? "outline" : "default"}
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

      {isEditable ? (
        <Textarea
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
          className="min-h-[600px] font-mono text-sm bg-muted border rounded-lg p-4 resize-y"
          placeholder="Your master prompt..."
        />
      ) : (
        <div className="bg-muted border rounded-lg p-4 overflow-auto max-h-[600px]">
          <pre className="whitespace-pre-wrap font-mono text-sm text-foreground">
            <code>{localContent}</code>
          </pre>
        </div>
      )}

      {/* Status indicator */}
      {isEditable && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isSaving && (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
          {!isSaving && hasChanges && (
            <span className="text-amber-600">Unsaved changes</span>
          )}
          {!isSaving && !hasChanges && (
            <span className="text-green-600">All changes saved</span>
          )}
        </div>
      )}
    </div>
  );
}
