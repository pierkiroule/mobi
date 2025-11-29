import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

/**
 * Composant React pour intégrer un canvas p5.js.
 * Utilise le mode instance de p5.js pour une meilleure compatibilité React.
 */
const P5Canvas = forwardRef(function P5Canvas(
  { sketch, className, style, onReady },
  ref
) {
  const containerRef = useRef(null);
  const p5Ref = useRef(null);

  useImperativeHandle(ref, () => ({
    getP5: () => p5Ref.current,
    getContainer: () => containerRef.current,
  }));

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    if (!window.p5) {
      console.error("p5.js n'est pas chargé");
      return;
    }

    // Créer l'instance p5 en mode instance
    p5Ref.current = new window.p5((p) => {
      sketch(p);
    }, containerRef.current);

    onReady?.(p5Ref.current);

    return () => {
      if (p5Ref.current) {
        p5Ref.current.remove();
        p5Ref.current = null;
      }
    };
  }, [sketch]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    />
  );
});

export default P5Canvas;
