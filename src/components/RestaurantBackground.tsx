import { useEffect, useRef } from "react";
import styles from "./MotionBackground.module.css";

/**
 * Główny komponent – tło restauracji + Canvas 3D z kieliszkiem
 */
export default function RestaurantBackground() {
    const bgRef = useRef<HTMLDivElement>(null);

    // Parallax disabled by user request
    // useEffect(() => { ... }, []);

    return (
        <>
            {/* TŁO RESTAURACJI */}
            <div
                ref={bgRef}
                className={styles.motionBg}
                style={{
                    backgroundImage: "url('/images/background.png')",
                }}
            />


        </>
    );
}
