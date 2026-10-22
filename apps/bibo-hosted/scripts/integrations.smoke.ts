import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { mockApi } from "./personal-workspace.fixture";
import type { BiboIntegration } from "@nextclaw/bibo-api";

const production = process.env.BIBO_SETTINGS_ORIGIN === "https://app.bibo.bot";
if (process.env.BIBO_SETTINGS_ORIGIN && !production) throw new Error("Use the official origin or the isolated local fixture.");
const port = String(31000 + process.pid % 15000), base = production ? "https://app.bibo.bot" : `http://127.0.0.1:${port}`;
const server = production ? null : spawn(process.execPath, [new URL("../node_modules/vite/bin/vite.js", import.meta.url).pathname, "preview", "--host", "127.0.0.1", "--port", port, "--strictPort"], { cwd: new URL("..", import.meta.url).pathname, stdio: "ignore" });
const artifacts = new URL(production ? "../../../.local/settings-production/" : "../../../.local/settings-browser/", import.meta.url);
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(production && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}) });
async function section(page: Page, name: string) {
  if (page.viewportSize()!.width <= 760 && await page.locator(".bibo-menu-button").getAttribute("aria-expanded") !== "true") await page.getByRole("button", { name: "打开菜单", exact: true }).click();
  await page.getByRole("navigation", { name: "设置分类" }).waitFor();
  if (name === "外观" && page.viewportSize()!.width === 390) await page.screenshot({ animations: "disabled", path: new URL("settings-menu-390.png", artifacts).pathname });
  await page.getByRole("navigation", { name: "设置分类" }).getByRole("link", { name, exact: true }).click();
  await page.locator("#settings-title").filter({ hasText: name }).waitFor();
}
try {
  for (let i = 0; !production && i < 100; i++) { if (await fetch(base).then((r) => r.ok).catch(() => false)) break; await new Promise((r) => setTimeout(r, 100)); }
  for (const width of production ? [1440] : [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    if (!production) await context.addInitScript(() => localStorage.setItem("bibo-ui-layout", JSON.stringify({ sidebarCollapsed: true })));
    const page = await context.newPage(), errors: string[] = [], created: string[] = [];
    page.setDefaultTimeout(production ? 30_000 : 12_000);
    page.on("pageerror", (error) => errors.push(error.message));
    let resets = 0, failedReset = true, failedRead = true, failedCreate = true;
    if (production) page.on("request", (request) => { if (new URL(request.url()).pathname === "/api/reset") resets++; });
    const integrationName = production ? `设置页面验证 ${Date.now()}` : "页面验收工具";
    let items: BiboIntegration[] = [{ id: "existing", name: "Bibo CLI", scopes: ["space:read", "space:write"], createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), lastUsedAt: new Date().toISOString() },
      { id: "expired", name: "资料整理脚本", scopes: ["space:read"], createdAt: "2026-01-01T00:00:00Z", expiresAt: "2026-01-02T00:00:00Z", lastUsedAt: null }];
    if (!production) {
      await mockApi(page);
      await page.route("**/api/reset", async (route) => { resets++; if (failedReset) { failedReset = false; return route.fulfill({ status: 503, json: { error: "暂时无法清空，请重试。" } }); } items = []; return route.fulfill({ json: { ok: true } }); });
      await page.route("**/api/integrations", async (route) => {
        const request = route.request();
        if (request.method() === "GET") { if (failedRead) { failedRead = false; return route.fulfill({ status: 503, json: { error: "暂时无法加载授权。" } }); } return route.fulfill({ json: { integrations: items } }); }
        const input = request.postDataJSON();
        if (input.operation === "create") {
          if (failedCreate) { failedCreate = false; return route.fulfill({ status: 503, json: { error: "服务暂时不可用，请重试。" } }); }
          const integration: BiboIntegration = { id: crypto.randomUUID(), name: input.name, scopes: input.scopes, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(), lastUsedAt: null };
          items.push(integration); return route.fulfill({ status: 201, json: { integration, token: "fixture-only-token-not-a-credential" } });
        }
        items = items.filter((item) => item.id !== input.id); return route.fulfill({ json: { revoked: input.id } });
      });
    }
    try {
      await page.goto(`${base}${production ? "/settings" : "/"}`, { waitUntil: "domcontentloaded" });
      if (production) {
        const account = JSON.parse(await readFile(join(homedir(), ".config/bibo-hosted/smoke-account.json"), "utf8")) as { email: string; password: string };
        const form = page.locator(".bibo-auth-form-pane form"); await form.getByLabel("邮箱").fill(account.email); await form.getByLabel("密码").fill(account.password); await form.getByRole("button", { name: "登录", exact: true }).click();
        await page.locator(".bibo-settings-email").filter({ hasText: account.email }).waitFor();
      } else {
        await page.setViewportSize({ width, height: width < 760 ? 844 : 1000 });
        if (width < 760) await page.getByRole("button", { name: "更多", exact: true }).click();
        await page.getByRole("button", { name: "账号与帮助", exact: true }).click();
        await page.getByRole("menuitem", { name: "设置", exact: true }).click();
        await page.locator("#settings-title").filter({ hasText: "账号" }).waitFor();
        await page.getByRole("dialog").waitFor({ state: "hidden" });
      }
      await section(page, "外观"); await page.getByRole("button", { name: "简约", exact: true }).click();
      await page.reload({ waitUntil: "domcontentloaded" });
      assert.equal(await page.locator("html").getAttribute("data-bibo-theme"), "neutral");
      await page.screenshot({ animations: "disabled", path: new URL(`appearance-neutral-${width}.png`, artifacts).pathname, fullPage: true });
      await page.getByRole("button", { name: "Bibo 经典", exact: true }).click();
      await section(page, "数据管理"); await page.getByRole("button", { name: "清空空间", exact: true }).click();
      await page.getByRole("dialog", { name: "清空个人空间？" }).waitFor();
      await page.getByRole("button", { name: "保留个人空间", exact: true }).click(); assert.equal(resets, 0);
      await section(page, "接入与授权");
      if (!production) { await page.getByRole("alert").filter({ hasText: "暂时无法加载授权" }).waitFor(); assert.equal(await page.getByRole("heading", { name: "还没有工具连接到你的空间" }).count(), 0); await page.getByRole("button", { name: "重新加载", exact: true }).click(); await page.getByRole("button", { name: "Bibo CLI", exact: true }).waitFor(); }
      assert.equal(await page.locator(".bibo-session-nav").count(), 0, "Settings never displays recent chats");
      assert.equal(await page.getByRole("link", { name: "返回空间", exact: true }).count(), 0, "Settings is a peer workspace page, not a nested flow with an extra back action");
      assert.equal(await page.getByRole("button", { name: "返回空间", exact: true }).count(), 0);
      if (width > 760) {
        const navigationTop = await page.locator(".bibo-navigation-rail").evaluate((rail) => {
          const firstLink = rail.querySelector(".bibo-primary-nav a")!;
          return firstLink.getBoundingClientRect().top - rail.getBoundingClientRect().top - parseFloat(getComputedStyle(rail).paddingTop);
        });
        assert.ok(navigationTop >= -1 && navigationTop <= 1, "Settings navigation starts at the rail's normal inset, with no placeholder for removed controls");
      }
      assert.equal(await page.locator('.bibo-primary-nav a[aria-current="page"]').count(), 0);
      if (!production) {
        const row = page.getByRole("table", { name: "有效授权", exact: true }).locator(".bibo-integration-row").first();
        await page.mouse.move(0, 0);
        const background = await row.evaluate((node) => getComputedStyle(node).backgroundColor);
        const metadata = row.locator(".bibo-integration-used");
        await metadata.hover();
        assert.equal(await row.evaluate((node) => getComputedStyle(node).backgroundColor), background, "Noninteractive row must not advertise a click action on hover");
        await metadata.click();
        assert.equal(await page.getByRole("dialog").count(), 0, "Metadata is not a details trigger");
        await page.screenshot({ animations: "disabled", path: new URL(`metadata-hover-${width}.png`, artifacts).pathname, fullPage: true });
        const name = row.getByRole("button", { name: "Bibo CLI", exact: true });
        await name.hover();
        assert.match(await name.evaluate((node) => getComputedStyle(node).textDecorationLine), /underline/);
        await name.focus(); await name.press("Enter");
        const details = page.getByRole("dialog", { name: "Bibo CLI", exact: true });
        await details.waitFor(); await details.getByRole("button", { name: "关闭", exact: true }).click();
        await details.waitFor({ state: "detached" });
      }
      await page.getByRole("button", { name: "创建访问令牌", exact: true }).click();
      const create = page.getByRole("dialog", { name: "创建访问令牌", exact: true });
      await create.getByLabel("名称", { exact: true }).fill(integrationName); await create.getByLabel("访问权限").selectOption("read");
      await page.screenshot({ animations: "disabled", path: new URL(`create-${width}.png`, artifacts).pathname, fullPage: true });
      await create.getByRole("button", { name: "创建令牌", exact: true }).click();
      if (!production) { await create.getByRole("alert").filter({ hasText: "服务暂时不可用" }).waitFor(); assert.equal(await create.getByLabel("名称", { exact: true }).inputValue(), integrationName); await create.getByRole("button", { name: "创建令牌", exact: true }).click(); }
      const secret = page.getByRole("dialog", { name: "保存你的访问令牌" }); await secret.waitFor();
      const token = await secret.getByLabel("访问令牌", { exact: true }).inputValue();
      if (production) {
        const response = await page.request.get(`${base}/api/integrations`); const list = (await response.json()).integrations as BiboIntegration[]; created.push(...list.filter((value) => value.name === integrationName).map((value) => value.id));
        assert.equal((await page.request.get(`${base}/api/v1/me`, { headers: { authorization: `Bearer ${token}` } })).status(), 200);
      }
      await secret.getByRole("button", { name: "我已保存，关闭" }).click();
      await page.getByLabel("访问令牌", { exact: true }).waitFor({ state: "detached" });
      assert.equal(await page.getByLabel("访问令牌", { exact: true }).count(), 0);
      assert.equal(await page.evaluate((value) => JSON.stringify(localStorage).includes(value), token), false);
      for (const screenshotWidth of production ? [1440, 390, 320] : [width]) {
        await page.setViewportSize({ width: screenshotWidth, height: screenshotWidth < 760 ? 844 : 1000 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.locator("#settings-title").click();
        const visibleRow = page.locator(".bibo-integration-row").filter({ has: page.getByRole("button", { name: integrationName, exact: true }) });
        const background = await visibleRow.evaluate((node) => getComputedStyle(node).backgroundColor);
        await visibleRow.locator(".bibo-integration-used").hover();
        assert.equal(await visibleRow.evaluate((node) => getComputedStyle(node).backgroundColor), background, "Published row metadata has no action hover");
        await page.screenshot({ animations: "disabled", path: new URL(`integrations-${screenshotWidth}.png`, artifacts).pathname, fullPage: true });
      }
      await page.setViewportSize({ width, height: width < 760 ? 844 : 1000 });
      await page.getByRole("button", { name: `查看 ${integrationName} 授权详情`, exact: true }).click();
      await page.getByRole("dialog", { name: integrationName, exact: true }).getByRole("button", { name: "撤销授权", exact: true }).click();
      await page.getByRole("button", { name: "确认撤销", exact: true }).click();
      await page.getByRole("button", { name: integrationName, exact: true }).waitFor({ state: "detached" });
      if (production) assert.equal((await page.request.get(`${base}/api/v1/me`, { headers: { authorization: `Bearer ${token}` } })).status(), 401);
      await page.goto(`${base}/integrations`, { waitUntil: "domcontentloaded" }); await page.waitForURL("**/settings/integrations");
      if (!production) {
        await section(page, "数据管理"); await page.getByRole("button", { name: "清空空间", exact: true }).click(); await page.getByRole("button", { name: "确认清空", exact: true }).click();
        await page.getByRole("alert").filter({ hasText: "暂时无法清空" }).waitFor(); await page.getByRole("button", { name: "确认清空", exact: true }).click(); await page.getByRole("status").filter({ hasText: "个人空间已清空" }).waitFor(); assert.equal(resets, 2);
        await section(page, "接入与授权"); await page.getByRole("heading", { name: "还没有工具连接到你的空间" }).waitFor();
        await page.screenshot({ animations: "disabled", path: new URL(`empty-${width}.png`, artifacts).pathname, fullPage: true });
      }
      if (width > 760) await page.getByRole("navigation", { name: "工作空间" }).getByRole("link", { name: "笔记", exact: true }).click();
      else await page.getByRole("navigation", { name: "手机快捷导航" }).getByRole("link", { name: "任务", exact: true }).click();
      await page.locator(".bibo-shell:not(.is-settings)").waitFor();
      assert.equal(await page.locator(".bibo-run-status").count(), 0, "Global navigation does not expose execution status");
      if (production) assert.equal(resets, 0, "Production verification never clears space");
      assert.deepEqual(errors, []); console.log(JSON.stringify({ settings: "passed", width, production }));
    } catch (error) { await page.screenshot({ animations: "disabled", path: new URL(`failure-${width}.png`, artifacts).pathname, fullPage: true }).catch(() => undefined); throw error; }
    finally {
      if (production) for (const id of created) await page.request.post(`${base}/api/integrations`, { data: { operation: "revoke", id } }).catch(() => undefined);
      await context.close();
    }
  }
} finally { await browser.close(); server?.kill("SIGTERM"); }
