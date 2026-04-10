/**
 * Basic example — research agent simulation
 * Run: npx tsx examples/basic.ts
 */

import { createAgentLogger } from '../src/index.js';

const log = createAgentLogger({
  runId: 'example_run_001',
  agent: 'research-agent',
  outputFile: '.agent-trace.json',
});

// Simulate an agent run
log.start({ input: 'Summarize recent AI regulation news' });

log.step({
  step: 'planning',
  content: 'Breaking task into: search → read → synthesize',
});

log.llm({
  model: 'gpt-4o-mini',
  tokens: { input: 310, output: 90, total: 400 },
  durationMs: 1200,
  stopReason: 'tool_calls',
});

log.tool({
  name: 'web_search',
  input: { query: 'AI regulation 2025 EU US' },
  output: [{ title: 'EU AI Act...', url: 'https://...' }],
  durationMs: 340,
  success: true,
});

log.step({
  step: 'reasoning',
  content: 'Found 3 relevant articles. Synthesizing key points.',
});

log.llm({
  model: 'gpt-4o-mini',
  tokens: { input: 2100, output: 480, total: 2580 },
  durationMs: 2800,
  stopReason: 'stop',
});

log.end({
  output: 'Summary: EU AI Act fully in force, US developing executive order framework...',
  durationMs: 5200,
  success: true,
});

log.flush(); // Finalise file with endedAt + durationMs

console.log('\nTrace written to .agent-trace.json');
console.log('Run: npx agent-log replay .agent-trace.json');
