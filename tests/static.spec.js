// Contrôles sur le texte des fichiers, sans navigateur.
const fs = require("fs");
const { test, expect } = require("@playwright/test");
const { ROOT, FICHES, PAGES, SKAZY, PICTO, read } = require("./site");

test("aucun emoji dans les pages et la documentation", () => {
  const files = fs.readdirSync(ROOT).filter((f) => /\.(html|md)$/.test(f));
  const found = [];
  for (const f of files) {
    read(f).split("\n").forEach((line, i) => { if (PICTO.test(line)) found.push(`${f}:${i + 1} ${line.trim().slice(0, 80)}`); });
  }
  expect(found).toEqual([]);
});

// Les blocs communs doivent rester identiques d'une fiche à l'autre.
const BLOCKS = {
  "CSS de base": (t) => t.slice(t.indexOf("<style>"), t.indexOf("/* Skazy Formation")),
  "CSS Skazy, icônes et Parcours": (t) => t.slice(t.indexOf("/* Skazy Formation"), t.indexOf(":root { --accent")),
  "JS Parcours": (t) => t.slice(t.indexOf("// Parcours : progression"), t.indexOf("})();", t.indexOf("(function initAtelier")) + 5),
};
for (const [name, cut] of Object.entries(BLOCKS)) {
  test(`bloc commun identique dans les 6 fiches : ${name}`, () => {
    const ref = cut(read(FICHES[0]));
    expect(ref.length).toBeGreaterThan(200);
    for (const f of FICHES.slice(1)) expect(cut(read(f)), f).toBe(ref);
  });
}

test("bandeau et mention Skazy Formation identiques sur toutes les pages", () => {
  const header = (t) => t.slice(t.indexOf('<header class="brand">'), t.indexOf("</header>") + 9);
  const foot = (t) => (t.match(/<span class="brand-foot">.*?<\/span>/) || [""])[0];
  const ref = read(PAGES[0]);
  expect(header(ref)).toContain(`href="${SKAZY}"`);
  expect(foot(ref)).toContain(`href="${SKAZY}"`);
  for (const f of PAGES.slice(1)) {
    expect(header(read(f)), f).toBe(header(ref));
    expect(foot(read(f)), f).toBe(foot(ref));
  }
});

test("Font Awesome chargé depuis cdnjs avec contrôle d'intégrité", () => {
  for (const f of PAGES) {
    const scripts = read(f).match(/<script defer src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/[^"]+" integrity="sha512-[^"]+"/g) || [];
    expect(scripts.length, f).toBe(2);
  }
});
