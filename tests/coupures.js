// Mauvaises coupures de ligne, mesurées dans la page affichée :
// une ponctuation seule en début de ligne, « seul en fin de ligne, un mot coupé en deux,
// un nombre séparé du mot qui le suit, une icône séparée de son mot,
// un mot seul sur sa ligne dans un titre ou un bouton, une ligne de titre h1 coupée en deux.
// À lancer avec page.evaluate(lineBreakIssues). Renvoie [{ coupure, ou, texte }], texte avec ⏎ à la coupure.
async function lineBreakIssues() {
  await document.fonts.ready;
  const out = [];
  const isText = (el) => !el.closest("script, style, textarea, svg, .confetti") && el.checkVisibility({ visibilityProperty: true });
  // Le bloc où se font les lignes. Un texte posé dans un flex ou une grille fait son propre bloc.
  const blockOf = (node) => {
    let e = node.parentElement;
    if (/flex|grid/.test(getComputedStyle(e).display)) return node;
    while (e && /^(inline|contents)$/.test(getComputedStyle(e).display)) e = e.parentElement;
    return e;
  };
  const name = (el) => {
    const e = el.nodeType === 1 ? el : el.parentElement;
    return e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (typeof e.className === "string" && e.className.trim() ? "." + e.className.trim().split(/\s+/).join(".") : "");
  };
  const range = document.createRange();
  const rectOf = (node, i) => { range.setStart(node, i); range.setEnd(node, i + 1); return range.getClientRects()[0]; };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (isText(n.parentElement) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  const LETTER = /[\p{L}\p{N}]/u;
  // Une adresse web ou e-mail, ou un nom avec des chiffres (gpt-5-thinking-mini), peut se couper à un trait d'union.
  const isCode = (word) => /@|\.\p{L}{2,}|\d/u.test(word);
  // Le voisin d'un nœud, sans le commentaire que Font Awesome ajoute après chaque icône.
  const sibling = (node, dir) => { let s = node[dir]; while (s?.nodeType === 8) s = s[dir]; return s; };
  let prev = null, before = "", space = false;
  for (let n; (n = walker.nextNode());) {
    const block = blockOf(n);
    if (!prev || prev.block !== block) { prev = null; before = ""; space = false; }
    // Une icône ou un <br> entre deux textes compte comme une espace.
    const left = sibling(n, "previousSibling");
    if (prev && left?.nodeType === 1 && !left.textContent.trim()) space = true;
    const data = n.data;
    for (let i = 0; i < data.length; i++) {
      const ch = data[i];
      if (/\s/.test(ch)) { if (ch !== " " && ch !== " ") space = true; before += ch; continue; }
      const r = rectOf(n, i);
      if (!r || (!r.width && !r.height)) { before += ch; continue; }
      // Nouvelle ligne : plus bas, et revenu vers la gauche (un petit texte à côté d'un gros chiffre reste sur la même ligne).
      if (prev && r.top > prev.r.top + Math.min(r.height, prev.r.height) / 2 && r.left < prev.r.right - 1) {
        const after = data.slice(i);
        const word = (before.match(/\S*$/)[0] + after.match(/^\S*/)[0]);
        let coupure = null;
        if (/[?!:;»%$€=·/)\].,…]/.test(ch)) coupure = "ponctuation en début de ligne";
        else if (prev.ch === "«") coupure = "« en fin de ligne";
        // Un trait d'union discret (­) juste avant : le mot est coupé à la bonne place, avec un trait d'union.
        else if (!space && LETTER.test(prev.ch) && LETTER.test(ch) && !/­.?$/.test(before)) coupure = "mot coupé";
        else if (!space && prev.ch === "-" && !isCode(word)) coupure = "mot coupé au trait d'union";
        else if (/\d/.test(prev.ch) && /[\p{L}\d]/u.test(ch)) coupure = "nombre séparé du mot qui le suit";
        else if (/\p{L}/u.test(prev.ch) && /\d/.test(ch)) coupure = "nombre séparé du mot d'avant";
        if (coupure) out.push({ coupure, ou: name(block), texte: (before.slice(-30) + "⏎" + after.slice(0, 30)).replace(/\s+/g, " ") });
      }
      prev = { ch, r, block };
      space = false;
      before += ch;
    }
  }
  // Une icône reste sur la même ligne que le texte qui la suit (« {icône} Bravo »),
  // ou, à la fin d'un texte, que le texte qui la précède (« Suivant {icône} »).
  // Dans un flex, l'icône est à côté du texte, même s'il fait 2 lignes : rien à vérifier.
  const textAround = (sib) => (sib?.nodeType === 3 && sib.data.trim() ? sib : null);
  for (const svg of document.querySelectorAll("svg.svg-inline--fa")) {
    if (!svg.checkVisibility({ visibilityProperty: true }) || svg.closest(".confetti") || /flex|grid/.test(getComputedStyle(svg.parentElement).display)) continue;
    const next = textAround(sibling(svg, "nextSibling")), prevText = textAround(sibling(svg, "previousSibling"));
    const sib = next || prevText;
    if (!sib) continue;
    const t = sib.data, r = rectOf(sib, next ? t.length - t.trimStart().length : t.trimEnd().length - 1), b = svg.getBoundingClientRect();
    if (r && Math.abs((r.top + r.bottom) / 2 - (b.top + b.bottom) / 2) > Math.max(r.height, b.height) / 2)
      out.push({ coupure: "icône séparée de son texte", ou: name(svg.parentElement), texte: (next ? "[icône]⏎" + t.slice(0, 30) : t.slice(-30) + "⏎[icône]").replace(/\s+/g, " ") });
  }
  // Un titre ou un bouton ne laisse pas un mot seul sur une ligne (« COMPRENDRE / L'IA »).
  // Les lignes d'un titre h1 (entre deux <br>) restent entières. Avec 3 mots ou moins, un texte sur 2 lignes
  // laisse forcément un mot seul : c'est permis, sauf dans un h1.
  for (const el of document.querySelectorAll("h1, h2, h3, .next strong, button, .btn, .pill, .sw > span, .lock-tip > span, .lic-title")) {
    if (!isText(el)) continue;
    const blocks = new Map();
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let seg = 0;
    for (let n; (n = tw.nextNode());) {
      if (n.nodeName === "BR") seg++;
      if (n.nodeType !== 3 || n.parentElement.closest("svg")) continue;
      let b = n.parentElement;
      while (b !== el && /^(inline|contents)$/.test(getComputedStyle(b).display)) b = b.parentElement;
      if (!blocks.has(b)) blocks.set(b, []);
      for (const m of n.data.matchAll(/\S+/g)) {
        if (!LETTER.test(m[0])) continue;
        range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
        const r = range.getClientRects()[0];
        if (r) blocks.get(b).push({ w: m[0], seg, top: r.top, h: r.height });
      }
    }
    for (const words of blocks.values()) {
      for (const seg of new Set(words.map((w) => w.seg))) {
        const lines = [];
        for (const w of words.filter((w) => w.seg === seg)) {
          const l = lines.at(-1);
          if (l && Math.abs(w.top - l.top) < w.h / 2) l.words.push(w.w); else lines.push({ top: w.top, words: [w.w] });
        }
        const texte = lines.map((l) => l.words.join(" ")).join(" ⏎ ");
        if (el.tagName === "H1" && lines.length > 1) out.push({ coupure: "ligne de titre coupée", ou: name(el), texte });
        else if (lines.length > 1 && lines.flatMap((l) => l.words).length >= 4 && lines.some((l) => l.words.length === 1))
          out.push({ coupure: "mot seul sur sa ligne", ou: name(el), texte });
      }
    }
  }
  return out;
}

module.exports = { lineBreakIssues };
