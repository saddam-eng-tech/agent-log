import { randomBytes } from 'node:crypto';

/** Generate a short unique run ID */
export function generateRunId(): string {
  return 'run_' + randomBytes(4).toString('hex');
}

/** Return current ISO8601 timestamp */
export function now(): string {
  return new Date().toISOString();
}

/** Elapsed ms since a start time (from Date.now()) */
export function elapsedMs(startTime: number): number {
  return Date.now() - startTime;
}

/** Clamp a string to maxLen, appending '...' if truncated */
export function truncate(str: string, maxLen = 120): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

/** Safely stringify — handles circular refs */
export function safeStringify(value: unknown, indent?: number): string {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (_, v) => {
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
      }
      return v;
    },
    indent,
  );
}

/** Format duration nicely: 4200 → "4.2s", 340 → "340ms" */
export function formatDuration(ms: number): string {
  if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
  return ms + 'ms';
}

/** Format token count: 1200 → "1.2k", 420 → "420" */
export function formatTokens(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}
