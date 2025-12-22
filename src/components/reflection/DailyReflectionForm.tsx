import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextareaWithVoice } from "@/components/ui/textarea-with-voice";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";

const MOOD_OPTIONS = [
  "Motivated", "Focused", "Anxious", "Tired", "Energized", 
  "Overwhelmed", "Calm", "Frustrated", "Hopeful", "Uncertain"
];

interface DailyReflectionFormProps {
  onSubmit: (data: {
    energy_level: number;
    stress_level: number;
    mood_tags: string[];
    what_did: string;
    what_learned: string;
    what_felt: string;
    top_priority: string;
    blockers: string;
  }) => void;
  isLoading: boolean;
  initialValues?: {
    energy_level?: number;
    stress_level?: number;
    mood_tags?: string[];
    what_did?: string;
    what_learned?: string;
    what_felt?: string;
    top_priority?: string;
    blockers?: string;
  };
}

export function DailyReflectionForm({ onSubmit, isLoading, initialValues }: DailyReflectionFormProps) {
  const [energyLevel, setEnergyLevel] = useState(initialValues?.energy_level ?? 3);
  const [stressLevel, setStressLevel] = useState(initialValues?.stress_level ?? 3);
  const [moodTags, setMoodTags] = useState<string[]>(initialValues?.mood_tags ?? []);
  const [whatDid, setWhatDid] = useState(initialValues?.what_did ?? "");
  const [whatLearned, setWhatLearned] = useState(initialValues?.what_learned ?? "");
  const [whatFelt, setWhatFelt] = useState(initialValues?.what_felt ?? "");
  const [topPriority, setTopPriority] = useState(initialValues?.top_priority ?? "");
  const [blockers, setBlockers] = useState(initialValues?.blockers ?? "");

  // Update form when initialValues change (e.g., after fetching existing reflection)
  useEffect(() => {
    if (initialValues) {
      setEnergyLevel(initialValues.energy_level ?? 3);
      setStressLevel(initialValues.stress_level ?? 3);
      setMoodTags(initialValues.mood_tags ?? []);
      setWhatDid(initialValues.what_did ?? "");
      setWhatLearned(initialValues.what_learned ?? "");
      setWhatFelt(initialValues.what_felt ?? "");
      setTopPriority(initialValues.top_priority ?? "");
      setBlockers(initialValues.blockers ?? "");
    }
  }, [initialValues]);

  const toggleMoodTag = (tag: string) => {
    setMoodTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      energy_level: energyLevel,
      stress_level: stressLevel,
      mood_tags: moodTags,
      what_did: whatDid,
      what_learned: whatLearned,
      what_felt: whatFelt,
      top_priority: topPriority,
      blockers: blockers,
    });
  };

  const getEnergyLabel = (value: number) => {
    const labels = ["Very Low", "Low", "Moderate", "High", "Very High"];
    return labels[value - 1] || "Moderate";
  };

  const getStressLabel = (value: number) => {
    const labels = ["Minimal", "Low", "Moderate", "High", "Overwhelming"];
    return labels[value - 1] || "Moderate";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Daily Pulse & Check-In
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Energy & Stress Sliders */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Energy Level</label>
                <span className="text-sm text-muted-foreground">{getEnergyLabel(energyLevel)}</span>
              </div>
              <Slider
                value={[energyLevel]}
                onValueChange={([v]) => setEnergyLevel(v)}
                min={1}
                max={5}
                step={1}
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Stress Level</label>
                <span className="text-sm text-muted-foreground">{getStressLabel(stressLevel)}</span>
              </div>
              <Slider
                value={[stressLevel]}
                onValueChange={([v]) => setStressLevel(v)}
                min={1}
                max={5}
                step={1}
              />
            </div>
          </div>

          {/* Mood Tags */}
          <div className="space-y-3">
            <label className="text-sm font-medium">How are you feeling? (select all that apply)</label>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map(mood => (
                <Badge
                  key={mood}
                  variant={moodTags.includes(mood) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleMoodTag(mood)}
                >
                  {mood}
                </Badge>
              ))}
            </div>
          </div>

          {/* Reflection Questions */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">What did you accomplish today?</label>
              <TextareaWithVoice
                value={whatDid}
                onChange={(e) => setWhatDid(e.target.value)}
                placeholder="List your wins, no matter how small..."
                rows={2}
                disabled={isLoading}
                voiceDisabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">What did you learn?</label>
              <TextareaWithVoice
                value={whatLearned}
                onChange={(e) => setWhatLearned(e.target.value)}
                placeholder="Any insights, skills, or realizations..."
                rows={2}
                disabled={isLoading}
                voiceDisabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">How did you feel about your progress?</label>
              <TextareaWithVoice
                value={whatFelt}
                onChange={(e) => setWhatFelt(e.target.value)}
                placeholder="Be honest about your emotional state..."
                rows={2}
                disabled={isLoading}
                voiceDisabled={isLoading}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Top priority for tomorrow?</label>
                <TextareaWithVoice
                  value={topPriority}
                  onChange={(e) => setTopPriority(e.target.value)}
                  placeholder="The one thing that matters most..."
                  rows={2}
                  disabled={isLoading}
                  voiceDisabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Any blockers or challenges?</label>
                <TextareaWithVoice
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="What's in your way..."
                  rows={2}
                  disabled={isLoading}
                  voiceDisabled={isLoading}
                />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating insights...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate My Daily Reflection
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
