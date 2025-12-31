import { useEffect, useRef } from "react";
import styles from "./MotionBackground.module.css";

export default function MotionBackground() {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;

    let x = 0;
    let y = 0;

    const applyTransform = () => {
      el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.05)`;
    };

    // DESKTOP – MYSZ
    const onMouseMove = (e: MouseEvent) => {
      x = (e.clientX / window.innerWidth - 0.5) * 10;
      y = (e.clientY / window.innerHeight - 0.5) * 10;
      applyTransform();
    };

    // MOBILE – GYRO
    const onDeviceMove = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      x = (e.gamma / 45) * 8;
      y = (e.beta / 45) * 8;
      applyTransform();
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("deviceorientation", onDeviceMove);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("deviceorientation", onDeviceMove);
    };
  }, []);

  return <div ref={bgRef} className={styles.motionBg} />;
}
