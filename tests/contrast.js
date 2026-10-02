// Contraste des textes (WCAG 2) : chaque texte visible contre son fond réel, transparences comprises.
// Seuil : 4,5:1, ou 3:1 pour un grand texte (24 px, ou 18,66 px en gras).

// Exécuté dans la page. Renvoie les textes sous le seuil.
function contrastIssuesInPage() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  // N'importe quelle couleur CSS (oklab, color-mix…) en sRGB 0-255, via le canevas.
  const rgba = (str) => {
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = "rgba(0, 0, 0, 0)";
    cx.fillStyle = str;
    cx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: a / 255 };
  };
  const over = (top, bot) => {
    const a = top.a + bot.a * (1 - top.a);
    if (!a) return { r: 0, g: 0, b: 0, a: 0 };
    const c = (k) => (top[k] * top.a + bot[k] * bot.a * (1 - top.a)) / a;
    return { r: c("r"), g: c("g"), b: c("b"), a };
  };
  const fade = (col, o) => ({ ...col, a: col.a * o });
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (x, y) => { const [a, b] = [lum(x), lum(y)].sort((m, n) => n - m); return (a + 0.05) / (b + 0.05); };
  const COLOR = /rgba?\([^)]*\)|color\([^)]*\)|oklab\([^)]*\)|oklch\([^)]*\)|#[0-9a-f]{3,8}\b/gi;

  // Couleur du texte et du fond sous le texte, en remontant les parents (fonds et opacités).
  // Un fond en dégradé donne une couleur par arrêt : on garde le pire cas.
  function colorsAt(el, fg) {
    const chain = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) chain.push(n);
    let stacks = [{ text: fg, bg: { r: 0, g: 0, b: 0, a: 0 } }];
    for (const n of chain) {
      const cs = getComputedStyle(n);
      const op = parseFloat(cs.opacity);
      const grads = cs.backgroundImage !== "none" ? (cs.backgroundImage.match(COLOR) || []).map(rgba) : [];
      const bgs = [rgba(cs.backgroundColor), ...grads.map((g) => over(g, rgba(cs.backgroundColor)))];
      const next = [];
      for (const s of stacks) for (const bg of grads.length ? bgs.slice(1) : bgs.slice(0, 1)) {
        next.push({ text: fade(over(s.text, bg), op), bg: fade(over(s.bg, bg), op) });
      }
      stacks = next;
    }
    const page = { r: 255, g: 255, b: 255, a: 1 };
    return stacks.map((s) => ratio(over(s.text, page), over(s.bg, page)));
  }

  // Textes exclus : volontairement cachés (démonstration de la fiche 6), floutés, désactivés, décoratifs.
  const SKIP = ".hid, .locked, .confetti, [hidden], :disabled, .seg.off";
  const issues = [];
  const seen = new Set();
  const els = [...document.querySelectorAll("body *")].filter((el) => {
    if (el.closest(SKIP) || seen.has(el)) return false;
    const own = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
    return own;
  });
  for (const el of els) {
    seen.add(el);
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility !== "visible") continue;
    const isSvgText = el instanceof SVGElement;
    const fg = rgba(isSvgText ? cs.fill : cs.color);
    // Dans un SVG, la taille du texte suit l'échelle du dessin.
    const svg = isSvgText && el.ownerSVGElement, vb = svg && svg.viewBox.baseVal;
    const scale = vb && vb.width ? svg.getBoundingClientRect().width / vb.width : 1;
    const size = parseFloat(cs.fontSize) * scale;
    const bold = parseInt(cs.fontWeight, 10) >= 700 || /Archivo Black/.test(cs.fontFamily);
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    const worst = Math.min(...colorsAt(el, fg));
    if (worst < need - 0.005) {
      issues.push({
        texte: [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join(" ").trim().replace(/\s+/g, " ").slice(0, 50),
        element: el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : ""),
        contraste: Math.round(worst * 100) / 100,
        seuil: need,
      });
    }
  }
  return issues;
}

const contrastIssues = (page) => page.evaluate(contrastIssuesInPage);

module.exports = { contrastIssues };
