import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, ContactShadows, Float } from "@react-three/drei";
import { Suspense, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useDebugControls } from "../state/DebugContext";

// --- Types ---
type IntentType = "food" | "transport" | "accommodation";

// --- Individual Tile Component ---
interface IntentTileProps {
    type: IntentType;
    modelPath: string;
    position: [number, number, number];
    onClick: () => void;
    floatIntensity?: number;
}

function IntentTile({ type, modelPath, position, onClick, floatIntensity = 1 }: IntentTileProps) {
    const { scene } = useGLTF(modelPath);
    const [hovered, setHovered] = useState(false);
    const ref = useRef<THREE.Group>(null);

    // Clone scene to avoid shared material issues
    const [clone] = useState(() => scene.clone(true));

    // --- Material Customization per Type ---
    useEffect(() => {
        clone.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
                const mesh = obj as THREE.Mesh;
                // Make sure we have a fresh material to mutate
                mesh.material = (mesh.material as THREE.Material).clone();
                const material = mesh.material as THREE.MeshStandardMaterial;

                if (type === "food") {
                    // Food: Glossy, warm
                    material.roughness = 0.2;
                    material.metalness = 0.0;
                    if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
                } else if (type === "transport") {
                    // Taxi: Semi-matte
                    material.roughness = 0.5;
                    material.metalness = 0.3;
                } else if (type === "accommodation") {
                    // Hotel: Neutral, stable
                    material.roughness = 0.7;
                    material.metalness = 0.1;
                }
            }
        });
    }, [clone, type]);

    // --- Animation Loop ---
    useFrame((state, delta) => {
        if (!ref.current) return;

        // Target values
        const targetScale = hovered ? 1.2 : 1;

        // Base scales for different models to normalize size
        const baseScale = type === "food" ? 0.15 : type === "transport" ? 0.008 : 0.008;
        const finalTargetScale = baseScale * targetScale;

        // Smoothstep interpolation for scale
        ref.current.scale.lerp(new THREE.Vector3(finalTargetScale, finalTargetScale, finalTargetScale), delta * 10);

        // Rotation Logic (On Hover)
        const targetRotationX = hovered && type === "food" ? 0.3 : 0;
        const targetRotationY = hovered && type === "transport" ? -0.5 : 0;

        ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, targetRotationX, delta * 10);
        ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, targetRotationY, delta * 10);
    });

    return (
        <group position={position}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; setHovered(true); }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
            {/* Lights specific to the object state */}
            <pointLight
                distance={3}
                decay={2}
                color={type === "food" ? "#ffaa00" : type === "transport" ? "#ccffff" : "#ffffff"}
                intensity={hovered ? (type === "food" ? 4 : 2) : 1}
                position={[0, 2, 2]}
            />

            <Float speed={2} rotationIntensity={0.2} floatIntensity={floatIntensity}>
                <primitive
                    object={clone}
                    ref={ref}
                    scale={type === "food" ? 0.15 : 0.008}
                />
            </Float>

            {/* Contact Shadow for grounding */}
            <ContactShadows position={[0, -1, 0]} opacity={0.4} scale={5} blur={2.5} far={4} color="black" />
        </group>
    );
}


// --- Main Scene Component ---
export default function IntentTiles3D({ onSelect }: { onSelect: (intent: string) => void }) {
    // Determine screen width for responsive layout
    const { width } = useThree(state => state.viewport);
    const isMobile = width < 5;

    // Debug Controls
    const debug = useDebugControls();

    return (
        <>
            <ambientLight intensity={debug.ambientIntensity} />
            <Environment preset="city" blur={0.8} />

            <group>
                {/* 1. Food (Burger) */}
                <group
                    position={debug.food.pos}
                    scale={debug.food.scale}
                    rotation={debug.food.rot}
                >
                    <IntentTile
                        type="food"
                        modelPath="/3d assets/burger.glb"
                        position={[0, 0, 0]}
                        onClick={() => onSelect('order')}
                        floatIntensity={debug.floatIntensity}
                    />
                </group>

                {/* 2. Transport (Taxi) */}
                <group
                    position={[debug.transport.pos[0], debug.transport.pos[1], debug.transport.pos[2]]}
                    scale={debug.transport.scale}
                    rotation={debug.transport.rot}
                >
                    <IntentTile
                        type="transport"
                        modelPath="/3d assets/canyon_taxi.glb"
                        position={[0, 0, 0]}
                        onClick={() => onSelect('taxi')}
                        floatIntensity={debug.floatIntensity}
                    />
                </group>

                {/* 3. Accommodation (Hotel) */}
                <group
                    position={debug.hotel.pos}
                    scale={debug.hotel.scale}
                    rotation={debug.hotel.rot}
                >
                    <IntentTile
                        type="accommodation"
                        modelPath="/3d assets/hotel.glb"
                        position={[0, 0, 0]}
                        onClick={() => onSelect('hotel')}
                        floatIntensity={debug.floatIntensity}
                    />
                </group>
            </group>

            {/* Fill Light (Debug Control) */}
            <directionalLight
                position={[debug.lightPosX, debug.lightPosY, debug.lightPosZ]}
                intensity={debug.lightIntensity}
                castShadow
            />
        </>
    );
}

// Wrapper to be used in Home.tsx
export function IntentTilesCanvas({ onSelect, className, style }: { onSelect: (intent: string) => void, className?: string, style?: React.CSSProperties }) {
    return (
        <div className={className} style={{ width: '100%', height: '100%', minHeight: '300px', pointerEvents: 'auto', ...style }}>
            <Canvas camera={{ position: [0, 0, 6], fov: 45 }} gl={{ antialias: true, alpha: true }}>
                <Suspense fallback={null}>
                    <IntentTiles3D onSelect={onSelect} />
                </Suspense>
            </Canvas>
        </div>
    )
}
