// Tests des fiches : les pages sont ouvertes telles quelles (file://), sur bureau et sur téléphone.
// Les icônes et les polices viennent d'internet : il faut être connecté.
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: { colorScheme: "dark" },
  projects: [
    { name: "fichiers", testMatch: /static\.spec\.js/ },
    { name: "bureau", testIgnore: /static\.spec\.js/, use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "mobile", testIgnore: /static\.spec\.js/, use: { ...devices["Pixel 7"] } },
  ],
});
