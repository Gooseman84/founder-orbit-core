import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function DeepDesiresStep({ value, onChange }: Props) {
  // Split the value into two parts for the two questions
  const parts = value.split("|||");
  const dreamBusiness = parts[0] || "";
  const unspokenDream = parts[1] || "";

  const handleChange = (field: "dreamBusiness" | "unspokenDream", newValue: string) => {
    if (field === "dreamBusiness") {
      onChange(`${newValue}|||${unspokenDream}`);
    } else {
      onChange(`${dreamBusiness}|||${newValue}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Deep Desires</h2>
        <p className="text-muted-foreground">
          Let's uncover what truly drives you. Be honest—no one else will see this.
        </p>
      </div>

      <div className="space-y-4">
        <Label htmlFor="dream-business" className="text-base font-medium">
          If you weren't afraid of failing, what business would you start tomorrow?
        </Label>
        <p className="text-sm text-muted-foreground">
          Don't overthink it. What's the first thing that comes to mind?
        </p>
        <Textarea
          id="dream-business"
          placeholder="I would start a..."
          value={dreamBusiness}
          onChange={(e) => handleChange("dreamBusiness", e.target.value)}
          className="min-h-[120px] resize-none"
        />
      </div>

      <div className="space-y-4">
        <Label htmlFor="unspoken-dream" className="text-base font-medium">
          What's a dream you want but rarely say out loud?
        </Label>
        <p className="text-sm text-muted-foreground">
          The thing you think about but haven't told many people.
        </p>
        <Textarea
          id="unspoken-dream"
          placeholder="I secretly want to..."
          value={unspokenDream}
          onChange={(e) => handleChange("unspokenDream", e.target.value)}
          className="min-h-[120px] resize-none"
        />
      </div>
    </div>
  );
}
