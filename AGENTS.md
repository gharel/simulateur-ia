# AGENTS.md

Consignes pour les agents (Claude Code, Codex…) qui travaillent sur ce dépôt.

## Le projet

- « Comprendre l'IA en 9 fiches » : 9 fiches interactives en 3 parties, et une page d'accueil, écrites en FALC. C'est une ressource [Skazy Formation](https://formation.skazy.nc/).
- Pages HTML statiques, sans étape de build. Chaque page est autonome : son CSS et son JS sont dans le fichier.
- En ligne avec GitHub Pages, depuis la branche `gh-pages` : https://gharel.github.io/simulateur-ia/

## Fichiers

- `index.html` : l'accueil, la progression, le permis à imprimer.
- `1-tokens.html` à `9-forfait-api.html` : les fiches, dans l'ordre du parcours.
- `2-modele-effort.html`, `3-hallucinations.html`, `4-boite-outils.html`, `5-forfait-api.html` : les adresses du parcours en 6 fiches. `8-forfait-api.html` : celle du parcours en 8 fiches. Ce sont de petites pages qui renvoient vers la nouvelle fiche, en gardant `?atelier=1` et `?demo=1`. Ne les supprime pas : des liens circulent.
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
- Une seule page : `npx playwright test -g "4-hallucinations"`. Sous Windows, n'écris pas de `|` dans `-g` : lance une commande par page.
- Les tests vérifient : pas d'emoji, blocs communs identiques, pages sans erreur JS, icônes connues, logo et lien Skazy Formation, bouton Accueil, pas de défilement horizontal, pas de grand vide en bas des cartes, pas de mauvaise coupure de ligne, pas de mot seul sur sa ligne dans un titre ou un bouton, pas de texte qui dépasse de sa case (aussi avec les jeux au maximum), zones floutées après leur question, mode démonstration, contraste de chaque texte, mode nuit des navigateurs sans effet, jeux et défis qui fonctionnent.
- Si tu changes une mise en page, regarde aussi le rendu toi-même, sur bureau et sur téléphone (captures Playwright).

## Règles

- **Blocs communs.** Le CSS de base, le bloc CSS « Skazy Formation, icônes, Parcours » et le JS « Parcours » sont identiques dans les 9 fiches. Modifie-les partout en même temps. Le bandeau Skazy Formation est identique sur les 10 pages. Un test le vérifie.
- **Progression.** Elle se range par nom de fiche (`const FICHE = "tokens"`…), jamais par numéro : on peut réordonner sans perdre les badges. Une progression du parcours en 6 fiches (clés 1 à 6) est convertie par `loadProgress()`, dans les fiches et dans l'accueil.
- **Ajouter ou déplacer une fiche.** À mettre à jour :
  - `BADGES` et `CONFETTI_COLORS` (bloc commun) ;
  - `index.html` : la carte, `BADGES`, `FILES`, `COLORS`, la bande de couleurs du permis ;
  - dans chaque fiche : « Fiche N sur 9 », le menu du bas, la carte « Fiche suivante » ;
  - `FICHES` dans `tests/site.js`.

  Si une adresse change, laisse une page de redirection et ajoute-la à `MOVED` dans `tests/site.js`. Pour renvoyer vers une autre fiche, écris son nom (« voir « Le Sac à Tokens » »), pas son numéro.
- **Pas d'emoji.** Les icônes viennent de Font Awesome 7 Free, style Solid :
  - dans le HTML : `<i class="fa-solid fa-coins" aria-hidden="true"></i>` ;
  - dans un texte JS : `{coins}`, affiché avec `rich(el, texte)` ou `h(tag, classe, texte)` ;
  - en CSS : vise `.fa-coins` ou `.svg-inline--fa`, jamais `.fa-solid`, qui disparaît une fois l'icône affichée.
- **FALC.** Des phrases courtes, le tutoiement, et chaque mot difficile expliqué.
- **Contraste.** Chaque texte doit atteindre 4,5:1 contre son fond (3:1 au-dessus de 24 px, ou de 18,66 px en gras), en thème clair comme en thème sombre. N'utilise pas `opacity` pour estomper un texte : choisis une couleur (`--muted`) ou un contour. Le test `tests/contraste.spec.js` mesure chaque texte, avant et après avoir joué.
- **Animations.** Une animation montre ce qui change quand on agit : un score qui monte, une étape d'un schéma, un classement qui s'inverse. Elle dure de 0,3 à 0,6 s. Les cartes ne bougent pas : pas d'animation à l'arrivée d'une carte, ni au défilement.
  - Elle bouge avec `transform` : jamais d'`opacity` ni de couleur animée sur un texte (le test de contraste lit la page à tout moment), et jamais un contenu caché en attendant qu'elle se joue.
  - Le bloc commun donne les `@keyframes` (`pop`, `bump`, `shake`, `rise`, `grow`, `glow`) et les outils JS : `replay(el)` relance une animation, `countTo(el, n)` fait monter un nombre, `onSeen(el, fn)` attend que l'élément arrive à l'écran.
  - Si le système demande moins d'animations (`prefers-reduced-motion`), tout s'arrête : la règle CSS commune s'en charge, et une animation lancée en JS vérifie `STILL()`. Un test le vérifie.
