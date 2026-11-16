import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de interface. Usa o Google Chrome instalado na máquina (`channel: "chrome"`) para não
 * baixar navegadores. Em CI, trocar por `npx playwright install chromium` e remover o channel.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 1649, height: 928 },
      },
    },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
  webServer: {
    command: "pnpm exec vite build && pnpm exec vite preview",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
