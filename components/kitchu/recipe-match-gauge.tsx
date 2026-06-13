"use client";

import { useId } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type RecipeMatchGaugeProps = {
  percent: number;
  size?: number;
  className?: string;
  compact?: boolean;
  framed?: boolean;
};

type MatchGaugeTheme = {
  gradientFrom: string;
  gradientTo: string;
};

function matchGaugeTheme(percent: number): MatchGaugeTheme {
  const value = Math.min(100, Math.max(0, percent));

  if (value >= 75) {
    return {
      gradientFrom: "var(--primary)",
      gradientTo: "oklch(0.72 0.12 145)",
    };
  }

  if (value >= 50) {
    return {
      gradientFrom: "oklch(0.62 0.14 155)",
      gradientTo: "oklch(0.74 0.11 145)",
    };
  }

  if (value >= 25) {
    return {
      gradientFrom: "oklch(0.72 0.14 75)",
      gradientTo: "oklch(0.8 0.12 85)",
    };
  }

  return {
    gradientFrom: "oklch(0.62 0.18 25)",
    gradientTo: "oklch(0.72 0.14 35)",
  };
}

export function RecipeMatchGauge({
  percent,
  size,
  className,
  compact = false,
  framed = false,
}: RecipeMatchGaugeProps) {
  const gradientId = useId();
  const gaugeSize = size ?? (compact ? 56 : 72);
  const strokeWidth = gaugeSize <= 44 ? 3 : compact ? 3.5 : 4;
  const radius = (gaugeSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clampedPercent / 100) * circumference;
  const center = gaugeSize / 2;
  const displayPercent = Math.round(clampedPercent);
  const theme = matchGaugeTheme(clampedPercent);
  const showPercentSign = gaugeSize > 44;
  const displayTextClass =
    gaugeSize <= 44 ? "text-[11px]" : gaugeSize <= 56 ? "text-base" : "text-lg";
  const shellPadding = framed ? (gaugeSize <= 44 ? 3 : 4) : compact ? 2 : 0;
  const outerSize = gaugeSize + shellPadding * 2;

  const gauge = (
    <div
      className={cn(
        "relative isolate flex shrink-0 items-center justify-center overflow-hidden",
        framed &&
          cn(
            "rounded-full border border-white/50 bg-white/20 shadow-[0_8px_24px_-4px_oklch(0_0_0/28%)] backdrop-blur-2xl backdrop-saturate-150",
            "ring-1 ring-inset ring-white/30",
            "dark:border-white/20 dark:bg-white/10 dark:shadow-[0_8px_24px_-4px_oklch(0_0_0/55%)] dark:ring-white/15",
          ),
        compact &&
          !framed &&
          cn(
            "rounded-full border border-border/50 bg-card/75 shadow-sm backdrop-blur-md backdrop-saturate-125",
            "ring-1 ring-inset ring-white/20 dark:ring-white/10",
          ),
        className,
      )}
      style={{ width: outerSize, height: outerSize, padding: shellPadding || undefined }}
      role="img"
      aria-label={`Match stock : ${displayPercent} %`}
    >
      {framed && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/55 via-white/15 to-white/5 dark:from-white/20 dark:via-white/5 dark:to-transparent"
        />
      )}
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
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={theme.gradientFrom} />
              <stop offset="100%" stopColor={theme.gradientTo} />
            </linearGradient>
          </defs>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className={framed ? "text-white/25 dark:text-white/15" : "text-foreground/10 dark:text-foreground/20"}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center font-semibold tabular-nums leading-none tracking-tight",
            framed ? "text-foreground drop-shadow-[0_1px_1px_oklch(1_0_0/35%)]" : "text-foreground",
            displayTextClass,
          )}
        >
          {displayPercent}
          {showPercentSign && (
            <span className="ml-px text-[0.58em] font-medium text-muted-foreground">%</span>
          )}
        </span>
      </div>
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>{gauge}</TooltipTrigger>
      <TooltipContent>Match stock : {displayPercent} %</TooltipContent>
    </Tooltip>
  );
}
