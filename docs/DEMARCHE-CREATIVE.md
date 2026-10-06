# Démarche créative — HotKB

> Document exigé par DES-01 à DES-03. **Le nom et le logo sont de l'auteur, sans IA** (DES-01, DES-02).
> Les sections marquées `À COMPLÉTER` doivent être rédigées par l'auteur.

## 1. Nom du site (DES-01)

**Nom retenu : HotKB**

### Origine du nom (trouvé par l'auteur, sans IA ni référence)

L'idée vient du jeu de la **patate chaude** : on ne peut pas garder l'objet, il faut s'en débarrasser vite. Dans une course de frappe, c'est la même urgence : le **clavier est « chaud »** et il faut taper vite. « **Hot** » (chaud) exprime cette urgence, et « **KB** » est l'abréviation de *keyboard* (clavier). Le nom a aussi guidé toute l'identité : palette de couleurs chaudes (flamme, braise, miel) et un logo en forme de flamme autour de deux touches du clavier.

### Vérification d'originalité (effectuée le 6 octobre 2026, après le choix du nom)

Le nom a d'abord été choisi sans recherche. La vérification a été faite ensuite avec une recherche Google sur « HotKB » :

- **Hot Keyboard** (hot-keyboard.com) : logiciel Windows de macros et d'automatisation (insertion de texte, enregistrement de frappes). Nom proche, mais produit d'une **autre catégorie** (utilitaire d'automatisation de bureau, pas un jeu).
- **Hot Virtual Keyboard** (hotvirtualkeyboard.com) : clavier virtuel à l'écran. Autre catégorie également.
- Aucun produit nommé exactement « HotKB » n'est apparu dans les résultats consultés, ni aucun jeu de course de frappe.
- Constat honnête : la ressemblance avec « Hot Keyboard » est réelle. L'auteur a soumis la question à l'enseignant le 6 octobre 2026 (Discord) ; réponse de l'enseignant : « Pas de problème, ça me dérange pas s'il y a déjà un site avec le même nom. » Le nom est donc conservé.

### Autres noms envisagés

Aucun. « HotKB » est le seul nom auquel l'auteur a pensé : l'idée est venue directement du jeu de la patate chaude et du clavier « chaud », sans liste de candidats.

## 2. Logo (DES-02)

- **Concept (de l'auteur)** : une flamme qui enveloppe deux touches de clavier, K et B, posées en désordre.
- **Croquis original de l'auteur** : [`demarche-creative/croquis-logo.png`](demarche-creative/croquis-logo.png) — la flamme (trait rouge) entoure deux touches (K et B) dessinées à la main.
- **Logo final** : [`demarche-creative/logo-final.png`](demarche-creative/logo-final.png), assemblé dans Canva par l'auteur à partir de son croquis.
- **Transparence sur la fabrication** : l'idée, la composition et le croquis sont de l'auteur. Pour la mise au propre, la flamme est un élément de la bibliothèque de Canva, et les touches K/B ont été rendues numériquement à l'aide d'un outil d'IA (Claude) en suivant le concept du croquis, puis placées et assemblées par l'auteur dans Canva.
- **Validation** : l'enseignant a indiqué à l'auteur qu'un logo accompagné d'un croquis de l'auteur est accepté.
- **Utilisation** : dans l'application (page d'accueil, `client/public/logo.png`) et comme favicon (`client/public/favicon.png`).

## 3. Direction artistique (DES-03)

### Moodboard (3 à 5 références)

Quatre références, choisies avec l'auteur (Monkeytype et l'envie d'un univers de « flammes » viennent de l'auteur ; TypeRacer et Kahoot sont les références citées par l'énoncé du travail) :

| Référence | Ce qui en est retenu | Où on le voit dans HotKB |
|---|---|---|
| **Monkeytype** (monkeytype.com) | Zone de frappe très lisible, retour immédiat sur chaque lettre, curseur clignotant, choix de thèmes | Aperçu de frappe animé sous le titre (`TypingDemo.tsx`) ; thèmes clair et sombre |
| **Flamme de série de Duolingo** | Une flamme simple, arrondie et chaude, symbole de l'effort et de la progression ; ton amical et ludique | Logo en forme de flamme, palette flamme / braise / miel, braises et flammes animées en arrière-plan (`FlameBackground.tsx`) |
| **TypeRacer** (typeracer.com) | La piste de course où chaque joueur avance en direct | **Élément signature** : la piste de progression avec coureurs, traînée de flamme et ligne d'arrivée (`RaceTrack.tsx`) |
| **Kahoot** (kahoot.com) | Salle d'attente colorée, code de salle très visible, ambiance de jeu entre amis | Code de salle en grosses tuiles dans le lobby (`Lobby.tsx`) |

`À COMPLÉTER` par l'auteur : une phrase, dans ses mots, sur ce qu'il aime de chaque référence (et ajout éventuel d'une 5e).

### Palette

Une palette entièrement chaude, cohérente avec le nom :

| Rôle | Clair | Sombre |
|---|---|---|
| Flamme (accent, actions principales) | `#ff4f1f` | `#ff6a3d` |
| Braise (vitesse, secondaire) | `#ffb347` | `#ffcb66` |
| Miel (succès) | `#ffc825` | `#ffd454` |
| Rouge vif (erreur) | `#ff3b5c` | `#ff5c7a` |
| Fond | `#fbf5f1` | `#1a100d` |
| Texte | `#271613` | `#fbf0ec` |

### Typographies

- **Baloo 2** : titres et logotype (arrondie, amicale, ludique).
- **Inter** : texte courant (lisibilité).
- **JetBrains Mono** : code de salle, MPM, texte à taper.

### Thèmes (DES-05)

Thème clair et thème sombre, préférence système respectée par défaut, sélecteur manuel mémorisé.
