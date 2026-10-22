import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { mockApi } from "./personal-workspace.fixture";
import type { BiboIntegration } from "@nextclaw/bibo-api";

const port = String(31000 + process.pid % 15000), base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [new URL("../node_modules/vite/bin/vite.js", import.meta.url).pathname, "preview", "--host", "127.0.0.1", "--port", port, "--strictPort"], { cwd: new URL("..", import.meta.url).pathname, stdio: "ignore" });
const artifacts = new URL("../../../.local/integrations-browser/", import.meta.url);
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (let i = 0; i < 100; i++) { if (await fetch(base).then((r) => r.ok).catch(() => false)) break; await new Promise((r) => setTimeout(r, 100)); }
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: width < 760 ? 844 : 1000 } });
    const page = await context.newPage(), errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await mockApi(page);
    let items: BiboIntegration[] = [], failedOnce = true;
    await page.route("**/api/integrations", async (route) => {
      const request = route.request();
      if (request.method() === "GET") return route.fulfill({ json: { integrations: items } });
      const input = request.postDataJSON();
      if (input.operation === "create") {
        if (failedOnce) { failedOnce = false; return route.fulfill({ status: 503, json: { error: "测试：服务暂时不可用，请重试。" } }); }
        const integration: BiboIntegration = { id: crypto.randomUUID(), name: input.name, scopes: input.scopes, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86_400_000).toISOString(), lastUsedAt: null };
        items.push(integration);
        return route.fulfill({ status: 201, json: { integration, token: "fixture-only-token-not-a-credential" } });
      }
      items = items.filter((item) => item.id !== input.id);
      return route.fulfill({ json: { revoked: input.id } });
    });
    await page.goto(`${base}/integrations`);
    await page.getByRole("heading", { name: "让你信任的 AI 接入空间" }).waitFor();
    await page.getByText("还没有外部工具接入你的空间。").waitFor();
    await page.getByLabel("授权给谁").fill("验收用编程助手");
    await page.getByLabel("空间权限").selectOption("write");
    await page.getByRole("button", { name: "创建令牌", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "测试：服务暂时不可用" }).waitFor();
    await page.getByRole("button", { name: "创建令牌", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "保存你的访问令牌" }); await dialog.waitFor();
    assert.equal(await page.getByLabel("访问令牌", { exact: true }).inputValue(), "fixture-only-token-not-a-credential");
    await dialog.getByRole("button", { name: "我已保存，关闭" }).click();
    await page.getByLabel("访问令牌", { exact: true }).waitFor({ state: "detached" });
    await page.getByRole("heading", { name: /验收用编程助手/ }).waitFor();
    assert.equal(await page.getByLabel("访问令牌", { exact: true }).count(), 0);
    assert.equal(await page.evaluate(() => JSON.stringify(localStorage).includes("fixture-only-token")), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: new URL(`authorization-${width}.png`, artifacts).pathname, fullPage: true });
    await page.getByRole("button", { name: "撤销 验收用编程助手" }).click();
    await page.getByRole("button", { name: "确认撤销" }).click();
    await page.getByText("还没有外部工具接入你的空间。").waitFor();
    assert.deepEqual(errors, []);
    await context.close();
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${base}/docs/`); await page.getByRole("heading", { name: "从一条命令开始" }).waitFor();
  await page.screenshot({ path: new URL("docs-desktop.png", artifacts).pathname, fullPage: true });
  // Vite preview is a static fixture server; clean URLs are verified on the deployed Worker.
  await page.goto(`${base}/docs/guide/quickstart.html`); await page.getByRole("heading", { name: /^五分钟接入/ }).waitFor();
  const mobileDocs = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobileDocs.goto(`${base}/docs/guide/quickstart.html`);
  await mobileDocs.getByRole("heading", { name: /^五分钟接入/ }).waitFor();
  await mobileDocs.screenshot({ path: new URL("docs-mobile.png", artifacts).pathname, fullPage: true, animations: "disabled" });
  assert.equal(await mobileDocs.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const openapi = await fetch(`${base}/docs/openapi.json`); assert.equal(openapi.status, 200); assert.ok((await openapi.json() as { paths: unknown }).paths);
  const skill = await fetch(`${base}/docs/downloads/bibo-space/SKILL.md`); assert.match(await skill.text(), /name: bibo-space/);
  console.log(JSON.stringify({ integrations: "passed", widths: [1440, 390, 320], docs: "passed", artifacts: artifacts.pathname }));
} finally { await browser.close(); server.kill("SIGTERM"); }
