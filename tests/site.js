// Outils partagés par les tests.
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { lineBreakIssues } = require("./coupures");

const ROOT = path.resolve(__dirname, "..");
const FICHES = ["1-tokens.html", "2-memoire.html", "3-modele-effort.html", "4-hallucinations.html", "5-complaisance.html", "6-message-piege.html", "7-boite-outils.html", "8-forfait-api.html"];
const PAGES = ["index.html", ...FICHES];
// Adresses du parcours en 6 fiches : de petites pages renvoient vers la nouvelle adresse.
const MOVED = { "2-modele-effort.html": "3-modele-effort.html", "3-hallucinations.html": "4-hallucinations.html", "4-boite-outils.html": "7-boite-outils.html", "5-forfait-api.html": "8-forfait-api.html" };
const SKAZY = "https://formation.skazy.nc/";

// Emoji et pictogrammes Unicode interdits : les icônes passent par Font Awesome.
const PICTO = /(\p{Extended_Pictographic}|\p{Regional_Indicator}|[←-⇿⌀-⏿■-◿☀-➿⬀-⯿️])/u;

const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const url = (f) => pathToFileURL(path.join(ROOT, f)).href;

// Ouvre une page (query : "?atelier=1" par exemple) et garde les erreurs JS et console.
async function open(page, f, query = "") {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(url(f) + query, { waitUntil: "networkidle" });
  await iconsReady(page);
  return errors;
}

// Font Awesome remplace chaque <i class="fa-…"> par un <svg>, peu après chaque changement de la page.
// Si ça bloque ici : Font Awesome n'a pas pu se charger (pas de connexion ?).
const iconsReady = (page) => page.waitForFunction(() => !document.querySelector("i[class*='fa-']"), null, { timeout: 15_000 });

// Ce qui ne doit jamais s'afficher : un jeton {icône} brut, un emoji, une icône inconnue,
// une mauvaise coupure de ligne (ponctuation seule en début de ligne, mot coupé… voir coupures.js),
// un cadre en double (une règle « .x span » qui habille aussi le <span class="nobr"> d'une icône et de son mot).
async function displayProblems(page) {
  const text = await page.locator("body").innerText();
  return {
    jetons: text.match(/\{[a-z0-9-]+\}/g) || [],
    emoji: text.match(new RegExp(PICTO.source, "gu")) || [],
    iconesInconnues: await page.locator("svg.svg-inline--fa .missing").count(),
    coupures: await page.evaluate(lineBreakIssues),
    cadres: await page.evaluate(() => [...document.querySelectorAll(".nobr")].filter((e) => {
      const cs = getComputedStyle(e);
      return parseFloat(cs.borderTopWidth) || parseFloat(cs.paddingLeft) || cs.boxShadow !== "none" || cs.backgroundColor !== "rgba(0, 0, 0, 0)";
    }).map((e) => e.textContent.trim())),
  };
}
const NO_PROBLEM = { jetons: [], emoji: [], iconesInconnues: 0, coupures: [], cadres: [] };

// Joue avec toute la page : répond aux « Devine d'abord », allume la lampe, clique partout, bouge les curseurs.
// Pas les boutons des modes (ils rechargent la page) ni l'impression.
async function playEverything(page, rounds = 2) {
  page.on("dialog", (d) => d.dismiss());
  for (const g of await page.locator(".guess").all()) {
    await g.locator(".qbtns button").first().click().catch(() => {});
    // En mode atelier, le clic choisit seulement : « Révéler » montre la correction.
    const reveal = g.locator(".reveal");
    if (await reveal.isVisible()) await reveal.click();
  }
  if (await page.locator("#lampSw").count()) await page.locator("#lampSw").click();
  const controls = page.locator("main button:visible:not(#atelierBtn):not(#demoBtn):not(#licPrint), main input[type=checkbox]:visible");
  for (let round = 0; round < rounds; round++) {
    const n = await controls.count();
    for (let i = 0; i < n; i++) await controls.nth(i).click({ timeout: 1000 }).catch(() => {});
    for (const r of await page.locator("main input[type=range]").all()) await r.fill(String(round ? 1 : 3)).catch(() => {});
  }
  await iconsReady(page);
}

module.exports = { ROOT, FICHES, PAGES, MOVED, SKAZY, PICTO, NO_PROBLEM, read, url, open, iconsReady, displayProblems, playEverything };
