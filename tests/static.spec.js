// Contrôles sur le texte des fichiers, sans navigateur.
const fs = require("fs");
const { test, expect } = require("@playwright/test");
const { ROOT, FICHES, PAGES, MOVED, SKAZY, PICTO, read } = require("./site");

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
  "JS Parcours": (t) => t.slice(t.indexOf("// Parcours : progression"), t.indexOf("})();", t.indexOf("(function initModes")) + 5),
  "bandeau du haut": (t) => t.slice(t.indexOf('<header class="brand">'), t.indexOf("</header>") + 9),
  "boutons des modes et leur explication": (t) => t.slice(t.indexOf('<div class="modes">'), t.indexOf("</div>", t.indexOf('<div class="modes-help">')) + 6),
};
for (const [name, cut] of Object.entries(BLOCKS)) {
  test(`bloc commun identique dans les ${FICHES.length} fiches : ${name}`, () => {
    const ref = cut(read(FICHES[0]));
    expect(ref.length).toBeGreaterThan(200);
    for (const f of FICHES.slice(1)) expect(cut(read(f)), f).toBe(ref);
  });
}

test("logo et mention Skazy Formation identiques sur toutes les pages", () => {
  const logo = (t) => (t.match(/<header class="brand">[\s\S]*?(<a href="https:\/\/formation\.skazy\.nc\/"[\s\S]*?<\/a>)\n\s*<\/header>/) || [, ""])[1];
  const foot = (t) => (t.match(/<span class="brand-foot">.*?<\/span>/) || [""])[0];
  const ref = read(PAGES[0]);
  expect(logo(ref)).toContain(`href="${SKAZY}"`);
  expect(foot(ref)).toContain(`href="${SKAZY}"`);
  expect(foot(ref)).toContain("© ");
  expect(foot(ref)).toContain("Usage réservé aux stagiaires de Skazy Formation");
  for (const f of PAGES.slice(1)) {
    expect(logo(read(f)), f).toBe(logo(ref));
    expect(foot(read(f)), f).toBe(foot(ref));
  }
});

test("aucune page n'est référencée par les moteurs de recherche", () => {
  for (const f of [...PAGES, ...Object.keys(MOVED)]) expect(read(f), f).toContain('<meta name="robots" content="noindex">');
});

test("chaque page a son favicon, et les fichiers existent", () => {
  for (const f of ["favicon.svg", "favicon-32.png", "apple-touch-icon.png"]) expect(fs.existsSync(`${ROOT}/${f}`), f).toBe(true);
  for (const f of PAGES) {
    const t = read(f);
    expect(t, f).toContain('<link rel="icon" href="favicon.svg" type="image/svg+xml">');
    expect(t, f).toContain('<link rel="icon" href="favicon-32.png" type="image/png" sizes="32x32">');
    expect(t, f).toContain('<link rel="apple-touch-icon" href="apple-touch-icon.png">');
  }
});

test("chaque fiche a un bouton Accueil en haut, et l'accueil a le mode démonstration", () => {
  for (const f of FICHES) expect(read(f), f).toMatch(/<header class="brand">\n\s*<a class="home" href="index\.html">[\s\S]*?Accueil<\/a>\n\s*<a href="https:\/\/formation\.skazy\.nc\/"/);
  const home = read("index.html");
  expect(home).not.toContain('class="home"');
  expect(home).toContain('id="demoBtn"');
  expect(home).toContain('class="modes-help"');
});

test("chaque page refuse les modes nuit forcés (elle a déjà son thème sombre)", () => {
  for (const f of PAGES) {
    expect(read(f), f).toContain('<meta name="color-scheme" content="light dark">');
    expect(read(f), f).toContain('<meta name="darkreader-lock">');
  }
});

test("Font Awesome chargé depuis cdnjs avec contrôle d'intégrité", () => {
  for (const f of PAGES) {
    const scripts = read(f).match(/<script defer src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/[^"]+" integrity="sha512-[^"]+"/g) || [];
    expect(scripts.length, f).toBe(2);
  }
});

test("chaque fiche donne son numéro, le menu de toutes les fiches et le lien vers la suivante", () => {
  const n = FICHES.length;
  FICHES.forEach((f, i) => {
    const t = read(f);
    expect(t, f).toContain(`Comprendre l'IA · Fiche ${i + 1} sur ${n}`);
    const nav = (t.match(/<nav class="series"[^>]*>.*?<\/nav>/) || [""])[0];
    expect(nav.match(/href="\d-[^"]+\.html"/g), f).toEqual(FICHES.filter((g) => g !== f).map((g) => `href="${g}"`));
    expect(t, f).toContain(`<a class="card s4 next" href="${FICHES[i + 1] || "index.html#permis"}">`);
  });
  // L'accueil a une carte par fiche, dans le même ordre.
  expect(read("index.html").match(/<a class="card fiche[^"]*" href="([^"]+)"/g).map((a) => a.match(/href="([^"]+)"/)[1])).toEqual(FICHES);
});

test("chaque ancienne adresse renvoie vers une fiche qui existe", () => {
  for (const [old, to] of Object.entries(MOVED)) {
    expect(FICHES, old).toContain(to);
    expect(read(old), old).toContain(`location.replace("${to}" + location.search + location.hash)`);
    expect(read(old), old).toContain(`<meta http-equiv="refresh" content="0; url=${to}">`);
  }
});
