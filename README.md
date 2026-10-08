# Comprendre l'IA en 9 fiches

9 fiches interactives, écrites en FALC (Facile À Lire et à Comprendre), pour expliquer l'IA à un public non technique. Elles vont de « je comprends » à « je crée mon agent et je choisis mon budget ».

**Partie 1 · Comprendre comment elle marche**

1. **Le Sac à Tokens** : les tokens, et comment l'IA découpe le texte
2. **La Mémoire qui Déborde** : la conversation relue à chaque message, la fenêtre de contexte, la compression, et le « context rot » (plus le texte est long, plus l'IA rate de détails)
3. **Le Bon Cerveau** : choisir le modèle et l'effort, et écrire une demande précise (bonne réponse = bon modèle + bonne demande), et les noms des modèles chez Claude et ChatGPT

**Partie 2 · Repérer les pièges**

4. **Le Détecteur de Bobards** : les hallucinations, et pourquoi l'IA devine au lieu de dire « je ne sais pas »
5. **L'IA qui Dit Oui** : la complaisance
6. **Le Message Piégé** : l'injection de prompt et le « trio dangereux »

**Partie 3 · Agir avec l'IA**

7. **La Boîte à Outils de l'IA** : le bon prompt (contexte, action précise, objectif), les infos en trop qui trompent l'IA (les distracteurs), répondre ou agir (l'exemple de Claude, qui réunit Chat et Cowork), l'agent de code, Projets, Skills, Connecteurs, les risques de chaque outil, et les noms de ces outils chez Claude et ChatGPT
8. **L'Agent sur Mesure** : ce qu'est un agent (la boucle regarde, décide, agit, vérifie), créer le sien en 5 étapes, ses fichiers (AGENTS.md pour les consignes, SKILL.md pour une méthode, et où ranger la méthode pour qu'elle ne prenne pas de place à chaque tâche), et où ranger ses consignes chez Claude et ChatGPT
9. **Forfait ou Compteur ?** : abonnement ou paiement à l'usage, et les noms des forfaits chez Claude et ChatGPT

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
  - fiche 8 : Le banc d'essai ;
  - fiche 9 : Fais ton pari.
- **des questions « Devine d'abord »** : on répond avant de voir le résultat.
- **un défi final** : seule la 1re réponse compte. Il donne un badge et de 1 à 3 étoiles.

Avec les 9 badges, l'accueil délivre un **permis de conduire l'IA** à imprimer.

La progression reste dans le navigateur (`localStorage`), rangée par nom de fiche (`tokens`, `memoire`…). Le bouton « Effacer ma progression » de l'accueil la remet à zéro.

Le parcours avait d'abord 6 fiches. Une progression de cette époque est convertie toute seule : une fiche coupée en deux donne ses deux badges. Les anciennes adresses (`2-modele-effort.html`, `3-hallucinations.html`, `4-boite-outils.html`, `5-forfait-api.html`) renvoient vers la nouvelle fiche.

Le parcours a eu ensuite 8 fiches. La fiche « L'Agent sur Mesure » est arrivée en 8e position : « Forfait ou Compteur ? » est passée de `8-forfait-api.html` à `9-forfait-api.html`, et l'ancienne adresse renvoie vers la nouvelle. Les badges déjà gagnés sont gardés, mais le permis demande aussi le badge de la nouvelle fiche.

## Mode atelier et mode démonstration

Les deux boutons sont en bas de chaque page, avec une courte explication. Le mode choisi reste actif d'une page à l'autre.

- **Mode atelier**, pour animer un groupe : le bouton « Mode atelier », ou l'adresse `index.html?atelier=1`.
  Le texte est plus gros. Dans les quiz, un clic choisit la réponse du groupe, puis « Révéler » affiche la correction.
- **Mode démonstration**, pour présenter : le bouton « Mode démonstration », ou l'adresse `index.html?demo=1`.
  Rien n'est flou : tout se voit sans répondre aux questions « Devine d'abord ». Sur l'accueil, le permis se voit aussi, mais on ne l'imprime qu'avec les 9 badges.

Pour enlever un mode : le même bouton, ou l'adresse avec `=0` (par exemple `?demo=0`).

En haut de chaque fiche, le bouton « Accueil » ramène à la page d'accueil.

## Skazy Formation

Les fiches sont une ressource [Skazy Formation](https://formation.skazy.nc/).
Chaque page affiche le logo en haut et une mention en bas, avec un lien vers formation.skazy.nc. Le permis imprimé porte aussi le logo.
Le logo est un SVG intégré dans la page : le mot « skazy » prend la couleur du texte (clair ou sombre selon le thème), « formation » reste vert `#00997A`.

## Technique

Pages HTML statiques, sans étape de build. Ouvrir `index.html`.

Chaque fiche est autonome : CSS et JS sont dans le fichier. Le bloc « Parcours » (défi, badges, mode atelier) est le même dans les 9 fiches. Si tu le modifies, modifie-le partout. Le bandeau Skazy Formation aussi.

### Icônes

Pas d'emoji : toutes les icônes viennent de [Font Awesome 7 Free](https://fontawesome.com/search?ic=free&s=solid), style Solid.
Chaque page charge la version SVG + JS depuis cdnjs (`solid.min.js` et `fontawesome.min.js`). Une connexion internet est donc nécessaire pour voir les icônes.

- Dans le HTML : `<i class="fa-solid fa-coins" aria-hidden="true"></i>`.
- Dans le JS : écrire `{coins}` dans le texte, puis l'afficher avec `rich(el, texte)` ou `h(tag, classe, texte)`. Exemple : `rich(el, "{circle-check} Bravo !")`. Pour un attribut (`aria-label`…), `plain(texte)` retire les icônes.
- Une fois l'icône affichée, le `<i>` devient un `<svg class="svg-inline--fa fa-coins">` : en CSS, cibler `.fa-coins` ou `.svg-inline--fa`, pas `.fa-solid`.

### Animations

Les animations montrent ce qui change quand tu agis : les tokens tombent un par un, le classement s'inverse, la courbe se dessine, le point fait le tour de la boucle de l'agent, le permis reçoit son tampon. Elles déplacent les éléments sans jamais cacher un texte. Les cartes, elles, ne bougent pas.

Les explications en étapes sont des **schémas pas à pas** : un rail d'étapes, le texte de l'étape, et un schéma qui change à chaque clic.

- fiche 1 : remplis le sac de 200 000 tokens, jusqu'à ce qu'il déborde ;
- fiche 4 : la machine à deviner le mot suivant, sur une question connue ou rare ;
- fiche 5 : tu notes 2 réponses avec 9 autres personnes, et l'IA apprend que le oui plaît ;
- fiche 6 : l'ordre caché va du pirate à l'e-mail, puis à l'IA, puis revient au pirate. Le fil de texte se voit avec tes yeux, ou avec ceux de l'IA ;
- fiche 8 : un formulaire en 5 étapes (tâche, consignes, outils, limites, test) remplit le plan de ton agent. Les tests disent quelle étape corriger ;
- fiche 9 : une grosse journée de messages vide le quota du forfait, et fait monter la facture de l'API jusqu'au plafond.
Si le système demande moins d'animations (réglage « Réduire les animations »), tout s'affiche tout de suite, sans mouvement.

### Zones floutées

« Devine d'abord » floute la suite tant qu'on n'a pas répondu. Chaque zone floutée affiche « Réponds d'abord à la question ».
Dans la fiche 6, « Ce que l'IA lit » attend en plus qu'on allume la lampe.

### Tests et mise en ligne

```bash
npm install
npx playwright install chromium
npm test
```

Les tests Playwright ouvrent chaque page sur bureau et sur téléphone. Ils vérifient les icônes, la marque Skazy Formation, la mise en page, les coupures de ligne (pas de ponctuation seule en début de ligne, pas de mot coupé), les zones floutées, le contraste de chaque texte (thèmes clair et sombre) et les jeux.

Les pages ont leur propre thème sombre. Elles demandent aux modes nuit forcés (mode nuit de Brave, extension Dark Reader) de ne pas changer leurs couleurs, avec `<meta name="darkreader-lock">`.

`npm run deploy` relance les tests, puis pousse sur `main` et sur `gh-pages` (le site GitHub Pages). Les consignes complètes pour les agents sont dans [AGENTS.md](AGENTS.md).
