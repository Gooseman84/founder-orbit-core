import { cn } from "@/lib/utils";
import { BusinessArchetype } from "@/types/intake";

type Props = {
  selected: BusinessArchetype[];
  onChange: (value: BusinessArchetype[]) => void;
};

const archetypeOptions: { value: BusinessArchetype; label: string; description: string }[] = [
  { value: "digital_products", label: "Digital Products", description: "Courses, templates, ebooks" },
  { value: "ai_tools", label: "AI Tools", description: "AI-powered apps & automations" },
  { value: "content_brand", label: "Content Brand", description: "Newsletter, YouTube, podcast" },
  { value: "saas", label: "SaaS", description: "Software as a Service" },
  { value: "service_agency", label: "Service Agency", description: "Done-for-you services" },
  { value: "local_business", label: "Local Business", description: "Brick & mortar or local services" },
  { value: "ecommerce", label: "E-commerce", description: "Physical or digital goods store" },
  { value: "licensing", label: "Licensing", description: "License IP, frameworks, or content" },
  { value: "coaching_consulting", label: "Coaching / Consulting", description: "1:1 or group coaching" },
  { value: "buying_businesses", label: "Buying Businesses", description: "Acquire & grow existing businesses" },
];

export function ArchetypesStep({ selected, onChange }: Props) {
  const toggleArchetype = (archetype: BusinessArchetype) => {
    if (selected.includes(archetype)) {
      onChange(selected.filter((a) => a !== archetype));
    } else {
      onChange([...selected, archetype]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Business Archetypes</h2>
        <p className="text-muted-foreground">
          Select all business models that interest you. Choose as many as you like.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {archetypeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleArchetype(option.value)}
            className={cn(
              "p-4 rounded-lg border-2 text-left transition-all",
              "hover:border-primary/50 hover:bg-primary/5",
              selected.includes(option.value)
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            )}
          >
            <div className="font-medium">{option.label}</div>
            <div className="text-sm text-muted-foreground">{option.description}</div>
          </button>
        ))}
      </div>

      {selected.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          {selected.length} selected
        </p>
      )}
    </div>
  );
}
