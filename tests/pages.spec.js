// Chaque page dans un vrai navigateur, sur bureau et sur téléphone : chargement, icônes, marque, mise en page.
const { test, expect } = require("@playwright/test");
const { PAGES, FICHES, SKAZY, NO_PROBLEM, open, displayProblems } = require("./site");

for (const f of PAGES) {
  test.describe(f, () => {
    test("se charge sans erreur, avec toutes ses icônes", async ({ page }) => {
      const errors = await open(page, f);
      expect(errors).toEqual([]);
      expect(await displayProblems(page)).toEqual(NO_PROBLEM);
    });

    test("tient dans la largeur de l'écran", async ({ page }) => {
      await open(page, f);
      const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(extra).toBeLessThanOrEqual(1);
      // Rien ne défile de côté non plus : sur téléphone, un tableau trop large passe en blocs, une ligne par case.
      const sideways = await page.evaluate(() => [...document.querySelectorAll("main :not(textarea)")]
        .filter((e) => /auto|scroll/.test(getComputedStyle(e).overflowX) && e.scrollWidth > e.clientWidth + 1).map((e) => e.className));
      expect(sideways).toEqual([]);
    });

    test("affiche le logo et la mention Skazy Formation", async ({ page }) => {
      await open(page, f);
      await expect(page.locator(`.brand a[href="${SKAZY}"] .brand-logo`)).toBeVisible();
      await expect(page.locator(`.brand-foot a[href="${SKAZY}"]`)).toBeVisible();
    });

    test("aucune carte n'a un grand vide en bas", async ({ page, isMobile }) => {
      test.skip(isMobile, "sur téléphone, les cartes sont l'une sous l'autre");
      await open(page, f);
      // Dans une rangée, les cartes prennent la hauteur de la plus haute : plus de 120 px de vide se voit trop.
      const gaps = await page.evaluate(() => [...document.querySelectorAll(".bento > *")].map((c) => {
        const r = c.getBoundingClientRect(), cs = getComputedStyle(c);
        let bottom = r.top + parseFloat(cs.paddingTop);
        for (const ch of c.children) { const b = ch.getBoundingClientRect(); if (b.height) bottom = Math.max(bottom, b.bottom); }
        return { carte: (c.querySelector("h1, h2, strong") || c).textContent.trim().slice(0, 40), vide: Math.round(r.bottom - parseFloat(cs.paddingBottom) - bottom) };
      }).filter((c) => c.vide > 120));
      expect(gaps).toEqual([]);
    });
  });
}

for (const f of FICHES) {
  test(`${f} : le bouton Accueil est en haut de la page`, async ({ page }) => {
    await open(page, f);
    const home = page.locator(".brand a.home");
    await expect(home).toBeVisible();
    await expect(home).toHaveAttribute("href", "index.html");
    expect((await home.boundingBox()).y).toBeLessThan(100);
  });

  test(`${f} : chaque zone floutée dit quoi faire, puis se débloque`, async ({ page, isMobile }) => {
    await open(page, f);
    const n = await page.locator(".locked").count();
    test.skip(n === 0, "pas de question « Devine d'abord » dans cette fiche");
    expect(await page.locator(".locked > .lock-tip").count()).toBe(n);
    if (isMobile) {
      // Sur téléphone, on lit la question avant de tomber sur les zones qu'elle débloque.
      const before = await page.evaluate(() => {
        const ends = [...document.querySelectorAll(".guess")].map((g) => g.getBoundingClientRect().bottom);
        return [...document.querySelectorAll(".locked")].filter((z) => !ends.some((e) => e <= z.getBoundingClientRect().top + 1)).map((z) => z.id);
      });
      expect(before, "zones floutées placées avant leur question").toEqual([]);
    }
    for (const g of await page.locator(".guess").all()) await g.locator(".qbtns button").first().click();
    if (await page.locator("#lampSw").count()) await page.locator("#lampSw").click();
    await expect(page.locator(".locked")).toHaveCount(0);
    await expect(page.locator(".lock-tip")).toHaveCount(0);
  });
}

test.describe("6-message-piege.html : ce que tu vois, ce que l'IA lit", () => {
  test("l'e-mail vient avant la question, sans zone floutée entre les deux", async ({ page, isMobile }) => {
    test.skip(!isMobile, "sur bureau, l'e-mail et ce que lit l'IA sont côte à côte");
    await open(page, "6-message-piege.html");
    const r = await page.evaluate(() => {
      const mail = document.querySelector("#docView").getBoundingClientRect();
      const q = document.querySelector("#hideGuess").getBoundingClientRect().top;
      const between = [...document.querySelectorAll(".locked")].filter((z) => { const t = z.getBoundingClientRect().top; return t > mail.top && t < q; });
      return { mailAvantQuestion: mail.bottom <= q, zonesEntre: between.length };
    });
    expect(r).toEqual({ mailAvantQuestion: true, zonesEntre: 0 });
  });

  test("le texte caché reste invisible jusqu'à la lampe", async ({ page }) => {
    await open(page, "6-message-piege.html");
    const size = () => page.locator("#docView .hid").first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    expect(await size()).toBeLessThan(4);
    await page.locator("#hideGuess .qbtns button").first().click();
    // La question répondue débloque la lampe, mais ce que lit l'IA attend la lampe.
    await expect(page.locator("#aiPane")).toHaveClass(/locked/);
    await page.locator("#lampSw").click();
    await expect(page.locator("#aiPane")).not.toHaveClass(/locked/);
    expect(await size()).toBeGreaterThan(10);
  });
});
