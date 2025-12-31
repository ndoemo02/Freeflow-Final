import { motion } from 'framer-motion';

const barStyle = {
  width: '10px',
  height: '30px',
  background: '#00E0FF', // Kolor z Twojego logo
  borderRadius: '5px',
  margin: '0 4px'
};

const animation = {
  scaleY: [1, 1.8, 1], // Skaluje w górę i w dół
  opacity: [0.7, 1, 0.7]
};

const transition = {
  duration: 1.3,
  repeat: Infinity,
  ease: "easeInOut"
};

export function VoiceBar() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: 60,
      padding: '1rem'
    }}>
      <motion.div 
        style={barStyle} 
        animate={animation} 
        transition={{ ...transition, delay: 0 }} 
      />
      <motion.div 
        style={barStyle} 
        animate={animation} 
        transition={{ ...transition, delay: 0.25 }} 
      />
      <motion.div 
        style={barStyle} 
        animate={animation} 
        transition={{ ...transition, delay: 0.5 }} 
      />
    </div>
  );
}



