import { execFileSync } from "node:child_process";

export function registryIntegrity(spec) {
  try {
    return JSON.parse(execFileSync("npm", ["view", spec, "dist.integrity", "--json", "--prefer-online", "--fetch-retries=1", "--fetch-timeout=15000"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    }));
  } catch (error) {
    if (String(error.stderr).includes("E404")) return null;
    throw new Error(`Unable to check registry integrity for ${spec}.`);
  }
}

/** npm may accept a new package before its scan/index becomes publicly readable. Never republish here. */
export async function waitForRegistryIntegrity(spec, expected, {
  read = registryIntegrity, wait = () => new Promise((resolve) => setTimeout(resolve, 5000)),
  now = Date.now, timeoutMs = 300_000,
} = {}) {
  const deadline = now() + timeoutMs;
  for (;;) {
    const actual = read(spec);
    if (actual === expected) return;
    if (actual) throw new Error(`Registry integrity mismatch for ${spec}; publishing is stopped.`);
    if (now() >= deadline) throw new Error(`${spec} was accepted by npm but is still processing. Preserve the published receipt and resume after registry visibility.`);
    await wait();
  }
}
