import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import './ConversationPanel.css'; // Stworzymy go za chwilę

export function ConversationPanel({ messages }) {
  const scrollRef = useRef(null);

  // Ten hook automatycznie przewija na dół, gdy pojawia się nowa wiadomość
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]); // Uruchamia się za każdym razem, gdy zmienia się tablica 'messages'

  return (
    <div ref={scrollRef} className="conversation-container">
      {/* AnimatePresence pozwala na animację "wejścia" nowych dymków */}
      <AnimatePresence>
        {messages.map((msg) => (
          <motion.div
            key={msg.id} // Klucz jest niezbędny dla AnimatePresence
            className={`bubble-wrapper ${msg.sender === 'user' ? 'user' : 'amber'}`}
            // `layout` to magia - płynnie "popycha" stare dymki w górę
            layout 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="bubble">
              {msg.text}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}



