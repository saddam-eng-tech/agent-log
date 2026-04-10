#!/usr/bin/env node
/**
 * agent-log CLI
 * Usage:
 *   npx agent-log replay [file]          - Replay a trace in the terminal
 *   npx agent-log inspect [file]         - Print trace summary/stats
 *   npx agent-log validate [file]        - Validate a trace file against the spec
 */

import { readFileSync, existsSync } from 'node:fs';
import { prettyFormat } from './pretty.js';
import { formatDuration, formatTokens } from './utils.js';
import type { AgentTrace, TraceEvent } from './types.js';

const args = process.argv.slice(2);
const command = args[0];
const filePath = args[1] ?? '.agent-trace.json';

const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  muted:  '\x1b[90m',
};

function c(code: string, text: string): string {
  return code + text + C.reset;
}

function loadTrace(path: string): AgentTrace {
  if (!existsSync(path)) {
    console.error(c(C.red, `✖ File not found: ${path}`));
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as AgentTrace;
  } catch (err) {
    console.error(c(C.red, `✖ Failed to parse trace file: ${err}`));
    process.exit(1);
  }
}

// -------------------------------------------------------------------
// Commands
// -------------------------------------------------------------------

async function cmdReplay(path: string): Promise<void> {
  const trace = loadTrace(path);

  console.log('');
  console.log(
    c(C.bold, `  agent-log replay`) +
    c(C.muted, `  runId: ${trace.runId}  agent: ${trace.agent}`),
  );
  console.log(c(C.muted, `  ${'─'.repeat(60)}`));
  console.log('');

  // Simulate timing playback (1/10 speed by default or --instant)
  const instant = args.includes('--instant') || args.includes('-i');
  let prevElapsed = 0;

  for (const event of trace.events) {
    if (!instant && event.elapsed > 0) {
      const gap = Math.min(event.elapsed - prevElapsed, 500); // cap delay at 500ms for UX
      await sleep(gap / 10); // 10x speed
    }
    console.log('  ' + prettyFormat(event));
    prevElapsed = event.elapsed;
  }

  console.log('');
  if (trace.durationMs != null) {
    console.log(c(C.muted, `  Total: ${formatDuration(trace.durationMs)}  |  ${trace.events.length} events`));
  }
  console.log('');
}

function cmdInspect(path: string): void {
  const trace = loadTrace(path);
  const events = trace.events;

  const llmEvents = events.filter(e => e.type === 'llm.call');
  const toolEvents = events.filter(e => e.type === 'tool.call');
  const errorEvents = events.filter(e => e.type === 'agent.error');

  const totalTokens = llmEvents.reduce((acc, e) => {
    const t = e.data.tokens as { total?: number } | undefined;
    return acc + (t?.total ?? 0);
  }, 0);

  const toolSuccess = toolEvents.filter(e => e.data.success !== false).length;

  console.log('');
  console.log(c(C.bold, '  Trace Summary'));
  console.log(c(C.muted, `  ${'─'.repeat(40)}`));
  console.log(`  Run ID      : ${c(C.cyan, trace.runId)}`);
  console.log(`  Agent       : ${c(C.bold, trace.agent)}`);
  console.log(`  Started     : ${trace.startedAt}`);
  if (trace.durationMs) console.log(`  Duration    : ${c(C.green, formatDuration(trace.durationMs))}`);
  console.log(`  Events      : ${c(C.bold, String(events.length))}`);
  console.log('');
  console.log(c(C.bold, '  Breakdown'));
  console.log(c(C.muted, `  ${'─'.repeat(40)}`));
  console.log(`  LLM calls   : ${llmEvents.length}  (${formatTokens(totalTokens)} total tokens)`);
  console.log(`  Tool calls  : ${toolEvents.length}  (${toolSuccess}/${toolEvents.length} success)`);
  console.log(`  Errors      : ${errorEvents.length > 0 ? c(C.red, String(errorEvents.length)) : c(C.green, '0')}`);
  console.log('');
}

function cmdValidate(path: string): void {
  const trace = loadTrace(path);
  const errors: string[] = [];

  if (!trace.version) errors.push('Missing required field: version');
  if (!trace.runId) errors.push('Missing required field: runId');
  if (!trace.agent) errors.push('Missing required field: agent');
  if (!trace.startedAt) errors.push('Missing required field: startedAt');
  if (!Array.isArray(trace.events)) errors.push('events must be an array');

  (trace.events ?? []).forEach((e: TraceEvent, i: number) => {
    if (!e.seq) errors.push(`events[${i}]: missing seq`);
    if (!e.type) errors.push(`events[${i}]: missing type`);
    if (!e.ts) errors.push(`events[${i}]: missing ts`);
    if (e.elapsed === undefined) errors.push(`events[${i}]: missing elapsed`);
    if (!e.agent) errors.push(`events[${i}]: missing agent`);
    if (!e.level) errors.push(`events[${i}]: missing level`);
    if (!e.data) errors.push(`events[${i}]: missing data`);
  });

  if (errors.length === 0) {
    console.log(c(C.green, `✔ Valid trace file (v${trace.version}) — ${trace.events.length} events`));
  } else {
    console.log(c(C.red, `✖ Invalid trace file — ${errors.length} error(s):`));
    errors.forEach(e => console.log(`   • ${e}`));
    process.exit(1);
  }
}

function printHelp(): void {
  console.log('');
  console.log(c(C.bold, '  agent-log CLI'));
  console.log('');
  console.log('  Commands:');
  console.log(`    ${c(C.cyan, 'replay')}   [file] [--instant]   Replay trace with timing`);
  console.log(`    ${c(C.cyan, 'inspect')}  [file]                Print summary & stats`);
  console.log(`    ${c(C.cyan, 'validate')} [file]                Validate trace file schema`);
  console.log(`    ${c(C.cyan, 'help')}                           Show this help`);
  console.log('');
  console.log('  Defaults to .agent-trace.json when no file is specified.');
  console.log('');
}

// -------------------------------------------------------------------
// Router
// -------------------------------------------------------------------

switch (command) {
  case 'replay':
    cmdReplay(filePath).catch(console.error);
    break;
  case 'inspect':
    cmdInspect(filePath);
    break;
  case 'validate':
    cmdValidate(filePath);
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    printHelp();
    break;
  default:
    console.error(c(C.red, `Unknown command: ${command}`));
    printHelp();
    process.exit(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
