# Brief rapide pour Codex 5.1

## Vision
Webapp mobile-first de VJing hypnotique en Three.js : l'utilisateur charge un MP3, le son est lu via la Web Audio API et pilote une visualisation 3D réactive. Contrôles tactiles simples (tap/glisser ou sliders) pour moduler les effets.

## Périmètre MVP
1. **Chargement audio** : zone/bouton "Charger un morceau (mp3)". Créer un `AudioContext`, un `AnalyserNode` (FFT) et récupérer volume/spectre.
2. **Scène Three.js** : canvas plein écran avec caméra perspective, rendu WebGL et un objet central (sphère ou plane). L'objet réagit au son (échelle, pulsation, couleur, distortion) et différencie basses/aigus.
3. **Audio-réactivité** : à chaque frame (`requestAnimationFrame`), lire les données de l'analyser, calculer volume global + moyennes basses/médiums/aigus. Appliquer sur échelle, couleur, légère rotation/tremblement.
4. **Contrôles tactiles** : gérer `touchstart`/`touchmove`... Glisser vertical = intensité FX (gain sur déformation/scale max). Glisser horizontal = vitesse de rotation/"chaos". Option simple : 2 sliders en bas (« Intensité FX », « Vitesse animation »).
5. **UI mobile** : fullscreen fond noir, forme lumineuse centrale. En bas : bouton import MP3 + deux sliders. Gros éléments, texte minimal pour ados.

## Contraintes techniques
- Three.js pour la 3D.
- Web Audio API pour analyse audio.
- Front only (HTML/JS ou React+Vite). Code clair et commenté.
- Architecture prête à ajouter d'autres formes/presets et changer facilement la palette.

## Livrable attendu
- Projet minimal complet : soit un `index.html` autonome avec script inline, soit un squelette React + Vite (décrire brièvement les composants si React).
- Doit tourner dans un navigateur récent et sur mobile (tactile), jouer le MP3 et afficher un visuel 3D bien réactif.
- Expliquer brièvement les étapes clés et commenter la création audio, l'analyse et le mapping audio → visuel.
