import type { TraceEvent } from './types.js';
import { formatDuration, formatTokens, truncate } from './utils.js';

// ANSI color codes (gracefully degrade if not supported)
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  // Event type colors
  start:   '\x1b[36m',   // cyan
  end:     '\x1b[32m',   // green
  step:    '\x1b[34m',   // blue
  llm:     '\x1b[35m',   // magenta
  tool:    '\x1b[33m',   // yellow
  handoff: '\x1b[36m',   // cyan
  error:   '\x1b[31m',   // red
  warn:    '\x1b[33m',   // yellow
  muted:   '\x1b[90m',   // gray
};

const ICONS: Record<string, string> = {
  'agent.start':   '✦',
  'agent.step':    '💭',
  'agent.handoff': '↗',
  'agent.error':   '✖',
  'agent.end':     '✔',
  'llm.call':      '🤖',
  'tool.call':     '🔧',
};

const TYPE_COLOR: Record<string, string> = {
  'agent.start':   C.start,
  'agent.step':    C.step,
  'agent.handoff': C.handoff,
  'agent.error':   C.error,
  'agent.end':     C.end,
  'llm.call':      C.llm,
  'tool.call':     C.tool,
};

const NO_COLOR = !process.stdout?.isTTY || process.env.NO_COLOR;

function color(code: string, text: string): string {
  if (NO_COLOR) return text;
  return code + text + C.reset;
}

function formatLabel(type: string): string {
  return type.split('.').pop()?.toUpperCase().padEnd(8) ?? type;
}

function formatData(event: TraceEvent): string {
  const d = event.data;
  const parts: string[] = [];

  switch (event.type) {
    case 'agent.start': {
      if (d.input != null) {
        const s = typeof d.input === 'string' ? d.input : JSON.stringify(d.input);
        parts.push(`input: ${color(C.dim, `"${truncate(s, 60)}"`)}`);
      }
      break;
    }
    case 'llm.call': {
      if (d.model) parts.push(color(C.bold, String(d.model)));
      if (d.tokens && typeof d.tokens === 'object') {
        const t = d.tokens as Record<string, number>;
        if (t.input != null && t.output != null)
          parts.push(`${formatTokens(t.input)}→${formatTokens(t.output)} tokens`);
      }
      if (d.durationMs != null) parts.push(color(C.muted, `(${formatDuration(Number(d.durationMs))})`));
      break;
    }
    case 'tool.call': {
      if (d.name) parts.push(color(C.bold, String(d.name)));
      if (d.success === true) parts.push(color(C.end, '✓'));
      if (d.success === false) parts.push(color(C.error, '✗'));
      if (d.durationMs != null) parts.push(color(C.muted, `(${formatDuration(Number(d.durationMs))})`));
      break;
    }
    case 'agent.step': {
      if (d.step) parts.push(color(C.dim, String(d.step)));
      if (d.content) parts.push(`"${truncate(String(d.content), 80)}"`);
      break;
    }
    case 'agent.handoff': {
      if (d.from && d.to) parts.push(`${d.from} → ${d.to}`);
      break;
    }
    case 'agent.error': {
      if (d.message) parts.push(color(C.error, truncate(String(d.message), 80)));
      if (d.retrying) parts.push(color(C.warn, `retrying (attempt ${d.attempt ?? '?'})`));
      break;
    }
    case 'agent.end': {
      if (d.durationMs != null) parts.push(color(C.bold, formatDuration(Number(d.durationMs))));
      if (d.success === false) parts.push(color(C.error, 'FAILED'));
      break;
    }
    default: {
      const summary = truncate(JSON.stringify(d), 100);
      parts.push(color(C.dim, summary));
    }
  }

  return parts.join('  ');
}

/**
 * Format a trace event as a pretty terminal line.
 */
export function prettyFormat(event: TraceEvent): string {
  const icon = ICONS[event.type] ?? '·';
  const typeColor = TYPE_COLOR[event.type] ?? C.reset;
  const label = formatLabel(event.type);
  const agentLabel = color(C.muted, `[${event.agent}]`);
  const details = formatData(event);
  const seq = color(C.muted, `#${String(event.seq).padStart(3, '0')}`);

  return [
    seq,
    color(typeColor, icon),
    agentLabel,
    color(typeColor + C.bold, label),
    details,
  ]
    .filter(Boolean)
    .join(' ');
}
