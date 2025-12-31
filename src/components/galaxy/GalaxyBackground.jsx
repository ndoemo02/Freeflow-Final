import { useEffect, useRef } from 'react';

export default function GalaxyBackground() {
  const starsContainerRef = useRef(null);

  useEffect(() => {
    const starsContainer = starsContainerRef.current;
    if (!starsContainer) return;

    const starCount = 100;
    const stars = [];

    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.classList.add('star');
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const size = Math.random() * 2 + 1;
      const duration = Math.random() * 3 + 2;
      const delay = Math.random() * 5;
      
      star.style.left = `${x}%`;
      star.style.top = `${y}%`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.setProperty('--duration', `${duration}s`);
      star.style.animationDelay = `${delay}s`;
      star.style.opacity = String(Math.random());
      
      starsContainer.appendChild(star);
      stars.push(star);
    }

    return () => {
      stars.forEach(star => star.remove());
    };
  }, []);

  return (
    <>
      <div className="galaxy-bg"></div>
      <div ref={starsContainerRef} className="stars"></div>
    </>
  );
}


