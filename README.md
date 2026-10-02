# Comprendre l'IA en 6 fiches

6 fiches interactives, écrites en FALC (Facile À Lire et à Comprendre), pour expliquer l'IA à un public non technique.

1. **Le Sac à Tokens** : tokens, conversation qui s'allonge, fenêtre de contexte
2. **Le Bon Cerveau** : choisir le modèle et l'effort
3. **Le Détecteur de Bobards** : les hallucinations et la complaisance
4. **La Boîte à Outils Claude** : Chat, Cowork, Code, Projets, Skills, Connecteurs
5. **Forfait ou Compteur ?** : abonnement ou paiement à l'usage
6. **Le Message Piégé** : l'injection de prompt et le « trio dangereux »

## Jouer

Chaque fiche contient :

- **un mini-jeu** avec un objectif :
  - fiche 1 : Ta journée en 4 moments ;
  - fiche 2 : Mission budget ;
  - fiche 3 : Surligne ce qu'il faut vérifier ;
  - fiche 4 : Les missions de la cuisine ;
  - fiche 5 : Fais ton pari ;
  - fiche 6 : Le gardien des permissions.
- **des questions « Devine d'abord »** : on répond avant de voir le résultat.
- **un défi final** : seule la 1re réponse compte. Il donne un badge et de 1 à 3 étoiles.

Avec les 6 badges, l'accueil délivre un **permis de conduire l'IA** à imprimer.

La progression reste dans le navigateur (`localStorage`). Le bouton « Effacer ma progression » de l'accueil la remet à zéro.

## Mode atelier

Pour animer un groupe : le bouton « Mode atelier » en bas de page, ou l'adresse `index.html?atelier=1`.
Le texte est plus gros. Dans les quiz, un clic choisit la réponse du groupe, puis « Révéler » affiche la correction.

## Skazy Formation

Les fiches sont une ressource [Skazy Formation](https://formation.skazy.nc/).
Chaque page affiche le logo en haut et une mention en bas, avec un lien vers formation.skazy.nc. Le permis imprimé porte aussi le logo.
Le logo est un SVG intégré dans la page : le mot « skazy » prend la couleur du texte (clair ou sombre selon le thème), « formation » reste vert `#00997A`.

## Technique

Pages HTML statiques, sans étape de build. Ouvrir `index.html`.

Chaque fiche est autonome : CSS et JS sont dans le fichier. Le bloc « Parcours » (défi, badges, mode atelier) est le même dans les 6 fiches. Si tu le modifies, modifie-le partout. Le bandeau Skazy Formation aussi.

### Icônes

Pas d'emoji : toutes les icônes viennent de [Font Awesome 7 Free](https://fontawesome.com/search?ic=free&s=solid), style Solid.
Chaque page charge la version SVG + JS depuis cdnjs (`solid.min.js` et `fontawesome.min.js`). Une connexion internet est donc nécessaire pour voir les icônes.

- Dans le HTML : `<i class="fa-solid fa-coins" aria-hidden="true"></i>`.
- Dans le JS : écrire `{coins}` dans le texte, puis l'afficher avec `rich(el, texte)` ou `h(tag, classe, texte)`. Exemple : `rich(el, "{circle-check} Bravo !")`. Pour un attribut (`aria-label`…), `plain(texte)` retire les icônes.
- Une fois l'icône affichée, le `<i>` devient un `<svg class="svg-inline--fa fa-coins">` : en CSS, cibler `.fa-coins` ou `.svg-inline--fa`, pas `.fa-solid`.
