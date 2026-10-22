# Bibo CLI

Your personal context and assets, accessible to every authorized AI.

```sh
npm install -g @nextclaw/bibo
bibo auth login
bibo task list --open
bibo note create --path hello.md --content 'Hello from my agent'
bibo skill install --path ~/.codex/skills
```

Node 22+. Login opens browser consent and automatically polls for approval. Use `bibo auth login --no-browser` on VPS/SSH, then open its link or enter the short code on another device. Add `--read-only` to request read access. Manual scoped tokens remain at https://app.bibo.bot/integrations; automation can use `--token-stdin` or `BIBO_API_TOKEN`. Never put a token in an argument or commit it.

[Full documentation](https://docs.bibo.bot/) · [Source](https://github.com/Peiiii/bibo)
