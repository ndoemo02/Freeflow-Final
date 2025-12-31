import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Mic, Bell, User } from "lucide-react";

// Components
import SideMenu from "../components/SideMenu";
import VoicePanel from "../components/VoicePanel";
import AnimatedCards from "../components/AnimatedCards";

// Hooks
import { useSpeech } from "../hooks/useSpeech";
import { useOrders } from "../hooks/useOrders";

export default function Main() {
  const [currentPage, setCurrentPage] = useState("home");
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Initialize hooks
  const { 
    isListening, 
    transcript, 
    response, 
    loading, 
    error,
    toggleListening,
    sendToBackend,
    clearAll 
  } = useSpeech({
    onResult: (text) => {
      console.log("Speech result:", text);
      sendToBackend(text);
    },
    onError: (err) => {
      console.error("Speech error:", err);
    }
  });

  const { 
    orders, 
    currentOrder, 
    loading: ordersLoading,
    createOrder,
    updateOrderStatus 
  } = useOrders({
    onOrderUpdate: (updatedOrders) => {
      console.log("Orders updated:", updatedOrders);
    }
  });

  // Mock data for demonstration
  const [restaurants] = useState([
    {
      id: 1,
      name: "Pizza Palace",
      cuisine_type: "Italian",
      rating: 4.8,
      delivery_time: "25-30 min",
      image: null
    },
    {
      id: 2,
      name: "Sushi Master",
      cuisine_type: "Japanese",
      rating: 4.9,
      delivery_time: "20-25 min",
      image: null
    },
    {
      id: 3,
      name: "Burger King",
      cuisine_type: "American",
      rating: 4.5,
      delivery_time: "15-20 min",
      image: null
    }
  ]);

  const [voiceCommands] = useState([
    {
      id: 1,
      title: "Order Food",
      description: "Start a new food order"
    },
    {
      id: 2,
      title: "Check Orders",
      description: "View your current orders"
    },
    {
      id: 3,
      title: "Find Restaurants",
      description: "Search for nearby restaurants"
    }
  ]);

  // Page content based on current page
  const renderPageContent = () => {
    switch (currentPage) {
      case "voice":
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-fuchsia-900 flex items-center justify-center">
            <VoicePanel />
          </div>
        );

      case "orders":
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white mb-8">Your Orders</h1>
            <AnimatedCards 
              items={orders}
              cardType="order"
              onItemClick={(order) => {
                console.log("Order clicked:", order);
              }}
            />
          </div>
        );

      case "restaurants":
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white mb-8">Restaurants</h1>
            <AnimatedCards 
              items={restaurants}
              cardType="restaurant"
              onItemClick={(restaurant) => {
                console.log("Restaurant clicked:", restaurant);
              }}
            />
          </div>
        );

      case "voice-commands":
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white mb-8">Voice Commands</h1>
            <AnimatedCards 
              items={voiceCommands}
              cardType="voice"
              onItemClick={(command) => {
                console.log("Voice command clicked:", command);
                toggleListening();
              }}
            />
          </div>
        );

      default: // home
        return (
          <div className="p-6">
            <div className="text-center mb-12">
              <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-bold text-white mb-4"
              >
                Welcome to FreeFlow
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl text-gray-300 mb-8"
              >
                Your voice-to-action delivery system
              </motion.p>
              
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage("voice")}
                className="bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg hover:shadow-fuchsia-500/25 transition-all duration-300"
              >
                <Mic className="inline-block mr-2" />
                Start Voice Order
              </motion.button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Recent Orders</h2>
                <AnimatedCards 
                  items={orders.slice(0, 3)}
                  cardType="order"
                  onItemClick={(order) => {
                    console.log("Order clicked:", order);
                  }}
                />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Nearby Restaurants</h2>
                <AnimatedCards 
                  items={restaurants.slice(0, 3)}
                  cardType="restaurant"
                  onItemClick={(restaurant) => {
                    console.log("Restaurant clicked:", restaurant);
                  }}
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSideMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white">FreeFlow</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-gray-700 transition-colors relative">
              <Bell className="w-6 h-6 text-white" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-fuchsia-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            
            <button className="p-2 rounded-lg hover:bg-gray-700 transition-colors">
              <User className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderPageContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Side Menu */}
      <SideMenu
        isOpen={isSideMenuOpen}
        onClose={() => setIsSideMenuOpen(false)}
        onNavigate={(path) => {
          const pageMap = {
            "/": "home",
            "/orders": "orders",
            "/voice": "voice",
            "/history": "orders",
            "/notifications": "home",
            "/profile": "home",
            "/settings": "home"
          };
          setCurrentPage(pageMap[path] || "home");
        }}
        currentPage={currentPage}
      />
    </div>
  );
}


