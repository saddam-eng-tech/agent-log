# agent-log

> 🔍 Zero-config, local-first structured logger for AI agents.
> The lightweight **pino/winston equivalent** for agent traces — not another cloud platform.

[![npm version](https://img.shields.io/npm/v/agent-log)](https://npmjs.com/package/agent-log)
[![license](https://img.shields.io/npm/l/agent-log)](LICENSE)

---

## Why agent-log?

Right now every agent builder debugs with `console.log` and scrolls through terminal output.

Datadog exists, but people still use **pino**. LangSmith exists, but people still need a **debug package**.

The big observability platforms (LangSmith, Braintrust, Arize Phoenix) are:
- ☁️ Cloud-first with dashboards and pricing tiers
- 📦 SDKs with 50+ dependencies
- 🔑 Require API keys and account setup

`agent-log` is the thing you `npm install` in 10 seconds and it just works:

```bash
npm install agent-log
```

---

## Quick Start

```ts
import { createAgentLogger } from 'agent-log';

const log = createAgentLogger({ runId: 'my-agent-run' });

log.start({ agent: 'planner', input: 'Research climate change solutions' });
log.llm({ model: 'gpt-4o', prompt: '...', tokens: { input: 420, output: 180 } });
log.tool({ name: 'web_search', input: { query: 'climate change' }, output: [...] });
log.step({ type: 'reasoning', content: 'Breaking into sub-tasks...' });
log.error({ message: 'Tool timeout', retrying: true });
log.end({ output: 'Final result here', durationMs: 4200 });
```

Outputs a clean `.agent-trace.json` file — and pretty terminal output:

```
✦ [planner] START  input: "Research climate change solutions"
🤖 [planner] LLM    gpt-4o  420→180 tokens  (1.2s)
🔧 [planner] TOOL   web_search  ✓ 3 results
💭 [planner] STEP   reasoning  "Breaking into sub-tasks..."
✔  [planner] END    4.2s
```

---

## Terminal Replay

```bash
npx agent-log replay .agent-trace.json
```

Replays the full trace with timing, color-coded by event type. Perfect for post-mortem debugging.

---

## API

### `createAgentLogger(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `runId` | `string` | auto UUID | Unique run identifier |
| `agent` | `string` | `'agent'` | Agent name label |
| `outputFile` | `string \| false` | `'.agent-trace.json'` | File path or `false` to disable |
| `pretty` | `boolean` | `true` (TTY) | Pretty-print to terminal |
| `level` | `LogLevel` | `'trace'` | Minimum level to emit |
| `append` | `boolean` | `false` | Append to existing file |

### Logger Methods

| Method | Event Type | Description |
|---|---|---|
| `log.start(data)` | `agent.start` | Agent run begins |
| `log.step(data)` | `agent.step` | Generic step / reasoning |
| `log.llm(data)` | `llm.call` | LLM invocation |
| `log.tool(data)` | `tool.call` | Tool / function call |
| `log.handoff(data)` | `agent.handoff` | Handoff between agents |
| `log.error(data)` | `agent.error` | Error / retry event |
| `log.end(data)` | `agent.end` | Agent run ends |
| `log.custom(type, data)` | custom | Arbitrary typed event |

---

## Trace Format Spec (`.agent-trace.json`)

The JSON trace format is the **real product** — the logger is the trojan horse. See [`TRACE_FORMAT.md`](./TRACE_FORMAT.md) for the full schema.

Goal: become the standard that other tools consume. Think:
- `agent-log` → writes traces
- `agent-log replay` → terminal playback *(v1)*
- `agent-log serve` → local web UI *(v2)*
- `agent-log export` → OpenTelemetry / LangSmith format *(v2)*

---

## Roadmap

### v1 (Now)
- [x] Core logger with typed event methods
- [x] `.agent-trace.json` schema v1
- [x] Pretty terminal output
- [x] `npx agent-log replay` CLI
- [ ] Framework integrations: LangGraph, Vercel AI SDK, raw OpenAI

### v2
- [ ] `agent-log serve` — local web UI (timeline view, no cloud)
- [ ] `agent-log export --format otel` — OpenTelemetry export
- [ ] `agent-log export --format langsmith` — LangSmith import
- [ ] Multi-agent trace correlation

---

## License

MIT © [Saddam](https://github.com/saddam-eng-tech)
