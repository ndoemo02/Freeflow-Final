import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './DynamicPopups.css';

export function DynamicPopups({ messages = [], isVisible = true }) {
  if (!isVisible || !messages.length) return null;

  return (
    <div className="dynamic-popups-container">
      <AnimatePresence>
        {messages.map((message, index) => (
          <motion.div
            key={message.id || index}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            transition={{ 
              duration: 0.3, 
              delay: index * 0.1,
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            className={`dynamic-popup ${message.sender === 'Ty' ? 'user' : 'amber'}`}
            style={{
              position: 'absolute',
              bottom: `${120 + (index * 100)}px`,
              zIndex: 1000 + index
            }}
          >
            <div className="popup-content">
              <div className="popup-header">
                <div className="popup-avatar">
                  <img 
                    src="/images/amber zdjecie.jpg" 
                    alt="Amber" 
                    className="popup-avatar-img"
                  />
                </div>
                <span className="popup-sender">{message.sender || 'Amber'}</span>
              </div>
              <div className="popup-text">{message.text}</div>
              {message.actions && (
                <div className="popup-actions">
                  {message.actions.map((action, actionIndex) => (
                    <button
                      key={actionIndex}
                      className="popup-action-btn"
                      onClick={action.onClick}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
