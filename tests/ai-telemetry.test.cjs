const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// Run the actual TypeScript modules with a synthetic SDK and isolated environment.
// No dotenv, network call to Gemini, real credential or new test dependency.
const root = path.resolve(__dirname, '..');
const marker = 'PRIVATE_SYNTHETIC_SENTINEL';
const params = {
  materialTitle: marker, combinedContent: `${marker} ação 🌱`,
  selectedTopics: [{ title: marker, summary: marker }],
  mode: 'faithful', difficulty: 'basic', flashcardCount: 1, multipleChoiceCount: 0, trueFalseCount: 0,
};
const generateBody = { flashcards: [{ front: marker, back: marker, sourceReference: marker }] };
const structureBody = { topics: [{ title: marker, summary: marker, keyConcepts: [marker] }] };

function response(body = generateBody) {
  return {
    text: JSON.stringify(body), sdkHttpResponse: { status: 200 },
    candidates: [{ finishReason: 'STOP', content: { parts: [{ text: marker }] } }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 30, totalTokenCount: 130 },
  };
}

function upstream(status) {
  return Object.assign(new Error(marker), { name: 'ApiError', status, request: marker, stack: marker });
}

function harness(provider, { env = {}, brokenLogger = false, sourceOverrides = {} } = {}) {
  const logs = [], requests = [], cache = new Map();
  const testMath = Object.create(Math);
  testMath.random = () => 0;
  const testEnv = { GEMINI_API_KEY: marker, AI_MODEL: marker, AI_RETRY_INITIAL_BACKOFF_MS: '1', ...env };
  function load(name) {
    if (cache.has(name)) return cache.get(name);
    const exports = {};
    cache.set(name, exports);
    class GoogleGenAI {
      constructor() {
        this.models = { generateContent: async (request) => {
          requests.push(request);
          return provider(request, requests.length);
        } };
      }
    }
    const logger = (...args) => { if (brokenLogger) throw new Error(marker); logs.push(args); };
    const sandbox = {
      exports, Buffer, AbortController, setTimeout, clearTimeout,
      process: { env: testEnv }, Math: testMath,
      console: { info: logger, warn: logger, error: logger },
      require(id) {
        if (id === 'dotenv/config') return {};
        if (id === '@google/genai') return { GoogleGenAI, Type: { OBJECT: 'OBJECT', ARRAY: 'ARRAY', STRING: 'STRING', BOOLEAN: 'BOOLEAN' } };
        if (id === './ai-telemetry.js') return load('server/ai-telemetry.ts');
        if (id === './ai.js') return load('server/ai.ts');
        if (id === './parsers.js') return {};
        return require(id);
      },
    };
    const source = sourceOverrides[name] ?? fs.readFileSync(path.join(root, name), 'utf8');
    vm.runInNewContext(ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText, sandbox, { filename: name });
    return exports;
  }
  return {
    ai: load('server/ai.ts'), load, logs, requests,
    events: () => logs.filter(([prefix]) => prefix === '[AI Telemetry]').map(([, json]) => JSON.parse(json)),
  };
}

