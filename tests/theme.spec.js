// Le thème : celui du système, clair ou sombre, choisi avec le bouton du bandeau.
// Le choix est commun à tous les outils Skazy Formation (même adresse gharel.github.io) : la clé « skazy-outils:theme »
// vaut "light" ou "dark" en JSON, et n'existe pas quand on suit le système. playwright.config.js met le système en sombre.
const { test, expect } = require("@playwright/test");
const { PAGES, open, iconsReady } = require("./site");

const KEY = "skazy-outils:theme";
const NBSP = " ";
const BG = { light: "rgb(241, 241, 246)", dark: "rgb(11, 11, 18)" };
// Les trois états, dans l'ordre du bouton : système, clair, sombre.
const CYCLE = [
  { theme: null, stored: null, name: `Thème${NBSP}: celui du système`, icon: "fa-circle-half-stroke" },
  { theme: "light", stored: '"light"', name: `Thème${NBSP}: clair`, icon: "fa-sun" },
  { theme: "dark", stored: '"dark"', name: `Thème${NBSP}: sombre`, icon: "fa-moon" },
];

// Ce que montre la page : le thème posé sur <html>, la clé, le nom et la bulle du bouton, l'icône visible,
// le contraste de l'icône contre le fond du bouton, et le fond de la page.
const shown = (page) => page.evaluate((key) => {
  const b = document.querySelector("#themeBtn");
  const icons = [...b.children].filter((i) => i.checkVisibility());
  const rgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lum = (c) => {
    const [r, g, bl] = rgb(c).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(getComputedStyle(icons[0] || b).color), lum(getComputedStyle(b).backgroundColor)].sort((x, y) => y - x);
  return {
    theme: document.documentElement.getAttribute("data-theme"),
    stored: localStorage.getItem(key),
    label: b.getAttribute("aria-label"),
    title: b.getAttribute("title"),
    icons: icons.map((i) => [...i.classList].find((c) => /^fa-(circle-half-stroke|sun|moon)$/.test(c))),
    contrasteAA: (hi + 0.05) / (lo + 0.05) >= 4.5,
    fond: getComputedStyle(document.body).backgroundColor,
  };
}, KEY);
const expected = ({ theme, stored, name, icon }, os = "dark") => ({
  theme, stored, label: `${name}. Changer de thème`, title: `${name}. Changer de thème`, icons: [icon], contrasteAA: true, fond: BG[theme || os],
});

for (const f of PAGES) {
  test(`${f} : le bouton du thème, juste avant « Les outils », passe de système à clair, à sombre, puis revient au système`, async ({ page }) => {
    const errors = await open(page, f);
    const b = page.locator("#themeBtn");
    expect(await b.evaluate((e) => [e.parentElement.className, e.nextElementSibling.className])).toEqual(["brand", "brand-outils"]);
    expect(await shown(page)).toEqual(expected(CYCLE[0]));
    for (const i of [1, 2, 0]) {
      await b.click();
      expect(await shown(page), CYCLE[i].name).toEqual(expected(CYCLE[i]));
    }
    expect(errors).toEqual([]);
  });
}

test("le choix suit d'une page à l'autre : clair choisi sur l'accueil, la fiche 1 s'ouvre en clair", async ({ page }) => {
  await open(page, "index.html");
  await page.locator("#themeBtn").click();
  await open(page, "1-tokens.html");
  expect(await shown(page)).toEqual(expected(CYCLE[1]));
  // Le retour au système vaut aussi pour la page suivante.
  await page.locator("#themeBtn").click();
  await page.locator("#themeBtn").click();
  await open(page, "9-forfait-api.html");
  expect(await shown(page)).toEqual(expected(CYCLE[0]));
});

test("une valeur inconnue dans la clé : la page suit le système, sans erreur", async ({ page }) => {
  const errors = await open(page, "index.html");
  // "light" sans guillemets n'est pas du JSON : le choix d'un autre outil est toujours écrit avec JSON.stringify.
  for (const bad of ['"blue"', "light", "{", "42", "null"]) {
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, bad]);
    await page.reload();
    await iconsReady(page);
    expect(await shown(page), bad).toEqual({ ...expected(CYCLE[0]), stored: bad });
  }
  await page.locator("#themeBtn").click();
  expect(await shown(page)).toEqual(expected(CYCLE[1]));
  expect(errors).toEqual([]);
});

