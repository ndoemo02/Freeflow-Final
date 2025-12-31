import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ResultCarousel from './ResultCarousel';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  restaurants?: Array<{ id: string; name: string; cuisine_type?: string; city?: string }>;
  locationRestaurants?: Array<{ id: string; name: string; cuisine_type?: string; city?: string }>;
  menuItems?: Array<{ id: string; name: string; price_pln: number; category?: string }>;
}

interface ChatBubblesProps {
  userMessage?: string;
  amberResponse?: string;
  restaurants?: Array<{ id: string; name: string; cuisine_type?: string; city?: string }>;
  menuItems?: Array<{ id: string; name: string; price_pln: number; category?: string }>;
  onRestaurantSelect?: (restaurant: any) => void;
  onMenuItemSelect?: (item: any) => void;
}

export default function ChatBubbles({
  userMessage,
  amberResponse,
  restaurants,
  menuItems,
  onRestaurantSelect,
  onMenuItemSelect
}: ChatBubblesProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string | null>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add user message
  useEffect(() => {
    if (userMessage?.trim()) {
      const newMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        text: userMessage,
        isUser: true,
        timestamp: new Date(),
      };
      setMessages(prev => {
        if (lastMessageRef.current === newMessage.text) return prev;
        lastMessageRef.current = newMessage.text;
        return [...prev, newMessage];
      });
    }
  }, [userMessage]);

  // Add Amber response
  useEffect(() => {
    if (amberResponse?.trim()) {
      const newMessage: ChatMessage = {
        id: `amber-${Date.now()}`,
        text: amberResponse,
        isUser: false,
        timestamp: new Date(),
        restaurants: restaurants,
        locationRestaurants: restaurants,
        menuItems: menuItems,
      };
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];

        // Check for duplicates or updates
        if (lastMsg && lastMsg.text === newMessage.text && !lastMsg.isUser) {
          const gainedRestaurants = (!lastMsg.restaurants?.length && newMessage.restaurants?.length);
          const gainedMenu = (!lastMsg.menuItems?.length && newMessage.menuItems?.length);

          if (gainedRestaurants || gainedMenu) {
            // Update existing message with new data
            return [...prev.slice(0, -1), newMessage];
          }
          return prev;
        }

        lastMessageRef.current = newMessage.text;
        return [...prev, newMessage];
      });
    }
  }, [amberResponse, restaurants, menuItems]);

  return (
    <div className="fixed top-[100px] bottom-[120px] left-0 right-0 md:left-1/2 md:-translate-x-1/2 
                    w-full max-w-[1000px] px-4 md:px-6 pointer-events-none z-30 flex justify-center">
      <div className="w-full h-full overflow-y-auto overflow-x-hidden flex flex-col gap-6 pb-4
                      scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <ChatBubble
              key={`${message.id}-${index}`}
              message={message}
              index={index}
              onRestaurantSelect={onRestaurantSelect}
              onMenuItemSelect={onMenuItemSelect}
            />
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-4" />
      </div>
    </div>
  );
}

interface ChatBubbleProps {
  message: ChatMessage;
  index: number;
  onRestaurantSelect?: (restaurant: any) => void;
  onMenuItemSelect?: (item: any) => void;
}

function ChatBubble({ message, index, onRestaurantSelect, onMenuItemSelect }: ChatBubbleProps) {
  const isUser = message.isUser;
  const restaurants = message.locationRestaurants || message.restaurants;
  const menuItems = message.menuItems || (message as any).menu || [];
  const hasRestaurants = Array.isArray(restaurants) && restaurants.length > 0;
  const hasMenu = Array.isArray(menuItems) && menuItems.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex w-full flex-col pointer-events-auto ${isUser ? 'items-end' : 'items-start'}`}
    >
      {/* Text Bubble */}
      <div className={`
        relative max-w-[85%] md:max-w-[70%] p-4 md:p-5 backdrop-blur-xl transition-all duration-300
        ${isUser
          ? 'bg-white text-black rounded-2xl rounded-tr-sm shadow-lg shadow-black/5'
          : 'bg-[#1a1a2e]/90 text-white rounded-2xl rounded-tl-sm border border-white/10 shadow-lg'}
      `}>
        {message.text && (
          <div className="text-base leading-relaxed whitespace-pre-wrap font-medium">
            {message.text}
          </div>
        )}
      </div>

      {/* Cards (Carousel) - Rendered distinctly from the bubble */}
      {hasRestaurants && (
        <div className="w-full mt-2 pl-2">
          <ResultCarousel
            items={restaurants}
            type="restaurant"
            onItemClick={(restaurant) => onRestaurantSelect?.(restaurant)}
          />
        </div>
      )}

      {!isUser && hasMenu && (
        <div className="w-full mt-2 pl-2">
          <ResultCarousel
            items={menuItems}
            type="menu"
            onItemClick={(item) => onMenuItemSelect?.(item)}
          />
        </div>
      )}
    </motion.div>
  );
}
