import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { animate, motion, useMotionTemplate, useMotionValue, useTransform } from 'framer-motion';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ACTIVATE_PULL_THRESHOLD = 64;
const SPRING_CONFIG = { type: 'spring' as const, stiffness: 250, damping: 15, mass: 1.2 };

function activateVoiceAgent() {
    console.log('VOICE AGENT START');
}

function LogoScene() {
    const gltf = useLoader(GLTFLoader, '/logo/logo.glb');
    const [logoTexture, silhouetteTexture] = useLoader(TextureLoader, [
        '/logo/logo.png',
        '/logo/logoglosnik.png',
    ]);

    useEffect(() => {
        [logoTexture, silhouetteTexture].forEach((texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = 8;
        });
    }, [logoTexture, silhouetteTexture]);

    const scene = useMemo(() => {
        const cloned = gltf.scene.clone(true);
        cloned.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            const sourceMaterial = Array.isArray(child.material) ? child.material[0] : child.material;
            const material = new THREE.MeshStandardMaterial({
                color: sourceMaterial?.color?.clone?.() ?? new THREE.Color('#ffffff'),
                map: logoTexture,
                emissive: new THREE.Color('#ff7a00'),
                emissiveIntensity: 0.7,
                metalness: 0.12,
                roughness: 0.24,
                transparent: true,
            });
            child.material = material;
        });
        return cloned;
    }, [gltf.scene, logoTexture]);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        scene.rotation.y = Math.sin(time * 0.8) * 0.14;
        scene.rotation.z = Math.sin(time * 1.1) * 0.035;
        scene.position.y = Math.sin(time * 1.5) * 0.012;
    });

    return (
        <group position={[0, -0.08, 0]}>
            <primitive object={scene} scale={1.12} />

            <mesh position={[0, -0.04, 0.16]}>
                <planeGeometry args={[1.5, 1.92]} />
                <meshBasicMaterial map={logoTexture} transparent opacity={0.96} toneMapped={false} />
            </mesh>

            <mesh position={[0, -0.05, -0.15]}>
                <planeGeometry args={[1.72, 2.12]} />
                <meshBasicMaterial
                    map={silhouetteTexture}
                    transparent
                    opacity={0.16}
                    color="#ff8a1f"
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    toneMapped={false}
                />
            </mesh>
        </group>
    );
}

