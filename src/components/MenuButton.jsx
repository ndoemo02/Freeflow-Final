import { motion } from "framer-motion";

// Mała linia jako komponent
const Line = (props) => (
  <motion.path
    fill="transparent"
    strokeWidth="3"
    stroke="white" // Kolor ikon
    strokeLinecap="round"
    {...props}
  />
);

export function MenuButton({ isOpen, onToggle }) {
  return (
    <button 
      onClick={onToggle} 
      style={{ 
        background: 'none', 
        border: 'none', 
        cursor: 'pointer', 
        zIndex: 101, // Na wierzchu
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <svg width="23" height="23" viewBox="0 0 23 23">
        {/* Górna linia: animuje się w '\' */}
        <Line
          variants={{
            closed: { d: "M 2 2.5 L 20 2.5" },
            open: { d: "M 3 16.5 L 17 2.5" }
          }}
          animate={isOpen ? "open" : "closed"}
        />
        {/* Środkowa linia: znika */}
        <Line
          d="M 2 9.423 L 20 9.423"
          variants={{
            closed: { opacity: 1 },
            open: { opacity: 0 }
          }}
          animate={isOpen ? "open" : "closed"}
          transition={{ duration: 0.1 }}
        />
        {/* Dolna linia: animuje się w '/' */}
        <Line
          variants={{
            closed: { d: "M 2 16.346 L 20 16.346" },
            open: { d: "M 3 2.5 L 17 16.346" }
          }}
          animate={isOpen ? "open" : "closed"}
        />
      </svg>
    </button>
  );
}



