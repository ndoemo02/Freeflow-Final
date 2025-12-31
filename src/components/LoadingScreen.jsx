import React, { useState, useEffect, useRef } from 'react';
import amberVideo from '../assets/amber_avatar.mp4';

export default function LoadingScreen({ onComplete }) {
  const [isComplete, setIsComplete] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const videoRef = useRef(null);

  // Funkcja obsługi interakcji użytkownika
  const handleUserInteraction = () => {
    if (!userInteracted) {
      setUserInteracted(true);
      if (videoRef.current) {
        setIsMuted(false);
        videoRef.current.muted = false;
        // Spróbuj odtworzyć video jeśli jest paused
        videoRef.current.play().catch(err => console.log('Autoplay prevented:', err));
      }
    }
  };

  useEffect(() => {
    // Nasłuchuj interakcji użytkownika
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    // Sprawdź długość video Amber i dopasuj timing do wypowiedzi
    const setupVideoTiming = () => {
      if (videoRef.current) {
        const duration = videoRef.current.duration;
        if (duration && duration > 0) {
          // Amber mówi przez całą długość video + 1 sekunda buforu
          const amberSpeakDuration = duration * 1000 + 1000;
          
          const timer = setTimeout(() => {
            setIsComplete(true);
            setTimeout(() => onComplete?.(), 800);
          }, amberSpeakDuration);

          return () => clearTimeout(timer);
        }
      }
      return null;
    };

    // Fallback na 8 sekund (długość video Amber)
    const fallbackTimer = setTimeout(() => {
      setIsComplete(true);
      setTimeout(() => onComplete?.(), 800);
    }, 8000);

    // Spróbuj ustawić timing na podstawie video
    const videoTimer = setupVideoTiming();

    return () => {
      if (videoTimer) videoTimer();
      clearTimeout(fallbackTimer);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [onComplete]);

  const handleVideoClick = () => {
    if (videoRef.current) {
      setIsMuted(!isMuted);
      videoRef.current.muted = !isMuted;
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 30% 50%, rgba(255, 165, 0, 0.3) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(138, 43, 226, 0.3) 0%, transparent 50%)',
            animation: 'gradientShift 8s ease-in-out infinite'
          }}
        />
      </div>

      {/* Particles effect */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-orange-400 rounded-full opacity-0"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `particle ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 2}s infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Fade out overlay */}
      <div
        className={`absolute inset-0 bg-black transition-all duration-1000 ${
          isComplete ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          background: isComplete
            ? 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)'
            : 'rgba(0,0,0,1)'
        }}
      />

      {/* Main content container */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-12">

        {/* Amber Avatar - Full Character - pojawia się od razu gdy zaczyna mówić */}
        <div
          className="relative opacity-0"
          style={{
            animation: 'fadeInScale 1.2s ease-out 0.2s forwards' // Pojawia się szybko, gdy Amber zaczyna mówić
          }}
        >
          {/* Glow effect behind Amber */}
          <div
            className="absolute inset-0 rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(255, 165, 0, 0.6) 0%, rgba(138, 43, 226, 0.4) 50%, transparent 70%)',
              animation: 'pulseGlow 3s ease-in-out infinite',
              transform: 'scale(1.5)'
            }}
          />

          {/* Amber video */}
          <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-4 border-orange-500/50 shadow-2xl cursor-pointer group" onClick={handleVideoClick}>
            <video
              ref={videoRef}
              src={amberVideo}
              autoPlay={false}
              loop
              muted={false}
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
              onError={(e) => console.error('Video error:', e)}
              onLoadedMetadata={() => {
                // Gdy video się załaduje, opóźnij rozpoczęcie o 1 sekundę
                if (videoRef.current) {
                  const duration = videoRef.current.duration;
                  console.log('Amber video duration:', duration, 'seconds');
                  
                  // Opóźnij rozpoczęcie video o 1 sekundę
                  setTimeout(() => {
                    if (videoRef.current) {
                      videoRef.current.play().catch(err => console.log('Delayed play failed:', err));
                    }
                  }, 1000);
                }
              }}
              onEnded={() => {
                // Gdy Amber skończy mówić, zakończ loading screen
                console.log('Amber finished speaking, ending loading screen');
                setIsComplete(true);
                setTimeout(() => onComplete?.(), 800);
              }}
            />
            
            {/* Sound indicator */}
            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:bg-black/70">
              {!isMuted ? (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </div>
            
          </div>
        </div>


        {/* Logo with animation */}
        <div
          className="relative"
          style={{ perspective: '1000px' }}
        >
          <div
            className="flex text-7xl md:text-8xl lg:text-9xl font-bold uppercase whitespace-nowrap relative"
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 700,
              transformStyle: 'preserve-3d',
              textShadow: '0 0 10px rgba(255, 165, 0, 0.8), 0 0 20px rgba(255, 165, 0, 0.6), 0 0 40px rgba(255, 165, 0, 0.4)',
              animation: 'intensifyGlow 3s ease-out 3s forwards' // Intensyfikacja glow gdy Amber mówi (1s opóźnienie + 2s)
            }}
          >
            {/* FREE - letters sliding from left - synchronized with Amber speech */}
            <span className="inline-block">
              {['F', 'R', 'E', 'E'].map((char, index) => (
                <span
                  key={index}
                  className="inline-block text-orange-400 opacity-0 transform -translate-x-20"
                  style={{
                    letterSpacing: '-0.05em',
                    animation: `slideInLeft 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                    animationDelay: `${2.5 + index * 0.2}s` // Opóźnienie po rozpoczęciu mowy Amber (1s opóźnienie + 1.5s)
                  }}
                >
                  {char}
                </span>
              ))}
            </span>

            {/* Space */}
            <span className="w-4"></span>

            {/* FLOW - slides from right - gdy Amber kończy mówić */}
            <span
              className="inline-block text-white opacity-0 transform translate-x-20"
              style={{
                animation: 'slideInRight 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 5.5s forwards' // Po 5.5s - gdy Amber kończy mówić (1s opóźnienie + 4.5s)
              }}
            >
              Flow
            </span>
          </div>

          {/* Subtitle - pojawia się gdy Amber kończy mówić */}
          <div
            className="text-center mt-4 text-orange-300/80 text-lg md:text-xl font-light tracking-widest opacity-0"
            style={{
              animation: 'fadeIn 1s ease-out 7s forwards' // Po 7s - gdy Amber skończy mówić (1s opóźnienie + 6s)
            }}
          >
            Voice-Powered Ordering
          </div>
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;700&display=swap');

        @keyframes slideInLeft {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes intensifyGlow {
          from {
            text-shadow: 0 0 10px rgba(255, 165, 0, 0.8),
                         0 0 20px rgba(255, 165, 0, 0.6),
                         0 0 40px rgba(255, 165, 0, 0.4);
          }
          to {
            text-shadow: 0 0 15px rgba(255, 165, 0, 1),
                         0 0 30px rgba(255, 165, 0, 0.8),
                         0 0 60px rgba(255, 165, 0, 0.6),
                         0 0 120px rgba(255, 165, 0, 0.4);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1.5);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.7);
          }
        }

        @keyframes gradientShift {
          0%, 100% {
            transform: translateX(0) translateY(0);
          }
          50% {
            transform: translateX(10%) translateY(10%);
          }
        }

        @keyframes particle {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0);
          }
          50% {
            opacity: 0.8;
            transform: translateY(-100px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-200px) scale(0);
          }
        }
      `}</style>
    </div>
  );
}
