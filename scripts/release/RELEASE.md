Bibo 0.1.1 makes developer documentation easier to discover and use.

The independent documentation site now lives at https://docs.bibo.bot/ with dedicated guides for notes, files, tasks, projects, events, inbox, image assets and space overview. Each guide includes CLI and HTTP examples, operation fields and current limits. CLI help, the bundled Skill and package homepages use the new domain. Existing app documentation links redirect to it.

Bibo's public space API, JavaScript SDK, CLI, and agent Skill are available.

```sh
npm install -g @nextclaw/bibo
bibo auth login
bibo overview
```

Create a scoped, expiring access token at https://app.bibo.bot/integrations.

- Documentation: https://docs.bibo.bot/
- SDK: `@nextclaw/bibo-api`
- Skill: `bibo skill install --path ~/.codex/skills`
- Notes, files, projects, tasks, events, inbox and image assets share the web app's existing space.
- Read-only/write scopes, revocation, version conflicts and bounded idempotency receipts protect integrations.

Node 22+. General chat execution, agent messaging and arbitrary binary uploads are outside this release.
