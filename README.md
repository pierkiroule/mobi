# Orbe luminescente

Une webapp de VJing tactile, mobile-first, qui mélange Three.js et Web Audio pour générer un champ de particules audioreactif. Chargez un MP3, touchez les pads vidéo pour changer d'ambiance et ajustez les sliders pour amplifier les FX.

## Fonctionnalités
- Import d'un fichier MP3 avec analyse en temps réel via la Web Audio API.
- Visualisation Three.js plein écran : nuages de points, lumière additive, variations de couleur synchronisées.
- Pads vidéo (3) pour superposer des textures vidéo en blend et moduler l'ambiance live.
- Sliders tactiles pour régler la déformation (warp), l'impulsion audioreactive (pulse) et le virage chromatique.
- UI pensée pour mobile : gros boutons, contraste élevé, instructions courtes.

## Lancement
1. Installez les dépendances : `npm install`.
2. Démarrez le serveur de dev : `npm run dev` puis ouvrez l'URL indiquée.
3. Build de prod : `npm run build`.

## Utilisation
1. Importez un MP3 (bouton "Importer votre MP3").
2. Appuyez sur "Play" pour déclencher l'audio.
3. Chargez jusqu'à trois vidéos (formats courants) et activez un pad pour le mixer.
4. Passez en mode "Mix FX" pour ajuster les sliders :
   - **Déformation organique** : intensité des courbures du champ de points.
   - **Impulsion réactive** : sensibilité de la scène aux basses / transitoires.
   - **Virage chromatique** : glissement chaud ↔ froid des couleurs.

## Notes techniques
- Three.js est chargé en ESM depuis un CDN pour rester lightweight. Les textures vidéo sont mises à jour à chaque frame si présentes.
- Les ressources créées (textures, analyzers audio) sont nettoyées lors des changements de sources ou du démontage du composant.
- Les sliders et boutons utilisent du HTML natif pour rester accessibles au tactile et au clavier.
