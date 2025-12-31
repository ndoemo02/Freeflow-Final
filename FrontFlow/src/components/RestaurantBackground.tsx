import { useEffect, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";
import styles from "./MotionBackground.module.css";

/**
 * Komponent 3D kieliszka wina z lampką nad nim
 */
function WineGlassWithLight() {
    const { scene } = useGLTF("/3d assets/red_wine_glass.glb");
    const groupRef = useRef<THREE.Group>(null);

    // Nadpisz materiał na realistyczne szkło
    scene.traverse((obj) => {
        if ((obj as any).isMesh) {
            (obj as THREE.Mesh).material = new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                roughness: 0.05,      // Bardzo gładkie szkło
                metalness: 0,
                transmission: 0.95,   // Prawie pełna przezroczystość
                thickness: 0.5,       // Grubość szkła dla realistycznego załamania
                ior: 1.5,            // Współczynnik załamania światła dla szkła
                transparent: true,
                opacity: 1,
                clearcoat: 1,        // Błyszcząca warstwa zewnętrzna
                clearcoatRoughness: 0.1,
            });
        }
    });

    // Pozycja kieliszka
    const glassPos: [number, number, number] = [0.8, -0.9, 0];

    // Pozycja lampki - dokładnie nad kieliszkiem
    const lampPos: [number, number, number] = [
        glassPos[0],
        glassPos[1] + 2.0,
        glassPos[2]
    ];

    // Delikatna animacja - powolne kołysanie
    useFrame((state) => {
        if (groupRef.current) {
            const time = state.clock.elapsedTime;
            // Bardzo subtelna rotacja wokół osi Y
            groupRef.current.rotation.y = Math.sin(time * 0.3) * 0.08;
            // Delikatne kołysanie w górę-dół
            groupRef.current.position.y = Math.sin(time * 0.5) * 0.02;
        }
    });

    return (
        <group ref={groupRef}>
            {/* MODEL KIELISZKA ZE SZKLANYM MATERIAŁEM */}
            <primitive
                object={scene}
                position={glassPos}
                scale={4.9}
            />

            {/* ŚWIECĄCA LAMPKA NAD KIELISZKIEM - większa i jaśniejsza */}
            <mesh position={lampPos}>
                <sphereGeometry args={[0.15, 32, 32]} />
                <meshStandardMaterial
                    color="#fff4e6"
                    emissive="#ffaa00"
                    emissiveIntensity={10}
                    toneMapped={false}
                />
            </mesh>

            {/* GŁÓWNE PUNKTOWE ŚWIATŁO - mocne, ciepłe */}
            <pointLight
                position={lampPos}
                intensity={12}
                distance={3.5}
                decay={2}
                color="#ffaa00"
                castShadow
            />

            {/* DODATKOWE ŚWIATŁO WYPEŁNIAJĄCE - delikatne */}
            <pointLight
                position={[glassPos[0] + 1, glassPos[1], glassPos[2] + 1]}
                intensity={3}
                distance={2}
                color="#ffd699"
            />

            {/* SPOTLIGHT DLA DRAMATYCZNEGO EFEKTU */}
            <spotLight
                position={[lampPos[0], lampPos[1] + 0.5, lampPos[2]]}
                angle={0.6}
                penumbra={0.5}
                intensity={8}
                distance={3}
                color="#ffcc66"
                target-position={glassPos}
            />
        </group>
    );
}

/**
 * Główny komponent – tło restauracji + Canvas 3D z kieliszkiem
 */
export default function RestaurantBackground() {
    const bgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = bgRef.current;
        if (!el) return;

        let x = 0;
        let y = 0;

        const applyTransform = () => {
            el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.05)`;
        };

        const onMouseMove = (e: MouseEvent) => {
            x = (e.clientX / window.innerWidth - 0.5) * 10;
            y = (e.clientY / window.innerHeight - 0.5) * 10;
            applyTransform();
        };

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

            {/* CANVAS 3D - kieliszek ze szkła z lampką i environment */}
            <div
                style={{
                    position: "fixed",
                    top: "70%",
                    left: "45%",
                    width: "600px",
                    height: "600px",
                    pointerEvents: "none",
                    zIndex: 5,
                    transform: "translate(-50%, -50%)",
                }}
            >
                <Canvas
                    camera={{
                        position: [0, 0, 5],
                        fov: 50,
                        near: 0.1,
                        far: 1000,
                    }}
                    gl={{
                        alpha: true,
                        antialias: true,
                        toneMapping: THREE.ACESFilmicToneMapping,
                        toneMappingExposure: 1.2,
                    }}
                >
                    {/* ENVIRONMENT MAPA - dodaje realistyczne odbicia w szkle */}
                    <Environment
                        preset="apartment"
                        background={false}
                        blur={0.8}
                    />

                    {/* ŚWIATŁO AMBIENTOWE - delikatne */}
                    <ambientLight intensity={0.3} color="#fff4e6" />

                    {/* ŚWIATŁO KIERUNKOWE - symuluje światło z okna */}
                    <directionalLight
                        position={[5, 8, 5]}
                        intensity={0.8}
                        color="#ffd9b3"
                    />

                    <Suspense fallback={null}>
                        <WineGlassWithLight />
                    </Suspense>
                </Canvas>
            </div>
        </>
    );
}
