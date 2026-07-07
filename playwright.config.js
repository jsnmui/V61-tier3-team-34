const { defineConfig } = require("@playwright/test");

const DEV_PORT = process.env.PW_DEV_PORT || "3000";
const BASE_URL = `http://127.0.0.1:${DEV_PORT}`;

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${DEV_PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});
