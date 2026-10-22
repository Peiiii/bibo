import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);

export default defineConfig({
  // Resolve the installed public entry; its development export references unpublished source.
  resolve: { alias: { "@nextclaw/agent-chat-ui": require.resolve("@nextclaw/agent-chat-ui") } },
  test: {
    server: { deps: { inline: ["@nextclaw/agent-chat-ui"] } },
  },
});
