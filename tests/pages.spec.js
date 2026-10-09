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

    test("affiche le bandeau : la pastille et le nom de l'outil, « Les outils », le logo, et la mention Skazy Formation", async ({ page, isMobile }) => {
      await open(page, f);
      // La pastille et le nom de l'outil : un seul lien, vers l'accueil de l'outil. La pastille reste toujours ;
      // sur téléphone, le nom peut laisser la place au bouton Accueil, mais les lecteurs d'écran le lisent encore.
      const tool = page.locator(".brand > a.brand-tool");
      await expect(tool).toHaveAttribute("href", "index.html");
      await expect(tool).toHaveAccessibleName("Comprendre l'IA");
      await expect(tool.locator('img[src="favicon.svg"]')).toBeVisible();
      if (f === "index.html") await expect(tool).toHaveAttribute("aria-current", "page");
      else expect(await tool.getAttribute("aria-current")).toBeNull();
      if (!isMobile || f === "index.html") await expect(tool.locator(".brand-name")).toBeVisible();
      // « Les outils » : la page de tous les outils Skazy Formation, dans le même onglet. Sur téléphone, il garde sa roue.
      const tools = page.locator(".brand > a.brand-outils");
      await expect(tools).toHaveAttribute("href", "https://gharel.github.io/home/");
      expect(await tools.getAttribute("target")).toBeNull();
      await expect(tools).toHaveAccessibleName("Les outils");
      await expect(tools.locator('img[src="les-outils.svg"]')).toBeVisible();
      // Le logo est le dernier élément du bandeau : il ouvre formation.skazy.nc dans un nouvel onglet.
      const logo = page.locator(".brand > :last-child");
      await expect(logo).toHaveAttribute("href", SKAZY);
      await expect(logo).toHaveAttribute("target", "_blank");
      await expect(logo).toHaveAttribute("rel", "noopener");
      await expect(logo).toHaveAccessibleName("Site de Skazy Formation (nouvel onglet)");
      await expect(logo.locator(".brand-logo")).toBeVisible();
      // Le bouton du thème, juste avant « Les outils » : assez grand pour le doigt (40 px au moins).
      const theme = page.locator(".brand > button.brand-theme");
      await expect(theme).toBeVisible();
      const box = await theme.boundingBox();
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(40);
      // Tout tient sur une seule ligne, dans cet ordre de gauche à droite : le logo est tout à droite.
      const row = await page.locator(".brand > *").evaluateAll((els) => els.map((e) => {
        const r = e.getBoundingClientRect();
        return { nom: e.className, gauche: r.left, droite: r.right, milieu: (r.top + r.bottom) / 2 };
      }));
      expect(row.map((e) => e.nom)).toEqual([...(f === "index.html" ? [] : ["home", "brand-sep"]), "brand-tool", "brand-theme", "brand-outils", "brand-sep", "brand-skazy"]);
      for (let i = 1; i < row.length; i++) {
        expect(row[i].gauche, row[i].nom).toBeGreaterThanOrEqual(row[i - 1].droite);
        expect(Math.abs(row[i].milieu - row[0].milieu), row[i].nom).toBeLessThan(4);
      }
      await expect(page.locator(`.brand-foot a[href="${SKAZY}"]`)).toBeVisible();
    });

    test("« Remonter en haut » paraît après un écran de défilement, et ramène en haut de la page", async ({ page }) => {
      await open(page, f);
      const up = page.locator("#toTop");
      await expect(up).toBeHidden();
      await page.evaluate(() => scrollTo(0, innerHeight * 1.5));
      await expect(up).toBeVisible();
      await expect(up).toHaveAccessibleName("Remonter en haut de la page");
      await up.click();
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      // Le bandeau prend le focus : au clavier, on repart du haut de la page.
      await expect(page.locator(".brand")).toBeFocused();
      await expect(up).toBeHidden();
    });

    // Sur les petits téléphones, en thème clair et sombre : rien ne dépasse, et le bandeau tient sur une ligne.
    test("à 390 et 360 px, rien ne dépasse, en thème clair comme en sombre", async ({ page, isMobile }) => {
      test.skip(!isMobile, "largeurs de téléphone");
      for (const colorScheme of ["dark", "light"]) {
        await page.emulateMedia({ colorScheme });
        for (const width of [390, 360]) {
          const at = `${width} px, thème ${colorScheme === "dark" ? "sombre" : "clair"}`;
          await page.setViewportSize({ width, height: 800 });
          await open(page, f);
          expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), at).toBeLessThanOrEqual(1);
          const brand = await page.evaluate(() => {
            const b = document.querySelector(".brand").getBoundingClientRect(), mid = (b.top + b.bottom) / 2;
            return [...document.querySelectorAll(".brand > *")].filter((e) => {
              const r = e.getBoundingClientRect();
              return r.left < b.left - 0.5 || r.right > b.right + 0.5 || Math.abs((r.top + r.bottom) / 2 - mid) > 4;
            }).map((e) => e.className);
          });
          expect(brand, at).toEqual([]);
          expect((await displayProblems(page)).debordements, at).toEqual([]);
        }
      }
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
    // Sur téléphone, il ne garde que sa maison : son nom reste « Accueil » pour les lecteurs d'écran.
    await expect(home).toHaveAccessibleName("Accueil");
    expect((await home.boundingBox()).y).toBeLessThan(100);
  });

  // Le message « Réponds d'abord à la question » va presque d'un bord à l'autre d'un petit téléphone :
  // quand il passe sous « Remonter en haut », le bouton monte au-dessus, pour qu'on lise le message et qu'on puisse toucher le bouton.
  test(`${f} : « Remonter en haut » ne cache jamais le message des zones floutées`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "sur bureau, le message est loin du bord");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 360, height: 740 });
    await open(page, f);
    const seen = await page.evaluate(async () => {
      const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      const b = document.querySelector("#toTop"), out = { croisements: 0, chevauchements: [] };
      for (const t of document.querySelectorAll(".lock-tip > span")) {
        const at = t.getBoundingClientRect().top + scrollY;
        // Le message monte de 6 px en 6 px, du bas de l'écran jusqu'au-dessus du bouton.
        for (let off = 0; off <= 150; off += 6) {
          scrollTo(0, at - innerHeight + off);
          await frame();
          if (!b.classList.contains("on")) continue;
          out.croisements++;
          const m = t.getBoundingClientRect(), r = b.getBoundingClientRect();
          if (m.right > r.left && m.left < r.right && m.bottom > r.top && m.top < r.bottom) out.chevauchements.push(t.textContent + " à " + off + " px du bas");
        }
      }
      return out;
    });
    expect(seen.croisements).toBeGreaterThan(0);
    expect(seen.chevauchements).toEqual([]);
  });

  test(`${f} : chaque zone floutée dit quoi faire, puis se débloque`, async ({ page, isMobile }) => {
    await open(page, f);
    // Chaque fiche pose au moins une question « Devine d'abord ».
    const n = await page.locator(".locked").count();
    expect(await page.locator(".guess").count(), "question « Devine d'abord »").toBeGreaterThan(0);
    expect(n).toBeGreaterThan(0);
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

  // Chaque fiche a ses réflexes à cocher : la jauge se remplit, et la coupe arrive quand tout est coché.
  test(`${f} : « Mes réflexes » se cochent, et la jauge se remplit`, async ({ page }) => {
    await open(page, f, "?demo=1");
    const boxes = page.locator("#check input[type=checkbox]"), n = await boxes.count();
    expect(n).toBeGreaterThanOrEqual(6);
    await expect(page.locator("#chkTxt")).toHaveText(new RegExp(`^0\\s+sur\\s+${n}$`));
    for (const b of await boxes.all()) await b.check();
    await expect(page.locator("#chkTxt")).toHaveText(new RegExp(`^${n}\\s+sur\\s+${n}`));
    await expect(page.locator("#chkTxt .fa-trophy")).toHaveCount(1);
    expect(await page.locator("#chkFill").evaluate((e) => e.style.width)).toBe("100%");
  });
}

// Les fiches ont une longueur proche : la plus longue fait moins de 1,75 fois la plus courte, sur bureau comme sur téléphone.
// Si une fiche grandit trop, range une partie de son contenu dans une fiche plus courte.
test(`les ${FICHES.length} fiches ont une longueur proche`, async ({ page }) => {
  const heights = {};
  for (const f of FICHES) {
    await open(page, f, "?demo=1");
    heights[f] = await page.evaluate(() => document.documentElement.scrollHeight);
  }
  const hs = Object.values(heights);
  expect(Math.max(...hs) / Math.min(...hs), JSON.stringify(heights)).toBeLessThan(1.75);
});

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
