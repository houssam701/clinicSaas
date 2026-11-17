import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Same alias as tsconfig "paths"
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // next-auth imports "next/server" without a file extension, which Node's ESM
    // loader rejects; letting Vitest transform it resolves the import.
    server: { deps: { inline: ["next-auth"] } },
  },
});
