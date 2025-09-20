# De Franceschi Mohamed

[Voir la démo](./demo.mp4)

## Fonctionnalités

### Simulation de Comportement
  - Séparation : Évitement des collisions entre poissons proches
  - Cohésion : Attraction vers le centre de masse du groupe
  - Alignement : Synchronisation de la direction avec les voisins

### Contrôles Interactifs
- **Paramètres en Temps Réel** : Ajustement des distances de séparation, cohésion et alignement
- **Vitesse Variable** : Contrôle de la vitesse de nage des poissons
- **Population Dynamique** : Ajout/suppression de poissons sans redémarrage
- **Présets** : Configurations prédéfinies pour différents comportements

### Environnement Visuel
- **Effets Aquatiques** : Dégradés d'eau, vagues subtiles et bulles flottantes
- **Diversité Visuelle** : Poissons colorés avec traînées d'eau

## Architecture du Code

### Structure Principale
Le projet utilise une classe `Entity` représentant chaque poisson. Chaque entité possède des propriétés de position, direction, vitesse et couleur, ainsi qu'un système de traînées visuelles.

### Boucle de Rendu
Le système fonctionne sur une boucle de jeu à 60 FPS utilisant `requestAnimationFrame`. À chaque frame, les règles de comportement sont appliquées dans un ordre spécifique, puis les positions sont mises à jour et les éléments sont rendus.

### Gestion des États
L'application utilise React avec des hooks pour gérer les paramètres utilisateur. Les valeurs sont stockées dans des refs pour permettre un accès en temps réel dans la boucle de jeu sans provoquer de re-rendu complet.

### Système de boids
Les règles de comportement sont implémentées comme des méthodes statiques de la classe Entity. Chaque règle calcule une redirection de la direciton de l'entitee basée sur la proximité et la direction des voisins.

## Évolution du Projet avec l'IA

### Version Initiale
Le projet a commencé avec une implémentation basique du système de boids :
- Formes géométriques simples (triangles) représentant les entités
- Fond noir minimaliste
- Interface de contrôle basique

### Transformation par l'IA
Grâce à l'assistance de Claude, le projet a été entièrement transformé :

#### Améliorations Visuelles
- **Poissons réalistes**
- **Environnement aquatique**
- **Système de traînées**
- **Bulles flottantes**

#### Interface Utilisateur
- **Présets configurables** : Boutons de configuration prédéfinis pour différents scénarios
- **Indicateurs visuels** : Feedback visuel pour les interactions utilisateur

### Néanmoins

j’ai moi-même codé la logique du système : même si j’ai souvent été bloqué et assisté par l’IA, j’ai globalement realiser le fonctionnement.