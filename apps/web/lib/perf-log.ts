type PerfDetails = Record<string, string | number | boolean | null | undefined>;

const PERF_PREFIX = "[kitchu:perf]";

export function isPerfLogEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.KITCHU_PERF_LOG === "1";
}

function slowThresholdMs() {
  const parsed = Number(process.env.KITCHU_PERF_SLOW_MS ?? "300");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
}

function formatDetails(details?: PerfDetails) {
  if (!details) return "";
  const parts = Object.entries(details)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`);
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

export function perfLog(scope: string, event: string, details?: PerfDetails) {
  if (!isPerfLogEnabled()) return;
  console.info(`${PERF_PREFIX} scope=${scope} event=${event}${formatDetails(details)}`);
}

export function perfLogSlow(scope: string, event: string, durationMs: number, details?: PerfDetails) {
  if (!isPerfLogEnabled() && durationMs < slowThresholdMs()) return;
  if (durationMs < slowThresholdMs()) return;
  console.warn(
    `${PERF_PREFIX} scope=${scope} event=${event} durationMs=${Math.round(durationMs)} slow=1${formatDetails(details)}`,
  );
}

export async function measurePerf<T>(
  scope: string,
  step: string,
  run: () => Promise<T>,
  details?: PerfDetails,
): Promise<T> {
  const startedAt = performance.now();
  try {
    return await run();
  } finally {
    const durationMs = performance.now() - startedAt;
    perfLog(scope, step, { durationMs: Math.round(durationMs), ...details });
    perfLogSlow(scope, step, durationMs, details);
  }
}

export function createPerfTimer(scope: string, details?: PerfDetails) {
  const startedAt = performance.now();

  return {
    step(step: string, stepDetails?: PerfDetails) {
      perfLog(scope, step, stepDetails);
    },
    end(event = "done", endDetails?: PerfDetails) {
      const durationMs = performance.now() - startedAt;
      perfLog(scope, event, { durationMs: Math.round(durationMs), ...details, ...endDetails });
      perfLogSlow(scope, event, durationMs, { ...details, ...endDetails });
    },
  };
}

export function summarizeSqlQuery(query: string, maxLength = 220) {
  const normalized = query.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}…`;
}