export default function FreeFlowSpringLogo({
    onActivate = activateVoiceAgent,
}: {
    onActivate?: () => void;
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [isCoarsePointer, setIsCoarsePointer] = useState(false);
    const dragX = useMotionValue(0);
    const dragY = useMotionValue(0);
    const swayX = useMotionValue(0);
    const swayRotate = useMotionValue(0);
    const badgeScale = useTransform(dragY, [0, 180], [1, 1.08]);
    const badgeRotateZ = useTransform(dragY, [-40, 0, 180], [-3, 0, 7]);
    const dragRotateY = useTransform(dragX, [-100, 100], [-25, 25]);
    const dragRotateX = useTransform(dragY, [0, 180], [0, 20]);
    const badgeLift = useTransform(dragY, [0, 180], [0, -10]);
    const lanyardScaleY = useTransform(dragY, [-40, 0, 180], [0.92, 1, 2.08]);
    const lanyardOpacity = useTransform(dragY, [-40, 0, 180], [0.65, 0.78, 1]);
    const hookRotateBase = useTransform(dragY, [-40, 0, 180], [-4, 0, 4]);
    const glowStrength = useTransform(dragY, [0, 180], [0.18, 0.42]);
    const glowShadow = useTransform(glowStrength, (value) => `0 0 40px rgba(255,120,0,${value})`);
    const badgeShadow = useMotionTemplate`0 24px 65px rgba(0,0,0,0.4), ${glowShadow}`;
    const combinedX = useTransform(() => dragX.get() + swayX.get());
    const combinedRotateZ = useTransform(() => badgeRotateZ.get() + swayRotate.get());
    const combinedHookRotate = useTransform(() => hookRotateBase.get() + dragRotateY.get() * 0.16 + swayRotate.get() * 0.35);
    const combinedLanyardX = useTransform(() => dragX.get() * 0.24 + swayX.get() * 0.32);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const media = window.matchMedia('(pointer: coarse)');
        const update = () => setIsCoarsePointer(media.matches);
        update();
        if (typeof media.addEventListener === 'function') {
            media.addEventListener('change', update);
            return () => media.removeEventListener('change', update);
        }
        media.addListener(update);
        return () => media.removeListener(update);
    }, []);

    const staticMobileShadow = '0 18px 40px rgba(0,0,0,0.34), 0 0 18px rgba(255,120,0,0.18)';

    return (
        <div
            style={{
                position: 'fixed',
                insetInline: 0,
                top: '40vh',
                perspective: '1000px',
                transform: 'translateY(-50%)',
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 35,
            }}
        >
            <div style={{ position: 'relative', width: 280, height: 430, pointerEvents: 'none', transformStyle: 'preserve-3d' }}>
                <div
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: 10,
                        width: 12,
                        height: 12,
                        translate: '-50% 0',
                        borderRadius: 999,
                        background: 'radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,166,92,0.38) 70%, rgba(255,166,92,0) 100%)',
                        boxShadow: '0 0 22px rgba(255,161,82,0.35)',
                    }}
                />

                <motion.div
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: 22,
                        width: 30,
                        height: 146,
                        translateX: '-50%',
                        x: combinedLanyardX,
                        transformOrigin: 'top center',
                        scaleY: lanyardScaleY,
                        opacity: lanyardOpacity,
                        borderRadius: 999,
                        background:
                            'linear-gradient(180deg, rgba(6,9,18,0.96), rgba(9,18,32,0.92)), repeating-linear-gradient(180deg, rgba(255,138,31,0.18) 0 12px, rgba(0,217,255,0.1) 12px 24px)',
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 16px 28px rgba(0,0,0,0.28)',
                    }}
                />

                <motion.div
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: 154,
                        width: 44,
                        height: 44,
                        translateX: '-50%',
                        x: combinedLanyardX,
                        rotate: combinedHookRotate,
                        borderRadius: 999,
                        border: '4px solid rgba(25,28,36,0.96)',
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), 0 10px 24px rgba(0,0,0,0.3)',
                        background: 'radial-gradient(circle at 30% 30%, rgba(255,190,120,0.12), rgba(0,0,0,0) 60%)',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: 26,
                            width: 7,
                            height: 18,
                            translate: '-50% 0',
                            borderRadius: 999,
                            background: 'linear-gradient(180deg, rgba(18,21,28,1), rgba(38,43,53,1))',
                        }}
                    />
                </motion.div>

                <motion.div
                    drag
                    dragMomentum={false}
                    dragConstraints={{ top: 0, bottom: 180, left: -100, right: 100 }}
                    dragElastic={0.7}
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: 182,
                        width: 250,
                        height: 248,
                        translateX: '-50%',
                        x: combinedX,
                        y: dragY,
                        scale: badgeScale,
                        rotateX: dragRotateX,
                        rotateY: dragRotateY,
                        rotateZ: combinedRotateZ,
                        transformStyle: 'preserve-3d',
                        pointerEvents: 'auto',
                        touchAction: 'none',
                        willChange: 'transform',
                        cursor: 'grab',
                    }}
                    transition={SPRING_CONFIG}
                    whileDrag={{ cursor: 'grabbing' }}
                    onDragStart={() => {
                        setIsDragging(true);
                        dragX.set(0);
                        swayX.set(0);
                        swayRotate.set(0);
                    }}
                    onDragEnd={() => {
                        setIsDragging(false);
                        const releaseY = Math.max(dragY.get(), 0);
                        const wobble = Math.max(0.28, Math.min(releaseY / 160, 1));
                        animate(dragX, 0, SPRING_CONFIG);
                        animate(dragY, 0, SPRING_CONFIG);
                        animate(swayRotate, [0, 17 * wobble, -12 * wobble, 7 * wobble, -3 * wobble, 0], {
                            duration: 1.08,
                            ease: 'easeOut',
                        });
                        animate(swayX, [0, 22 * wobble, -16 * wobble, 10 * wobble, -4 * wobble, 0], {
                            duration: 1.14,
                            ease: 'easeOut',
                        });
                        if (releaseY >= ACTIVATE_PULL_THRESHOLD) {
                            onActivate();
                        }
                    }}
                >
                    <motion.div
                        style={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            transformStyle: 'preserve-3d',
                            borderRadius: 999,
                            boxShadow: isDragging || isCoarsePointer ? staticMobileShadow : badgeShadow,
                            y: badgeLift,
                            background:
                                'radial-gradient(circle at 50% 25%, rgba(255,160,70,0.18), rgba(0,0,0,0) 46%), linear-gradient(180deg, rgba(11,14,22,0.1), rgba(11,14,22,0))',
                            overflow: 'visible',
                            willChange: 'transform',
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: -16,
                                width: 16,
                                height: 28,
                                translate: '-50% 0',
                                borderRadius: 999,
                                background: 'linear-gradient(180deg, rgba(20,24,31,0.98), rgba(42,48,60,0.98))',
                                boxShadow: '0 8px 18px rgba(0,0,0,0.3)',
                            }}
                        />

                        <Canvas
                            camera={{ position: [0, 0, 3.2], fov: 28 }}
                            gl={{ antialias: true, alpha: true }}
                            style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
                        >
                            <ambientLight intensity={1.3} />
                            <pointLight position={[0, 1.5, 2.6]} intensity={20} color="#ff8a2a" />
                            <pointLight position={[0, -1.3, 2.1]} intensity={8} color="#00d9ff" />
                            <Suspense fallback={null}>
                                <LogoScene />
                            </Suspense>
                        </Canvas>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
