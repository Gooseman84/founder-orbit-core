import { cn } from "@/lib/utils";

interface TrueBlazerLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * TrueBlazer.AI Logo with ember cut on the 'z' for a modern look.
 * The 'z' has a diagonal slash through it representing fire/ember.
 */
export function TrueBlazerLogo({ className, size = "md" }: TrueBlazerLogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <span className={cn("font-bold inline-flex items-baseline", sizeClasses[size], className)}>
      <span className="text-primary">True</span>
      <span className="text-primary">Bla</span>
      {/* Custom 'z' with ember cut - diagonal slash */}
      <span className="relative text-primary">
        <span className="relative inline-block">
          z
          {/* Ember cut - diagonal line through the z */}
          <span 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent rotate-[-25deg] opacity-90"
            aria-hidden="true"
          />
          {/* Subtle glow effect on the cut */}
          <span 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[4px] bg-accent/40 rotate-[-25deg] blur-[2px]"
            aria-hidden="true"
          />
        </span>
      </span>
      <span className="text-primary">er</span>
      <span className="text-muted-foreground">.AI</span>
    </span>
  );
}

/**
 * Gradient version of the logo for marketing pages
 */
export function TrueBlazerLogoGradient({ className, size = "md" }: TrueBlazerLogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <span className={cn("font-bold inline-flex items-baseline bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent", sizeClasses[size], className)}>
      TrueBla
      {/* Custom 'z' with ember cut */}
      <span className="relative">
        <span className="relative inline-block">
          z
          {/* Ember cut line - uses a visible color since parent is transparent */}
          <span 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[2px] bg-gradient-to-r from-primary via-accent to-primary rotate-[-25deg]"
            aria-hidden="true"
          />
        </span>
      </span>
      er.AI
    </span>
  );
}
