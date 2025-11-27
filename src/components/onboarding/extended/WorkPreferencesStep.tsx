import { cn } from "@/lib/utils";
import { WorkPreference } from "@/types/intake";

type Props = {
  selected: WorkPreference[];
  onChange: (value: WorkPreference[]) => void;
};

const preferenceOptions: { value: WorkPreference; label: string; icon: string }[] = [
  { value: "talking_to_people", label: "Talking to People", icon: "💬" },
  { value: "writing", label: "Writing", icon: "✍️" },
  { value: "designing", label: "Designing", icon: "🎨" },
  { value: "problem_solving", label: "Problem Solving", icon: "🧩" },
  { value: "analyzing_data", label: "Analyzing Data", icon: "📊" },
  { value: "leading_teams", label: "Leading Teams", icon: "👥" },
  { value: "selling", label: "Selling", icon: "💰" },
  { value: "building_systems", label: "Building Systems", icon: "⚙️" },
  { value: "creative_work", label: "Creative Work", icon: "🎭" },
];

export function WorkPreferencesStep({ selected, onChange }: Props) {
  const togglePreference = (preference: WorkPreference) => {
    if (selected.includes(preference)) {
      onChange(selected.filter((p) => p !== preference));
    } else {
      onChange([...selected, preference]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Work Preferences</h2>
        <p className="text-muted-foreground">
          What type of work do you enjoy? Select all that apply.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {preferenceOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => togglePreference(option.value)}
            className={cn(
              "p-4 rounded-lg border-2 text-center transition-all",
              "hover:border-primary/50 hover:bg-primary/5",
              selected.includes(option.value)
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            )}
          >
            <div className="text-2xl mb-1">{option.icon}</div>
            <div className="text-sm font-medium">{option.label}</div>
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
