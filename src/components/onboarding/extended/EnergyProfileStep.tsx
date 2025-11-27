import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Props = {
  energyGivers: string;
  energyDrainers: string;
  onChangeGivers: (value: string) => void;
  onChangeDrainers: (value: string) => void;
};

export function EnergyProfileStep({ 
  energyGivers, 
  energyDrainers, 
  onChangeGivers, 
  onChangeDrainers 
}: Props) {
  return (
    <div className="space-y-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Energy Profile</h2>
        <p className="text-muted-foreground">
          Understanding what fuels you helps us match you with the right business model.
        </p>
      </div>

      <div className="space-y-4">
        <Label htmlFor="energy-givers" className="text-base font-medium">
          What gives you energy?
        </Label>
        <p className="text-sm text-muted-foreground">
          Activities, situations, or interactions that make you feel alive and motivated.
        </p>
        <Textarea
          id="energy-givers"
          placeholder="I feel energized when I'm..."
          value={energyGivers}
          onChange={(e) => onChangeGivers(e.target.value)}
          className="min-h-[140px] resize-none"
        />
      </div>

      <div className="space-y-4">
        <Label htmlFor="energy-drainers" className="text-base font-medium">
          What drains you?
        </Label>
        <p className="text-sm text-muted-foreground">
          Tasks, environments, or situations that leave you exhausted or unmotivated.
        </p>
        <Textarea
          id="energy-drainers"
          placeholder="I feel drained when I have to..."
          value={energyDrainers}
          onChange={(e) => onChangeDrainers(e.target.value)}
          className="min-h-[140px] resize-none"
        />
      </div>
    </div>
  );
}
