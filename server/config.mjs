import path from 'node:path';

const clean = (value) => typeof value === 'string' ? value.trim() : '';

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, parsed));
}

function optionalHttpUrl(value) {
  const candidate = clean(value);
  if (!candidate) return '';
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.href.replace(/\/$/, '') : '';
  } catch {
    return '';
  }
}

function optionalUuid(value) {
  const candidate = clean(value);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate) ? candidate : '';
}

export function loadConfig(env = process.env, root = process.cwd()) {
  const sceneCacheSetting = clean(env.ECHOLOOM_SCENE_CACHE_DIR) || '.cache/echoloom-scenes';
  return {
    gemini: {
      apiKey: clean(env.GEMINI_API_KEY),
      model: clean(env.GEMINI_MODEL) || 'gemini-3.6-flash',
      timeoutMs: boundedInteger(env.GEMINI_TIMEOUT_MS, 12_000, 1_000, 30_000)
    },
    supabase: {
      url: optionalHttpUrl(env.SUPABASE_URL),
      serviceRoleKey: clean(env.SUPABASE_SERVICE_ROLE_KEY),
      demoUserId: optionalUuid(env.ECHOLOOM_DEMO_USER_ID)
    },
    cloudflare: {
      accountId: clean(env.CLOUDFLARE_ACCOUNT_ID),
      apiToken: clean(env.CLOUDFLARE_API_TOKEN),
      model: clean(env.CLOUDFLARE_FLUX_MODEL) || '@cf/black-forest-labs/flux-1-schnell',
      timeoutMs: boundedInteger(env.CLOUDFLARE_TIMEOUT_MS, 20_000, 2_000, 45_000)
    },
    sceneCacheDir: path.resolve(root, sceneCacheSetting)
  };
}

export function providerStatus(config) {
  return {
    gemini: {
      configured: Boolean(config.gemini.apiKey),
      model: config.gemini.model
    },
    persistence: {
      configured: Boolean(config.supabase.url && config.supabase.serviceRoleKey && config.supabase.demoUserId),
      provider: 'supabase'
    },
    scenes: {
      configured: Boolean(config.cloudflare.accountId && config.cloudflare.apiToken),
      provider: 'cloudflare-workers-ai',
      model: config.cloudflare.model
    },
    offlineFallback: true
  };
}

