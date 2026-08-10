import assert from 'node:assert/strict';
import { loadConfig, parseEnvText, providerStatus } from '../server/config.mjs';

const parsed = parseEnvText(`
# local-only secrets
GEMINI_API_KEY="gemini-test"
GEMINI_MODEL=gemini-test # selected model
export CLOUDFLARE_ACCOUNT_ID='account-test'
SUPABASE_URL=https://example.supabase.co
`);
assert.equal(parsed.GEMINI_API_KEY, 'gemini-test');
assert.equal(parsed.GEMINI_MODEL, 'gemini-test');
assert.equal(parsed.CLOUDFLARE_ACCOUNT_ID, 'account-test');

const config = loadConfig({ ...parsed, CLOUDFLARE_API_TOKEN: 'token-test' }, '/tmp/echoloom-config-test');
assert.equal(config.gemini.apiKey, 'gemini-test');
assert.equal(config.supabase.url, 'https://example.supabase.co');
const status = providerStatus(config);
assert.equal(status.gemini.configured, true);
assert.equal(status.scenes.configured, true);
assert.equal(JSON.stringify(status).includes('gemini-test'), true);
assert.equal(JSON.stringify(status).includes('token-test'), false);

console.log('EchoLoom environment configuration test: PASS');
console.log('Checked dependency-free .env parsing, bounded provider configuration, and secret-free status output.');
