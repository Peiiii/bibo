import { cp, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { BiboSpaceService } from "../../apps/bibo-hosted/src/features/bibo-domain/services/bibo-space.service";

const root = new URL("../../", import.meta.url);
const docs = new URL("apps/bibo-docs/", root);
const actions = new BiboSpaceService("/unused-docs-catalog").listActions().map((action) => ({ ...action, readOnly: /\.(get|list)$/.test(action.action) }));
await mkdir(new URL(".generated/", docs), { recursive: true });
await mkdir(new URL("public/downloads/", docs), { recursive: true });
await writeFile(new URL(".generated/actions.md", docs), `| 动作 | 权限 | 说明与输入 |\n| --- | --- | --- |\n${actions.map((item) => `| \`${item.action}\` | ${item.readOnly ? "只读" : "读写"} | ${item.description.replaceAll("|", "\\|")}<br>\`${item.input.replaceAll("|", "\\|")}\` |`).join("\n")}\n`);
await cp(new URL("skills/bibo-space/", root), new URL("public/downloads/bibo-space/", docs), { recursive: true });
const jsonResponse = { description: "JSON result envelope", content: { "application/json": { schema: { type: "object", required: ["result", "requestId"], properties: { result: {}, requestId: { type: "string" } } } } } };
const errors = Object.fromEntries([400, 401, 403, 404, 409, 413, 415, 429, 503].map((status) => [status, { description: `Error ${status}`, content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }]));
const operation = (summary: string, status = "200") => ({ summary, responses: { [status]: jsonResponse, ...errors } });
const schema = {
  openapi: "3.1.0", info: { title: "Bibo Space API", version: "1.0.0", description: "Personal space access for authorized agents. Rate limit: 60 requests per token per minute." },
  servers: [{ url: "https://app.bibo.bot/api/v1" }], security: [{ bearerAuth: [] }],
  paths: {
    "/me": { get: operation("Current identity and integration scopes") },
    "/actions": { get: operation("Discover the live action catalog") },
    "/space": { post: { ...operation("Execute a space action"), requestBody: { required: true, content: { "application/json": { schema: {
      type: "object", required: ["action"], properties: { action: { type: "string", enum: actions.map((a) => a.action) }, input: { type: "object", additionalProperties: true } },
    } } } }, "x-bibo-actions": actions } },
    "/auth/revoke": { post: operation("Revoke the current token") },
    "/assets": { post: { ...operation("Upload an image, max 10 MiB", "201"), requestBody: { required: true, content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } } } },
    "/assets/{id}": { get: { summary: "Download an account-scoped image", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Image bytes", content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } }, ...errors } } },
  },
  components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "Bibo PAT" } }, schemas: {
    Error: { type: "object", required: ["error", "requestId"], properties: { error: { type: "object", required: ["code", "message"], properties: { code: { type: "string" }, message: { type: "string" } } }, requestId: { type: "string" } } },
  } },
};
await writeFile(new URL("public/openapi.json", docs), `${JSON.stringify(schema, null, 2)}\n`);
execFileSync("pnpm", ["-C", fileURLToPath(docs), "build"], { cwd: fileURLToPath(root), stdio: "inherit" });
await mkdir(new URL("apps/bibo-hosted/dist/public/docs/", root), { recursive: true });
await cp(new URL(".vitepress/dist/", docs), new URL("apps/bibo-hosted/dist/public/docs/", root), { recursive: true });
