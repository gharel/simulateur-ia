// On joue avec les pages : clics partout, défi final, permis.
const { test, expect } = require("@playwright/test");
const { PAGES, FICHES, NO_PROBLEM, open, iconsReady, displayProblems, playEverything } = require("./site");
const { contrastIssues } = require("./contrast");

for (const f of PAGES) {
  for (const query of ["", "?atelier=1"]) {
    test(`${f}${query && " en mode atelier"} : tout cliquer ne casse rien`, async ({ page }) => {
      const errors = await open(page, f, query);
      await playEverything(page);
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

test.describe("1-tokens.html : l'IA relit tout, à chaque message", () => {
  for (const colorScheme of ["dark", "light"]) {
    test(`l'animation va jusqu'au bout, lisible à chaque étape (thème ${colorScheme === "dark" ? "sombre" : "clair"})`, async ({ page, isMobile }) => {
      test.skip(isMobile && colorScheme === "light", "mêmes couleurs que sur bureau");
      // Sans animation, chaque étape se joue tout de suite.
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme });
      await open(page, "1-tokens.html");
      const next = page.locator("#rpNext");
      for (let step = 1; step <= 6; step++) {
        await next.click();
        // L'étape est finie quand le bouton revient (ou disparaît, à la fin).
        await page.waitForFunction(() => { const b = document.querySelector("#rpNext"); return b.hidden || !b.disabled; });
        await iconsReady(page);
        expect(await contrastIssues(page), `étape ${step}`).toEqual([]);
      }
      await expect(next).toBeHidden();
      await expect(page.locator("#rpBars .srow")).toHaveCount(5);
      // Après la compression, le milieu est un résumé : « Je n'aime pas le bateau » n'est plus lu.
      await expect(page.locator("#rpRead .rl.sum")).toHaveCount(1);
      await expect(page.locator("#rpRead")).not.toContainText("bateau");
      await expect(page.locator("#rpChat .cb.lost")).toContainText("Je n'aime pas le bateau");
      await page.locator("#rpReset").click();
      await expect(page.locator("#rpChat .cb")).toHaveCount(0);
      await expect(next).toBeEnabled();
    });
  }
});

test("3-hallucinations.html : changer la règle du classement change le gagnant", async ({ page }) => {
  await open(page, "3-hallucinations.html");
  await page.locator("#rankGuess .qbtns button").first().click();
  const leader = () => page.locator(".rk:has(.rk-place.win) .rk-name strong");
  await expect(leader()).toHaveText("o4-mini");
  await page.locator('#segRule button[data-v="fair"]').click();
  await expect(leader()).toHaveText("gpt-5-thinking-mini");
  await expect(page.locator(".rk-n")).toHaveText(["−4", "−51"]);
});

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
