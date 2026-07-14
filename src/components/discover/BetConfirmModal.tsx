// src/components/discover/BetConfirmModal.tsx
// The Bet — final commercial confirmation before Money Path commitment.
// Proposes offer_title / buyer_segment / delivery_format / price from the
// AI recommendation; founder can edit price and delivery format before
// the value is persisted through commit_money_path.

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Rocket } from "lucide-react";
import type { Recommendation } from "@/types/recommendation";

export interface BetConfirmValues {
  priceCents: number;
  deliveryFormat: string;
}

interface Props {
  open: boolean;
  recommendation: Recommendation | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: (values: BetConfirmValues) => void;
}

const DEFAULT_PRICE_USD = 500;
const DEFAULT_DELIVERY = "Structured deliverable + async review";

export function BetConfirmModal({ open, recommendation, isSubmitting, onCancel, onConfirm }: Props) {
  const initialPrice = useMemo(() => {
    const p = recommendation?.proposedPriceUsd;
    return typeof p === "number" && Number.isFinite(p) && p > 0 ? Math.round(p) : DEFAULT_PRICE_USD;
  }, [recommendation]);
  const initialDelivery = useMemo(() => {
    const d = recommendation?.proposedDeliveryFormat;
    return typeof d === "string" && d.trim().length > 0 ? d.trim() : DEFAULT_DELIVERY;
  }, [recommendation]);

  const [priceUsd, setPriceUsd] = useState<string>(String(initialPrice));
  const [deliveryFormat, setDeliveryFormat] = useState<string>(initialDelivery);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPriceUsd(String(initialPrice));
      setDeliveryFormat(initialDelivery);
      setError(null);
    }
  }, [open, initialPrice, initialDelivery]);

  if (!recommendation) return null;

  const priceNum = Number(priceUsd);
  const priceValid = Number.isFinite(priceNum) && priceNum > 0 && priceNum <= 1_000_000;
  const deliveryValid = deliveryFormat.trim().length > 0 && deliveryFormat.trim().length <= 240;
  const canSubmit = priceValid && deliveryValid && !isSubmitting;

  const unitsToTenK = priceValid ? Math.max(1, Math.ceil(10_000 / priceNum)) : null;

  const handleSubmit = () => {
    if (!priceValid) return setError("Enter a price between $1 and $1,000,000.");
    if (!deliveryValid) return setError("Describe how the offer is delivered.");
    setError(null);
    onConfirm({
      priceCents: Math.round(priceNum * 100),
      deliveryFormat: deliveryFormat.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isSubmitting) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="eyebrow text-primary">The Bet</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1">
            <h2 className="font-display text-2xl leading-tight">{recommendation.name}</h2>
            <p className="text-sm text-muted-foreground">{recommendation.oneLiner}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 text-sm">
            <Field label="For">{recommendation.targetCustomer}</Field>
            <Field label="What they get">{recommendation.oneLiner}</Field>

            <div>
              <Label htmlFor="bet-delivery" className="label-mono text-xs">Delivered as</Label>
              <Input
                id="bet-delivery"
                value={deliveryFormat}
                onChange={(e) => setDeliveryFormat(e.target.value)}
                placeholder="e.g. Structured audit + 60-min findings review"
                className="mt-1"
                maxLength={240}
              />
            </div>

            <div>
              <Label htmlFor="bet-price" className="label-mono text-xs">Price (USD)</Label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  id="bet-price"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value)}
                  className="flex-1"
                />
              </div>
              {unitsToTenK !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Revenue path: {unitsToTenK} × ${priceNum.toLocaleString()} = ${(unitsToTenK * priceNum).toLocaleString()} to hit $10K
                </p>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} className="flex-1">
              Back
            </Button>
            <Button variant="gradient" onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
              <Rocket className="h-4 w-4 mr-2" />
              {isSubmitting ? "Committing…" : "Commit to the Bet"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="label-mono text-xs text-muted-foreground">{label}</span>
      <p className="text-sm text-foreground mt-0.5">{children}</p>
    </div>
  );
}
