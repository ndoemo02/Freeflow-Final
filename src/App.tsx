import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import { AuthProvider } from "./state/auth";
import { useUI } from "./state/ui";
import { ToastProvider } from "./components/Toast";
import { CartProvider } from "./state/CartContext";
import Cart from "./components/Cart";
import CustomerPanel from "./pages/Panel/CustomerPanel";
import BusinessPanel from "./pages/Panel/BusinessPanel";
import BusinessPanelNew from "./pages/BusinessPanelNew";
import BusinessClientPanel from "./pages/BusinessClientPanel";
import AdminPanel from "./pages/AdminPanel";
import DriverPanel from "./pages/DriverPanel";
import UiLab from "./pages/UiLab";
import AuthModal from "./components/AuthModal";
import MenuDrawer from "./ui/MenuDrawer";
import { ThemeProvider } from "./state/ThemeContext";
import RestaurantBackground from "./components/RestaurantBackground";
import ClientPanel from "./pages/ClientPanel/ClientPanel";
import DevOverlay from "./components/DevOverlay";
import { ttsManager } from "./tts/ttsManager";
import { useEffect } from "react";
import { ROUTES, ROUTE_ALIASES } from "./app/routeConfig";

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
          <Route path={ROUTES.HOME} element={<Home />} />
          <Route path={ROUTES.UI_LAB} element={<UiLab />} />
          <Route path={ROUTES.BUSINESS_READONLY} element={<BusinessClientPanel />} />
          <Route path={ROUTES.LEGACY_PANEL_CUSTOMER} element={<CustomerPanel />} />
          <Route path={ROUTES.PANEL_BUSINESS} element={<BusinessPanel />} />
          <Route path={ROUTES.PANEL_BUSINESS_KDS} element={<BusinessPanelNew />} />
          <Route path={ROUTES.PANEL_ADMIN} element={<AdminPanel />} />
          <Route path={ROUTES.PANEL_DRIVER} element={<DriverPanel />} />
          <Route path={ROUTES.PANEL_CLIENT} element={<ClientPanel />} />
          {ROUTE_ALIASES.map((alias) => (
            <Route key={alias.from} path={alias.from} element={<Navigate to={alias.to} replace />} />
          ))}
          <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
        </Routes>
      </main>

      <MenuDrawer />
      <Cart />
      {authOpen && <AuthModal onClose={closeAuth} />}
      <DevOverlay />
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
