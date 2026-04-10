# Agent Trace Format Spec — `.agent-trace.json`

Version: `1.0.0`

The trace format is the core artifact of `agent-log`. It is designed to be:
- **Self-contained** — everything needed to replay a run is in one file
- **Human-readable** — flat JSON array, not nested opaque objects
- **Tool-agnostic** — not tied to any framework or cloud provider
- **Extensible** — `data` field accepts any JSON

---

## File Structure

```json
{
  "version": "1.0.0",
  "runId": "run_abc123",
  "agent": "planner",
  "startedAt": "2025-11-01T10:00:00.000Z",
  "endedAt": "2025-11-01T10:00:04.200Z",
  "durationMs": 4200,
  "events": [
    { ...event },
    { ...event }
  ]
}
```

### Root Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `version` | `string` | ✅ | Trace format version (`semver`) |
| `runId` | `string` | ✅ | Unique identifier for this run |
| `agent` | `string` | ✅ | Top-level agent name |
| `startedAt` | `ISO8601` | ✅ | Run start timestamp |
| `endedAt` | `ISO8601` | ✳️ | Run end timestamp (set when `log.end()` called) |
| `durationMs` | `number` | ✳️ | Total duration in ms |
| `events` | `Event[]` | ✅ | Ordered array of trace events |
| `meta` | `object` | ➖ | Arbitrary run-level metadata |

---

## Event Schema

Every event in the `events` array shares a common envelope:

```json
{
  "seq": 1,
  "type": "llm.call",
  "ts": "2025-11-01T10:00:01.100Z",
  "elapsed": 1100,
  "agent": "planner",
  "level": "info",
  "data": { ... }
}
```

### Envelope Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `seq` | `number` | ✅ | Monotonically increasing sequence number |
| `type` | `EventType` | ✅ | Event type (see below) |
| `ts` | `ISO8601` | ✅ | Event timestamp |
| `elapsed` | `number` | ✅ | Milliseconds since run start |
| `agent` | `string` | ✅ | Agent that emitted this event |
| `level` | `LogLevel` | ✅ | `trace` \| `debug` \| `info` \| `warn` \| `error` |
| `data` | `object` | ✅ | Event-specific payload (see types below) |
| `parentSeq` | `number` | ➖ | For nested/child events, seq of the parent |
| `spanId` | `string` | ➖ | For correlating multi-agent spans |

---

## Event Types

### `agent.start`
```json
{
  "type": "agent.start",
  "data": {
    "input": "string or object",
    "config": { "...any agent config" }
  }
}
```

### `agent.step`
```json
{
  "type": "agent.step",
  "data": {
    "step": "reasoning | planning | reflection | custom",
    "content": "string",
    "metadata": {}
  }
}
```

### `llm.call`
```json
{
  "type": "llm.call",
  "data": {
    "model": "gpt-4o",
    "provider": "openai",
    "prompt": "string (or messages array)",
    "response": "string",
    "tokens": {
      "input": 420,
      "output": 180,
      "total": 600
    },
    "durationMs": 1240,
    "cost": 0.0042,
    "temperature": 0.7,
    "stopReason": "stop | length | tool_calls | content_filter"
  }
}
```

### `tool.call`
```json
{
  "type": "tool.call",
  "data": {
    "name": "web_search",
    "input": { "query": "..." },
    "output": "any",
    "durationMs": 340,
    "success": true,
    "error": null
  }
}
```

### `agent.handoff`
```json
{
  "type": "agent.handoff",
  "data": {
    "from": "planner",
    "to": "executor",
    "payload": "any"
  }
}
```

### `agent.error`
```json
{
  "type": "agent.error",
  "data": {
    "message": "string",
    "code": "TOOL_TIMEOUT",
    "stack": "optional stack trace",
    "retrying": true,
    "attempt": 2
  }
}
```

### `agent.end`
```json
{
  "type": "agent.end",
  "data": {
    "output": "any",
    "durationMs": 4200,
    "success": true,
    "summary": "optional string"
  }
}
```

---

## Log Levels

| Level | Value | When to use |
|---|---|---|
| `trace` | 10 | Maximum verbosity — raw prompts, full tool I/O |
| `debug` | 20 | Detailed but not exhaustive — token counts, timing |
| `info` | 30 | Normal operation — starts, ends, decisions |
| `warn` | 40 | Recoverable issues — retries, degraded results |
| `error` | 50 | Failures — exceptions, unrecoverable errors |

---

## Example Trace

```json
{
  "version": "1.0.0",
  "runId": "run_k9x2p",
  "agent": "research-agent",
  "startedAt": "2025-11-01T10:00:00.000Z",
  "endedAt": "2025-11-01T10:00:04.200Z",
  "durationMs": 4200,
  "events": [
    {
      "seq": 1,
      "type": "agent.start",
      "ts": "2025-11-01T10:00:00.000Z",
      "elapsed": 0,
      "agent": "research-agent",
      "level": "info",
      "data": { "input": "Summarize recent AI regulation news" }
    },
    {
      "seq": 2,
      "type": "llm.call",
      "ts": "2025-11-01T10:00:01.200Z",
      "elapsed": 1200,
      "agent": "research-agent",
      "level": "info",
      "data": {
        "model": "gpt-4o-mini",
        "tokens": { "input": 310, "output": 90, "total": 400 },
        "durationMs": 1200,
        "stopReason": "tool_calls"
      }
    },
    {
      "seq": 3,
      "type": "tool.call",
      "ts": "2025-11-01T10:00:01.900Z",
      "elapsed": 1900,
      "agent": "research-agent",
      "level": "info",
      "data": {
        "name": "web_search",
        "input": { "query": "AI regulation 2025" },
        "durationMs": 340,
        "success": true
      }
    },
    {
      "seq": 4,
      "type": "agent.end",
      "ts": "2025-11-01T10:00:04.200Z",
      "elapsed": 4200,
      "agent": "research-agent",
      "level": "info",
      "data": { "durationMs": 4200, "success": true }
    }
  ]
}
```

---

## Versioning

The trace format follows `semver`:
- **Patch** — backward-compatible fixes to field descriptions
- **Minor** — new optional fields added
- **Major** — breaking changes to required fields or event types

Tools consuming `.agent-trace.json` files should check `version` and warn if major version is unsupported.
