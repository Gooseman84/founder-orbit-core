// src/components/ideas/IdeaCard.tsx
import { useNavigate } from "react-router-dom";
import type { Idea } from "@/hooks/useIdeas";

interface IdeaCardProps {
  idea: Idea;
}

export const IdeaCard = ({ idea }: IdeaCardProps) => {
  const navigate = useNavigate();

  return (
    <div
      className="relative flex flex-col p-7 border border-border transition-all duration-200 cursor-pointer group hover:bg-secondary hover:border-l-2 hover:border-l-primary"
      style={{ background: "hsl(240 12% 7%)" }}
      onClick={() => navigate(`/ideas/${idea.id}`)}
    >
      {/* Title + complexity */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-[0.95rem] font-medium text-foreground leading-tight group-hover:text-primary transition-colors">
          {idea.title}
        </h3>
        {idea.complexity && (
          <span className="font-mono-tb text-[0.62rem] uppercase border px-2 py-0.5 text-muted-foreground border-border bg-transparent shrink-0">
            {idea.complexity}
          </span>
        )}
      </div>

      {idea.business_model_type && (
        <span className="badge-gold mb-3 self-start">{idea.business_model_type}</span>
      )}

      <p className="text-[0.82rem] font-light text-muted-foreground line-clamp-2 mb-3" style={{ lineHeight: "1.55" }}>
        {idea.description || "No description available"}
      </p>

      {idea.target_customer && (
        <p className="text-[0.82rem] font-light text-muted-foreground mb-1">
          <span className="text-foreground font-medium">Target:</span> {idea.target_customer}
        </p>
      )}

      {/* Score row */}
      {idea.overall_fit_score != null && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
          <span className="badge-gold">FIT: {idea.overall_fit_score}%</span>
          <div className="flex gap-2">
            {idea.passion_fit_score != null && <span className="label-mono">PASSION {idea.passion_fit_score}%</span>}
            {idea.skill_fit_score != null && <span className="label-mono">SKILL {idea.skill_fit_score}%</span>}
          </div>
        </div>
      )}
    </div>
  );
};
