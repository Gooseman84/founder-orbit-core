// src/components/discover/DiscoverTypingIndicator.tsx

export function DiscoverTypingIndicator() {
  return (
    <div className="flex flex-col items-start gap-3 py-6" role="status" aria-label="Mavrik is analyzing">
      {/* Three gold dots */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-1.5 h-1.5 bg-primary"
            style={{
              animation: "mavrik-dot 1.2s ease-in-out infinite",
              animationDelay: `${i * 200}ms`,
            }}
          />
        ))}
      </div>
      <span className="label-mono">MAVRIK IS ANALYZING</span>

      <style>{`
        @keyframes mavrik-dot {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