function assertPrivate(h) {
  assert.equal(JSON.stringify(h.logs).includes(marker), false, 'synthetic private values must never be logged');
  for (const event of h.events()) {
    assert.match(event.requestId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.ok(Number.isInteger(event.durationMs) && event.durationMs >= 0);
    assert.ok(Number.isInteger(event.timestampMs));
    for (const value of Object.values(event)) assert.ok(['string', 'number', 'boolean'].includes(typeof value));
    for (const key of ['message', 'stack', 'prompt', 'text', 'title', 'summary', 'model', 'apiKey', 'response']) assert.equal(key in event, false);
  }
}

test('generate: correlates retry 503 -> success, input UTF-8 sizes and response metrics', async () => {
  const h = harness(async (_request, attempt) => {
    await new Promise(resolve => setTimeout(resolve, 8));
    if (attempt === 1) throw upstream(503);
    return response();
  });
  const result = await h.ai.generateActivities(params);
  assert.equal(result.flashcards.length, 1);
  const events = h.events();
  assert.deepEqual(events.map(e => e.event), ['attempt_started', 'attempt_failed', 'attempt_started', 'response_received', 'attempt_completed']);
  assert.equal(new Set(events.map(e => e.requestId)).size, 1);
  const failed = events[1];
  assert.equal(failed.upstreamStatus, 503);
  assert.equal(failed.upstreamCode, 503);
  assert.equal(failed.errorCategory, 'UNAVAILABLE');
  assert.equal(failed.stage, 'provider_call');
  assert.equal(failed.retryScheduled, true);
  assert.equal(failed.retryDelayMs, 1);
  assert.equal('publicStatus' in failed, false);
  assert.ok(failed.durationMs >= 5);
  const received = events[3];
  assert.equal(received.attempt, 2);
  assert.equal(received.inputChars, h.requests[1].contents.length);
  assert.equal(received.inputBytes, Buffer.byteLength(h.requests[1].contents));
  assert.ok(received.inputBytes > received.inputChars);
  assert.equal(received.topicCount, 1);
  assert.equal(received.totalActivitiesRequested, 1);
  assert.equal(received.candidateCount, 1);
  assert.equal(received.finishReason, 'STOP');
  assert.equal(received.totalTokenCount, 130);
  assert.equal(received.responseTextLength, response().text.length);
  assert.equal(events[4].success, true);
  assert.equal(events[4].publicStatus, 200);
  assertPrivate(h);
});

test('structure: actual sampled input, response before parse, no invented topic/activity counts', async () => {
  const h = harness(() => response(structureBody));
  const result = await h.ai.extractStructureFromText(marker, 'á'.repeat(50_100));
  assert.equal(result.topics.length, 1);
  const first = h.events()[0];
  assert.equal(first.operation, 'structure');
  assert.equal(first.inputChars, h.requests[0].contents.length);
  assert.equal(first.inputBytes, Buffer.byteLength(h.requests[0].contents));
  assert.equal('topicCount' in first, false);
  assert.equal('totalActivitiesRequested' in first, false);
  assertPrivate(h);
});

test('504 upstream remains public 500; last attempt logged without duplicate route fallback', async () => {
  const error = upstream(504);
  const h = harness(() => { throw error; });
  await assert.rejects(h.ai.generateActivities(params), e => e === error);
  h.ai.logUnobservedAIError(error, 'generate');
  assert.equal(h.requests.length, 2);
  assert.equal(h.events().length, 4);
  const last = h.events().at(-1);
  assert.equal(last.upstreamStatus, 504);
  assert.equal(last.errorCategory, 'UPSTREAM_TIMEOUT');
  assert.equal(last.publicStatus, 500);
  assert.equal(last.timeoutLocal, false);
  assert.equal(last.retryScheduled, false);
  assert.equal(h.ai.mapAIErrorToHttp(error).code, 'AI_PROCESSING_ERROR');
  assertPrivate(h);
});

test('local timeout is distinct, not retried, and late settlement cannot log success', async () => {
  let release;
  const h = harness(() => new Promise(resolve => { release = resolve; }), { env: { AI_REQUEST_TIMEOUT_MS: '15' } });
  await assert.rejects(h.ai.generateActivities(params), e => e.code === 'AI_REQUEST_TIMEOUT');
  const failed = h.events().at(-1);
  assert.equal(failed.timeoutLocal, true);
  assert.equal(failed.errorCategory, 'LOCAL_TIMEOUT');
  assert.equal(failed.publicStatus, 504);
  assert.equal('upstreamStatus' in failed, false);
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].config.abortSignal.aborted, true);
  const logCount = h.logs.length;
  release(response());
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(h.logs.length, logCount);
  assertPrivate(h);
});

test('parsing and normalization failures identify the stage and preserve existing errors', async () => {
  for (const [text, stage, category] of [['{', 'json_parse', 'PARSE'], ['{"flashcards":{}}', 'normalize', 'NORMALIZATION']]) {
    const h = harness(() => ({ ...response(), text }));
    await assert.rejects(h.ai.generateActivities(params));
    const last = h.events().at(-1);
    assert.equal(last.stage, stage);
    assert.equal(last.errorCategory, category);
    assert.equal(last.upstreamStatus, 200);
    assert.equal(last.publicStatus, 500);
    assert.equal(h.requests.length, 1);
    assertPrivate(h);
  }
});

test('hostile SDK metadata, error names/codes, messages and environment cannot enter logs', async () => {
  const h = harness(() => ({
    ...response(),
    candidates: [{ finishReason: marker, content: marker }],
    promptFeedback: { blockReason: marker, blockReasonMessage: marker },
    usageMetadata: { promptTokenCount: marker, candidatesTokenCount: Infinity, totalTokenCount: -1 },
    sdkHttpResponse: { status: marker },
  }), { env: { NODE_ENV: 'development' } });
  await h.ai.generateActivities(params);
  const event = h.events()[1];
  assert.equal(event.finishReason, 'UNKNOWN');
  assert.equal(event.blockReason, 'UNKNOWN');
  assert.equal('promptTokenCount' in event, false);
  assert.equal('upstreamStatus' in event, false);
  const maliciousError = { name: marker, code: marker, message: marker, stack: marker, response: { status: marker }, cause: { code: marker } };
  h.ai.logUnobservedAIError(maliciousError, 'structure');
  assert.equal(h.events().at(-1).errorCategory, 'UNKNOWN');
  assert.equal(JSON.stringify(h.ai.getAIErrorDiagnostics(maliciousError)).includes(marker), false);
  assertPrivate(h);
});

