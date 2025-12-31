import { useState, useEffect } from 'react';

export default function CountUp({ end, prefix = '', suffix = '', duration = 1500 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(progress * end * easeOut);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  const formatted = count.toLocaleString(undefined, {
    minimumFractionDigits: end % 1 !== 0 ? 1 : 0,
    maximumFractionDigits: end % 1 !== 0 ? 1 : 0
  });

  return <span>{prefix}{formatted}{suffix}</span>;
}


