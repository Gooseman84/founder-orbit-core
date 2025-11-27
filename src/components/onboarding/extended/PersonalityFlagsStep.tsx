import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PersonalityFlags } from "@/types/intake";

type Props = {
  flags: PersonalityFlags;
  onChange: (flags: PersonalityFlags) => void;
};

const flagOptions: { key: keyof PersonalityFlags; label: string; description: string }[] = [
  { 
    key: "wants_autopilot", 
    label: "I want an autopilot business", 
    description: "Minimal day-to-day involvement once it's running" 
  },
  { 
    key: "wants_to_be_face", 
    label: "I want to be the face of my brand", 
    description: "Comfortable being visible and building a personal brand" 
  },
  { 
    key: "wants_predictable_income", 
    label: "I need predictable income", 
    description: "Recurring revenue and stability over big swings" 
  },
  { 
    key: "thrives_under_pressure", 
    label: "I thrive under pressure", 
    description: "Deadlines and challenges motivate me" 
  },
  { 
    key: "prefers_structure", 
    label: "I prefer structure over chaos", 
    description: "Clear processes and systems make me productive" 
  },
  { 
    key: "loves_experimenting", 
    label: "I love experimenting", 
    description: "Trying new things and pivoting excites me" 
  },
];

export function PersonalityFlagsStep({ flags, onChange }: Props) {
  const toggleFlag = (key: keyof PersonalityFlags) => {
    onChange({
      ...flags,
      [key]: !flags[key],
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Personality & Preferences</h2>
        <p className="text-muted-foreground">
          These help us understand how you like to work. Toggle the ones that resonate with you.
        </p>
      </div>

      <div className="space-y-4">
        {flagOptions.map((option) => (
          <div
            key={option.key}
            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="space-y-0.5 flex-1 pr-4">
              <Label htmlFor={option.key} className="text-base font-medium cursor-pointer">
                {option.label}
              </Label>
              <p className="text-sm text-muted-foreground">
                {option.description}
              </p>
            </div>
            <Switch
              id={option.key}
              checked={flags[option.key] || false}
              onCheckedChange={() => toggleFlag(option.key)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
