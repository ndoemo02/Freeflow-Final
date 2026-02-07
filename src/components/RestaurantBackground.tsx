import { useEffect, useRef, useState } from "react";
import styles from "./MotionBackground.module.css";

/**
 * Główny komponent – tło restauracji (responsywne: mobile vs desktop)
 */
export default function RestaurantBackground() {
    const bgRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Select background based on viewport
    const backgroundImage = isMobile
        ? "url('/images/backgroundd.png')"  // Mobile background
        : "url('/images/desk.png')";        // Desktop background

    return (
        <>
            {/* TŁO RESTAURACJI - responsywne */}
            <div
                ref={bgRef}
                className={styles.motionBg}
                style={{
                    backgroundImage: backgroundImage,
                }}
            />
        </>
    );
}