- **Schémas pas à pas.** Une procédure ou un « pourquoi » en étapes devient un schéma interactif, pas une rangée de cartes figées. Le bloc commun donne `procedure(el, steps, show)` :
  - dans le HTML, `<div class="proc" id="…">` contient le schéma de la fiche. Le script ajoute le rail des étapes au début, puis le texte de l'étape, puis les boutons à la fin. Pour les placer ailleurs, mets `<div class="proc-txt">` et `<div class="proc-nav">` dans la page ;
  - `steps` : `[{ label, title, text }]`. `label` est court (le rail), `title` et `text` peuvent être des fonctions, quand l'étape dépend d'un réglage ;
  - `show(i, from)` redessine le schéma pour l'étape `i`. `from` vaut l'étape d'avant, ou `null` au premier affichage et après `redraw()` : n'anime que quand l'étape change. `.proc[data-at]` donne l'étape au CSS ;
  - sur téléphone, le rail ne garde que les numéros. Range le schéma pour que ce qui change soit juste au-dessus des boutons ;
  - les schémas des fiches : le sac à remplir (1), la machine à deviner le mot suivant (4), l'entraînement qui récompense le oui (5), le chemin de l'ordre caché (6), l'info piège qui trompe l'IA (7), le plan de l'agent en 5 étapes (8), le quota et la facture d'une grosse journée (9).
- **Mode nuit des navigateurs.** Les pages ont leur propre thème sombre. Chaque page garde `<meta name="color-scheme" content="light dark">` et `<meta name="darkreader-lock">`, sinon le mode nuit de Brave ou Dark Reader inverse les couleurs (texte clair sur les cartes jaunes).
- **Mise en page.** La grille a 4 colonnes (`s1` à `s4`). Les cartes d'une même rangée prennent la hauteur de la plus haute. Associe donc des contenus de hauteur proche : le test refuse plus de 120 px de vide en bas d'une carte. Si « À retenir » est plus court que sa voisine, mets-le en pleine largeur (`s4`).
  - Sur téléphone, un tableau dans `.tbl-wrap` devient une suite de blocs : la 1re case donne le titre de la ligne, les autres rappellent le nom de leur colonne. Le JS commun le prend dans `<thead>` (ou dans l'`aria-label` d'une icône) et le met dans `data-label`.
  - Un texte ne dépasse jamais de sa case (pastille, carte, bouton). Le test `tests/debordement.js` le vérifie, sur bureau et sur téléphone, et aussi avec les jeux au maximum (`maxEverything()` : curseurs au bout, 45 messages envoyés).
- **Espaces.** Ce qui va ensemble reste proche, le reste est bien séparé. Entre les cartes, l'écart grandit avec l'écran : `clamp(20px, 3.2vw, 40px)`, de 20 px sur téléphone à 40 px sur bureau. Dans une carte, les blocs sont à `--gap` (24 px, 20 px sur téléphone). Le bloc commun rapproche tout seul le texte d'intro de son titre, et une note (`p.small.muted`) ou une légende (`.legend`) de ce qu'elle explique. Un `h3` posé dans la carte ouvre une nouvelle partie, avec un trait au-dessus. Dans une colonne (`.lab-col`, `.viz`…), range un titre et ce qu'il présente dans un même groupe serré (`.lab-part`, `.stacks`, `.mis-head`). N'écris pas deux `<p>` d'une ligne à la suite : un seul `<p>`, avec `<br>` si besoin.
- **Coupures de ligne.** Écris des espaces normales : le JS commun (`tidy()` et `glue()`) corrige le texte à l'affichage, et aussi le texte ajouté ensuite par la page.
  - Une espace insécable garde `? ! : ; » % $ € = · /` avec le mot d'avant, `«` avec le mot d'après, et un nombre avec ses mots (« la fiche 1 », « 3 étoiles »).
  - Un mot à trait d'union (e-mail, dis-moi) ne se coupe plus. Une adresse ou un nom avec des chiffres (gpt-5-thinking-mini) reste tel quel.
  - Une icône reste avec son mot, dans un `<span class="nobr">` : Chrome coupe toujours juste après une icône, même devant une espace insécable.
  - Un titre ou un bouton ne laisse pas un mot seul sur une ligne (« COMPRENDRE / L'IA »). Le JS commun (`unlone()`, sur les éléments de `LONE`) essaie les coupures du navigateur (`text-wrap: balance`, `pretty`) et garde la première qui n'en laisse pas. Avec 3 mots ou moins, un texte sur 2 lignes laisse forcément un mot seul : c'est la largeur de la case ou la taille du texte qu'il faut changer.
  - Chaque ligne d'un titre `h1` (entre deux `<br>`) reste entière, et un grand nombre (`.stat b`, « 4 040 000 ») reste dans sa case : s'ils sont trop larges, `fit()` les fait rapetisser. Ajoute à `FIT` un autre texte qui ne doit pas passer à la ligne. L'accueil n'a pas ce JS : son titre a une taille calculée en CSS.
  - Un mot trop long pour sa case : un trait d'union discret (`­`) dit où le couper. Sinon, `overflow-wrap: anywhere` le coupe n'importe où. Une adresse e-mail peut passer à la ligne après le `@` (`​`, comme dans « Le Message Piégé »).
  - Le test (`tests/coupures.js`) mesure chaque ligne affichée, sur bureau et sur téléphone, avant et après avoir joué.
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
