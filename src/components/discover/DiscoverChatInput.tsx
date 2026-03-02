// src/components/discover/DiscoverChatInput.tsx
import { useState, useRef, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { VoiceInputButton } from "@/components/ui/VoiceInputButton";

interface DiscoverChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function DiscoverChatInput({ onSend, disabled }: DiscoverChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    <div className="flex items-end gap-3">
      {/* Voice Input */}
      <VoiceInputButton
        onTranscript={handleVoiceTranscript}
        disabled={disabled}
        size="default"
        className="h-12 w-12 min-w-[48px] min-h-[48px] shrink-0 border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
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
          className="w-full resize-none border border-border bg-card px-4 py-3 text-[1rem] font-light text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50 min-h-[48px] max-h-[120px]"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
          aria-label="Type your answer"
        />
      </div>

      {/* Send Button */}
      <button
        onClick={handleSubmit}
        disabled={disabled || !message.trim()}
        className="w-12 h-12 min-w-[48px] min-h-[48px] shrink-0 flex items-center justify-center bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Send message"
      >
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}
