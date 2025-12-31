import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";

export default function AnimatedCards({ 
  items = [], 
  onItemClick = null,
  className = "",
  cardType = "default" // "default", "order", "restaurant", "voice"
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [cardScales, setCardScales] = useState({});
  const scrollContainerRef = useRef(null);
  const cardRefs = useRef([]);

  // Track scroll position for 3D effect
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || cardType !== "restaurant") return;

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      const newScales = {};

      cardRefs.current.forEach((cardRef, index) => {
        if (!cardRef) return;
        const cardRect = cardRef.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(cardCenter - containerCenter);
        const maxDistance = containerRect.width / 2;
        const scale = Math.max(0.85, 1 - (distance / maxDistance) * 0.15);
        
        newScales[index] = {
          scale,
          opacity: scale > 0.9 ? 1 : 0.7
        };

        // Update focused index
        if (distance < 50) {
          setFocusedIndex(index);
        }
      });

      setCardScales(newScales);
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call

    return () => container.removeEventListener('scroll', handleScroll);
  }, [items, cardType]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 300,
      },
    },
    hover: {
      scale: 1.03,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 400,
      },
    },
  };

  // Get image URL for restaurant
  const getRestaurantImage = (item) => {
    if (item.image) return item.image;
    if (item.image_url) return item.image_url;
    if (item.photo) return item.photo;
    // Return null if no image - will show fallback gradient
    return null;
  };

  // Card content based on type
  const renderCardContent = (item, index) => {
    switch (cardType) {
      case "order":
        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Order #{item.id}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                item.status === 'completed' ? 'bg-green-600 text-white' :
                item.status === 'pending' ? 'bg-yellow-600 text-white' :
                item.status === 'cancelled' ? 'bg-red-600 text-white' :
                'bg-gray-600 text-white'
              }`}>
                {item.status}
              </span>
            </div>
            <p className="text-gray-300 mb-2">{item.restaurant_name}</p>
            <p className="text-fuchsia-400 font-bold">${item.total}</p>
            <p className="text-sm text-gray-400 mt-2">
              {new Date(item.created_at).toLocaleDateString()}
            </p>
          </div>
        );

      case "restaurant":
        const imageUrl = getRestaurantImage(item);
        return (
          <>
            {/* Main Image - 90% of visual effect */}
            {imageUrl ? (
              <img 
                src={imageUrl}
                alt={item.name || 'Restaurant'}
                className="w-full h-[260px] object-cover"
                onError={(e) => {
                  // Fallback to gradient if image fails to load
                  e.target.style.display = 'none';
                  const fallback = e.target.nextElementSibling;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            {/* Fallback gradient if no image */}
            <div 
              className={`w-full h-[260px] bg-gradient-to-br from-fuchsia-500 to-purple-600 ${imageUrl ? 'hidden' : 'flex'} items-center justify-center`}
            >
              <span className="text-4xl font-bold text-white">
                {item.name?.charAt(0) || 'R'}
              </span>
            </div>

            {/* Purple Glow - neonowy bok */}
            <div 
              className="absolute inset-0 rounded-[32px] opacity-60 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at left, rgba(255,0,255,0.35), transparent)'
              }}
            />

            {/* Foreground Panel - dark panel with text at bottom */}
            <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent">
              <h3 className="text-xl font-semibold text-white mb-1">
                {item.name}
              </h3>
              <p className="text-gray-300 text-sm mb-2">{item.cuisine_type}</p>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400">★</span>
                <span className="text-gray-200 font-medium">{item.rating || '4.5'}</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-300 text-sm">{item.delivery_time || '25-30 min'}</span>
              </div>
            </div>
          </>
        );

      case "voice":
        return (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🎤</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {item.title || 'Voice Command'}
            </h3>
            <p className="text-gray-300 text-sm">
              {item.description || 'Click to start voice interaction'}
            </p>
          </div>
        );

      default:
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              {item.title || item.name || `Item ${index + 1}`}
            </h3>
            <p className="text-gray-300 text-sm">
              {item.description || item.content || 'No description available'}
            </p>
            {item.subtitle && (
              <p className="text-fuchsia-400 text-xs mt-2">{item.subtitle}</p>
            )}
          </div>
        );
    }
  };

  if (!items || items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`text-center py-12 ${className}`}
      >
        <div className="text-gray-400 text-lg">No items to display</div>
      </motion.div>
    );
  }

  // Special styling for restaurant cards (Arena style)
  const isRestaurantType = cardType === "restaurant";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      ref={scrollContainerRef}
      className={`flex gap-6 overflow-x-auto pb-8 px-4 snap-x snap-mandatory scrollbar-hide ${className}`}
      style={{
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {items.map((item, index) => {
        const cardScale = cardScales[index] || { scale: 1, opacity: 1 };
        return (
          <motion.div
            key={item.id || index}
            ref={(el) => cardRefs.current[index] = el}
            variants={cardVariants}
            whileHover={isRestaurantType ? { scale: 1.03 } : "hover"}
            animate={isRestaurantType ? {
              scale: cardScale.scale,
              opacity: cardScale.opacity,
            } : {}}
            onHoverStart={() => setHoveredIndex(index)}
            onHoverEnd={() => setHoveredIndex(null)}
            onClick={() => onItemClick && onItemClick(item, index)}
            className={`
              ${isRestaurantType ? `
                relative
                w-[85vw] max-w-sm
                rounded-[32px]
                overflow-hidden
                snap-center
                shadow-xl
                bg-gradient-to-b from-black/10 to-black/60
                backdrop-blur-sm
                transform transition-all duration-500 ease-out
                group
                cursor-pointer
              ` : `
                snap-center shrink-0 w-[280px] h-[420px]
                rounded-3xl p-4
                bg-gradient-to-br from-white/10 to-white/5
                backdrop-blur-xl
                border border-white/10
                shadow-[0_0_40px_-10px_rgba(152,0,255,0.45)]
                transition-all duration-300
                hover:scale-[1.04] hover:-rotate-[1.5deg]
                hover:shadow-[0_0_55px_-8px_rgba(152,0,255,0.65)]
                cursor-pointer overflow-hidden
                relative
              `}
            `}
          >
          {renderCardContent(item, index)}
          
          {/* Hover overlay - only for non-restaurant cards */}
          {!isRestaurantType && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: hoveredIndex === index ? 0.1 : 0 
              }}
              className="absolute inset-0 bg-fuchsia-500 pointer-events-none"
            />
          )}
        </motion.div>
        );
      })}
    </motion.div>
  );
}


