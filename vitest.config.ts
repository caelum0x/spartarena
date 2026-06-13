import { defineConfig } from "vitest/config";

/**
 * Root Vitest config for the SpartArena monorepo.
 *
 * Node-side packages and apps are tested here (pure logic, parsers, services,
 * proof hashing, validators). The web app uses a separate jsdom project once
 * component tests land. Source uses NodeNext-style `.js` import specifiers that
 * resolve to `.ts` files; Vite's bundler resolution handles this natively.
 */
export default defineConfig({
  test: {
    environment: "node",
    // The API reads a validated env at import time; provide the one required key
    // so importing its modules under test does not throw. Unit tests never open
    // a real connection.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/spartarena_test",
    },
    include: [
      "packages/shared/src/**/*.test.ts",
      "packages/sdk/src/**/*.test.ts",
      "packages/byreal-adapter/src/**/*.test.ts",
      "apps/api/src/**/*.test.ts",
      "apps/agent-runner/src/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: [
        "packages/shared/src/**",
        "packages/sdk/src/**",
        "packages/byreal-adapter/src/**",
        "apps/api/src/**",
        "apps/agent-runner/src/**",
      ],
      exclude: ["**/*.test.ts", "**/index.ts", "**/types.ts", "**/*.d.ts"],
    },
  },
});
