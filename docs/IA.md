# Utilisation de l'IA — HotKB

> **Brouillon à relire et à réécrire avec tes propres mots avant la remise.** Les faits ci-dessous viennent du déroulement réel du projet ; la section 4 (réflexion) est volontairement à toi.

## 1. Outil et rôle

- Outil : **Claude** (Anthropic), utilisé via Claude Code dans une session de travail.
- Ce que l'IA a fait : écrire et tester le code (serveur de course, bots, bonus, interface), rédiger les documents techniques, proposer des structures.
- Ce que l'auteur a fait seul, **sans IA** : le **nom** HotKB et son origine, le **concept et le croquis du logo**, le choix des références (Monkeytype, Duolingo, TypeRacer, Kahoot) et ses commentaires sur chacune, les décisions de direction (accueil plus simple façon Kahoot, rectangle autour du texte, enlever le rouge du document Word, etc.). Pour le logo, la flamme vient de la bibliothèque Canva et les touches K/B ont été rendues par l'IA d'après son croquis (indiqué dans la démarche créative).

## 2. Méthode de travail

1. L'auteur décrit ce qu'il veut ou ce qui ne va pas ; l'IA propose ou corrige.
2. Chaque fonctionnalité est accompagnée de tests (serveur, client, e2e) lancés avant de la considérer finie.
3. Les exigences sont suivies dans `docs/EXIGENCES.md` avec un statut honnête, y compris ce qui manque.
4. Le code est relu par l'auteur via les commits sur GitHub.

## 3. Trois situations où l'IA s'est trompée

*(À reformuler avec tes mots. Ce sont des faits du projet.)*

1. **Document Word remis sans les liens.** Une version plus ancienne de la démarche créative, sans les liens vers le site et le GitHub, a été remise à la place de la version corrigée. Le professeur avait besoin des liens pour évaluer. Correction : refaire le document avec des hyperliens cliquables et remplacer le fichier. *Leçon : vérifier quel fichier est réellement envoyé, pas seulement le fichier généré.*
2. **Page d'accueil trop chargée.** Le premier design de l'accueil copiait trop la page de TypeRacer ; l'auteur l'a trouvée « trop chargée et trop classique ». Elle a été refaite sur le modèle de la page de saisie de code de Kahoot. *Leçon : l'IA reproduit une référence au lieu de traduire ce que l'auteur aime d'elle.*
3. **Migration de base de données qui échoue sur des données existantes.** La migration 003 ajoutait un index unique « une seule salle active par personne » sans tenir compte des anciennes lignes déjà présentes ; elle échouait. Il a fallu d'abord marquer les anciennes participations comme terminées (`UPDATE … SET left_at = now()`) avant de créer l'index. *Leçon : tester les migrations sur une base qui contient déjà des données, pas seulement sur une base vide.*

Autres erreurs corrigées en cours de route (si tu veux en remplacer une) : l'historique du profil ignorait les courses avec texte aléatoire (jointure interne au lieu de jointure gauche) ; la touche « Rejoindre » apparaissait en double après l'ajout de l'explorateur de salles et cassait un test ; le texte de test de la course contenait des accents que Playwright ne peut pas taper.

## 4. Réflexion de l'auteur

*(À écrire par toi, quelques phrases chacune.)*

- Qu'est-ce que l'IA a rendu plus rapide ? Qu'est-ce qu'elle a rendu plus difficile ?
- Qu'est-ce que tu as dû décider toi-même parce que l'IA ne pouvait pas le faire ?
- Comment sais-tu que le code fonctionne (tests, essais à la main) ?
- Qu'est-ce que tu ferais différemment la prochaine fois ?

## 5. Limites déclarées

- OAuth (Discord, GitHub) est codé et testé, mais pas activé en production.
- Hébergement sur Render (gratuit) et non sur un VPS.
- Les mesures Lighthouse sont faites en local ; à refaire sur le site en ligne.
