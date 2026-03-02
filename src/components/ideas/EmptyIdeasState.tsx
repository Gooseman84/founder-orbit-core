// src/components/ideas/EmptyIdeasState.tsx

interface EmptyIdeasStateProps {
  onGenerateIdeas: () => void;
  isGenerating: boolean;
}

export const EmptyIdeasState = ({ onGenerateIdeas, isGenerating }: EmptyIdeasStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      {/* Gold diamond */}
      <span className="text-primary text-[1.5rem] mb-5">◆</span>

      <h2 className="font-display italic text-xl text-muted-foreground mb-3">
        No ventures discovered yet
      </h2>
      <p className="text-sm font-light text-muted-foreground mb-8 max-w-md">
        Let Mavrik analyze your profile and generate personalized venture ideas tailored to your strengths.
      </p>

      <button
        onClick={onGenerateIdeas}
        disabled={isGenerating}
        className="bg-primary text-primary-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase px-5 py-2.5 transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isGenerating ? "GENERATING IDEAS..." : "GENERATE IDEAS FOR ME"}
      </button>

      {isGenerating && <p className="label-mono mt-4">THIS MAY TAKE 10–20 SECONDS</p>}
    </div>
  );
};
