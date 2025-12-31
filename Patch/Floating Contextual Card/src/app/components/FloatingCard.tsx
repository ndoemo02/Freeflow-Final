import { useState, useRef } from "react";
import { motion, PanInfo, useMotionValue } from "motion/react";
import { Star, MapPin, Clock, DollarSign, ChevronUp } from "lucide-react";

type CardState = "closed" | "peek" | "expanded";

interface Restaurant {
  id: number;
  name: string;
  rating: number;
  cuisine: string;
  distance: string;
  priceLevel: string;
  waitTime: string;
  description: string;
  image: string;
}

const restaurants: Restaurant[] = [
  {
    id: 1,
    name: "Szara Gęś",
    rating: 4.8,
    cuisine: "Polska",
    distance: "0.3 km",
    priceLevel: "$$",
    waitTime: "15-20 min",
    description: "Tradycyjna polska kuchnia w nowoczesnym wydaniu. Specjalność: pierogi i zupy.",
    image: "restaurant-1"
  },
  {
    id: 2,
    name: "Trattoria Italia",
    rating: 4.6,
    cuisine: "Włoska",
    distance: "0.5 km",
    priceLevel: "$$$",
    waitTime: "20-25 min",
    description: "Autentyczne włoskie smaki. Świeże makaron i pizze z pieca opalanego drewnem.",
    image: "restaurant-2"
  },
  {
    id: 3,
    name: "Sushi Master",
    rating: 4.9,
    cuisine: "Japońska",
    distance: "0.8 km",
    priceLevel: "$$$",
    waitTime: "25-30 min",
    description: "Najlepsze sushi w mieście. Tylko najświeższe składniki od sprawdzonych dostawców.",
    image: "restaurant-3"
  }
];

export function FloatingCard() {
  const [state, setState] = useState<CardState>("peek");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const y = useMotionValue(0);
  const constraintsRef = useRef(null);

  const restaurant = restaurants[currentIndex];

  // Oblicz wysokości dla różnych stanów
  const peekHeight = 100;
  const expandedHeight = 340;

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    // Swipe w górę - rozwinięcie
    if (offset < -50 || velocity < -500) {
      if (state === "peek") {
        setState("expanded");
      }
    }
    // Swipe w dół - zamknięcie
    else if (offset > 50 || velocity > 500) {
      if (state === "expanded") {
        setState("peek");
      } else if (state === "peek") {
        setState("closed");
      }
    }

    // Swipe w bok - przełączanie restauracji
    const horizontalOffset = info.offset.x;
    const horizontalVelocity = info.velocity.x;

    if (Math.abs(horizontalOffset) > 80 || Math.abs(horizontalVelocity) > 500) {
      setIsTransitioning(true);
      if (horizontalOffset > 0 || horizontalVelocity > 0) {
        // Swipe w prawo - poprzednia restauracja
        setCurrentIndex((prev) => (prev - 1 + restaurants.length) % restaurants.length);
      } else {
        // Swipe w lewo - następna restauracja
        setCurrentIndex((prev) => (prev + 1) % restaurants.length);
      }
      setTimeout(() => setIsTransitioning(false), 300);
    }

    y.set(0);
  };

  const handleTap = () => {
    if (state === "peek") {
      console.log(`Selected restaurant: ${restaurant.name}`);
      // Tutaj możesz dodać logikę wyboru restauracji
    }
  };

  if (state === "closed") {
    return null;
  }

  const height = state === "peek" ? peekHeight : expandedHeight;

  return (
    <motion.div
      ref={constraintsRef}
      className="fixed left-4 bottom-24 z-30 pointer-events-none"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <motion.div
        drag={!isTransitioning}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
        animate={{ height }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto cursor-pointer border border-gray-100 dark:border-gray-800"
        style={{
          width: 320,
          y,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 0, 0, 0.1)"
        }}
      >
        {/* Peek State - Nazwa + Rating */}
        <motion.div
          className="p-5 select-none"
          animate={{ opacity: 1 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <motion.h3
                key={`name-${restaurant.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="text-gray-900 dark:text-gray-100 truncate mb-1"
              >
                {restaurant.name}
              </motion.h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-gray-900 dark:text-gray-100">{restaurant.rating}</span>
                </div>
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span className="text-gray-600 dark:text-gray-300">{restaurant.cuisine}</span>
              </div>
            </div>
            
            {/* Indicator dots */}
            <div className="flex items-center gap-1.5 pt-1">
              {restaurants.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentIndex ? "bg-blue-500 w-4" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Swipe indicator */}
          {state === "peek" && (
            <motion.div
              className="flex justify-center mt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </motion.div>
          )}
        </motion.div>

        {/* Expanded State - Szczegóły */}
        {state === "expanded" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="px-5 pb-5 select-none"
          >
            {/* Quick Info */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <MapPin className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span className="text-sm">{restaurant.distance}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span className="text-sm">{restaurant.waitTime}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <DollarSign className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span className="text-sm">{restaurant.priceLevel}</span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                {restaurant.description}
              </p>
            </div>

            {/* Action Button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="w-full bg-blue-500 dark:bg-blue-600 text-white py-3 rounded-2xl hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
              onClick={() => {
                console.log(`Booking: ${restaurant.name}`);
              }}
            >
              Rezerwuj stolik
            </motion.button>

            {/* Swipe down hint */}
            <div className="flex justify-center mt-3">
              <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500 rotate-180" />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Swipe hints (lewo/prawo) */}
      <div className="absolute -right-16 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm select-none pointer-events-none">
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">←→</span>
          <span className="text-xs">swipe</span>
        </div>
      </div>
    </motion.div>
  );
}