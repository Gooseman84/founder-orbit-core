import * as React from "react";
import logoPng from "@/assets/trueblazer-logo.png";

type BrandLogoProps = {
  /** Controls rendered height; width auto-scales. */
  height?: number;
  /** Adds optional className for layout tweaks. */
  className?: string;
  /** If true, hides the text for screen readers. */
  decorative?: boolean;
};

export function BrandLogo({
  height = 32,
  className,
  decorative = false,
}: BrandLogoProps) {
  return (
    <img
      src={logoPng}
      alt={decorative ? "" : "TrueBlazer.AI"}
      aria-hidden={decorative ? true : undefined}
      height={height}
      className={className}
      style={{
        height,
        width: "auto",
        display: "block",
      }}
      draggable={false}
      loading="eager"
    />
  );
}
