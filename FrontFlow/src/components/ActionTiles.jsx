import { motion } from "framer-motion";
import "../styles/hero.css";

const tiles = [
  { label: "Food", icon: "🍕", color: "rgba(255, 80, 200, 0.4)" },
  { label: "Taxi", icon: "🚖", color: "rgba(80, 200, 255, 0.4)" },
  { label: "Hotel", icon: "🏨", color: "rgba(255, 180, 80, 0.4)" },
];

export default function ActionTiles() {
  return (
    <div className="tiles-container">
      {tiles.map((tile) => (
        <motion.div
          key={tile.label}
          className="tile"
          whileHover={{
            scale: 1.08,
            boxShadow: `0 0 25px ${tile.color}, 0 0 60px ${tile.color}`,
          }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <div className="tile-icon">{tile.icon}</div>
          <div className="tile-label">{tile.label}</div>
        </motion.div>
      ))}
    </div>
  );
}