test("un choix fait dans un autre onglet s'applique tout de suite", async ({ context }) => {
  const a = await context.newPage(), b = await context.newPage();
  await open(a, "index.html");
  await open(b, "2-memoire.html");
  for (const i of [1, 2, 0]) {
    await a.locator("#themeBtn").click();
    await expect.poll(() => shown(b), CYCLE[i].name).toEqual(expected(CYCLE[i]));
  }
  // Un autre onglet vide tout le stockage : retour au système.
  await a.locator("#themeBtn").click();
  await expect.poll(() => shown(b)).toEqual(expected(CYCLE[1]));
  await a.evaluate(() => localStorage.clear());
  await expect.poll(() => shown(b)).toEqual(expected(CYCLE[0]));
});

test("au retour sur une page gardée en mémoire (bouton « précédent »), le thème suit le choix fait entre-temps", async ({ page }) => {
  await open(page, "4-hallucinations.html");
  // Le choix change sans événement « storage » dans cette page, puis le navigateur la ressort de sa mémoire (pageshow, persisted).
  await page.evaluate((k) => {
    localStorage.setItem(k, JSON.stringify("light"));
    dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  }, KEY);
  expect(await shown(page)).toEqual(expected(CYCLE[1]));
  // Pour de vrai : une autre page, le thème sombre, puis « précédent ». Gardée en mémoire ou rechargée, la page est en sombre.
  await open(page, "5-complaisance.html");
  await page.locator("#themeBtn").click();
  await page.goBack();
  await expect.poll(() => shown(page)).toEqual(expected(CYCLE[2]));
});

// Le thème choisi l'emporte sur le système : sombre choisi avec un système clair donne exactement les couleurs
// du système sombre, et l'inverse. Chaque couleur calculée de chaque élément (et de ses ::before, ::after) est comparée.
const PROPS = ["color", "background-color", "background-image", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
  "outline-color", "text-decoration-color", "fill", "stroke", "box-shadow", "text-shadow", "accent-color", "caret-color", "filter"];
async function colors(browser, f, colorScheme, stored) {
  const context = await browser.newContext({ colorScheme, reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
  if (stored) await context.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(stored)]);
  const page = await context.newPage();
  const errors = await open(page, f);
  const out = await page.evaluate((colorProps) => {
    // Et chaque variable CSS, même si aucun élément ne s'en sert encore (une case qui ne paraît qu'en jouant).
    const vars = new Set();
    const walk = (rules) => {
      for (const r of rules) {
        if (r.style) for (const p of r.style) if (p.startsWith("--")) vars.add(p);
        if (r.cssRules) walk(r.cssRules);
      }
    };
    for (const s of document.styleSheets) { try { walk(s.cssRules); } catch { /* feuille d'un autre site (polices) */ } }
    const props = [...colorProps, ...vars];
    const name = (e) => e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (typeof e.className === "string" && e.className.trim() ? "." + e.className.trim().split(/\s+/).join(".") : "");
    const all = {};
    [document.documentElement, ...document.querySelectorAll("body, body *")].forEach((e, i) => {
      for (const pseudo of ["", "::before", "::after"]) {
        const cs = getComputedStyle(e, pseudo || null);
        if (pseudo && cs.content === "none") continue;
        for (const p of props) all[`${i} ${name(e)}${pseudo} ${p}`] = cs.getPropertyValue(p);
      }
    });
    return { scheme: getComputedStyle(document.documentElement).colorScheme, all };
  }, PROPS);
  await context.close();
  return { errors, ...out };
}

test.describe("thème choisi contre thème du système", () => {
  test.skip(({ isMobile }) => isMobile, "mêmes couleurs que sur bureau");
  for (const f of PAGES) {
    for (const [forced, os] of [["dark", "light"], ["light", "dark"]]) {
      const nom = { dark: "sombre", light: "clair" };
      test(`${f} : ${nom[forced]} choisi avec un système ${nom[os]} donne les couleurs du système ${nom[forced]}`, async ({ browser }) => {
        const ref = await colors(browser, f, forced, null);
        const got = await colors(browser, f, os, forced);
        expect(got.errors).toEqual([]);
        // Clair choisi : « only light », pour que le navigateur n'assombrisse pas la page (Chrome l'écrit « light only »).
        expect(got.scheme.split(" ").sort()).toEqual(forced === "light" ? ["light", "only"] : ["dark"]);
        expect(ref.scheme).toBe(forced);
        const keys = Object.keys(ref.all);
        expect(Object.keys(got.all)).toEqual(keys);
        const diff = keys.filter((k) => got.all[k] !== ref.all[k]).map((k) => `${k} : ${got.all[k]} au lieu de ${ref.all[k]}`);
        expect(diff.slice(0, 10), `${diff.length} différences`).toEqual([]);
      });
    }
  }
});
