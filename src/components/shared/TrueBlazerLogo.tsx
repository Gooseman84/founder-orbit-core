interface TrueBlazerLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const TrueBlazerLogo = ({ className = "", size = "md" }: TrueBlazerLogoProps) => {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  };

  return (
    <span className={`inline-flex items-baseline font-bold select-none ${sizeClasses[size]} ${className}`} aria-label="TrueBlazer.AI">
      {/* "True" — flame orange to gold gradient */}
      <span
        className="bg-clip-text text-transparent"
        style={{ backgroundImage: 'linear-gradient(to right, #E27500, #F5A623, #FCD34D)' }}
      >
        True
      </span>
      {/* "Bla" in foreground */}
      <span className="text-foreground">Bla</span>
      {/* Stylized Z — ember slash with flame-to-gold gradient, extending below baseline */}
      <span className="inline-flex items-baseline" style={{ lineHeight: 0 }}>
        <svg
          viewBox="0 0 56 100"
          fill="none"
          className="relative"
          style={{
            width: '0.65em',
            height: '1.6em',
            marginBottom: '-0.45em',
            marginLeft: '-0.02em',
            marginRight: '-0.04em',
          }}
        >
          <defs>
            <linearGradient id="tbz-grad" x1="0.3" y1="0" x2="0.65" y2="1">
              <stop offset="0%" stopColor="#FF6A00" />
              <stop offset="45%" stopColor="#F5A623" />
              <stop offset="85%" stopColor="#FCD34D" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
          </defs>
          {/* Z body: top bar → steep diagonal → bottom bar */}
          <path
            d="M 4,6 L 50,6 L 47,16 L 22,16 L 46,54 L 10,54 L 7,64 L 40,64 L 14,17 L 8,8 Z"
            fill="url(#tbz-grad)"
          />
          {/* Ember tail: sharp descending point from bottom bar center */}
          <path
            d="M 18,64 L 36,64 L 28,78 L 26,96 L 22,78 Z"
            fill="url(#tbz-grad)"
          />
        </svg>
      </span>
      {/* "er.AI" in foreground */}
      <span className="text-foreground">er.AI</span>
    </span>
  );
};
