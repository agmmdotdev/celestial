import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    globals: true,
    environment: "node",
    setupFiles: ["./src/service/effect/env.service.setup.ts"],
  },
  resolve: {
    alias: {
      "@celestial/effect": "effect",
    },
  },
});
