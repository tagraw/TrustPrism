# @trustprism/sdk

SDK for integrating external games with the **TrustPrism** research platform. Handles session management, event telemetry, and AI proxy with full server-side audit logging.

## Installation

```bash
# From your game project root:
npm install ../path/to/TrustPrism/sdk

# Or, once published:
npm install @trustprism/sdk
```

## Quick Start

```javascript
import TrustPrism from "@trustprism/sdk";

// 1. Initialize with your API key (from the admin dashboard)
const tp = TrustPrism.init({
  apiKey: "tp_dev_abc123...",
  gameId: "your-game-uuid",
  baseUrl: "http://localhost:5000",  // TrustPrism backend URL
  debug: true  // optional: enable console logging
});

// 2. Start a session when the player begins
const session = await tp.startSession({
  participantId: "player-uuid"
});
console.log("Session ID:", session.sessionId);

// 3. Track game events
await tp.trackEvent("level_started", { level: 1, difficulty: "hard" });
await tp.trackEvent("hint_shown", { hint_type: "directional", ai_confidence: 0.85 });
await tp.trackEvent("user_decision", { choice: "cooperate", reaction_time_ms: 2300 });

// 4. Use AI through TrustPrism (fully logged + audited)
const result = await tp.ai.generate({
  prompt: "The player is stuck on level 3. Suggest a hint.",
  systemPrompt: "You are a helpful game assistant. Keep hints vague.",
  model: "gpt-4",           // optional (default: gpt-4)
  temperature: 0.7,         // optional (default: 0.7)
  maxTokens: 256            // optional (default: 1024)
});

console.log(result.response);       // "Try looking near the waterfall..."
console.log(result.usage.latencyMs); // 1200

// 5. End the session
await tp.endSession({ score: 42 });
```

## API Reference

### `TrustPrism.init(config)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiKey` | string | ✅ | Your API key (from Admin → Game Detail → Generate API Key) |
| `gameId` | string | ✅ | UUID of your registered game |
| `baseUrl` | string | — | TrustPrism backend URL (default: `http://localhost:5000`) |
| `debug` | boolean | — | Log SDK calls to console (default: `false`) |

---

### `tp.startSession({ participantId })`

Starts a game session. **Must be called before** `trackEvent()` or `ai.generate()`.

**Returns:** `{ sessionId, startedAt }`

---

### `tp.endSession({ score? })`

Ends the current session. Optionally records a final score.

**Returns:** `{ sessionId, endedAt, score }`

---

### `tp.trackEvent(eventType, data?)`

Tracks any game event. Written to TrustPrism's activity logs.

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventType` | string | Event name (e.g. `"hint_shown"`, `"user_decision"`) |
| `data` | object | Arbitrary event data |

**Returns:** `{ eventId, trackedAt }`

---

### `tp.ai.generate(options)`

Proxies an AI call through TrustPrism. Logs the full request/response audit trail.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | string | — | The prompt text (required) |
| `systemPrompt` | string | — | System instruction |
| `model` | string | `"gpt-4"` | LLM model |
| `provider` | string | `"openai"` | LLM provider |
| `temperature` | number | `0.7` | Sampling temperature |
| `maxTokens` | number | `1024` | Max response tokens |
| `metadata` | object | `{}` | Extra metadata for the log |

**Returns:**
```json
{
  "response": "AI text response...",
  "usage": {
    "promptTokens": 42,
    "completionTokens": 128,
    "totalTokens": 170,
    "latencyMs": 1200
  },
  "logId": "uuid-of-log-entry"
}
```

## What Gets Logged

Every call through the SDK is captured server-side:

| Method | Backend Table | Data Captured |
|--------|---------------|---------------|
| `startSession` | `game_sessions` | game_id, participant_id, started_at |
| `endSession` | `game_sessions` | ended_at, score |
| `trackEvent` | `activity_logs` | event_type, event_data, game_id, session_id |
| `ai.generate` | `ai_interaction_logs` | prompt, response, model, provider, tokens, latency, flags |

## Utilities

```javascript
tp.sessionId       // Current session ID (or null)
tp.isSessionActive // Boolean — is a session running?
```
