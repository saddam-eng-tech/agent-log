import { describe, it, expect, beforeEach } from 'vitest';
import { AgentLogger } from './logger.js';

describe('AgentLogger', () => {
  let log: AgentLogger;

  beforeEach(() => {
    log = new AgentLogger({
      runId: 'test_run',
      agent: 'test-agent',
      outputFile: false, // no file output in tests
      pretty: false,
    });
  });

  it('emits agent.start event', () => {
    log.start({ input: 'hello' });
    const events = log.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('agent.start');
    expect(events[0].data.input).toBe('hello');
    expect(events[0].seq).toBe(1);
    expect(events[0].agent).toBe('test-agent');
  });

  it('emits llm.call event', () => {
    log.llm({ model: 'gpt-4o', tokens: { input: 100, output: 50, total: 150 } });
    const events = log.getEvents();
    expect(events[0].type).toBe('llm.call');
    const data = events[0].data as { model: string; tokens: { total: number } };
    expect(data.model).toBe('gpt-4o');
    expect(data.tokens.total).toBe(150);
  });

  it('emits tool.call event', () => {
    log.tool({ name: 'web_search', input: { q: 'test' }, success: true });
    const events = log.getEvents();
    expect(events[0].type).toBe('tool.call');
    const data = events[0].data as { name: string; success: boolean };
    expect(data.name).toBe('web_search');
    expect(data.success).toBe(true);
  });

  it('assigns monotonically increasing seq numbers', () => {
    log.start();
    log.step({ content: 'thinking...' });
    log.end();
    const seqs = log.getEvents().map(e => e.seq);
    expect(seqs).toEqual([1, 2, 3]);
  });

  it('getTrace returns valid AgentTrace', () => {
    log.start();
    log.end({ output: 'done' });
    const trace = log.getTrace();
    expect(trace.version).toBe('1.0.0');
    expect(trace.runId).toBe('test_run');
    expect(trace.agent).toBe('test-agent');
    expect(trace.events).toHaveLength(2);
  });

  it('supports custom event types', () => {
    log.custom('retrieval.chunk', { chunkId: 'c1', score: 0.92 });
    const events = log.getEvents();
    expect(events[0].type).toBe('retrieval.chunk');
    const data = events[0].data as { chunkId: string; score: number };
    expect(data.score).toBe(0.92);
  });

  it('respects minimum level filter', () => {
    const infoLog = new AgentLogger({
      runId: 'level_test',
      outputFile: false,
      pretty: false,
      level: 'info',
    });
    infoLog.step({ content: 'hidden' }, 'debug'); // below info — filtered
    infoLog.step({ content: 'visible' }, 'info');
    expect(infoLog.getEvents()).toHaveLength(1);
    expect((infoLog.getEvents()[0].data as { content: string }).content).toBe('visible');
  });

  it('agent override on per-method calls', () => {
    log.llm({ model: 'gpt-4o' }, 'info', 'sub-agent');
    expect(log.getEvents()[0].agent).toBe('sub-agent');
  });
});
