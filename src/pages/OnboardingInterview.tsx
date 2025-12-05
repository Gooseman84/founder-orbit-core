// src/pages/OnboardingInterview.tsx
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function OnboardingInterview() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Founder Interview | TrueBlazer.AI";
  }, []);

  return (
    <div className="max-w-3xl mx-auto py-12">
      <Card className="p-8 space-y-4">
        <h1 className="text-2xl font-semibold">Founder Interview</h1>
        <p className="text-muted-foreground">
          This is where your dynamic interview will live. In the next step, we&apos;ll turn your story and
          context into an engine for sharper ideas.
        </p>
        <p className="text-muted-foreground text-sm">
          For now, this is a placeholder screen so we can wire the onboarding flow and data model. We&apos;ll
          layer in the real conversational experience next.
        </p>
        <div className="pt-4">
          <Button variant="outline" onClick={() => navigate("/ideas")}>
            Skip to ideas for now
          </Button>
        </div>
      </Card>
    </div>
  );
}
