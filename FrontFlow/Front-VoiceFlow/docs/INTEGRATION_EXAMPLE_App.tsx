// PRZYKŁAD INTEGRACJI w App.tsx
// Skopiuj ten kod do swojego App.tsx aby włączyć komponent RestaurantBackground

import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import { AuthProvider } from "./state/auth";
import { useUI } from "./state/ui";
import { ToastProvider } from "./components/Toast";
import { CartProvider } from "./state/CartContext";
import Cart from "./components/Cart";
import CustomerPanel from "./pages/Panel/CustomerPanel";
import BusinessPanel from "./pages/Panel/BusinessPanel";
import AdminPanel from "./pages/AdminPanel";
import AuthModal from "./components/AuthModal";
import MenuDrawer from "./ui/MenuDrawer";
import { ThemeProvider } from "./state/ThemeContext";
import MenuViewer from "./components/MenuViewer";

// ✅ ZMIEŃ IMPORT Z MotionBackground NA RestaurantBackground
import RestaurantBackground from "./components/RestaurantBackground";

function AppContent() {
    const authOpen = useUI((s) => s.authOpen);
    const closeAuth = useUI((s) => s.closeAuth);

    return (
        <div className="min-h-screen text-slate-100 relative overflow-hidden">

            {/* 🌌 NOWE TŁO Z 3D KIELISZKIEM */}
            <RestaurantBackground />

            <main className="relative z-10">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/panel/customer" element={<CustomerPanel />} />
                    <Route path="/panel/business" element={<BusinessPanel />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/panel/admin" element={<AdminPanel />} />
                </Routes>
            </main>

            {/* Globalne komponenty */}
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
