import { useEffect, useRef } from "react";

/**
 * Hook pour intégrer p5.js en mode instance avec React.
 * Permet d'utiliser p5.js de manière déclarative dans un composant React.
 * 
 * @param {Function} sketch - Fonction sketch p5.js en mode instance
 * @param {Object} deps - Dépendances pour recréer le sketch
 * @returns {Object} - Référence au conteneur et à l'instance p5
 */
export default function useP5(sketch, deps = []) {
  const containerRef = useRef(null);
  const p5InstanceRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    // Vérifier que p5 est disponible globalement
    if (!window.p5) {
      console.error("p5.js n'est pas chargé. Vérifiez les balises de script.");
      return;
    }

    // Créer une nouvelle instance p5 en mode instance
    p5InstanceRef.current = new window.p5(sketch, containerRef.current);

    return () => {
      // Nettoyer l'instance p5 lors du démontage
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, deps);

  return { containerRef, p5Instance: p5InstanceRef };
}
