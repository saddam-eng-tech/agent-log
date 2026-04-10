import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import type {
  AgentEndData,
  AgentErrorData,
  AgentHandoffData,
  AgentLoggerOptions,
  AgentStartData,
  AgentStepData,
  AgentTrace,
  EventType,
  LlmCallData,
  LogLevel,
  ToolCallData,
  TraceEvent,
} from './types.js';
import { LOG_LEVEL_VALUE } from './types.js';
import { elapsedMs, generateRunId, now, safeStringify } from './utils.js';
import { prettyFormat } from './pretty.js';

// -----------------------------------------------------------------------

const DEFAULT_OUTPUT_FILE = '.agent-trace.json';

export class AgentLogger {
  private readonly runId: string;
  private readonly agentName: string;
  private readonly outputFile: string | false;
  private readonly pretty: boolean;
  private readonly minLevel: number;
  private readonly startedAt: string;
  private readonly startTime: number;
  private readonly meta: Record<string, unknown> | undefined;

  private seq = 0;
  private events: TraceEvent[] = [];

  constructor(options: AgentLoggerOptions = {}) {
    this.runId = options.runId ?? generateRunId();
    this.agentName = options.agent ?? 'agent';
    this.outputFile = options.outputFile !== undefined ? options.outputFile : DEFAULT_OUTPUT_FILE;
    this.pretty = options.pretty !== undefined ? options.pretty : Boolean(process.stdout?.isTTY);
    this.minLevel = LOG_LEVEL_VALUE[options.level ?? 'trace'];
    this.startedAt = now();
    this.startTime = Date.now();
    this.meta = options.meta;

    // If outputFile exists and append is true, load existing events
    if (
      options.append &&
      typeof this.outputFile === 'string' &&
      existsSync(this.outputFile)
    ) {
      try {
        const existing: AgentTrace = JSON.parse(readFileSync(this.outputFile, 'utf-8'));
        this.events = existing.events ?? [];
        this.seq = this.events.length;
      } catch {
        // ignore parse errors — start fresh
      }
    }
  }

  // -----------------------------------------------------------------
  // Core emit
  // -----------------------------------------------------------------

  private emit(
    type: EventType,
    data: Record<string, unknown>,
    level: LogLevel = 'info',
    agentOverride?: string,
  ): TraceEvent {
    if (LOG_LEVEL_VALUE[level] < this.minLevel) {
      // Return a stub event — not stored or printed
      return { seq: -1, type, ts: now(), elapsed: 0, agent: agentOverride ?? this.agentName, level, data };
    }

    const event: TraceEvent = {
      seq: ++this.seq,
      type,
      ts: now(),
      elapsed: elapsedMs(this.startTime),
      agent: agentOverride ?? this.agentName,
      level,
      data,
    };

    this.events.push(event);

    if (this.pretty) {
      console.log(prettyFormat(event));
    }

    this._flushFile();
    return event;
  }

  // -----------------------------------------------------------------
  // Typed methods
  // -----------------------------------------------------------------

  start(data: AgentStartData = {}, agent?: string): TraceEvent {
    return this.emit('agent.start', data as Record<string, unknown>, 'info', agent);
  }

  step(data: AgentStepData, level: LogLevel = 'debug', agent?: string): TraceEvent {
    return this.emit('agent.step', data as Record<string, unknown>, level, agent);
  }

  llm(data: LlmCallData, level: LogLevel = 'info', agent?: string): TraceEvent {
    return this.emit('llm.call', data as Record<string, unknown>, level, agent);
  }

  tool(data: ToolCallData, level: LogLevel = 'info', agent?: string): TraceEvent {
    return this.emit('tool.call', data as Record<string, unknown>, level, agent);
  }

  handoff(data: AgentHandoffData, agent?: string): TraceEvent {
    return this.emit('agent.handoff', data as Record<string, unknown>, 'info', agent);
  }

  error(data: AgentErrorData, agent?: string): TraceEvent {
    return this.emit('agent.error', data as Record<string, unknown>, 'error', agent);
  }

  end(data: AgentEndData = {}, agent?: string): TraceEvent {
    const durationMs = elapsedMs(this.startTime);
    return this.emit(
      'agent.end',
      { durationMs, success: true, ...data } as Record<string, unknown>,
      'info',
      agent,
    );
  }

  /** Emit a custom-typed event */
  custom(type: string, data: Record<string, unknown>, level: LogLevel = 'info', agent?: string): TraceEvent {
    return this.emit(type, data, level, agent);
  }

  // -----------------------------------------------------------------
  // Trace snapshot / export
  // -----------------------------------------------------------------

  /** Get the current trace as an AgentTrace object */
  getTrace(): AgentTrace {
    return {
      version: '1.0.0',
      runId: this.runId,
      agent: this.agentName,
      startedAt: this.startedAt,
      events: [...this.events],
      ...(this.meta ? { meta: this.meta } : {}),
    };
  }

  /** Get all emitted events */
  getEvents(): TraceEvent[] {
    return [...this.events];
  }

  // -----------------------------------------------------------------
  // File I/O
  // -----------------------------------------------------------------

  private _flushFile(): void {
    if (!this.outputFile) return;
    try {
      const trace = this.getTrace();
      writeFileSync(this.outputFile, safeStringify(trace, 2), 'utf-8');
    } catch (err) {
      // Non-fatal — log to stderr
      process.stderr.write(`[agent-log] Failed to write trace: ${err}\n`);
    }
  }

  /** Finalise the trace file with endedAt and durationMs */
  flush(): void {
    if (!this.outputFile) return;
    try {
      const durationMs = elapsedMs(this.startTime);
      const trace: AgentTrace = {
        ...this.getTrace(),
        endedAt: now(),
        durationMs,
      };
      writeFileSync(this.outputFile, safeStringify(trace, 2), 'utf-8');
    } catch (err) {
      process.stderr.write(`[agent-log] Failed to flush trace: ${err}\n`);
    }
  }
}

// -----------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------

export function createAgentLogger(options?: AgentLoggerOptions): AgentLogger {
  return new AgentLogger(options);
}
