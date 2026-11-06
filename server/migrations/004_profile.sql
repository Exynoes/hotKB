-- AUTH-05 : pseudonyme d'affichage modifiable, distinct de l'identifiant de connexion.
ALTER TABLE "user" ADD COLUMN display_name varchar(20);
