# Contributing to Bibo

Start with a reproducible issue or a real use case. Include your Bibo release, Node version, relevant deployment setting names, expected behavior and actual behavior. Remove cookies, passwords, keys, private files and conversation content before sharing logs.

Use Node.js from `.nvmrc` and pnpm from `package.json`. Run `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build` and the Wrangler dry-run documented in the README. UI changes should be checked at desktop and mobile widths, including keyboard use and failure recovery. `pnpm dev` provides a credential-free preview.

This repository is Bibo's development source of truth. Submit app, client/UI, website and product-documentation changes here, against `main`; no export or upstream application sync is required. Read [AGENTS.md](AGENTS.md) and the [product direction](docs/VISION.md) before changing product boundaries. `SOURCE.json` retains historical provenance only.

Agent execution belongs to the public NextClaw Harness. Keep Bibo's domain actions shared between UI and agent; do not introduce another agent loop or duplicate persistence. Generic core fixes belong in [NextClaw](https://github.com/Peiiii/nextclaw); consume them through released public packages with explicit versions, without local checkout aliases or copied core code.

Keep pull requests focused. Describe the user result and your verification; add tests for meaningful behavior or regressions. Do not commit build output, credentials or local data. Contributions retain the MIT license.

## Maintainer release and recovery

Run **Release Bibo NPM** on `main`; its `npm-production` environment owns `NPM_TOKEN`. It verifies, packs and installs both public packages before publishing SDK then CLI. Keep accepted versions immutable. A new package can be accepted by npm while its scan/index still returns 404: the publisher waits up to five minutes, and always uploads tarballs plus any `accepted.json` receipt. If processing outlasts that window, wait for registry visibility, verify the published integrity, then resume the workflow. Do not repeat a pending publish or change a version to hide propagation delay. The same Linux CI tarball is the integrity authority; local macOS gzip headers can differ even when the entire uncompressed tar is identical.

Official app deployment uses `pnpm deploy:hosted`; developer documentation uses the independent `pnpm deploy:docs` Worker at `docs.bibo.bot`. Both deploy from clean remote `main`. App builds do not include documentation assets. Preflight accepts the official repository through HTTPS, SCP SSH and GitHub SSH 443; repository identity, clean status and remote SHA remain mandatory. Keep container rollout disabled for ordinary app/docs releases.

UI fixtures use `scripts/integrations.smoke.ts`; production validation uses `scripts/integrations-live.smoke.ts` with a newly registry-installed CLI and the dedicated owner-only smoke account file. Never expose its credentials or token. Production cleanup removes exact test objects and all test keys; a resolved inbox receipt and a tiny image remain because the public API has no deletion operation for those assets.


Documentation verification: `pnpm build:docs && pnpm smoke:docs` checks the rendered link tree, all eight feature guides, action search, 390/320px navigation, OpenAPI and Skill downloads. For deployed checks use `BIBO_DOCS_ORIGIN=https://docs.bibo.bot pnpm smoke:docs`; this additionally verifies real clean URLs, HEAD and missing-page status. VitePress preview instances must start after the current build so their asset index is current.
