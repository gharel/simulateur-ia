// Texte qui dépasse de sa case, mesuré dans la page affichée : un grand nombre dans une pastille,
// un mot trop long dans une carte, une colonne de tableau coupée par le bord de l'écran…
// Pour chaque texte, on remonte les cases qui l'entourent (fond, bordure ou overflow) : il doit tenir dedans en largeur.
// Une zone qui défile (overflow: auto) arrête la recherche. Une zone floutée (.locked) ne compte pas : elle ne se lit pas encore.
// À lancer avec page.evaluate(overflowIssues). Renvoie [{ case, texte, px }], px : de combien le texte dépasse.
async function overflowIssues() {
  await document.fonts.ready;
  const out = [];
  const name = (e) => e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (typeof e.className === "string" && e.className.trim() ? "." + e.className.trim().split(/\s+/).join(".") : "");
  const isBox = (cs) => cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.backgroundImage !== "none" || cs.overflowX !== "visible"
    || ["Top", "Right", "Bottom", "Left"].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== "none");
  const range = document.createRange();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.data.trim() && !n.parentElement.closest("script, style, svg, textarea, .confetti, .locked") && n.parentElement.checkVisibility({ visibilityProperty: true })
      ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  for (let n; (n = walker.nextNode());) {
    range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0.5);
    for (let e = n.parentElement; rects.length && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (/auto|scroll/.test(cs.overflowX)) break;
      if (/^(inline|contents)$/.test(cs.display) || !isBox(cs)) continue;
      const b = e.getBoundingClientRect();
      const px = Math.max(...rects.map((r) => Math.max(b.left - r.left, r.right - b.right)));
      if (px > 1) { out.push({ case: name(e), texte: n.data.trim().slice(0, 40), px: Math.round(px) }); break; }
    }
  }
  return out;
}

module.exports = { overflowIssues };
