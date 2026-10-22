import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, stat, rm, open } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, relative } from "node:path";
import { chromium } from "playwright";

const directory = await mkdtemp(join(tmpdir(), "bibo-device-browser-"));
const artifacts = new URL("../../../.local/device-auth-browser/", import.meta.url);
await mkdir(artifacts, { recursive: true });
const port = String(33000 + process.pid % 10000), origin = `http://127.0.0.1:${port}`;
const config = join(directory, "wrangler.toml");
const source = await readFile("wrangler.toml", "utf8");
await writeFile(config, source.replace('main = "src/app/bibo-hosted.app.ts"', `main = ${JSON.stringify(resolve("src/app/bibo-hosted.app.ts"))}`)
  .replace('name = "bibo-personal"', `name = "bibo-personal"\ntsconfig = ${JSON.stringify(relative(directory, resolve("tsconfig.json")))}`)
  .replace('directory = "./dist/public"', `directory = ${JSON.stringify(resolve("dist/public"))}`)
  .replace(', "durable_object_io_tasks_prevent_eviction"', "")
  .replace(/\[\[containers\]\][\s\S]*?(?=\n\[|$)/g, "")
  .replace('BIBO_OWNER_EMAIL = "owner@example.com"', 'BIBO_OWNER_EMAIL = "owner@example.com"\nBIBO_OWNER_PASSWORD = "local-disposable-password-123456"'));
const workerLog = await open(new URL("worker.log", artifacts), "w");
const worker = spawn(process.execPath, [resolve("node_modules/wrangler/bin/wrangler.js"), "dev", "--config", config, "--port", port, "--persist-to", join(directory, "state")], { cwd: directory, stdio: ["ignore", workerLog.fd, workerLog.fd] });
const cli = resolve("../../packages/bibo-cli/dist/bin.js");
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
const browser = await chromium.launch({ headless: true });
try {
  for (let i = 0; i < 200; i++) {
    if (worker.exitCode !== null) throw new Error("Local authorization Worker failed to start; see worker.log");
    if (await fetch(origin).then((response) => response.ok).catch(() => false)) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  const first = startCli("Browser test CLI"), start = await first.ready;
  await page.goto(start.url);
  await page.locator(".bibo-auth-form-pane").getByLabel("邮箱").fill("owner@example.com");
  await page.locator(".bibo-auth-form-pane").getByLabel("密码").fill("local-disposable-password-123456");
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
    await page.screenshot({ path: new URL(`consent-${width}.png`, artifacts).pathname, fullPage: true });
  }
  await page.getByRole("button", { name: "授权读写空间", exact: true }).click();
  await page.getByRole("heading", { name: "授权成功", exact: true }).waitFor();
  const firstResult = await first.done; assert.equal(firstResult.code, 0, firstResult.stderr);
  const saved = join(directory, "Browser test CLI/bibo/config.json");
  const credential = JSON.parse(await readFile(saved, "utf8")) as { token: string };
  assert.equal((await stat(saved)).mode & 0o777, 0o600);
  assert.ok(!`${firstResult.stderr}${firstResult.stdout}`.includes(credential.token));
  await page.setViewportSize({ width: 1440, height: 1000 });
  const remote = startCli("Remote readonly CLI", ["--no-browser", "--read-only"]), remoteStart = await remote.ready;
  await page.goto(`${origin}/authorize`);
  await page.getByLabel("授权码", { exact: true }).fill(remoteStart.code);
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await page.getByRole("button", { name: "授权读取空间", exact: true }).click();
  assert.equal((await remote.done).code, 0);
  const readonly = JSON.parse(await readFile(join(directory, "Remote readonly CLI/bibo/config.json"), "utf8")) as { token: string };
  const deniedWrite = await fetch(`${origin}/api/v1/space`, { method: "POST", headers: { authorization: `Bearer ${readonly.token}` }, body: JSON.stringify({ action: "task.create", input: { title: "must not write" } }) });
  assert.equal(deniedWrite.status, 403);
  const denied = startCli("Denied CLI", ["--no-browser"]), deniedStart = await denied.ready;
  await page.goto(deniedStart.url); await page.getByRole("button", { name: "拒绝", exact: true }).click();
  await page.getByRole("heading", { name: "已拒绝授权", exact: true }).waitFor();
  assert.notEqual((await denied.done).code, 0);
  await assert.rejects(stat(join(directory, "Denied CLI/bibo/config.json")), { code: "ENOENT" });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ defaultBrowser: "passed", remoteManualCode: "passed", denial: "passed", readonly: "passed", privateCredentials: "passed", widths: [1440, 390, 320], artifacts: artifacts.pathname }));
} finally { for (const child of children) child.kill("SIGTERM"); await browser.close(); worker.kill("SIGTERM"); await workerLog.close(); await rm(directory, { recursive: true, force: true }); }
