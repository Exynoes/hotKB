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

## 3. Trois situations où il a fallu corriger l'IA

Ces trois histoires sont racontées par l'auteur, à partir de ses propres essais du site. L'orthographe seule a été corrigée ; chaque récit est suivi d'une note factuelle sur la correction faite.

1. **Les fautes de frappe n'étaient pas visibles.** « Pendant le travail, j'ai remarqué qu'il n'affichait pas les erreurs quand on tape un mauvais caractère. J'ai demandé qu'il les mette. Aussi, avec des caractères spéciaux, le site ne prenait pas tous les caractères spéciaux et ça pouvait bloquer les joueurs du site. »
   *Correction :* la lettre attendue devient rouge et le caractère tapé s'affiche ; la saisie passe par un champ invisible qui accepte les accents et les touches mortes (« é », « ê »), avec des tests dédiés.
2. **« Tu es déjà dans une salle » sur l'accueil.** « Pendant que je voulais rejoindre une salle, j'ai eu un bug dans le site : il disait que j'étais déjà dans une salle, alors que j'étais dans le menu d'accueil, et ça n'avait pas de sens. J'ai donc demandé qu'il me corrige ce problème. »
   *Correction :* les anciennes participations restées actives après un redéploiement sont nettoyées au démarrage du serveur et à chaque création ou arrivée dans une salle.
3. **Mauvais texte et impossible d'abandonner.** « Dans la course, des fois je prenais le texte le plus facile mais il me ressortait le texte le plus long, et ça me frustrait. J'ai demandé de corriger, et j'essayais d'abandonner, ce qui ne marchait même pas ! J'ai découvert 2 erreurs en un test. »
   *Correction :* si aucun texte n'existe pour la difficulté demandée, le serveur choisit la complexité la plus proche ; la course se termine quand plus aucun humain ne court, et un bouton « Quitter » apparaît après l'abandon.

## 4. Réflexion de l'auteur

**Ce que l'IA a apporté.** « Je ne pense pas que je pourrais le faire seul. Il y a trop de choses que je ne savais pas faire, et je suis lent pour faire le code. Avec l'IA, je pouvais créer rapidement ce qui était demandé. Elle m'a aussi aidé à mettre mon site en ligne gratuitement, ce que je ne savais pas vraiment comment faire. L'IA a aussi fait les tests pour moi, ce qui m'a rendu la tâche beaucoup plus simple. Quand je ne savais pas quoi faire ou que je ne comprenais pas ce qu'elle avait fait, je lui demandais et je regardais ce qu'elle expliquait, mais je ne comprenais pas tout et je ne me souviens pas de tout ce qu'elle a fait, mais au moins ça marche. »

**Les limites et les risques.** « Le risque avec lequel j'ai travaillé, c'est que je laissais aller sur Render tout seul et je ne savais pas ce qu'il faisait dedans. J'ai dû faire plusieurs tests parce que l'IA ne pouvait pas le faire, à cause de problèmes d'accès. Elle fait du code que je ne comprends pas, et ça me frustrait, donc j'essayais de demander ce qu'elle avait fait dans le code, mais je ne me souviens pas de tout. Aussi, à certains moments, l'IA prenait trop de temps à générer sa réponse, ce qui me faisait paniquer. »

**Comment j'ai vérifié que ça fonctionne.** « Ce que je faisais, c'était juste de tester le site pour voir si le site marche vraiment. J'ai fait toutes les possibilités qu'un utilisateur fait sur mon site, pour être sûr que ce que j'attends est vraiment ce que le client a demandé. J'ai aussi demandé à mon IA de faire des tests manuels, pour voir aussi ce que je dois tester pour être sûr que le site est vraiment correct. »

**Ce que je ferais autrement.** « Ce que je ferai la prochaine fois, c'est de faire par moi-même le code, et si je bloque, que l'IA m'aide. Mais je ne sais pas si c'est la bonne approche, car je ne me sens pas toujours capable de faire ce qui est demandé ; par exemple, mettre le site en ligne, j'ai demandé à mon IA de le faire pour moi. Pour travailler dans le code, je veux travailler petit à petit, pour éviter de trop toucher au code et éviter trop de dépendances entre les fonctions. Le problème pour moi, c'est que j'ai peur de ne pas tout comprendre de ce que l'IA a fait en réalité et de devenir trop dépendant d'elle. »

## 5. Limites déclarées

- OAuth (Discord, GitHub) est codé et testé, mais pas activé en production.
- Hébergement sur Render (gratuit) et non sur un VPS.
- Les mesures Lighthouse sont faites en local ; à refaire sur le site en ligne.
