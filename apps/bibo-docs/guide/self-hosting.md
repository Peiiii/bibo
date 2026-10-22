# 自部署与开发

Bibo 源码独立维护在 [Peiiii/bibo](https://github.com/Peiiii/bibo)。公共 API、CLI 和文档与官方空间使用同一份实现；无需本地 NextClaw checkout。

## 工具链与构建

使用仓库 `.nvmrc` 指定的 Node 版本和 pnpm 9.15.1：

```sh
git clone https://github.com/Peiiii/bibo.git
cd bibo
pnpm install --frozen-lockfile
pnpm build:packages
pnpm typecheck
pnpm test
pnpm build
```

`pnpm dev` 是无凭据 UI 预览，不连接真实账户和云端空间。完整本地 Worker 开发使用 `pnpm dev:worker` 和 `pnpm dev:proxy`，并配置对应资源。

## Cloudflare 配置

默认 `apps/bibo-hosted/wrangler.toml` 是个人自部署配置。为自己的 Cloudflare 账户创建独立 R2 bucket、DO 绑定和 Worker 域名，保留类名/迁移结构。配置 `BIBO_AUTH_MODE=self-hosted` 和主人邮箱，以 Wrangler Secret 配置至少 16 字符的 `BIBO_OWNER_PASSWORD`；聊天等额外能力需要对应模型配置。具体资源和秘密入口见[应用 README](https://github.com/Peiiii/bibo/tree/main/apps/bibo-hosted)。

```sh
pnpm build
pnpm -C apps/bibo-hosted exec wrangler secret put BIBO_OWNER_PASSWORD
pnpm deploy
```

默认 `pnpm deploy` 服务自部署；`deploy:hosted` 是维护者的官方托管发布入口，有冻结远程 main 的 preflight。不要将自部署资源指向官方 bucket。

部署后登录自己的域名创建访问令牌：

```sh
bibo auth login --endpoint https://your-bibo.example
bibo auth status
```

公共 API 本身不依赖模型额度或 Linux 沙箱。文档构建到同一 Worker 的 `/docs/`，可以匿名访问。

## NPM 发布

仓库 `.github/workflows/release.yml` 是独立的发布入口。维护者通过 `npm-production` 环境的 `NPM_TOKEN` 认证，先验证、打包 SDK/CLI，再发布公开 `@nextclaw` 包。用户安装无需该 token。包版本不可覆盖，发布后由 registry 与真实安装核验。
