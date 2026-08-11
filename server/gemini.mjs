import { GAME_EVENT_SCHEMA, parseModelJson, validateGameEvent } from './game-event.mjs';

export class ProviderError extends Error {
  constructor(message, code = 'provider_error', status = 502) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.status = status;
  }
}

export function outputText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  if (typeof payload?.text === 'string') return payload.text;
  const stepText = payload?.steps?.filter((step) => step?.type === 'model_output')
    .flatMap((step) => step?.content || []).find((part) => typeof part?.text === 'string')?.text;
  if (stepText) return stepText;
  const interactionText = payload?.outputs?.flatMap((output) => output?.content || []).find((part) => typeof part?.text === 'string')?.text;
  if (interactionText) return interactionText;
  return payload?.candidates?.[0]?.content?.parts?.find((part) => typeof part?.text === 'string')?.text || '';
}

function retryDelay(response, attempt) {
  const header = response.headers?.get?.('retry-after');
  let milliseconds = Number.parseFloat(header) * 1_000;
  if (!Number.isFinite(milliseconds) && header) milliseconds = Date.parse(header) - Date.now();
  if (!Number.isFinite(milliseconds)) milliseconds = 350 * (2 ** attempt);
  return Math.max(100, Math.min(2_500, milliseconds));
}

function waitForRetry(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener('abort', abort, { once: true });
    function finish() {
      signal.removeEventListener('abort', abort);
      resolve();
    }
    function abort() {
      clearTimeout(timer);
      const error = new Error('Gemini request timed out.');
      error.name = 'AbortError';
      reject(error);
    }
  });
}

export async function requestGeminiEvent(prompt, config, { fetchImpl = fetch, allowedFlags = [], onModelUsed = () => {} } = {}) {
  if (!config.apiKey) throw new ProviderError('Gemini is not configured.', 'provider_unavailable', 503);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const fallbackModel = config.fallbackModel && config.fallbackModel !== config.model ? config.fallbackModel : '';
  let activeModel = config.model;
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetchImpl('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': config.apiKey },
        signal: controller.signal,
        body: JSON.stringify({
          model: activeModel,
          input: prompt,
          response_format: { type: 'text', mime_type: 'application/json', schema: GAME_EVENT_SCHEMA }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        const event = validateGameEvent(parseModelJson(outputText(payload)), { allowedFlags });
        onModelUsed(activeModel);
        return event;
      }

      const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
      if (retryable && attempt < 2) {
        const switchModel = response.status === 429 && fallbackModel && activeModel !== fallbackModel;
        if (switchModel) activeModel = fallbackModel;
        await waitForRetry(switchModel ? 100 : retryDelay(response, attempt), controller.signal);
        continue;
      }
      const providerMessage = typeof payload?.error?.message === 'string' ? payload.error.message.slice(0, 240) : `Gemini returned ${response.status}.`;
      throw new ProviderError(providerMessage, response.status === 429 ? 'provider_rate_limited' : 'provider_error', response.status === 429 ? 429 : 502);
    }
    throw new ProviderError('Gemini request failed.', 'provider_error', 502);
  } catch (error) {
    if (error?.name === 'AbortError') throw new ProviderError('Gemini request timed out.', 'provider_timeout', 504);
    if (error instanceof ProviderError) throw error;
    throw new ProviderError('Gemini request failed.', 'provider_error', 502);
  } finally {
    clearTimeout(timer);
  }
}
