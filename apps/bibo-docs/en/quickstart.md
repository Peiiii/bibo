# Connect an agent to Bibo

Bibo is a shared personal context and asset space. Its web app, built-in assistant and authorized external tools use the same notes, files, projects, tasks, events and inbox.

1. Sign in at [Bibo](https://app.bibo.bot).
2. Install the CLI (Node 22+) and authorize in your browser:

```sh
npm install -g @nextclaw/bibo
bibo auth login
bibo auth status
bibo actions
bibo overview
```

Login opens a prefilled consent page. Check the code and permissions, then approve; the CLI polls automatically and saves private credentials. On VPS/SSH, use `bibo auth login --no-browser` and open its link on another device, or enter the short code at https://app.bibo.bot/authorize. Requests expire after 10 minutes. `--read-only` requests read access. No token copying is needed.

3. With write access, create and verify an object:

```sh
bibo note create --path agent-plan.md --content '# My plan' --request-id agent-plan-2026-10-22
bibo note get agent-plan.md --raw
bibo task create --title 'Review the plan'
```

4. Install the agent skill into your host's skills directory:

```sh
bibo skill install --path ~/.codex/skills
```

Use `BIBO_API_TOKEN` for secret-managed automation and `BIBO_ENDPOINT` for self-hosted installations. Login also supports `--token-stdin`; never put tokens in arguments. Local credentials are private and bound to their endpoint.

The API origin is `https://app.bibo.bot`, with `GET /api/v1/me`, `GET /api/v1/actions`, `POST /api/v1/space`, image upload/download, and self-revocation. Every request requires a Bearer token. JSON responses are `{result,requestId}`; errors are `{error:{code,message},requestId}`. See [API reference](../api/reference) and [OpenAPI](/openapi.json).

Updates require versions. CLI object commands fetch the current version unless explicitly supplied; use `--version` to protect a previously read snapshot. On 409, re-read and reconcile. Use a stable input requestId for identical retries; receipts are scoped per token/actor and retain at most 100 recent writes or 2 MiB of receipts. SDK never automatically retries writes. On network/persistence failure, inspect state before retrying.

Tokens allow 60 requests per minute, expire in 1–365 days, and can be revoked immediately in the web app or via `bibo auth logout`. Images support PNG/JPEG/GIF/WebP/AVIF up to 10 MiB. No general chat execution, agent messaging, arbitrary binary upload or scheduling API is exposed in this release.

JavaScript integrations can install `@nextclaw/bibo-api` and use `new BiboApi({token}).call(action,input)`. [SDK guide](../guide/sdk) · [CLI reference](../cli/reference) · [Skill](../guide/skill).
