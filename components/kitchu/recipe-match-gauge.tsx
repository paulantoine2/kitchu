"use client";

import { cn } from "@/lib/utils";

type RecipeMatchGaugeProps = {
  percent: number;
  size?: number;
  className?: string;
  compact?: boolean;
  framed?: boolean;
};

type MatchGaugeTheme = {
  progressClass: string;
  ringClass: string;
};

function matchGaugeTheme(percent: number): MatchGaugeTheme {
  const value = Math.min(100, Math.max(0, percent));

  if (value >= 75) {
    return {
      progressClass: "text-emerald-600 dark:text-emerald-400",
      ringClass: "ring-emerald-600/70 dark:ring-emerald-400/60",
    };
  }

  if (value >= 50) {
    return {
      progressClass: "text-lime-600 dark:text-lime-400",
      ringClass: "ring-lime-600/70 dark:ring-lime-400/60",
    };
  }

  if (value >= 25) {
    return {
      progressClass: "text-amber-600 dark:text-amber-400",
      ringClass: "ring-amber-600/70 dark:ring-amber-400/60",
    };
  }

  return {
    progressClass: "text-rose-600 dark:text-rose-400",
    ringClass: "ring-rose-600/70 dark:ring-rose-400/60",
  };
}

export function RecipeMatchGauge({
  percent,
  size,
  className,
  compact = false,
  framed = false,
}: RecipeMatchGaugeProps) {
  const gaugeSize = size ?? (compact ? 56 : 72);
  const strokeWidth = gaugeSize <= 44 ? 5 : compact ? 5 : 6;
  const radius = (gaugeSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clampedPercent / 100) * circumference;
  const center = gaugeSize / 2;
  const displayPercent = Math.round(clampedPercent);
  const theme = matchGaugeTheme(clampedPercent);
  const displayTextClass =
    gaugeSize <= 44 ? "text-xs" : gaugeSize <= 56 ? "text-lg" : "text-xl";
  const shellPadding = framed ? (gaugeSize <= 44 ? 4 : 5) : compact ? 3 : 0;
  const outerSize = gaugeSize + shellPadding * 2;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center transition-[box-shadow,colors] duration-300",
        framed
          ? cn("rounded-full bg-background shadow-md ring-2", theme.ringClass)
          : compact && "rounded-full bg-card ring-1 ring-border/80 shadow-sm",
        className,
      )}
      style={{ width: outerSize, height: outerSize, padding: shellPadding || undefined }}
      role="img"
      aria-label={`${displayPercent}%`}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: gaugeSize, height: gaugeSize }}
      >
        <svg
          width={gaugeSize}
          height={gaugeSize}
          viewBox={`0 0 ${gaugeSize} ${gaugeSize}`}
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="currentColor"
            className="text-background dark:text-card"
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-foreground/20 dark:text-foreground/30"
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(
              "transition-[stroke-dashoffset,colors] duration-500 ease-out",
              theme.progressClass,
            )}
          />
        </svg>
        <span
          className={cn(
            "absolute font-bold tabular-nums tracking-tight text-foreground",
            displayTextClass,
          )}
        >
          {displayPercent}
        </span>
      </div>
    </div>
  );
}
