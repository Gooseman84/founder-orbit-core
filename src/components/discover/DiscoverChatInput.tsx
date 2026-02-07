// src/components/discover/DiscoverChatInput.tsx
import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceInputButton } from "@/components/ui/VoiceInputButton";
import { cn } from "@/lib/utils";

interface DiscoverChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function DiscoverChatInput({ onSend, disabled }: DiscoverChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (!message.trim() || disabled) return;
    onSend(message.trim());
    setMessage("");
    // Reset height after clearing
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceTranscript = (text: string) => {
    if (!text.trim()) return;
    const separator = message.trim() ? " " : "";
    setMessage((prev) => prev + separator + text.trim());
  };

  return (
    <div className="flex items-end gap-2">
      {/* Voice Input Button */}
      <VoiceInputButton
        onTranscript={handleVoiceTranscript}
        disabled={disabled}
        size="default"
        className="h-11 w-11 min-w-[44px]"
      />

      {/* Text Input */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your answer..."
          disabled={disabled}
          rows={1}
          className={cn(
            "w-full resize-none rounded-xl border border-input bg-background px-4 py-3 pr-12",
            "text-base placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "min-h-[44px] max-h-[120px]"
          )}
          aria-label="Type your answer"
        />
      </div>

      {/* Send Button */}
      <Button
        onClick={handleSubmit}
        disabled={disabled || !message.trim()}
        size="icon"
        className="h-11 w-11 min-w-[44px] rounded-xl shrink-0"
        aria-label="Send message"
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  );
}
