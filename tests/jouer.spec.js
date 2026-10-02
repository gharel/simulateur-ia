// On joue avec les pages : clics partout, défi final, permis.
const { test, expect } = require("@playwright/test");
const { PAGES, FICHES, NO_PROBLEM, open, iconsReady, displayProblems } = require("./site");

for (const f of PAGES) {
  for (const query of ["", "?atelier=1"]) {
    test(`${f}${query && " en mode atelier"} : tout cliquer ne casse rien`, async ({ page }) => {
      page.on("dialog", (d) => d.dismiss());
      const errors = await open(page, f, query);
      // Pas les boutons des modes (ils rechargent la page) ni l'impression.
      const controls = page.locator("main button:visible:not(#atelierBtn):not(#demoBtn):not(#licPrint), main input[type=checkbox]:visible");
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

test.describe("mode démonstration", () => {
  for (const f of ["1-tokens.html", "3-hallucinations.html", "6-message-piege.html"]) {
    test(`${f} : rien n'est flou`, async ({ page }) => {
      await open(page, f, "?demo=1");
      await expect(page.locator(".locked")).toHaveCount(0);
      await expect(page.locator(".lock-tip")).toHaveCount(0);
      await expect(page.locator("#demoBtn")).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("#demoBtn")).toContainText("oui");
    });
  }

  test("le mode suit d'une page à l'autre, montre le permis, et s'enlève avec son bouton", async ({ page }) => {
    await open(page, "1-tokens.html", "?demo=1");
    await page.locator(".brand a.home").click();
    await page.waitForURL(/index\.html\?demo=1/);
    await iconsReady(page);
    await expect(page.locator("#license")).not.toHaveClass(/locked/);
    await expect(page.locator("#licLock")).toBeHidden();
    await expect(page.locator("#licPrint")).toBeDisabled();
    // Sans rien dans l'adresse, le choix gardé dans le navigateur s'applique.
    await open(page, "6-message-piege.html");
    await expect(page.locator(".locked")).toHaveCount(0);
    await page.locator("#demoBtn").click();
    await page.waitForURL(/demo=0/);
    await iconsReady(page);
    await expect(page.locator(".locked")).not.toHaveCount(0);
    await expect(page.locator("#demoBtn")).toContainText("non");
  });
});

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
