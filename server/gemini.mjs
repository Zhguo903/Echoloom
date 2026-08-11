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

export async function requestGeminiEvent(prompt, config, { fetchImpl = fetch, allowedFlags = [] } = {}) {
  if (!config.apiKey) throw new ProviderError('Gemini is not configured.', 'provider_unavailable', 503);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetchImpl('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': config.apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        input: prompt,
        response_format: { type: 'text', mime_type: 'application/json', schema: GAME_EVENT_SCHEMA }
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerMessage = typeof payload?.error?.message === 'string' ? payload.error.message.slice(0, 240) : `Gemini returned ${response.status}.`;
      throw new ProviderError(providerMessage, response.status === 429 ? 'provider_rate_limited' : 'provider_error', response.status === 429 ? 429 : 502);
    }
    return validateGameEvent(parseModelJson(outputText(payload)), { allowedFlags });
  } catch (error) {
    if (error?.name === 'AbortError') throw new ProviderError('Gemini request timed out.', 'provider_timeout', 504);
    if (error instanceof ProviderError) throw error;
    throw new ProviderError('Gemini request failed.', 'provider_error', 502);
  } finally {
    clearTimeout(timer);
  }
}
