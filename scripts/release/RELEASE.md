Bibo's public space API, JavaScript SDK, CLI, and agent Skill are available.

```sh
npm install -g @nextclaw/bibo
bibo auth login
bibo overview
```

Create a scoped, expiring access token at https://app.bibo.bot/integrations.

- Documentation: https://app.bibo.bot/docs/
- SDK: `@nextclaw/bibo-api`
- Skill: `bibo skill install --path ~/.codex/skills`
- Notes, files, projects, tasks, events, inbox and image assets share the web app's existing space.
- Read-only/write scopes, revocation, version conflicts and bounded idempotency receipts protect integrations.

Node 22+. General chat execution, agent messaging and arbitrary binary uploads are outside this release.
