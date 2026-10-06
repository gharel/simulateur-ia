# Comprendre l'IA en 8 fiches

8 fiches interactives, écrites en FALC (Facile À Lire et à Comprendre), pour expliquer l'IA à un public non technique. Elles vont de « je comprends » à « je choisis mon outil et mon budget ».

**Partie 1 · Comprendre comment elle marche**

1. **Le Sac à Tokens** : les tokens, et comment l'IA découpe le texte
2. **La Mémoire qui Déborde** : la conversation relue à chaque message, la fenêtre de contexte et la compression
3. **Le Bon Cerveau** : choisir le modèle et l'effort, et écrire une demande précise (bonne réponse = bon modèle + bonne demande)

**Partie 2 · Repérer les pièges**

4. **Le Détecteur de Bobards** : les hallucinations, et pourquoi l'IA devine au lieu de dire « je ne sais pas »
5. **L'IA qui Dit Oui** : la complaisance
6. **Le Message Piégé** : l'injection de prompt et le « trio dangereux »

**Partie 3 · Agir avec l'IA**

7. **La Boîte à Outils Claude** : le bon prompt (contexte, action précise, objectif), l'appli Claude (Chat et Cowork réunis) et Claude Code, Projets, Skills, Connecteurs, et les risques de chaque outil
8. **Forfait ou Compteur ?** : abonnement ou paiement à l'usage

## Jouer

Chaque fiche contient :

- **un mini-jeu** avec un objectif :
  - fiche 1 : Le compte est bon ;
  - fiche 2 : Ta journée en 4 moments ;
  - fiche 3 : Mission budget ;
  - fiche 4 : Surligne ce qu'il faut vérifier ;
  - fiche 5 : Pose ta question sans donner ton avis ;
  - fiche 6 : Le gardien des permissions ;
  - fiche 7 : Les missions de la cuisine ;
  - fiche 8 : Fais ton pari.
- **des questions « Devine d'abord »** : on répond avant de voir le résultat.
- **un défi final** : seule la 1re réponse compte. Il donne un badge et de 1 à 3 étoiles.

Avec les 8 badges, l'accueil délivre un **permis de conduire l'IA** à imprimer.

La progression reste dans le navigateur (`localStorage`), rangée par nom de fiche (`tokens`, `memoire`…). Le bouton « Effacer ma progression » de l'accueil la remet à zéro.

Le parcours avait d'abord 6 fiches. Une progression de cette époque est convertie toute seule : une fiche coupée en deux donne ses deux badges. Les anciennes adresses (`2-modele-effort.html`, `3-hallucinations.html`, `4-boite-outils.html`, `5-forfait-api.html`) renvoient vers la nouvelle fiche.

## Mode atelier et mode démonstration

Les deux boutons sont en bas de chaque page, avec une courte explication. Le mode choisi reste actif d'une page à l'autre.

- **Mode atelier**, pour animer un groupe : le bouton « Mode atelier », ou l'adresse `index.html?atelier=1`.
  Le texte est plus gros. Dans les quiz, un clic choisit la réponse du groupe, puis « Révéler » affiche la correction.
- **Mode démonstration**, pour présenter : le bouton « Mode démonstration », ou l'adresse `index.html?demo=1`.
  Rien n'est flou : tout se voit sans répondre aux questions « Devine d'abord ». Sur l'accueil, le permis se voit aussi, mais on ne l'imprime qu'avec les 8 badges.

Pour enlever un mode : le même bouton, ou l'adresse avec `=0` (par exemple `?demo=0`).

En haut de chaque fiche, le bouton « Accueil » ramène à la page d'accueil.

## Skazy Formation

Les fiches sont une ressource [Skazy Formation](https://formation.skazy.nc/).
Chaque page affiche le logo en haut et une mention en bas, avec un lien vers formation.skazy.nc. Le permis imprimé porte aussi le logo.
Le logo est un SVG intégré dans la page : le mot « skazy » prend la couleur du texte (clair ou sombre selon le thème), « formation » reste vert `#00997A`.

## Technique

Pages HTML statiques, sans étape de build. Ouvrir `index.html`.

Chaque fiche est autonome : CSS et JS sont dans le fichier. Le bloc « Parcours » (défi, badges, mode atelier) est le même dans les 8 fiches. Si tu le modifies, modifie-le partout. Le bandeau Skazy Formation aussi.

### Icônes

Pas d'emoji : toutes les icônes viennent de [Font Awesome 7 Free](https://fontawesome.com/search?ic=free&s=solid), style Solid.
Chaque page charge la version SVG + JS depuis cdnjs (`solid.min.js` et `fontawesome.min.js`). Une connexion internet est donc nécessaire pour voir les icônes.

- Dans le HTML : `<i class="fa-solid fa-coins" aria-hidden="true"></i>`.
- Dans le JS : écrire `{coins}` dans le texte, puis l'afficher avec `rich(el, texte)` ou `h(tag, classe, texte)`. Exemple : `rich(el, "{circle-check} Bravo !")`. Pour un attribut (`aria-label`…), `plain(texte)` retire les icônes.
- Une fois l'icône affichée, le `<i>` devient un `<svg class="svg-inline--fa fa-coins">` : en CSS, cibler `.fa-coins` ou `.svg-inline--fa`, pas `.fa-solid`.

### Zones floutées

« Devine d'abord » floute la suite tant qu'on n'a pas répondu. Chaque zone floutée affiche « Réponds d'abord à la question ».
Dans la fiche 6, « Ce que l'IA lit » attend en plus qu'on allume la lampe.

### Tests et mise en ligne

```bash
npm install
npx playwright install chromium
npm test
```

Les tests Playwright ouvrent chaque page sur bureau et sur téléphone. Ils vérifient les icônes, la marque Skazy Formation, la mise en page, les zones floutées, le contraste de chaque texte (thèmes clair et sombre) et les jeux.

Les pages ont leur propre thème sombre. Elles demandent aux modes nuit forcés (mode nuit de Brave, extension Dark Reader) de ne pas changer leurs couleurs, avec `<meta name="darkreader-lock">`.

`npm run deploy` relance les tests, puis pousse sur `main` et sur `gh-pages` (le site GitHub Pages). Les consignes complètes pour les agents sont dans [AGENTS.md](AGENTS.md).
