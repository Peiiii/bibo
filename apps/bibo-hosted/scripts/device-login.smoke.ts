import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, stat, rm, open } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { join, resolve, relative } from "node:path";
import { chromium } from "playwright";

const directory = await mkdtemp(join(tmpdir(), "bibo-device-browser-"));
const production = process.env.BIBO_DEVICE_ORIGIN === "https://app.bibo.bot";
if (process.env.BIBO_DEVICE_ORIGIN && !production) throw new Error("Use the official production origin or the isolated local fixture.");
const account = production ? JSON.parse(await readFile(join(homedir(), ".config/bibo-hosted/smoke-account.json"), "utf8")) as { email: string; password: string } : { email: "owner@example.com", password: "local-disposable-password-123456" };
const artifacts = new URL(production ? "../../../.local/device-auth-production/" : "../../../.local/device-auth-browser/", import.meta.url);
await mkdir(artifacts, { recursive: true });
const port = String(33000 + process.pid % 10000), origin = production ? "https://app.bibo.bot" : `http://127.0.0.1:${port}`;
const config = join(directory, "wrangler.toml");
const source = await readFile("wrangler.toml", "utf8");
await writeFile(config, source.replace('main = "src/app/bibo-hosted.app.ts"', `main = ${JSON.stringify(resolve("src/app/bibo-hosted.app.ts"))}`)
  .replace('name = "bibo-personal"', `name = "bibo-personal"\ntsconfig = ${JSON.stringify(relative(directory, resolve("tsconfig.json")))}`)
  .replace('directory = "./dist/public"', `directory = ${JSON.stringify(resolve("dist/public"))}`)
  .replace(', "durable_object_io_tasks_prevent_eviction"', "")
  .replace(/\[\[containers\]\][\s\S]*?(?=\n\[|$)/g, "")
  .replace('BIBO_OWNER_EMAIL = "owner@example.com"', 'BIBO_OWNER_EMAIL = "owner@example.com"\nBIBO_OWNER_PASSWORD = "local-disposable-password-123456"'));
const workerLog = await open(new URL("worker.log", artifacts), "w");
const worker = production ? null : spawn(process.execPath, [resolve("node_modules/wrangler/bin/wrangler.js"), "dev", "--config", config, "--port", port, "--persist-to", join(directory, "state")], { cwd: directory, stdio: ["ignore", workerLog.fd, workerLog.fd] });
if (production && !process.env.BIBO_LIVE_CLI?.includes("node_modules/@nextclaw/bibo/dist/bin.js")) throw new Error("Production verification requires a freshly registry-installed CLI.");
const cli = process.env.BIBO_LIVE_CLI ?? resolve("../../packages/bibo-cli/dist/bin.js");
const bin = join(directory, "bin"), capture = join(directory, "browser-url");
const children: ReturnType<typeof spawn>[] = [];
await mkdir(bin);
await writeFile(join(bin, process.platform === "darwin" ? "open" : "xdg-open"), '#!/bin/sh\nprintf "%s" "$1" > "$BIBO_BROWSER_CAPTURE"\n', { mode: 0o700 });
const startCli = (name: string, flags: string[] = []) => {
  const child = spawn(process.execPath, [cli, "auth", "login", "--endpoint", origin, "--name", name, ...flags], {
    env: { ...process.env, XDG_CONFIG_HOME: join(directory, name), BIBO_API_TOKEN: "", BIBO_ENDPOINT: "", SSH_CONNECTION: "", SSH_TTY: "", DISPLAY: ":fixture", BIBO_BROWSER_CAPTURE: capture, PATH: `${bin}:${process.env.PATH}` }, stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  let stdout = "", stderr = "";
  const ready = new Promise<{ url: string; code: string }>((accept, reject) => {
    child.stderr.on("data", (chunk) => { stderr += chunk; const url = stderr.match(/Open: (\S+)/)?.[1], code = stderr.match(/Code: ([A-Z2-9-]+)/)?.[1]; if (url && code) accept({ url, code }); });
    child.on("error", reject); child.on("exit", (code) => { if (code) reject(new Error(stderr)); });
  });
  const done = new Promise<{ code: number | null; stdout: string; stderr: string }>((accept, reject) => {
    child.stdout.on("data", (chunk) => { stdout += chunk; }); child.on("error", reject); child.on("exit", (code) => accept({ code, stdout, stderr }));
  });
  return { ready, done, child, diagnostics: () => stderr };
};
const browser = await chromium.launch({ headless: true, ...(production && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}) });
try {
  for (let i = 0; !production && i < 200; i++) {
    if (worker?.exitCode !== null) throw new Error("Local authorization Worker failed to start; see worker.log");
    if (await fetch(origin).then((response) => response.ok).catch(() => false)) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const workspaceCalls: string[] = [];
  page.on("request", (request) => { const path = new URL(request.url()).pathname; if (/^\/api\/(sessions|history|runs|space|chat)(\/|$)/.test(path)) workspaceCalls.push(path); });
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  const first = startCli("Browser test CLI"), start = await first.ready;
  await page.goto(start.url, { waitUntil: "domcontentloaded" });
  await page.locator(".bibo-auth-form-pane").getByLabel("邮箱").waitFor();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
    assert.equal(await page.locator(".bibo-shell, .bibo-sidebar, .bibo-mobile-nav").count(), 0);
    await page.screenshot({ animations: "disabled", path: new URL(`login-${width}.png`, artifacts).pathname, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator(".bibo-auth-form-pane").getByLabel("邮箱").fill(account.email);
  await page.locator(".bibo-auth-form-pane").getByLabel("密码").fill(account.password);
  await page.locator(".bibo-auth-form-pane form").getByRole("button", { name: "登录", exact: true }).click();
  await page.getByRole("button", { name: "授权读写空间", exact: true }).waitFor();
  let captured = "";
  for (let i = 0; i < 60; i++) {
    captured = await readFile(capture, "utf8").catch(() => ""); if (captured) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(captured, start.url, `Default login opens the prefilled authorization URL: ${first.diagnostics()}`);
  assert.equal((await page.locator(".bibo-device-auth__code").innerText()).trim(), start.code);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ animations: "disabled", path: new URL(`consent-${width}.png`, artifacts).pathname, fullPage: true });
  }
  await page.getByRole("button", { name: "授权读写空间", exact: true }).click();
  await page.getByRole("heading", { name: "授权成功", exact: true }).waitFor();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
    assert.equal(await page.locator(".bibo-shell, .bibo-sidebar, .bibo-mobile-nav").count(), 0);
    const card = await page.locator(".bibo-authorization__result").boundingBox(); assert.ok(card && card.height < 450);
    await page.screenshot({ animations: "disabled", path: new URL(`success-${width}.png`, artifacts).pathname, fullPage: true });
  }
  const firstResult = await first.done; assert.equal(firstResult.code, 0, firstResult.stderr);
  const saved = join(directory, "Browser test CLI/bibo/config.json");
  const credential = JSON.parse(await readFile(saved, "utf8")) as { token: string };
  assert.equal((await stat(saved)).mode & 0o777, 0o600);
  assert.ok(!`${firstResult.stderr}${firstResult.stdout}`.includes(credential.token));
  await page.setViewportSize({ width: 1440, height: 1000 });
  const remote = startCli("Remote readonly CLI", ["--no-browser", "--read-only"]), remoteStart = await remote.ready;
  await page.goto(`${origin}/authorize`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("设备授权码", { exact: true }).fill(remoteStart.code);
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await page.getByRole("button", { name: "授权读取空间", exact: true }).click();
  assert.equal((await remote.done).code, 0);
  const readonly = JSON.parse(await readFile(join(directory, "Remote readonly CLI/bibo/config.json"), "utf8")) as { token: string };
  const deniedWrite = await fetch(`${origin}/api/v1/space`, { method: "POST", headers: { authorization: `Bearer ${readonly.token}` }, body: JSON.stringify({ action: "task.create", input: { title: "must not write" } }) });
  assert.equal(deniedWrite.status, 403);
  const denied = startCli("Denied CLI", ["--no-browser"]), deniedStart = await denied.ready;
  await page.goto(deniedStart.url, { waitUntil: "domcontentloaded" }); await page.getByRole("button", { name: "拒绝", exact: true }).click();
  await page.getByRole("heading", { name: "已拒绝授权", exact: true }).waitFor();
  assert.notEqual((await denied.done).code, 0);
  await assert.rejects(stat(join(directory, "Denied CLI/bibo/config.json")), { code: "ENOENT" });
  await page.screenshot({ animations: "disabled", path: new URL("denied.png", artifacts).pathname, fullPage: true });
  await page.goto(`${origin}/authorize?user_code=ZZZZZZZZ`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "授权链接已过期", exact: true }).waitFor();
  await page.screenshot({ animations: "disabled", path: new URL("expired.png", artifacts).pathname, fullPage: true });
  await page.getByRole("button", { name: "输入其他授权码", exact: true }).click();
  await page.getByLabel("设备授权码", { exact: true }).waitFor();
  await page.getByRole("button", { name: "切换账号", exact: true }).click();
  await page.locator(".bibo-auth-form-pane").getByLabel("邮箱").waitFor();
  assert.deepEqual(workspaceCalls, [], "Authorization never initializes chats, history, space or subscriptions");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ defaultBrowser: "passed", remoteManualCode: "passed", denial: "passed", readonly: "passed", privateCredentials: "passed", widths: [1440, 390, 320], artifacts: artifacts.pathname }));
} catch (error) {
  await browser.contexts()[0]?.pages()[0]?.screenshot({ animations: "disabled", path: new URL("failure.png", artifacts).pathname, fullPage: true }).catch(() => undefined);
  throw error;
} finally {
  for (const child of children) child.kill("SIGTERM");
  if (production) for (const name of ["Browser test CLI", "Remote readonly CLI"]) {
    const saved = await readFile(join(directory, name, "bibo/config.json"), "utf8").catch(() => "");
    if (saved) await fetch(`${origin}/api/v1/auth/revoke`, { method: "POST", headers: { authorization: `Bearer ${(JSON.parse(saved) as { token: string }).token}` }, signal: AbortSignal.timeout(15_000) }).catch(() => undefined);
  }
  await browser.close(); worker?.kill("SIGTERM"); await workerLog.close(); await rm(directory, { recursive: true, force: true });
}
