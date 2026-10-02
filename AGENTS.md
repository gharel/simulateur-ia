# AGENTS.md

Consignes pour les agents (Claude Code, Codex…) qui travaillent sur ce dépôt.

## Le projet

- « Comprendre l'IA en 6 fiches » : 6 fiches interactives et une page d'accueil, écrites en FALC. C'est une ressource [Skazy Formation](https://formation.skazy.nc/).
- Pages HTML statiques, sans étape de build. Chaque page est autonome : son CSS et son JS sont dans le fichier.
- En ligne avec GitHub Pages, depuis la branche `gh-pages` : https://gharel.github.io/simulateur-ia/

## Fichiers

- `index.html` : l'accueil, la progression, le permis à imprimer.
- `1-tokens.html` à `6-message-piege.html` : les fiches.
- `favicon.svg` : l'icône de l'onglet, « IA » en blanc avec une barre au vert Skazy. `favicon-32.png` et `apple-touch-icon.png` (180 px) en sont des copies, pour Safari et l'écran d'accueil des téléphones. Les liens sont relatifs, pour marcher sous `/simulateur-ia/` sur GitHub Pages.
- `tests/` : les tests Playwright. `playwright.config.js` les lance sur bureau (1280 px) et sur téléphone (Pixel 7).
- `README.md` : le contenu des fiches et le mode d'emploi des icônes.

## Installer et tester

```bash
npm install
npx playwright install chromium
npm test
```

- Les tests ouvrent les pages en `file://`. Ils ont besoin d'internet : Font Awesome et les polices viennent de CDN.
- Une seule page : `npx playwright test -g "3-hallucinations"`.
- Les tests vérifient : pas d'emoji, blocs communs identiques, pages sans erreur JS, icônes connues, logo et lien Skazy Formation, bouton Accueil, pas de défilement horizontal, pas de grand vide en bas des cartes, zones floutées après leur question, mode démonstration, contraste de chaque texte, mode nuit des navigateurs sans effet, jeux et défis qui fonctionnent.
- Si tu changes une mise en page, regarde aussi le rendu toi-même, sur bureau et sur téléphone (captures Playwright).

## Règles

- **Blocs communs.** Le CSS de base, le bloc CSS « Skazy Formation, icônes, Parcours » et le JS « Parcours » sont identiques dans les 6 fiches. Modifie-les partout en même temps. Le bandeau Skazy Formation est identique sur les 7 pages. Un test le vérifie.
- **Pas d'emoji.** Les icônes viennent de Font Awesome 7 Free, style Solid :
  - dans le HTML : `<i class="fa-solid fa-coins" aria-hidden="true"></i>` ;
  - dans un texte JS : `{coins}`, affiché avec `rich(el, texte)` ou `h(tag, classe, texte)` ;
  - en CSS : vise `.fa-coins` ou `.svg-inline--fa`, jamais `.fa-solid`, qui disparaît une fois l'icône affichée.
- **FALC.** Des phrases courtes, le tutoiement, et chaque mot difficile expliqué.
- **Contraste.** Chaque texte doit atteindre 4,5:1 contre son fond (3:1 au-dessus de 24 px, ou de 18,66 px en gras), en thème clair comme en thème sombre. N'utilise pas `opacity` pour estomper un texte : choisis une couleur (`--muted`) ou un contour. Le test `tests/contraste.spec.js` mesure chaque texte, avant et après avoir joué.
- **Mode nuit des navigateurs.** Les pages ont leur propre thème sombre. Chaque page garde `<meta name="color-scheme" content="light dark">` et `<meta name="darkreader-lock">`, sinon le mode nuit de Brave ou Dark Reader inverse les couleurs (texte clair sur les cartes jaunes).
- **Mise en page.** La grille a 4 colonnes (`s1` à `s4`). Les cartes d'une même rangée prennent la hauteur de la plus haute. Associe donc des contenus de hauteur proche : le test refuse plus de 120 px de vide en bas d'une carte. Si « À retenir » est plus court que sa voisine, mets-le en pleine largeur (`s4`).
- **« Devine d'abord ».** La question vient avant les zones qu'elle floute, sur téléphone aussi. `guess()` floute les zones et y ajoute le message « Réponds d'abord à la question ». Pour flouter une zone, passe toujours par `lockZones()` : le mode démonstration (`?demo=1`) doit pouvoir tout montrer.
- **Modes.** Atelier (`?atelier=1`) et démonstration (`?demo=1`) se gardent dans le navigateur et se transmettent dans les liens entre pages. Les boutons et leur explication sont en bas de chaque page.
- **Logo Skazy Formation.** C'est un SVG intégré dans chaque page. Ne le redessine pas.
- **Fins de ligne.** Le dépôt est en LF, l'arbre de travail Windows en CRLF (`core.autocrlf=true`). Ne convertis pas les fichiers.

## Publier

1. `npm test` doit passer en entier.
2. Fais un commit, avec un message en français.
3. Lance `npm run deploy`. Il relance les tests, puis pousse le même commit sur `gh-pages`, puis sur `main`. GitHub Pages republie le site en 1 à 2 minutes.

- Jamais de `--force`.
- Pousse `gh-pages` seul, dans son propre push. Un push de 3 branches d'un coup n'a pas déclenché la publication. Pour vérifier qu'elle est partie : https://github.com/gharel/simulateur-ia/actions (« pages build and deployment »).
- Si le push est refusé parce que le dépôt distant a avancé : récupère les changements (`git fetch`, puis rebase), relance les tests, puis pousse.
- Si le port 22 (SSH) est bloqué, passe par le port 443 :

  ```bash
  git push ssh://git@ssh.github.com:443/gharel/simulateur-ia.git HEAD:gh-pages
  git push ssh://git@ssh.github.com:443/gharel/simulateur-ia.git HEAD:main
  ```
