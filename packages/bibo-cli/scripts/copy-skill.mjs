import { cp, chmod, rm } from "node:fs/promises";
const target = new URL("../skill/", import.meta.url);
await rm(target, { recursive: true, force: true });
await cp(new URL("../../../skills/bibo-space/", import.meta.url), target, { recursive: true });
await chmod(new URL("../dist/bin.js", import.meta.url), 0o755);
