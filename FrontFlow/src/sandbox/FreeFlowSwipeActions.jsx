import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { useState } from "react";

const tiles = [
  { id: "restaurant", label: "🍽️ Restauracje", color: "from-fuchsia-600 to-purple-700" },
  { id: "taxi", label: "🚖 Taxi", color: "from-yellow-400 to-orange-600" },
  { id: "hotel", label: "🏨 Hotele", color: "from-blue-600 to-cyan-400" },
];

export default function FreeFlowSwipeActions() {
  const [active, setActive] = useState(tiles[0].id);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-8, 8]);
  const opacity = useTransform(x, [-200, 0, 200], [0.2, 1, 0.2]);

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 100) {
      setActive((prev) =>
        prev === "restaurant" ? "taxi" : prev === "taxi" ? "hotel" : "restaurant"
      );
    } else if (info.offset.x < -100) {
      setActive((prev) =>
        prev === "hotel" ? "taxi" : prev === "taxi" ? "restaurant" : "hotel"
      );
    }
  };

  const currentTile = tiles.find((t) => t.id === active);

  return (
    <div className="w-full h-[70vh] flex flex-col justify-center items-center bg-[#0D0D1A] text-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTile.id}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          style={{ x, rotate, opacity }}
          onDragEnd={handleDragEnd}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className={`w-64 h-64 flex flex-col justify-center items-center rounded-3xl bg-gradient-to-br ${currentTile.color} shadow-[0_0_30px_rgba(255,0,255,0.3)] cursor-grab`}
        >
          <span className="text-6xl mb-3">{currentTile.label.split(" ")[0]}</span>
          <p className="text-xl font-semibold tracking-wide">
            {currentTile.label.split(" ")[1]}
          </p>
        </motion.div>
      </AnimatePresence>
      <p className="mt-6 text-gray-400 text-sm italic">
        Przeciągnij ➡️ lub ⬅️, aby zmienić sekcję
      </p>
    </div>
  );
}

