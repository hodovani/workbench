import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL, browserName: "chromium", serviceWorkers: "block" },
  webServer: {
    command: "pnpm exec next dev --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_FIREBASE_API_KEY: "test-api-key",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-workbench",
      NEXT_PUBLIC_CHAT_API_URL: "/__test/chat",
    },
  },
});
