// ============================================================
// agent-log — Core Type Definitions
// Trace Format v1.0.0
// ============================================================

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export const LOG_LEVEL_VALUE: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

// -----------------------------------------------------------
// Event Types
// -----------------------------------------------------------

export type EventType =
  | 'agent.start'
  | 'agent.step'
  | 'agent.handoff'
  | 'agent.error'
  | 'agent.end'
  | 'llm.call'
  | 'tool.call'
  | (string & {});

// -----------------------------------------------------------
// Event Payloads
// -----------------------------------------------------------

export interface AgentStartData {
  input?: unknown;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AgentStepData {
  step?: 'reasoning' | 'planning' | 'reflection' | (string & {});
  content?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LlmCallData {
  model: string;
  provider?: string;
  prompt?: unknown;
  response?: unknown;
  tokens?: {
    input?: number;
    output?: number;
    total?: number;
  };
  durationMs?: number;
  cost?: number;
  temperature?: number;
  stopReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | (string & {});
  [key: string]: unknown;
}

export interface ToolCallData {
  name: string;
  input?: unknown;
  output?: unknown;
  durationMs?: number;
  success?: boolean;
  error?: string | null;
  [key: string]: unknown;
}

export interface AgentHandoffData {
  from: string;
  to: string;
  payload?: unknown;
  [key: string]: unknown;
}

export interface AgentErrorData {
  message: string;
  code?: string;
  stack?: string;
  retrying?: boolean;
  attempt?: number;
  [key: string]: unknown;
}

export interface AgentEndData {
  output?: unknown;
  durationMs?: number;
  success?: boolean;
  summary?: string;
  [key: string]: unknown;
}

// -----------------------------------------------------------
// Trace Event Envelope
// -----------------------------------------------------------

export interface TraceEvent {
  seq: number;
  type: EventType;
  ts: string;      // ISO8601
  elapsed: number; // ms since run start
  agent: string;
  level: LogLevel;
  data: Record<string, unknown>;
  parentSeq?: number;
  spanId?: string;
}

// -----------------------------------------------------------
// Trace File (root)
// -----------------------------------------------------------

export interface AgentTrace {
  version: '1.0.0';
  runId: string;
  agent: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  events: TraceEvent[];
  meta?: Record<string, unknown>;
}

// -----------------------------------------------------------
// Logger Options
// -----------------------------------------------------------

export interface AgentLoggerOptions {
  /** Unique run ID. Auto-generated if omitted. */
  runId?: string;
  /** Agent name label */
  agent?: string;
  /** Output file path, or false to disable file output */
  outputFile?: string | false;
  /** Pretty-print to terminal (default: true in TTY) */
  pretty?: boolean;
  /** Minimum level to emit (default: 'trace') */
  level?: LogLevel;
  /** Append to existing trace file instead of overwriting */
  append?: boolean;
  /** Optional run-level metadata */
  meta?: Record<string, unknown>;
}
