import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Venture } from "@/types/venture";
import { toast } from "sonner";

interface ShareVentureButtonProps {
  venture: Venture;
}

export function ShareVentureButton({ venture }: ShareVentureButtonProps) {
  const [copied, setCopied] = useState(false);

  const generateShareText = () => {
    const lines = [
      `🔥 Building: ${venture.name || "My Venture"}`,
      "",
      venture.success_metric ? `🎯 Goal: ${venture.success_metric}` : "",
      venture.commitment_window_days ? `⏱️ ${venture.commitment_window_days}-day sprint` : "",
      "",
      "Powered by TrueBlazer.AI — Your AI Co-Founder",
      "https://trueblazer.ai",
    ];
    return lines.filter(Boolean).join("\n");
  };

  const handleShare = async () => {
    const text = generateShareText();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Building: ${venture.idea_title || "My Venture"}`,
          text,
        });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Venture summary copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
      {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      {copied ? "Copied!" : "Share"}
    </Button>
  );
}
