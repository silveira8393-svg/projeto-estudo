import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

type Operation = 'structure' | 'generate';
type Stage = 'initialization' | 'provider_call' | 'response_received' | 'json_parse' | 'normalize' | 'completed';
type ErrorCategory = 'NONE' | 'RATE_LIMIT' | 'UNAVAILABLE' | 'UPSTREAM_TIMEOUT' | 'LOCAL_TIMEOUT' |
  'AUTH_CONFIGURATION' | 'NETWORK' | 'PARSE' | 'NORMALIZATION' | 'INVALID_RESPONSE' | 'UNKNOWN';

const ERROR_NAMES = new Set(['Error', 'ApiError', 'SyntaxError', 'TypeError', 'AbortError', 'TimeoutError', 'AIRequestTimeoutError']);
const NETWORK_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ENETDOWN', 'ENETUNREACH', 'ETIMEDOUT']);
const ERROR_CODES = new Set([
  ...NETWORK_CODES, 'AI_REQUEST_TIMEOUT', 'RESOURCE_EXHAUSTED', 'UNAVAILABLE', 'DEADLINE_EXCEEDED',
  'UNAUTHENTICATED', 'PERMISSION_DENIED', 'INVALID_ARGUMENT', 'INTERNAL', 'NOT_FOUND', 'CANCELLED',
]);
const FINISH_REASONS = new Set([
  'FINISH_REASON_UNSPECIFIED', 'STOP', 'MAX_TOKENS', 'SAFETY', 'RECITATION', 'LANGUAGE', 'OTHER',
  'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'MALFORMED_FUNCTION_CALL', 'IMAGE_SAFETY',
  'UNEXPECTED_TOOL_CALL', 'TOO_MANY_TOOL_CALLS', 'IMAGE_PROHIBITED_CONTENT', 'NO_IMAGE',
  'IMAGE_RECITATION', 'IMAGE_OTHER',
]);
const BLOCK_REASONS = new Set([
  'BLOCKED_REASON_UNSPECIFIED', 'SAFETY', 'OTHER', 'BLOCKLIST', 'PROHIBITED_CONTENT',
  'IMAGE_SAFETY', 'MODEL_ARMOR', 'JAILBREAK',
]);
const recordedErrors = new WeakSet<object>();

function field(value: unknown, key: string): unknown {
  try {
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
  } catch { return undefined; }
}

function count(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function httpStatus(value: unknown): number | undefined {
  const numeric = typeof value === 'string' && /^[1-5]\d{2}$/.test(value) ? Number(value) : value;
  return typeof numeric === 'number' && Number.isInteger(numeric) && numeric >= 100 && numeric <= 599 ? numeric : undefined;
}

function category(value: unknown, allowed: Set<string>): string | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === 'string' && allowed.has(value) ? value : 'UNKNOWN';
}

// Never coerce or serialize arbitrary SDK values, messages, stacks or environment values.
export function safeAIErrorDetails(error: unknown) {
  const upstreamStatus = httpStatus(field(error, 'status') ?? field(error, 'statusCode') ?? field(field(error, 'response'), 'status'));
  const rawCode = field(error, 'code');
  const upstreamCode = httpStatus(rawCode) ?? category(rawCode, ERROR_CODES);
  const timeoutLocal = field(error, 'name') === 'AIRequestTimeoutError' || rawCode === 'AI_REQUEST_TIMEOUT';
  return {
    errorName: category(field(error, 'name'), ERROR_NAMES) ?? 'UNKNOWN',
    upstreamStatus: timeoutLocal ? undefined : upstreamStatus,
    upstreamCode: timeoutLocal ? undefined : upstreamCode ?? upstreamStatus,
    timeoutLocal,
    networkCode: category(field(field(error, 'cause'), 'code'), NETWORK_CODES),
  };
}

function errorCategory(error: unknown, stage: Stage): ErrorCategory {
  const details = safeAIErrorDetails(error);
  if (details.timeoutLocal) return 'LOCAL_TIMEOUT';
  if (stage === 'json_parse') return 'PARSE';
  if (stage === 'normalize') return 'NORMALIZATION';
  if (stage === 'response_received') return 'INVALID_RESPONSE';
  if (details.upstreamStatus === 429 || details.upstreamCode === 'RESOURCE_EXHAUSTED') return 'RATE_LIMIT';
  if (details.upstreamStatus === 503 || details.upstreamCode === 'UNAVAILABLE') return 'UNAVAILABLE';
  if (details.upstreamStatus === 504 || details.upstreamCode === 'DEADLINE_EXCEEDED') return 'UPSTREAM_TIMEOUT';
  if ([401, 403].includes(details.upstreamStatus) || ['UNAUTHENTICATED', 'PERMISSION_DENIED'].includes(String(details.upstreamCode))) return 'AUTH_CONFIGURATION';
  if (NETWORK_CODES.has(String(details.upstreamCode)) || NETWORK_CODES.has(details.networkCode)) return 'NETWORK';
  return 'UNKNOWN';
}

