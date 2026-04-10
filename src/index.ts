/**
 * agent-log — Zero-config, local-first structured logger for AI agents.
 * @module agent-log
 */

export { AgentLogger, createAgentLogger } from './logger.js';
export type {
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
