import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.integration.ts"], testTimeout: 15000, hookTimeout: 15000 },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } }
});
