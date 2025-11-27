import { useEffect, useState } from "react";

export default function useGyro() {
  const [gyro, setGyro] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    const handle = (event) => {
      const { alpha, beta, gamma } = event;
      setGyro({ x: gamma ?? 0, y: beta ?? 0, z: alpha ?? 0 });
    };

    window.addEventListener("deviceorientation", handle, true);
    return () => window.removeEventListener("deviceorientation", handle, true);
  }, []);

  return gyro;
}
