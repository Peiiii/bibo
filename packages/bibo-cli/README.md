# Bibo CLI

Your personal context and assets, accessible to every authorized AI.

```sh
npm install -g @nextclaw/bibo
bibo auth login
bibo task list --open
bibo note create --path hello.md --content 'Hello from my agent'
bibo skill install --path ~/.codex/skills
```

Node 22+. Create a scoped access token at https://app.bibo.bot/integrations. Login uses hidden input; automation can use `--token-stdin` or `BIBO_API_TOKEN`. Never put a token in an argument or commit it.

[Full documentation](https://docs.bibo.bot/) · [Source](https://github.com/Peiiii/bibo)
