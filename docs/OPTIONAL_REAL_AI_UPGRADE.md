# Optional real-AI upgrade

The shipped prototype deliberately uses the deterministic offline `EchoEngine` so it can be demonstrated without an account, network connection, or API key.

When a real model is introduced, keep the existing offline mode and preserve this interface:

- `storyReply(input, state)`
- `chatReply(input, state)`
- `generateScene(prompt, selectedSceneId, state)`
- `sceneReply(input, scene, state)`

EchoLink core-character private messages reuse `chatReply(input, state)`. Group knowledge attribution, delayed delivery, permissions, promises, and the separation between private player intent and visible message text remain deterministic product rules around the provider; a live model must not silently override them. Side contacts can gain model-backed replies later, but should receive only the knowledge and relationship context available to that specific contact.

## Security requirements

- Never put an API key in `app/*.js` or any browser-delivered file.
- Add a local or hosted server-side proxy.
- Read the secret from an environment variable.
- Validate and limit requests on the server.
- Keep export/import data local unless the user explicitly opts into synchronization.
- Make the UI clearly distinguish offline simulation from a live model.
- Never send the private intent label as though it were dialogue spoken to the character; treat it as bounded interpretation metadata.

## Suggested Codex task

```text
Read AGENTS.md, docs/PRODUCT_BRIEF.md, docs/ARCHITECTURE.md, and docs/OPTIONAL_REAL_AI_UPGRADE.md. First write an implementation plan using PLANS.md. Add an optional server-side live-model provider without placing secrets in browser code. Preserve the existing offline provider as the default and fallback, keep the EchoEngine method contract, add .env.example without a real key, add error/timeout handling, and run npm test. Do not change the product principles or visual direction.
```
