import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const external = process.env.BIBO_DOCS_ORIGIN;
const port = String(31000 + process.pid % 15000);
const origin = external || `http://127.0.0.1:${port}`;
const server = external ? null : spawn(process.execPath, [new URL("../../bibo-docs/node_modules/vitepress/bin/vitepress.js", import.meta.url).pathname,
  "preview", ".", "--host", "127.0.0.1", "--port", port], { cwd: new URL("../../bibo-docs/", import.meta.url).pathname, stdio: "ignore" });
const artifacts = new URL(`../../../.local/docs-r2-${external ? "production" : "local"}/`, import.meta.url);
await mkdir(artifacts, { recursive: true });
const features = [
  ["notes", "笔记"], ["files", "文件与目录"], ["tasks", "待办与任务"], ["projects", "项目"],
  ["events", "日程"], ["inbox", "收件箱"], ["assets", "图片资产"], ["overview", "空间概览"],
];
const browser = await chromium.launch({ headless: true });
const errors: string[] = [];
try {
  for (let i = 0; i < 100; i++) {
    if (await fetch(origin, { signal: AbortSignal.timeout(5000) }).then((r) => r.ok).catch(() => false)) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(origin);
  for (const [slug, title] of features) {
    const card = page.locator(`.VPFeature[href="/features/${slug}"]`);
    await card.waitFor(); assert.match(await card.innerText(), new RegExp(title));
  }
  await page.screenshot({ path: new URL("home-desktop.png", artifacts).pathname, fullPage: true });
  // Crawl the real rendered link tree, including sidebars, footer, anchors and downloads.
  const pending = ["/"], visited = new Set<string>();
  while (pending.length) {
    const path = pending.shift()!;
    if (visited.has(path)) continue;
    visited.add(path);
    const response = await page.goto(origin + path);
    assert.equal(response?.status(), 200, path);
    await page.locator(".VPNavBar").waitFor();
    const links = await page.locator("a[href]").evaluateAll((nodes) => nodes.map((node) => (node as HTMLAnchorElement).href));
    for (const link of links) {
      const url = new URL(link);
      assert.ok(!link.startsWith("https://app.bibo.bot/docs"), `Old documentation entry: ${link}`);
      if (url.origin !== origin || /\.(json|md|yaml)$/.test(url.pathname)) continue;
      if (url.pathname === path && url.hash) {
        assert.ok(await page.locator(`[id=${JSON.stringify(decodeURIComponent(url.hash.slice(1)))}]`).count(), `Broken anchor: ${link}`);
      }
      if (!visited.has(url.pathname)) pending.push(url.pathname);
    }
  }
  for (const [slug, title] of features) {
    await page.goto(`${origin}/features/${slug}`);
    await page.getByRole("heading", { level: 1, name: new RegExp(`^${title}`) }).waitFor();
    assert.ok(await page.locator(".vp-doc div[class*=language-]").count() >= 2, `${slug}: CLI and HTTP examples`);
    assert.match(await page.locator(".vp-doc").innerText(), /result|items/);
    await page.locator(".VPSidebar").getByRole("link", { name: "待办与任务", exact: true }).waitFor();
  }
  await page.goto(`${origin}/features/tasks`);
  await page.screenshot({ path: new URL("tasks-desktop.png", artifacts).pathname, fullPage: true });
  await page.getByRole("button", { name: "搜索文档", exact: true }).click();
  await page.locator("#localsearch-input").fill("task.create");
  const searchResult = page.locator(".VPLocalSearchBox a[href*='/features/tasks']").first();
  await searchResult.waitFor(); await searchResult.click();
  await page.locator(".VPLocalSearchBox").waitFor({ state: "detached" });
  assert.match(page.url(), /\/features\/tasks/);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${origin}/features/tasks`);
    await page.getByRole("button", { name: "目录", exact: true }).click();
    for (const [, title] of features) await page.locator(".VPSidebar").getByRole("link", { name: title, exact: true }).waitFor();
    await page.locator(".VPSidebar").getByRole("link", { name: "笔记", exact: true }).click();
    await page.getByRole("heading", { name: /^笔记/, level: 1 }).waitFor();
    await page.locator(".VPBackdrop").waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}`);
    await page.screenshot({ path: new URL(`notes-mobile-${width}.png`, artifacts).pathname, fullPage: true, animations: "disabled" });
  }
  const schema = await (await fetch(`${origin}/openapi.json`)).json() as { paths: Record<string, unknown> };
  assert.ok(schema.paths["/space"] && schema.paths["/assets"]);
  const skill = await (await fetch(`${origin}/downloads/bibo-space/SKILL.md`)).text();
  assert.match(skill, /https:\/\/docs.bibo.bot\//);
  if (external) {
    assert.equal((await fetch(`${origin}/features/not-a-real-page`)).status, 404);
    assert.equal((await fetch(origin, { method: "HEAD" })).status, 200);
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ origin, features: features.length, pages: visited.size, search: "passed", mobile: [390, 320], artifacts: artifacts.pathname }));
} finally { await browser.close(); server?.kill("SIGTERM"); }
