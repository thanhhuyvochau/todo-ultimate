# DeepSeek API Client

## Overview
Centralized service module for all DeepSeek API interactions. Handles authentication, request construction, timeout/retry, response validation, and structured error handling. No other module makes direct HTTP calls to DeepSeek.

## Requirements
- Single service file: `src/main/services/deepseekService.ts`.
- Uses `openai` npm package configured with `baseURL: 'https://api.deepseek.com/v1'`.
- Model: `deepseek-chat` with `response_format: { type: 'json_object' }` for structured outputs.
- API key loaded from Keychain (Feature 3) at call time, never cached in plaintext.
- Timeout: 30 seconds per request.
- Retry: max 3 attempts with exponential backoff (1s, 2s, 4s).
- All responses validated against expected schemas before returning.

## Functions

```ts
export async function generateDailyPlan(input: AIScheduleInput): Promise<DailyPlan>;
export async function generatePerformanceReport(params: ReportParams): Promise<PerformanceReport>;
export async function testConnection(): Promise<boolean>;
```

## Retry Strategy
```ts
// 50x errors, network errors, and timeout → retry
// 40x errors (except 429) → do not retry, return error
// 429 rate limit → retry with Retry-After header or backoff
const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 2000, 4000];
```

## Response Validation
- Validate JSON schema of DeepSeek response against expected `DailyPlan` or `PerformanceReport` shape.
- On parse failure: return structured fallback instead of crashing.
- Log schema mismatch details (no API key in logs).

## Error Codes
- `AI_TIMEOUT`: request exceeded 30s.
- `AI_RATE_LIMITED`: 429 response.
- `AI_AUTH_FAILED`: invalid or missing API key (401).
- `AI_PARSE_ERROR`: response didn't match expected schema.
- `AI_NETWORK_ERROR`: connection failed (DNS, TLS, etc.).

## Non-Blocking Failure
- AI calls never block the UI thread.
- Renderer shows loading state during AI generation.
- On failure: show user-friendly message + retry button.
- Cached previous results shown as fallback when available.

## Prompt Management
- Prompts stored in `src/main/services/prompts/` as versioned templates.
- Each prompt file: `plan-{version}.txt`, `report-{version}.txt`.
- Prompt version included in AI cache key and performance report metadata.

## Dependencies
- Feature 3 (safeStorage keychain)

## Acceptance Criteria
- [ ] API key loaded from keychain, never logged.
- [ ] 30s timeout enforced.
- [ ] Retry with exponential backoff (max 3) on 50x errors.
- [ ] Responses validated against expected schema.
- [ ] Structured error codes returned to renderer.
- [ ] UI stays responsive during AI calls.
