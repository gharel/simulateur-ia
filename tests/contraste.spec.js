// Contrastes et mode nuit : chaque texte reste lisible, en thème clair et sombre, avant et après avoir joué.
const { test, expect } = require("@playwright/test");
const { PAGES, open, playEverything } = require("./site");
const { contrastIssues } = require("./contrast");

// Les couleurs ne dépendent pas de la taille de l'écran : le bureau suffit.
test.skip(({ isMobile }) => isMobile, "mêmes couleurs que sur bureau");

const CASES = [...PAGES.map((f) => [f, ""]), ["index.html", "?demo=1"]];

for (const colorScheme of ["dark", "light"]) {
  test.describe(`thème ${colorScheme === "dark" ? "sombre" : "clair"}`, () => {
    test.use({ colorScheme });
    for (const [f, query] of CASES) {
      test(`${f}${query && " en mode démonstration"} : tous les textes sont assez contrastés`, async ({ page }) => {
        await open(page, f, query);
        const avant = await contrastIssues(page);
        await playEverything(page);
        const apres = await contrastIssues(page);
        expect({ avant, apres }).toEqual({ avant: [], apres: [] });
      });
    }
  });
}

// Le mode nuit de Brave (et l'extension Dark Reader) inverse les couleurs des pages claires.
// Nos pages ont déjà leur thème sombre : la balise darkreader-lock doit l'empêcher d'agir.
for (const f of PAGES) {
  test(`${f} : le mode nuit du navigateur ne change pas les couleurs`, async ({ page }) => {
    await open(page, f);
    const colors = () => page.evaluate(() => {
      const c = document.querySelector(".bento > *");
      return [getComputedStyle(document.body).backgroundColor, getComputedStyle(c).color, getComputedStyle(c).backgroundColor];
    });
    const before = await colors();
    await page.addScriptTag({ path: require.resolve("darkreader") });
    await page.evaluate(() => { window.DarkReader.setFetchMethod(window.fetch); window.DarkReader.enable({ brightness: 100, contrast: 90, sepia: 10 }); });
    await page.waitForTimeout(500);
    await expect(page.locator("style.darkreader")).toHaveCount(0);
    expect(await colors()).toEqual(before);
  });
}
