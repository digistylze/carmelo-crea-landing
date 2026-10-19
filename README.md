# Carmelo Crea · L'Éveil des sens (landing)

Prévisualisation de la landing « L'Éveil des sens » (rénovation d'espace nuit à Genève) réalisée par Digistylze pour Carmelo Crea / CREA Immobilier Sàrl.

- `index.html` : la page publiée, un seul fichier autonome (images, polices et scripts embarqués, aucune requête réseau). Non indexée par les moteurs de recherche (`noindex`).
- `source/` : les sources (une section par dossier dans `source/src/sections/`, socle dans `source/src/`). `python build.py` reconstruit la page ; il lit aussi les logos et la médiathèque du site client, qui ne sont pas versionnés ici.

Préchargement : `?pre=99` saute le tour 3D du lit, `?pre=<secondes>` le fige à un instant.
