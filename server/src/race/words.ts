/** Dictionnaires de mots pour les textes aléatoires (CONF-03). Mots courants, sans nom propre. */

const FR = `le la un une des les et ou mais donc car or ni que qui quoi dont où si on il elle nous vous ils elles je tu me te se ce ces mon ton son ma ta sa mes tes ses
chat chien maison arbre fleur soleil lune étoile mer lac rivière montagne forêt route pont ville village école classe livre stylo table chaise porte fenêtre jardin pomme poire fraise
pain lait eau thé gâteau fromage soupe riz pâtes jouer courir sauter nager chanter danser lire écrire dessiner manger boire dormir rêver rire parler écouter regarder marcher grimper
petit grand beau joli rapide lent fort doux froid chaud rouge bleu vert jaune blanc noir rose gris heureux content calme drôle gentil sage curieux
matin soir nuit jour semaine mois année hiver printemps été automne vent pluie neige nuage orage brouillard
ami amie frère sœur père mère enfant famille voisin maître élève équipe cadeau fête voyage aventure histoire musique image couleur
clavier écran souris ordinateur téléphone message numéro mot lettre phrase vitesse précision course défi victoire record
bonjour merci salut demain hier toujours jamais souvent parfois ensemble autour devant derrière dessus dessous pendant avant après
éléphant dinosaure papillon grenouille hirondelle chocolat bibliothèque anniversaire extraordinaire mystérieux incroyable magnifique silencieux courageux généreux
orchestre télescope laboratoire température révolution découverte imagination imprimerie traversée métamorphose enchantement
forêt énergie qualité réussite été théâtre hôpital île où à déjà après-midi peut-être c'est-à-dire aujourd'hui quelqu'un`;

const EN = `the a an and or but so if then that this these those who what where when why how my your his her our their its me you him them
cat dog house tree flower sun moon star sea lake river mountain forest road bridge town village school class book pen table chair door window garden apple pear berry
bread milk water tea cake cheese soup rice pasta play run jump swim sing dance read write draw eat drink sleep dream laugh talk listen watch walk climb
small big tall pretty quick slow strong soft cold hot red blue green yellow white black pink gray happy glad calm funny kind wise curious
morning evening night day week month year winter spring summer autumn wind rain snow cloud storm fog
friend brother sister father mother child family neighbor teacher pupil team gift party trip story music picture color
keyboard screen mouse computer phone message number word letter sentence speed accuracy race challenge victory record
hello thanks tomorrow yesterday always never often sometimes together around front behind above below during before after
elephant dinosaur butterfly frog swallow chocolate library birthday extraordinary mysterious incredible magnificent silent courageous generous
orchestra telescope laboratory temperature revolution discovery imagination printing crossing metamorphosis enchantment
energy quality success theater hospital island don't can't it's we're they're someone`;

export const WORDS: Record<'fr' | 'en', string[]> = {
  fr: [...new Set(FR.split(/\s+/).filter(Boolean))],
  en: [...new Set(EN.split(/\s+/).filter(Boolean))],
};
