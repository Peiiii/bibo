#!/usr/bin/env node
import { BiboApiError } from "@nextclaw/bibo-api";
import { run } from "./commands.js";

try { await run(process.argv.slice(2)); }
catch (error) {
  const api = error instanceof BiboApiError ? error : null;
  process.stderr.write(`${JSON.stringify({ error: { code: api?.code ?? "CLI_ERROR", message: error instanceof Error ? error.message : "Command failed." },
    ...(error && typeof error === "object" && "clientRequestId" in error ? { clientRequestId: error.clientRequestId } : {}),
    ...(api?.requestId ? { requestId: api.requestId } : {}), ...(api?.retryAfter ? { retryAfter: api.retryAfter } : {}) })}\n`);
  process.exitCode = api?.status === 401 || api?.status === 403 ? 3 : api?.status === 409 ? 4 : api?.status === 429 ? 5 : api ? 1 : 2;
}
