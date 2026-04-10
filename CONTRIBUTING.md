# Contributing to agent-log

Thanks for your interest! `agent-log` is intentionally small. Before contributing, please read the philosophy:

## Core Principle: Scope Discipline

> Ship the logger + JSON format + terminal replay first.
> The web UI and export features come in v2. Don't let it creep into a platform.

## v1 Scope (PRs Welcome)

- Core logger fixes or improvements
- New typed event methods (with spec additions to `TRACE_FORMAT.md`)
- `agent-log replay` CLI improvements
- `agent-log inspect` / `agent-log validate` CLI
- Framework integrations: LangGraph, Vercel AI SDK, raw OpenAI
- Zero-dependency constraint: **no new runtime deps**

## v2 Scope (Ideas Only — Not Yet)

- `agent-log serve` — local web UI
- `agent-log export --format otel` — OpenTelemetry export
- Multi-agent trace correlation

## Development Setup

```bash
git clone https://github.com/saddam-eng-tech/agent-log
cd agent-log
npm install
npm run dev         # watch mode
npm test            # run tests
npm run test:run    # single run
```

## Pull Request Guidelines

1. Keep diffs small and focused
2. Add/update tests for any new behaviour
3. Update `TRACE_FORMAT.md` if adding new event types or fields
4. No new runtime dependencies — `agent-log` has **zero** at runtime
5. TypeScript strict mode — no `any` without comment justification