test('missing response metadata and zero activities preserve current success behavior', async () => {
  const h = harness(() => ({ text: undefined }));
  const empty = await h.ai.generateActivities(params);
  assert.equal(empty.flashcards.length, 0);
  assert.equal(h.events().at(-1).success, true);
  assert.equal('candidateCount' in h.events()[1], false);
  assert.equal('responseTextLength' in h.events()[1], false);
  const before = h.logs.length;
  await h.ai.generateActivities({ ...params, flashcardCount: 0 });
  assert.equal(h.logs.length, before);
  assert.equal(h.requests.length, 1);
});

test('structured categories are recorded without classifying arbitrary message text', async () => {
  for (const [error, expected] of [
    [upstream(429), 'RATE_LIMIT'], [upstream(403), 'AUTH_CONFIGURATION'],
    [Object.assign(new Error(marker), { cause: { code: 'ECONNRESET' } }), 'NETWORK'],
    [new Error('UNAVAILABLE'), 'UNKNOWN'],
  ]) {
    const h = harness(() => { throw error; }, { env: { AI_MAX_ATTEMPTS: '1' } });
    await assert.rejects(h.ai.generateActivities(params));
    assert.equal(h.events().at(-1).errorCategory, expected);
    assertPrivate(h);
  }
});

test('SDK text getter failures identify response stage; metadata getters cannot break success', async () => {
  const badText = harness(() => ({ get text() { throw new Error(marker); } }));
  await assert.rejects(badText.ai.generateActivities(params));
  assert.equal(badText.events().at(-1).errorCategory, 'INVALID_RESPONSE');
  assert.equal(badText.events().at(-1).stage, 'response_received');
  assertPrivate(badText);
  const h = harness(() => ({
    text: response().text,
    candidates: new Proxy([], { get() { throw new Error(marker); } }),
    get usageMetadata() { throw new Error(marker); },
  }));
  assert.equal((await h.ai.generateActivities(params)).flashcards.length, 1);
  assert.equal(h.events().at(-1).success, true);
  assertPrivate(h);
});

test('client initialization failure has a safe route fallback without provider attempts', async () => {
  const h = harness(() => { throw new Error('must not call provider'); }, { env: { GEMINI_API_KEY: '' } });
  await assert.rejects(h.ai.generateActivities(params), error => {
    h.ai.logUnobservedAIError(error, 'generate');
    return true;
  });
  const last = h.events().at(-1);
  assert.equal(last.attempt, 0);
  assert.equal(last.stage, 'initialization');
  assert.equal(last.publicStatus, 500);
  assert.equal(h.requests.length, 0);
  assertPrivate(h);
});

test('concurrent operations have independent correlation IDs', async () => {
  const h = harness(() => response());
  await Promise.all([h.ai.generateActivities(params), h.ai.generateActivities(params)]);
  assert.equal(new Set(h.events().map(e => e.requestId)).size, 2);
});

test('logging failure does not alter success or retry', async () => {
  const h = harness((_r, i) => { if (i === 1) throw upstream(503); return response(); }, { brokenLogger: true });
  const result = await h.ai.generateActivities(params);
  assert.equal(result.flashcards.length, 1);
  assert.equal(h.requests.length, 2);
});

test('HTTP routes retain public codes/messages and do not expose correlation IDs', async () => {
  for (const [operation, status, expectedStatus, expectedCode, expectedMessage] of [
    ['generate', 503, 503, 'AI_UNAVAILABLE', 'O serviço de IA está temporariamente indisponível. Tente novamente em alguns instantes.'],
    ['structure', 504, 500, 'AI_PROCESSING_ERROR', 'Não foi possível concluir o processamento com IA. Tente novamente.'],
  ]) {
    const h = harness(() => { throw upstream(status); });
    const app = h.load('server/app.ts').createApp();
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    try {
      const result = await fetch(`http://127.0.0.1:${server.address().port}/api/ai/${operation}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operation === 'generate' ? params : { materialTitle: marker, rawText: marker }),
      });
      assert.equal(result.status, expectedStatus);
      assert.deepEqual(await result.json(), { success: false, error: expectedMessage, code: expectedCode });
      assert.equal(result.headers.has('x-request-id'), false);
      assert.equal(h.events().filter(e => e.event === 'attempt_failed').length, 2);
      assertPrivate(h);
    } finally { await new Promise(resolve => server.close(resolve)); }
  }
});

module.exports = { harness, params, response, structureBody };