export function hasAIErrorTelemetry(error: unknown): boolean {
  return error !== null && typeof error === 'object' && recordedErrors.has(error);
}

interface InputMetrics {
  inputChars: number;
  inputBytes: number;
  topicCount?: number;
  flashcardsRequested?: number;
  multipleChoiceRequested?: number;
  trueFalseRequested?: number;
  totalActivitiesRequested?: number;
}

export class AITelemetry {
  private readonly requestId = randomUUID();
  private readonly input: InputMetrics;

  constructor(private readonly operation: Operation, input: InputMetrics) {
    // Explicit projection: even extra runtime properties cannot reach the logger.
    this.input = {
      inputChars: count(input.inputChars),
      inputBytes: count(input.inputBytes),
      topicCount: count(input.topicCount),
      flashcardsRequested: count(input.flashcardsRequested),
      multipleChoiceRequested: count(input.multipleChoiceRequested),
      trueFalseRequested: count(input.trueFalseRequested),
      totalActivitiesRequested: count(input.totalActivitiesRequested),
    };
  }

  startAttempt(attempt: number, stage: Stage = 'provider_call'): AIAttemptTelemetry {
    return new AIAttemptTelemetry(this.requestId, this.operation, this.input, attempt, stage);
  }
}

export class AIAttemptTelemetry {
  private readonly startedAt = performance.now();
  private closed = false;
  private upstreamStatus: number | undefined;

  constructor(
    private readonly requestId: string,
    private readonly operation: Operation,
    private readonly input: InputMetrics,
    private readonly attempt: number,
    private stage: Stage,
  ) {
    this.emit('attempt_started');
  }

  setStage(stage: Stage) {
    if (!this.closed) this.stage = stage;
  }

  responseReceived(response: unknown, responseTextLength: number | undefined) {
    if (this.closed) return; // A late SDK settlement after timeout must not report success.
    this.stage = 'response_received';
    this.upstreamStatus = httpStatus(field(field(response, 'sdkHttpResponse'), 'status'));
    const candidates = field(response, 'candidates');
    const usage = field(response, 'usageMetadata');
    this.emit('response_received', {
      success: true,
      candidateCount: Array.isArray(candidates) ? count(field(candidates, 'length')) : undefined,
      responseTextLength: count(responseTextLength),
      finishReason: category(field(Array.isArray(candidates) ? field(candidates, '0') : undefined, 'finishReason'), FINISH_REASONS),
      blockReason: category(field(field(response, 'promptFeedback'), 'blockReason'), BLOCK_REASONS),
      promptTokenCount: count(field(usage, 'promptTokenCount')),
      candidatesTokenCount: count(field(usage, 'candidatesTokenCount')),
      totalTokenCount: count(field(usage, 'totalTokenCount')),
    });
  }

  completed() {
    if (this.closed) return;
    this.stage = 'completed';
    this.emit('attempt_completed', { success: true, publicStatus: 200 });
    this.closed = true;
  }

  failed(error: unknown, publicStatus?: number, retryDelayMs?: number) {
    if (this.closed) return;
    const details = safeAIErrorDetails(error);
    this.emit('attempt_failed', {
      success: false,
      errorName: details.errorName,
      upstreamStatus: details.upstreamStatus ?? this.upstreamStatus,
      upstreamCode: details.upstreamCode,
      timeoutLocal: details.timeoutLocal,
      errorCategory: errorCategory(error, this.stage),
      publicStatus: httpStatus(publicStatus),
      retryScheduled: retryDelayMs !== undefined,
      retryDelayMs: count(retryDelayMs),
    });
    this.closed = true;
    if (error !== null && typeof error === 'object') recordedErrors.add(error);
  }

  private emit(event: 'attempt_started' | 'response_received' | 'attempt_completed' | 'attempt_failed', fields: Record<string, string | number | boolean | undefined> = {}) {
    try {
      console.info('[AI Telemetry]', JSON.stringify({
        event,
        requestId: this.requestId,
        operation: this.operation,
        timestampMs: Date.now(),
        attempt: this.attempt,
        stage: this.stage,
        durationMs: Math.max(0, Math.round(performance.now() - this.startedAt)),
        ...this.input,
        upstreamStatus: this.upstreamStatus,
        timeoutLocal: false,
        errorCategory: 'NONE',
        ...fields,
      }));
    } catch { /* Logging failure must not change the AI result or retry policy. */ }
  }
}
