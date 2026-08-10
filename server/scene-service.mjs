import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ProviderError } from './gemini.mjs';

const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/;

function text(value, maximum, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim().replace(/\s+/g, ' ').slice(0, maximum) : fallback;
}

export class SceneValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SceneValidationError';
    this.code = 'invalid_scene_request';
    this.status = 400;
  }
}

export function validateSceneRequest(value) {
  const body = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const source = body.scene && typeof body.scene === 'object' && !Array.isArray(body.scene) ? body.scene : {};
  if (source.changed !== true) throw new SceneValidationError('A background can be generated only after a validated scene change.');
  const location = text(source.location, 100);
  if (!location) throw new SceneValidationError('scene.location is required.');
  return {
    scene: {
      changed: true,
      location,
      time: text(source.time, 40, 'unspecified time'),
      weather: text(source.weather, 60, 'calm'),
      mood: text(source.mood, 80, 'quiet')
    },
    characterId: text(body.characterId, 64),
    language: body.language === 'en' ? 'en' : 'zh'
  };
}

export function buildScenePrompt(scene) {
  return [
    'Original premium bright 2D visual-novel background for EchoLoom.',
    `Location: ${scene.location}. Time: ${scene.time}. Weather: ${scene.weather}. Mood: ${scene.mood}.`,
    'Airy cinematic composition, slate blue and champagne beige with muted sage accents, soft layered lighting, detailed environment.',
    'No characters, people, text, logos, interface, watermark, or imitation of an existing game. Landscape background, 16:9.'
  ].join(' ');
}

export function sceneFingerprint(prompt) {
  return createHash('sha256').update(prompt).digest('hex');
}

function sceneFile(cacheDir, fingerprint) {
  if (!FINGERPRINT_PATTERN.test(fingerprint)) throw new SceneValidationError('Invalid scene fingerprint.');
  return path.join(cacheDir, `${fingerprint}.jpg`);
}

function imageFromPayload(payload) {
  return typeof payload?.result?.image === 'string' ? payload.result.image
    : typeof payload?.image === 'string' ? payload.image
      : '';
}

function validImage(buffer) {
  const jpeg = buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer.at(-2) === 0xff && buffer.at(-1) === 0xd9;
  return jpeg && buffer.length <= 10 * 1024 * 1024;
}

export async function readSceneBackground(fingerprint, cacheDir) {
  try {
    const body = await readFile(sceneFile(cacheDir, fingerprint));
    return validImage(body) ? body : null;
  } catch {
    return null;
  }
}

export async function generateSceneBackground(value, config, { fetchImpl = fetch } = {}) {
  const request = validateSceneRequest(value);
  const prompt = buildScenePrompt(request.scene);
  const fingerprint = sceneFingerprint(prompt);
  const cachedBody = await readSceneBackground(fingerprint, config.sceneCacheDir);
  if (cachedBody) return { fingerprint, image: `/api/scenes/${fingerprint}.jpg`, cached: true, scene: request.scene };
  if (!config.cloudflare.accountId || !config.cloudflare.apiToken) {
    throw new ProviderError('Cloudflare scene generation is not configured.', 'provider_unavailable', 503);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.cloudflare.timeoutMs);
  try {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.cloudflare.accountId)}/ai/run/${config.cloudflare.model}`;
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.cloudflare.apiToken}`, 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ prompt, num_steps: 4, seed: Number.parseInt(fingerprint.slice(0, 8), 16) })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = text(payload?.errors?.[0]?.message, 240, `Cloudflare Workers AI returned ${response.status}.`);
      throw new ProviderError(message, response.status === 429 ? 'provider_rate_limited' : 'provider_error', response.status === 429 ? 429 : 502);
    }
    const body = Buffer.from(imageFromPayload(payload), 'base64');
    if (!validImage(body)) throw new ProviderError('Cloudflare Workers AI returned an invalid image.', 'provider_error', 502);
    await mkdir(config.sceneCacheDir, { recursive: true });
    await writeFile(sceneFile(config.sceneCacheDir, fingerprint), body, { flag: 'wx' }).catch(async (error) => {
      if (error?.code !== 'EEXIST') throw error;
    });
    return { fingerprint, image: `/api/scenes/${fingerprint}.jpg`, cached: false, scene: request.scene };
  } catch (error) {
    if (error?.name === 'AbortError') throw new ProviderError('Cloudflare scene generation timed out.', 'provider_timeout', 504);
    if (error instanceof ProviderError) throw error;
    throw new ProviderError('Cloudflare scene generation failed.', 'provider_error', 502);
  } finally {
    clearTimeout(timer);
  }
}
