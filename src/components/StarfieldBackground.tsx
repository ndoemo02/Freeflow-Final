/**
 * StarfieldBackground — animowane gwieździste niebo + mgławice
 * Używane w ClientPanel i BusinessClientPanel jako globalne tło.
 *
 * Efekty:
 * - 280 gwiazd w 3 warstwach (parallax przy ruchu myszy)
 * - Migotanie (twinkle) z różnymi prędkościami
 * - Spadające gwiazdy (shooting stars) co ~4s
 * - 4 pływające mgławice (nebula) z blur CSS
 * - Cross-sparkle dla najjaśniejszych gwiazd
 */

import { useEffect, useRef } from 'react';

const STAR_COUNT = 280;
const SHOOTING_INTERVAL = 4000;

interface Star {
    x: number; y: number;
    baseX: number; baseY: number;
    size: number; baseSize: number;
    layer: number;
    parallaxSpeed: number;
    alpha: number; baseAlpha: number;
    twinkleSpeed: number; twinklePhase: number;
    r: number; g: number; b: number;
}

interface ShootingStar {
    x: number; y: number;
    angle: number; speed: number;
    length: number; alpha: number;
    life: number; decay: number;
}

export default function StarfieldBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let W = 0, H = 0;
        let mouseX = 0, mouseY = 0;
        let stars: Star[] = [];
        let shootingStars: ShootingStar[] = [];
        let time = 0;
        let rafId: number;

        function resize() {
            W = canvas!.width = window.innerWidth;
            H = canvas!.height = window.innerHeight;
        }

        function createStar(): Star {
            const layerRand = Math.random();
            let layer: number, size: number, speed: number;
            if (layerRand < 0.6) {
                layer = 1; size = Math.random() * 1.2 + 0.3; speed = 0.15;
            } else if (layerRand < 0.9) {
                layer = 2; size = Math.random() * 1.8 + 0.8; speed = 0.3;
            } else {
                layer = 3; size = Math.random() * 2.5 + 1.2; speed = 0.5;
            }

            const hueRand = Math.random();
            let r: number, g: number, b: number;
            if (hueRand < 0.6) {
                r = 200 + Math.random() * 55; g = 210 + Math.random() * 45; b = 255;
            } else if (hueRand < 0.8) {
                r = 255; g = 220 + Math.random() * 35; b = 180 + Math.random() * 40;
            } else if (hueRand < 0.92) {
                r = 255; g = 180 + Math.random() * 40; b = 140 + Math.random() * 50;
            } else {
                r = 180 + Math.random() * 75; g = 200 + Math.random() * 55; b = 255;
            }

            const x = Math.random() * W;
            const y = Math.random() * H;
            return {
                x, y, baseX: x, baseY: y,
                size, baseSize: size,
                layer, parallaxSpeed: speed,
                alpha: Math.random() * 0.5 + 0.3,
                baseAlpha: Math.random() * 0.5 + 0.3,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinklePhase: Math.random() * Math.PI * 2,
                r, g, b
            };
        }

        function initStars() {
            stars = [];
            for (let i = 0; i < STAR_COUNT; i++) {
                stars.push(createStar());
            }
        }

        function createShootingStar() {
            const startX = Math.random() * W * 0.8;
            const startY = Math.random() * H * 0.5;
            const angle = (Math.random() * 30 + 15) * Math.PI / 180;
            const speed = Math.random() * 8 + 6;
            const length = Math.random() * 100 + 60;
            shootingStars.push({
                x: startX, y: startY,
                angle, speed, length,
                alpha: 1, life: 1,
                decay: Math.random() * 0.015 + 0.01
            });
        }

        function draw() {
            ctx!.clearRect(0, 0, W, H);
            time += 0.016;

            const px = (mouseX / W - 0.5) * 2;
            const py = (mouseY / H - 0.5) * 2;

            // Draw stars
            for (const s of stars) {
                const offsetX = px * s.parallaxSpeed * 25;
                const offsetY = py * s.parallaxSpeed * 25;
                const drawX = s.baseX + offsetX;
                const drawY = s.baseY + offsetY;

                const twinkle = Math.sin(time * s.twinkleSpeed * 60 + s.twinklePhase);
                const alpha = s.baseAlpha + twinkle * 0.3;
                const sz = s.baseSize + twinkle * 0.3;

                if (alpha <= 0) continue;

                ctx!.save();
                ctx!.globalAlpha = Math.max(0, Math.min(1, alpha));

                // Glow for bigger stars
                if (sz > 1.5) {
                    const grd = ctx!.createRadialGradient(drawX, drawY, 0, drawX, drawY, sz * 3);
                    grd.addColorStop(0, `rgba(${s.r},${s.g},${s.b},${alpha * 0.6})`);
                    grd.addColorStop(0.4, `rgba(${s.r},${s.g},${s.b},${alpha * 0.15})`);
                    grd.addColorStop(1, `rgba(${s.r},${s.g},${s.b},0)`);
                    ctx!.fillStyle = grd;
                    ctx!.beginPath();
                    ctx!.arc(drawX, drawY, sz * 3, 0, Math.PI * 2);
                    ctx!.fill();
                }

                // Core
                ctx!.fillStyle = `rgba(${s.r},${s.g},${s.b},${Math.min(1, alpha * 1.2)})`;
                ctx!.beginPath();
                ctx!.arc(drawX, drawY, Math.max(0.3, sz * 0.6), 0, Math.PI * 2);
                ctx!.fill();

                // Cross sparkle for brightest stars
                if (sz > 2 && alpha > 0.6) {
                    ctx!.strokeStyle = `rgba(${s.r},${s.g},${s.b},${alpha * 0.3})`;
                    ctx!.lineWidth = 0.5;
                    const spLen = sz * 2.5;
                    ctx!.beginPath();
                    ctx!.moveTo(drawX - spLen, drawY);
                    ctx!.lineTo(drawX + spLen, drawY);
                    ctx!.moveTo(drawX, drawY - spLen);
                    ctx!.lineTo(drawX, drawY + spLen);
                    ctx!.stroke();
                }
                ctx!.restore();
            }

            // Draw shooting stars
            for (let i = shootingStars.length - 1; i >= 0; i--) {
                const ss = shootingStars[i];
                ss.x += Math.cos(ss.angle) * ss.speed;
                ss.y += Math.sin(ss.angle) * ss.speed;
                ss.life -= ss.decay;
                ss.alpha = ss.life;

                if (ss.life <= 0 || ss.x > W + 100 || ss.y > H + 100) {
                    shootingStars.splice(i, 1);
                    continue;
                }

                const tailX = ss.x - Math.cos(ss.angle) * ss.length;
                const tailY = ss.y - Math.sin(ss.angle) * ss.length;
                const grd = ctx!.createLinearGradient(tailX, tailY, ss.x, ss.y);
                grd.addColorStop(0, `rgba(255,255,255,0)`);
                grd.addColorStop(0.6, `rgba(200,220,255,${ss.alpha * 0.4})`);
                grd.addColorStop(1, `rgba(255,255,255,${ss.alpha * 0.9})`);

                ctx!.save();
                ctx!.strokeStyle = grd;
                ctx!.lineWidth = 1.5;
                ctx!.lineCap = 'round';
                ctx!.beginPath();
                ctx!.moveTo(tailX, tailY);
                ctx!.lineTo(ss.x, ss.y);
                ctx!.stroke();

                // Head glow
                const headGrd = ctx!.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, 6);
                headGrd.addColorStop(0, `rgba(255,255,255,${ss.alpha * 0.8})`);
                headGrd.addColorStop(1, `rgba(200,220,255,0)`);
                ctx!.fillStyle = headGrd;
                ctx!.beginPath();
                ctx!.arc(ss.x, ss.y, 6, 0, Math.PI * 2);
                ctx!.fill();
                ctx!.restore();
            }

            rafId = requestAnimationFrame(draw);
        }

        // Mouse parallax
        const handleMouseMove = (e: MouseEvent) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };
        document.addEventListener('mousemove', handleMouseMove);

        // Shooting star timer
        const shootingInterval = setInterval(() => {
            if (Math.random() > 0.3) createShootingStar();
        }, SHOOTING_INTERVAL);

        // Fire initial ones
        const t1 = setTimeout(createShootingStar, 1500);
        const t2 = setTimeout(createShootingStar, 3000);

        // Resize handler
        const handleResize = () => {
            resize();
            for (const s of stars) {
                if (s.baseX > W) s.baseX = Math.random() * W;
                if (s.baseY > H) s.baseY = Math.random() * H;
            }
        };
        window.addEventListener('resize', handleResize);

        // Init
        resize();
        initStars();
        draw();

        return () => {
            cancelAnimationFrame(rafId);
            clearInterval(shootingInterval);
            clearTimeout(t1);
            clearTimeout(t2);
            document.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <>
            {/* Canvas starfield */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 0,
                    pointerEvents: 'none',
                    width: '100%',
                    height: '100%',
                }}
            />

            {/* Nebula CSS layers */}
            <div style={{
                position: 'fixed', pointerEvents: 'none', zIndex: 0,
                borderRadius: '50%', filter: 'blur(80px)',
                top: '-10%', right: '-5%', width: '600px', height: '600px',
                background: 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, rgba(139,92,246,0.03) 50%, transparent 70%)',
                animation: 'nebulaFloat 25s ease-in-out infinite alternate',
            }} />
            <div style={{
                position: 'fixed', pointerEvents: 'none', zIndex: 0,
                borderRadius: '50%', filter: 'blur(80px)',
                bottom: '-15%', left: '-8%', width: '550px', height: '550px',
                background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, rgba(245,158,11,0.03) 50%, transparent 70%)',
                animation: 'nebulaFloat 30s ease-in-out infinite alternate',
                animationDelay: '-10s',
            }} />
            <div style={{
                position: 'fixed', pointerEvents: 'none', zIndex: 0,
                borderRadius: '50%', filter: 'blur(80px)',
                top: '40%', left: '30%', width: '400px', height: '400px',
                background: 'radial-gradient(circle, rgba(168,85,247,0.04) 0%, rgba(236,72,153,0.02) 50%, transparent 70%)',
                animation: 'nebulaFloat 22s ease-in-out infinite alternate',
                animationDelay: '-5s',
            }} />
            <div style={{
                position: 'fixed', pointerEvents: 'none', zIndex: 0,
                borderRadius: '50%', filter: 'blur(80px)',
                top: '20%', right: '25%', width: '350px', height: '350px',
                background: 'radial-gradient(circle, rgba(14,165,233,0.04) 0%, transparent 60%)',
                animation: 'nebulaFloat 28s ease-in-out infinite alternate',
                animationDelay: '-15s',
            }} />

            {/* Keyframes injected once */}
            <style>{`
        @keyframes nebulaFloat {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.7; }
          33%  { transform: translate(30px, -20px) scale(1.1); opacity: 1; }
          66%  { transform: translate(-20px, 15px) scale(0.95); opacity: 0.8; }
          100% { transform: translate(15px, -10px) scale(1.05); opacity: 0.9; }
        }
      `}</style>
        </>
    );
}
