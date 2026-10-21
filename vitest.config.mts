import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/**/*.integration.test.ts"],
    // Compile-time contract tests. Run separately with `pnpm test:types`.
    typecheck: {
      enabled: false,
      include: ["src/**/*.test-d.ts"],
      tsconfig: "./tsconfig.json",
    },
    coverage: {
      provider: "v8",
      // Measure the product, not the test files themselves.
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.test-d.ts",
        "src/**/*.test-helpers.ts",
        "src/**/*.d.ts",
        // Wiring, not logic: barrels, type-only contracts, the React context
        // object, Firebase SDK init, and the Next entry points.
        "src/**/index.ts",
        "src/**/types.ts",
        "src/**/context.ts",
        "src/lib/firebase.ts",
        // This adapter is exercised by Firestore emulator integration tests.
        "src/storage/FirestoreChatRepository.ts",
        "src/app/**",
      ],
      reporter: ["text", "html"],
      thresholds: {
        // Keep high line coverage while leaving room for defensive branch combinations.
        statements: 90,
        branches: 80,
        functions: 90,
        lines: 90,
      },
    },
  },
});
