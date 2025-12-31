import { motion, useMotionValue, useTransform } from "framer-motion";
import React, { useState } from "react";

export default function FreeFlowQuickActions() {
  const actions = [
    { id: "food", label: "🍕 Jedzenie", color: "bg-gradient-to-r from-pink-600 to-fuchsia-500" },
    { id: "taxi", label: "🚖 Taxi", color: "bg-gradient-to-r from-yellow-400 to-orange-500" },
    { id: "hotel", label: "🏨 Hotel", color: "bg-gradient-to-r from-cyan-500 to-blue-600" },
  ];

  const [active, setActive] = useState(null);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-120, 0, 120], [0.3, 1, 0.3]);

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 80) {
      setActive("right");
      console.log("➡️ Swiped Right");
    } else if (info.offset.x < -80) {
      setActive("left");
      console.log("⬅️ Swiped Left");
    } else {
      setActive(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[80vh] bg-[#0d0d1a] text-white font-spacegrotesk">
      <h1 className="text-fuchsia-500 text-xl mb-6 font-semibold tracking-wide">
        FreeFlow – Wybierz sekcję
      </h1>

      <div className="flex flex-col gap-4 w-[90%] max-w-md">
        {actions.map((action) => (
          <motion.div
            key={action.id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            style={{ x, opacity }}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            className={`flex justify-between items-center px-6 py-4 rounded-2xl ${action.color} shadow-[0_0_15px_rgba(255,0,255,0.3)] cursor-grab active:cursor-grabbing transition-all`}
          >
            <span className="text-2xl">{action.label.split(" ")[0]}</span>
            <p className="text-lg font-semibold">{action.label.split(" ")[1]}</p>
          </motion.div>
        ))}
      </div>

      {active && (
        <p className="mt-6 text-gray-400 text-sm italic">
          {active === "left" ? "← Przesunięto w lewo" : "→ Przesunięto w prawo"}
        </p>
      )}
    </div>
  );
}

