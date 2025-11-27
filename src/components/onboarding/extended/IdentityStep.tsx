import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Props = {
  value: string;
  onChange: (value: string) => void;
  fears: string;
  onChangeFears: (value: string) => void;
};

export function IdentityStep({ value, onChange, fears, onChangeFears }: Props) {
  // Split the value into two parts for the two questions
  const parts = value.split("|||");
  const refuseToLive = parts[0] || "";
  const successReputation = parts[1] || "";

  const handleChange = (field: "refuseToLive" | "successReputation", newValue: string) => {
    if (field === "refuseToLive") {
      onChange(`${newValue}|||${successReputation}`);
    } else {
      onChange(`${refuseToLive}|||${newValue}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Identity & Bold Statements</h2>
        <p className="text-muted-foreground">
          Your vision shapes your path. Let's define what success looks like for you.
        </p>
      </div>

      <div className="space-y-4">
        <Label htmlFor="refuse-to-live" className="text-base font-medium">
          Finish the sentence: "In five years, I refuse to be living a life where ______."
        </Label>
        <p className="text-sm text-muted-foreground">
          What's the scenario you absolutely want to avoid?
        </p>
        <Textarea
          id="refuse-to-live"
          placeholder="...I'm still trading time for money at a job I hate"
          value={refuseToLive}
          onChange={(e) => handleChange("refuseToLive", e.target.value)}
          className="min-h-[120px] resize-none"
        />
      </div>

      <div className="space-y-4">
        <Label htmlFor="success-reputation" className="text-base font-medium">
          What do you want people to say about you when your business succeeds?
        </Label>
        <p className="text-sm text-muted-foreground">
          Think about the reputation and legacy you want to build.
        </p>
        <Textarea
          id="success-reputation"
          placeholder="They built something that..."
          value={successReputation}
          onChange={(e) => handleChange("successReputation", e.target.value)}
          className="min-h-[120px] resize-none"
        />
      </div>

      <div className="space-y-4">
        <Label htmlFor="fears" className="text-base font-medium">
          What fears might hold you back?
        </Label>
        <p className="text-sm text-muted-foreground">
          Acknowledging fears is the first step to overcoming them.
        </p>
        <Textarea
          id="fears"
          placeholder="I sometimes worry that..."
          value={fears}
          onChange={(e) => onChangeFears(e.target.value)}
          className="min-h-[100px] resize-none"
        />
      </div>
    </div>
  );
}
