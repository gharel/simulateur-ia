// On joue avec les pages : clics partout, défi final, permis.
const { test, expect } = require("@playwright/test");
const { PAGES, FICHES, NO_PROBLEM, open, iconsReady, displayProblems } = require("./site");

for (const f of PAGES) {
  for (const query of ["", "?atelier=1"]) {
    test(`${f}${query && " en mode atelier"} : tout cliquer ne casse rien`, async ({ page }) => {
      page.on("dialog", (d) => d.dismiss());
      const errors = await open(page, f, query);
      // Pas le bouton du mode atelier (il recharge la page) ni l'impression.
      const controls = page.locator("main button:visible:not(#atelierBtn):not(#licPrint), main input[type=checkbox]:visible");
      for (let round = 0; round < 2; round++) {
        const n = await controls.count();
        for (let i = 0; i < n; i++) await controls.nth(i).click({ timeout: 1000 }).catch(() => {});
        for (const r of await page.locator("main input[type=range]").all()) await r.fill(String(round ? 1 : 3)).catch(() => {});
      }
      await iconsReady(page);
      expect(errors).toEqual([]);
      expect(await displayProblems(page)).toEqual(NO_PROBLEM);
    });
  }
}

for (const [n, f] of FICHES.entries()) {
  test(`${f} : finir le défi donne le badge`, async ({ page }) => {
    await open(page, f);
    for (const q of await page.locator("#defiQuiz .qi").all()) await q.locator(".qbtns button").first().click();
    await expect(page.locator("#badge")).toHaveClass(/won/);
    await expect(page.locator("#defiResult")).not.toBeEmpty();
    await expect(page.locator("#stars svg")).toHaveCount(3);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ia6:progress")));
    expect(saved[n + 1]).toBeGreaterThan(0);
  });
}

test("index.html : le permis se débloque avec les 6 badges", async ({ page }) => {
  await open(page, "index.html");
  await expect(page.locator("#licLock")).toBeVisible();
  await page.evaluate(() => localStorage.setItem("ia6:progress", JSON.stringify({ 1: 3, 2: 3, 3: 2, 4: 3, 5: 1, 6: 3 })));
  await page.reload({ waitUntil: "networkidle" });
  await iconsReady(page);
  await expect(page.locator("#licLock")).toBeHidden();
  await expect(page.locator("#licPrint")).toBeEnabled();
  await expect(page.locator("#license .brand-logo")).toBeVisible();
  await expect(page.locator("#licBadges .st svg")).toHaveCount(18);
});
