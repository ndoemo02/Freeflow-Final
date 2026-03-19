import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import { AuthProvider } from "./state/auth";
import { useUI } from "./state/ui";
import { ToastProvider } from "./components/Toast";
import { CartProvider } from "./state/CartContext";
import Cart from "./components/Cart";
import CustomerPanel from "./pages/Panel/CustomerPanel";
import BusinessPanelNew from "./pages/BusinessPanelNew";
import BusinessClientPanel from "./pages/BusinessClientPanel";
import AdminPanel from "./pages/AdminPanel";
import DriverPanel from "./pages/DriverPanel";
import AuthModal from "./components/AuthModal";
import MenuDrawer from "./ui/MenuDrawer";
import { ThemeProvider } from "./state/ThemeContext";
import RestaurantBackground from "./components/RestaurantBackground";
import MenuViewer from "./components/MenuViewer";
import ClientPanel from "./pages/ClientPanel/ClientPanel";
import { ttsManager } from "./tts/ttsManager";
import { useEffect } from "react";

function AppContent() {
  const authOpen = useUI((s) => s.authOpen);
  const closeAuth = useUI((s) => s.closeAuth);

  useEffect(() => {
    const killTTS = () => {
      ttsManager.stop();
    };

    window.addEventListener("beforeunload", killTTS);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) killTTS();
    });

    return () => {
      killTTS();
      window.removeEventListener("beforeunload", killTTS);
      document.removeEventListener("visibilitychange", killTTS);
    };
  }, []);

  return (
    <div className="min-h-screen text-slate-100 relative overflow-hidden">
      <RestaurantBackground />

      <main className="relative z-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/business" element={<BusinessClientPanel />} />
          <Route path="/panel/customer" element={<CustomerPanel />} />
          <Route path="/panel/business" element={<BusinessPanelNew />} />
          <Route path="/panel/admin" element={<AdminPanel />} />
          <Route path="/driver" element={<DriverPanel />} />
          <Route path="/restaurants" element={<ClientPanel />} />
        </Routes>
      </main>

      <MenuDrawer />
      <Cart />
      {authOpen && <AuthModal onClose={closeAuth} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
