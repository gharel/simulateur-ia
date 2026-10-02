// Outils partagés par les tests.
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const FICHES = ["1-tokens.html", "2-modele-effort.html", "3-hallucinations.html", "4-boite-outils.html", "5-forfait-api.html", "6-message-piege.html"];
const PAGES = ["index.html", ...FICHES];
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

// Ce qui ne doit jamais s'afficher : un jeton {icône} brut, un emoji, une icône inconnue.
async function displayProblems(page) {
  const text = await page.locator("body").innerText();
  return {
    jetons: text.match(/\{[a-z0-9-]+\}/g) || [],
    emoji: text.match(new RegExp(PICTO.source, "gu")) || [],
    iconesInconnues: await page.locator("svg.svg-inline--fa .missing").count(),
  };
}
const NO_PROBLEM = { jetons: [], emoji: [], iconesInconnues: 0 };

module.exports = { ROOT, FICHES, PAGES, SKAZY, PICTO, NO_PROBLEM, read, url, open, iconsReady, displayProblems };
