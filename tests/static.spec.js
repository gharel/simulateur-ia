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
  "bandeau du haut": (t) => t.slice(t.indexOf('<header class="brand"'), t.indexOf("</header>") + 9),
  "boutons des modes et leur explication": (t) => t.slice(t.indexOf('<div class="modes">'), t.indexOf("</div>", t.indexOf('<div class="modes-help">')) + 6),
};
for (const [name, cut] of Object.entries(BLOCKS)) {
  test(`bloc commun identique dans les ${FICHES.length} fiches : ${name}`, () => {
    const ref = cut(read(FICHES[0]));
    expect(ref.length).toBeGreaterThan(200);
    for (const f of FICHES.slice(1)) expect(cut(read(f)), f).toBe(ref);
  });
}
// Et sur les 10 pages, accueil compris : le CSS du bandeau, le bouton « Remonter en haut » et son JS.
const PAGE_BLOCKS = {
  "CSS du bandeau et de « Remonter en haut »": (t) => t.slice(t.indexOf("/* Skazy Formation"), t.indexOf(".modes {")),
  "bouton « Remonter en haut »": (t) => t.slice(t.indexOf('<button type="button" class="to-top"'), t.indexOf("</button>", t.indexOf('class="to-top"')) + 9),
  "JS « Remonter en haut »": (t) => t.slice(t.indexOf("// « Remonter en haut »"), t.indexOf("})();", t.indexOf("(function initToTop")) + 5),
};
for (const [name, cut] of Object.entries(PAGE_BLOCKS)) {
  test(`bloc commun identique dans les ${PAGES.length} pages : ${name}`, () => {
    const ref = cut(read(PAGES[0]));
    expect(ref.length).toBeGreaterThan(100);
    for (const f of PAGES.slice(1)) expect(cut(read(f)), f).toBe(ref);
  });
}

test("bandeau Skazy Formation : le même ordre et les mêmes liens sur toutes les pages", () => {
  // De gauche à droite : le bouton Accueil et un filet (fiches), puis la pastille et le nom de l'outil, un seul lien vers l'accueil.
  // À droite : « Les outils » (tous les outils Skazy Formation, dans le même onglet), un filet, et le logo en dernier (nouvel onglet).
  const brand = (t) => (t.match(/<header class="brand"[^>]*>\n[\s\S]*?<\/header>/) || [""])[0];
  const LOGO = /^<svg class="brand-logo" viewBox="0 0 218 72" aria-hidden="true" focusable="false">.*<\/svg>$/;
  const lines = (t) => brand(t).split("\n").map((l) => l.trim()).map((l) => (LOGO.test(l) ? "<svg logo>" : l));
  const tool = (current) => `<a class="brand-tool" href="index.html"${current}><img src="favicon.svg" width="28" height="28" alt=""><span class="brand-name">Comprendre l'IA</span></a>`;
  const right = [
    '<a class="brand-outils" href="https://gharel.github.io/home/" title="Tous les outils Skazy Formation"><img src="les-outils.svg" width="26" height="26" alt=""><span class="brand-txt">Les outils</span></a>',
    '<span class="brand-sep" aria-hidden="true"></span>',
    `<a class="brand-skazy" href="${SKAZY}" target="_blank" rel="noopener" aria-label="Site de Skazy Formation (nouvel onglet)">`,
    "<svg logo>",
    "</a>",
    "</header>",
  ];
  // L'accueil : le nom de l'outil est la page en cours. Une fiche : le bouton Accueil d'abord.
  expect(lines(read("index.html"))).toEqual(['<header class="brand" tabindex="-1">', tool(' aria-current="page"'), ...right]);
  for (const f of FICHES) {
    expect(lines(read(f)), f).toEqual([
      '<header class="brand" tabindex="-1">',
      '<a class="home" href="index.html"><i class="fa-solid fa-house" aria-hidden="true"></i> <span class="brand-txt">Accueil</span></a>',
      '<span class="brand-sep" aria-hidden="true"></span>',
      tool(""),
      ...right,
    ]);
  }
  // Le même logo partout, et la même mention en bas.
  const logo = (t) => brand(t).match(/<svg class="brand-logo".*<\/svg>/)[0];
  const foot = (t) => (t.match(/<span class="brand-foot">.*?<\/span>/) || [""])[0];
  const ref = read(PAGES[0]);
  expect(foot(ref)).toContain(`href="${SKAZY}"`);
  expect(foot(ref)).toContain("© ");
  expect(foot(ref)).toContain("Usage réservé aux stagiaires de Skazy Formation");
  for (const f of PAGES.slice(1)) {
    expect(logo(read(f)), f).toBe(logo(ref));
    expect(foot(read(f)), f).toBe(foot(ref));
  }
});

// Titre d'onglet commun aux outils Skazy Formation : « Page · Comprendre l'IA · Skazy Formation » (l'accueil, sans « Page · »).
test("chaque titre d'onglet suit la règle des outils Skazy Formation", () => {
  expect(read("index.html")).toContain("<title>Comprendre l'IA · Skazy Formation</title>");
  for (const f of [...FICHES, ...Object.keys(MOVED)]) expect(read(f), f).toMatch(/<title>[^<·—]+ · Comprendre l'IA · Skazy Formation<\/title>/);
});

test("aucune page n'est référencée par les moteurs de recherche", () => {
  for (const f of [...PAGES, ...Object.keys(MOVED)]) expect(read(f), f).toContain('<meta name="robots" content="noindex">');
});

test("chaque page a son favicon, et les fichiers existent", () => {
  // les-outils.svg : la roue de « Les outils », copiée dans le dépôt (pas de lien vers le fichier d'un autre site).
  for (const f of ["favicon.svg", "favicon-32.png", "apple-touch-icon.png", "les-outils.svg"]) expect(fs.existsSync(`${ROOT}/${f}`), f).toBe(true);
  for (const f of PAGES) {
    const t = read(f);
    expect(t, f).toContain('<link rel="icon" href="favicon.svg" type="image/svg+xml">');
    expect(t, f).toContain('<link rel="icon" href="favicon-32.png" type="image/png" sizes="32x32">');
    expect(t, f).toContain('<link rel="apple-touch-icon" href="apple-touch-icon.png">');
  }
});

test("chaque fiche a un bouton Accueil en haut, et l'accueil a le mode démonstration", () => {
  for (const f of FICHES) expect(read(f), f).toMatch(/<header class="brand"[^>]*>\n\s*<a class="home" href="index\.html">[\s\S]*?Accueil<\/span><\/a>\n/);
  const home = read("index.html");
  expect(home).toMatch(/<header class="brand"[^>]*>\n\s*<a class="brand-tool" href="index\.html" aria-current="page">/);
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
