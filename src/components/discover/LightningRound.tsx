import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  LIGHTNING_ROUND_QUESTIONS,
  type LightningRoundResponse,
  type LightningRoundQuestion,
  type SelectOption,
} from "@/config/lightningRoundQuestions";

interface LightningRoundProps {
  interviewId: string;
  onComplete: (responses: LightningRoundResponse[]) => void;
}

type Direction = "forward" | "backward";

const TOTAL = LIGHTNING_ROUND_QUESTIONS.length;

export function LightningRound({ interviewId, onComplete }: LightningRoundProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, string | number | string[] | boolean>>(new Map());
  const [direction, setDirection] = useState<Direction>("forward");
  const [isAnimating, setIsAnimating] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const focusRef = useRef<HTMLButtonElement | HTMLDivElement | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefersReduced = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const animDuration = prefersReduced ? 0 : 250;

  const question = LIGHTNING_ROUND_QUESTIONS[currentIndex];

  // Initialize slider default values so Continue isn't disabled on first render
  useEffect(() => {
    if (question.inputType === "slider" && question.sliderConfig && !responses.has(question.id)) {
      const defaultVal = Math.round((question.sliderConfig.min + question.sliderConfig.max) / 2);
      setResponses((prev) => {
        const next = new Map(prev);
        next.set(question.id, defaultVal);
        return next;
      });
    }
  }, [question.id, question.inputType, question.sliderConfig]);

  const currentValue = responses.get(question.id);
  const progressPercent = ((currentIndex + (currentValue !== undefined ? 1 : 0)) / TOTAL) * 100;

  // Focus management
  useEffect(() => {
    if (!isAnimating && focusRef.current) {
      focusRef.current.focus();
    }
  }, [currentIndex, isAnimating]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isAnimating) return;
      if (e.key === "Enter") {
        if (canContinue()) advance();
      } else if (e.key === "Escape" && currentIndex > 0) {
        goBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, isAnimating, responses]);

  const canContinue = useCallback(() => {
    const val = responses.get(question.id);
    if (val === undefined || val === null) return !question.required;
    if (Array.isArray(val)) return val.length > 0 || !question.required;
    return true;
  }, [question, responses]);

  const animateTransition = useCallback(
    (dir: Direction, cb: () => void) => {
      setDirection(dir);
      setIsAnimating(true);
      setTimeout(() => {
        cb();
        setIsAnimating(false);
      }, animDuration);
    },
    [animDuration]
  );

  const advance = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (currentIndex < TOTAL - 1) {
      animateTransition("forward", () => setCurrentIndex((i) => i + 1));
    } else {
      // Complete
      setShowComplete(true);
      setTimeout(() => {
        const result: LightningRoundResponse[] = [];
        responses.forEach((value, question_id) => {
          result.push({ question_id, value });
        });
        onComplete(result);
      }, 800);
    }
  }, [currentIndex, animateTransition, responses, onComplete]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      animateTransition("backward", () => setCurrentIndex((i) => i - 1));
    }
  }, [currentIndex, animateTransition]);

  const setResponse = useCallback(
    (value: string | number | string[] | boolean) => {
      setResponses((prev) => {
        const next = new Map(prev);
        next.set(question.id, value);
        return next;
      });
    },
    [question.id]
  );

  const handleSingleSelect = useCallback(
    (value: string) => {
      setResponse(value);
      advanceTimer.current = setTimeout(() => advance(), 400);
    },
    [setResponse, advance]
  );

  const handleMultiToggle = useCallback(
    (value: string) => {
      setResponses((prev) => {
        const next = new Map(prev);
        const current = (next.get(question.id) as string[]) || [];
        const idx = current.indexOf(value);
        if (idx >= 0) {
          next.set(question.id, current.filter((v) => v !== value));
        } else {
          next.set(question.id, [...current, value]);
        }
        return next;
      });
    },
    [question.id]
  );

  const handleYesNo = useCallback(
    (value: boolean) => {
      setResponse(value);
      advanceTimer.current = setTimeout(() => advance(), 400);
    },
    [setResponse, advance]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  // ─── Completion Screen ──────────────────────────────────────────────
  if (showComplete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-scale-in">
          <div className="w-16 h-16 border-2 border-primary flex items-center justify-center">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <p className="font-display text-2xl text-foreground">All set!</p>
          <p className="text-sm text-muted-foreground font-mono tracking-wide">SAVING YOUR PREFERENCES</p>
        </div>
      </div>
    );
  }

  // ─── Card animation classes ─────────────────────────────────────────
  const enterClass = isAnimating
    ? direction === "forward"
      ? "translate-x-full opacity-0"
      : "-translate-x-full opacity-0"
    : "translate-x-0 opacity-100";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Progress bar */}
      <div className="h-1 w-full bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <button
          onClick={goBack}
          className={`p-2 -ml-2 transition-colors hover:bg-secondary min-h-[44px] min-w-[44px] flex items-center justify-center ${
            currentIndex === 0 ? "invisible" : ""
          }`}
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          {currentIndex + 1} of {TOTAL}
        </span>
        <div className="w-[44px]" />
      </div>

      {/* Question card */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-hidden">
        <div
          className={`w-full max-w-[480px] transition-all ease-out ${enterClass}`}
          style={{ transitionDuration: `${animDuration}ms` }}
        >
          {/* Question text */}
          <div className="mb-8">
            <h2 className="font-display text-2xl sm:text-3xl text-foreground leading-tight mb-2">
              {question.text}
            </h2>
            {question.subtext && (
              <p className="text-sm text-muted-foreground">{question.subtext}</p>
            )}
          </div>

          {/* Input renderer */}
          <QuestionInput
            question={question}
            value={currentValue}
            onSingleSelect={handleSingleSelect}
            onMultiToggle={handleMultiToggle}
            onSliderChange={setResponse}
            onYesNo={handleYesNo}
            focusRef={focusRef}
          />

          {/* Continue button for slider & multi_select */}
          {(question.inputType === "slider" || question.inputType === "multi_select") && (
            <div className="mt-8">
              <Button
                ref={focusRef as React.RefObject<HTMLButtonElement>}
                variant="gradient"
                className="w-full min-h-[44px]"
                onClick={advance}
                disabled={!canContinue()}
                aria-label="Continue to next question"
              >
                Continue
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component: renders the right input for each question type ────

interface QuestionInputProps {
  question: LightningRoundQuestion;
  value: string | number | string[] | boolean | undefined;
  onSingleSelect: (v: string) => void;
  onMultiToggle: (v: string) => void;
  onSliderChange: (v: number) => void;
  onYesNo: (v: boolean) => void;
  focusRef: React.MutableRefObject<HTMLButtonElement | HTMLDivElement | null>;
}

function QuestionInput({
  question,
  value,
  onSingleSelect,
  onMultiToggle,
  onSliderChange,
  onYesNo,
  focusRef,
}: QuestionInputProps) {
  switch (question.inputType) {
    case "slider":
      return (
        <SliderInput
          config={question.sliderConfig!}
          value={value as number | undefined}
          onChange={onSliderChange}
          focusRef={focusRef}
        />
      );

    case "single_select":
    case "range_select":
      return (
        <SelectList
          options={question.options!}
          selected={value as string | undefined}
          onSelect={onSingleSelect}
          multi={false}
          focusRef={focusRef}
        />
      );

    case "multi_select":
      return (
        <SelectList
          options={question.options!}
          selected={value as string[] | undefined}
          onSelect={onMultiToggle}
          multi
          focusRef={focusRef}
        />
      );

    case "yes_no":
      return (
        <div className="grid grid-cols-2 gap-3">
          {[true, false].map((v) => {
            const isSelected = value === v;
            return (
              <button
                key={String(v)}
                ref={v === true ? (focusRef as React.RefObject<HTMLButtonElement>) : undefined}
                onClick={() => onYesNo(v)}
                className={`min-h-[80px] border transition-all duration-150 text-lg font-display ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary shadow-[0_0_20px_hsl(43_52%_54%/0.15)]"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                }`}
                aria-label={v ? "Yes" : "No"}
                aria-pressed={isSelected}
              >
                {v ? "Yes" : "No"}
              </button>
            );
          })}
        </div>
      );

    default:
      return null;
  }
}

// ─── Slider ───────────────────────────────────────────────────────────

function SliderInput({
  config,
  value,
  onChange,
  focusRef,
}: {
  config: NonNullable<LightningRoundQuestion["sliderConfig"]>;
  value: number | undefined;
  onChange: (v: number) => void;
  focusRef: React.MutableRefObject<HTMLButtonElement | HTMLDivElement | null>;
}) {
  const current = value ?? Math.round((config.min + config.max) / 2);
  const labelEntries = Object.entries(config.labels).map(([k, v]) => [Number(k), v] as const);

  // Find closest label
  const closestLabel = labelEntries.reduce((closest, [threshold]) => {
    return Math.abs(current - threshold) < Math.abs(current - closest) ? threshold : closest;
  }, labelEntries[0][0]);

  return (
    <div ref={focusRef as React.RefObject<HTMLDivElement>} tabIndex={-1} className="outline-none">
      {/* Current value display */}
      <div className="text-center mb-6">
        <span className="font-display text-5xl text-primary">{current}</span>
        {config.unit && (
          <span className="text-lg text-muted-foreground ml-2">{config.unit}</span>
        )}
      </div>

      {/* Slider */}
      <Slider
        min={config.min}
        max={config.max}
        step={config.step}
        value={[current]}
        onValueChange={([v]) => onChange(v)}
        className="mb-4"
        aria-label={`Select value between ${config.min} and ${config.max}`}
      />

      {/* Labels */}
      <div className="flex justify-between text-xs text-muted-foreground font-mono mt-2">
        {labelEntries.map(([threshold, label]) => (
          <span
            key={threshold}
            className={`transition-colors duration-150 ${
              threshold === closestLabel ? "text-primary" : ""
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Select List (single + multi) ────────────────────────────────────

function SelectList({
  options,
  selected,
  onSelect,
  multi,
  focusRef,
}: {
  options: SelectOption[];
  selected: string | string[] | undefined;
  onSelect: (v: string) => void;
  multi: boolean;
  focusRef: React.MutableRefObject<HTMLButtonElement | HTMLDivElement | null>;
}) {
  const isSelected = (val: string) => {
    if (multi) return Array.isArray(selected) && selected.includes(val);
    return selected === val;
  };

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt, i) => {
        const active = isSelected(opt.value);
        return (
          <button
            key={opt.value}
            ref={i === 0 ? (focusRef as React.RefObject<HTMLButtonElement>) : undefined}
            onClick={() => onSelect(opt.value)}
            className={`flex items-center gap-3 w-full min-h-[52px] px-4 py-3 border text-left transition-all duration-150 ${
              active
                ? "border-primary bg-primary/10 shadow-[0_0_20px_hsl(43_52%_54%/0.12)]"
                : "border-border bg-card hover:border-primary/40"
            }`}
            aria-label={opt.label}
            aria-pressed={active}
          >
            {opt.emoji && <span className="text-xl flex-shrink-0">{opt.emoji}</span>}
            <span className="text-sm text-foreground flex-1">{opt.label}</span>
            {multi && active && (
              <Check className="w-4 h-4 text-primary flex-shrink-0 animate-scale-in" />
            )}
          </button>
        );
      })}
    </div>
  );
}
