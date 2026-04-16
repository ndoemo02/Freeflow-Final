import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useUI } from "../state/ui";
import { useAuth } from "../state/auth";
import { useCart } from "../state/CartContext";
import { getUserRole } from "../lib/menuBuilder";
import { canAccessWorkspacePanels } from "../lib/accessControl";
import { ROUTES, FEATURE_FLAGS, isRouteEnabled } from "../app/routeConfig";

const Icon = ({ name, size = 15 }) => {
  const icons = {
    home: <><path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" strokeLinecap="round" strokeLinejoin="round" /></>,
    cart: <><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
    business: <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" strokeLinecap="round" strokeLinejoin="round" />,
    kds: <path d="M9 17H5a2 2 0 0 0-2 2v0M15 17h4a2 2 0 0 1 2 2v0M12 3v14M8 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />,
    driver: <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v5m-9 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" strokeLinecap="round" strokeLinejoin="round" />,
    analytics: <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round" />,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
    login: <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></>,
    close: <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
    faq: <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" strokeLinecap="round" strokeLinejoin="round" /></>,
    history: <><polyline points="12 8 12 12 14 14" /><path d="M3.05 11a9 9 0 1 0 .5-4" strokeLinecap="round" strokeLinejoin="round" /><polyline points="3 3 3.05 11 11 11" strokeLinecap="round" strokeLinejoin="round" /></>,
    profile: <><path d="M20 21a8 8 0 1 0-16 0" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="8" r="4" /></>,
    debug: <><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" /></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      {icons[name] ?? null}
    </svg>
  );
};

function NavItem({ iconName, label, route, onClick, isDanger = false, badge, requiresAuth = false }) {
  const { user } = useAuth();
  const { openAuth, closeDrawer } = useUI();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = route
    ? (route === "/" ? location.pathname === "/" : location.pathname.startsWith(route))
    : false;

  const handleClick = () => {
    if (route) {
      if ((requiresAuth || route.startsWith("/panel")) && !user?.id) {
        openAuth();
        return;
      }
      onClick?.();
      navigate(route);
      closeDrawer();
      return;
    }

    onClick?.();
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      className="w-full flex items-center gap-3 text-left transition-colors"
      style={{
        padding: "9px 10px",
        borderRadius: "var(--radius-sm)",
        background: isActive ? "rgba(249,115,22,0.08)" : "transparent",
        color: isDanger
          ? "rgba(248,113,113,0.85)"
          : isActive
            ? "var(--ff-orange)"
            : "rgba(255,255,255,0.70)",
      }}
    >
      <span
        style={{
          color: isDanger ? "rgba(248,113,113,0.65)" : isActive ? "rgba(249,115,22,0.80)" : "rgba(255,255,255,0.28)",
          flexShrink: 0,
        }}
      >
        <Icon name={iconName} size={15} />
      </span>
      <span className="flex-1 text-[13.5px] font-medium tracking-tight">{label}</span>
      {badge > 0 && (
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(249,115,22,0.18)", color: "#f97316" }}
        >
          {badge}
        </span>
      )}
    </motion.button>
  );
}

function OpItem({ iconName, label, route, requiresAuth = false }) {
  const { user } = useAuth();
  const { openAuth, closeDrawer } = useUI();
  const navigate = useNavigate();

  const handleClick = () => {
    if ((requiresAuth || route?.startsWith("/panel")) && !user?.id) {
      openAuth();
      return;
    }
    if (route) {
      navigate(route);
      closeDrawer();
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      className="w-full flex items-center gap-2.5 text-left transition-colors"
      style={{
        padding: "7px 10px",
        borderRadius: "var(--radius-sm)",
        color: "rgba(255,255,255,0.42)",
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.20)", flexShrink: 0 }}>
        <Icon name={iconName} size={13} />
      </span>
      <span className="flex-1 text-[12.5px] font-medium">{label}</span>
    </motion.button>
  );
}

function GroupLabel({ children }) {
  return (
    <div
      className="px-2 pt-5 pb-0.5 text-[9.5px] uppercase tracking-[0.20em] font-semibold select-none"
      style={{ color: "rgba(255,255,255,0.18)" }}
    >
      {children}
    </div>
  );
}

function Hairline() {
  return <div className="my-2.5 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />;
}

export default function MenuDrawer() {
  const isOpen = useUI((s) => s.drawerOpen);
  const close = useUI((s) => s.closeDrawer);
  const openAuth = useUI((s) => s.openAuth);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { setIsOpen: setCartOpen, itemCount } = useCart();
  const userRole = getUserRole(user);
  const hasWorkspaceAccess = canAccessWorkspacePanels(user);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && isOpen && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const displayName = user?.email?.split("@")[0] || null;
  const roleLabel = userRole === "admin"
    ? "Administrator"
    : userRole === "business"
      ? "Wlasciciel"
      : "Uzytkownik";

  const handleDrawerHome = () => {
    console.log("[NAV] drawer: home");
  };

  const handleDrawerCart = () => {
    console.log("[NAV] drawer: cart");
    setCartOpen(true);
    close();
  };
  const handleDrawerClientPanel = () => {
    console.log("[NAV] drawer: client_panel");
  };
  const handleDrawerOrders = () => {
    console.log("[NAV_FIX] orders route -> /panel/client?section=orders");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.48)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={close}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu nawigacji"
            className="fixed top-0 right-0 z-50 flex flex-col"
            style={{
              width: 288,
              height: "100dvh",
              background: "rgba(8,11,20,0.96)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "-20px 0 56px rgba(0,0,0,0.60)",
            }}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center text-[11px] font-bold"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "var(--radius-sm)",
                    background: "linear-gradient(135deg, rgba(249,115,22,0.22), rgba(249,115,22,0.08))",
                    border: "1px solid rgba(249,115,22,0.24)",
                    color: "var(--ff-orange)",
                  }}
                >
                  FF
                </div>
                <span className="text-[14px] font-semibold" style={{ color: "rgba(255,255,255,0.80)" }}>
                  FreeFlow
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    navigate(`${ROUTES.PANEL_CLIENT}?section=orders`);
                    close();
                  }}
                  aria-label="Powiadomienia"
                  className="flex items-center justify-center transition-colors hover:bg-white/5"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "var(--radius-sm)",
                    color: "rgba(255,255,255,0.30)",
                  }}
                >
                  <Icon name="bell" size={14} />
                </button>
                <button
                  onClick={close}
                  aria-label="Zamknij"
                  className="flex items-center justify-center transition-colors hover:bg-white/5"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "var(--radius-sm)",
                    color: "rgba(255,255,255,0.30)",
                  }}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3" style={{ scrollbarWidth: "none" }}>
              <GroupLabel>Aplikacja</GroupLabel>
              <NavItem iconName="home" label="Home" route={ROUTES.HOME} onClick={handleDrawerHome} />
              <NavItem iconName="cart" label="Koszyk" onClick={handleDrawerCart} badge={itemCount} />
              <NavItem iconName="history" label="Moje zamowienia" route={ROUTES.ORDERS} onClick={handleDrawerOrders} />
              <NavItem iconName="profile" label="Panel Klienta" route={ROUTES.PANEL_CLIENT} onClick={handleDrawerClientPanel} />

              {hasWorkspaceAccess && (
                <>
                  <Hairline />

                  <GroupLabel>Przestrzen pracy</GroupLabel>
                  <OpItem iconName="business" label="Panel Wlasciciela" route={ROUTES.PANEL_BUSINESS} requiresAuth />
                  <OpItem iconName="kds" label="Zarzadzanie restauracja" route={ROUTES.PANEL_MANAGE} requiresAuth />
                  <OpItem iconName="kds" label="Kitchen Display" route={ROUTES.PANEL_BUSINESS_KDS} requiresAuth />
                  <OpItem iconName="analytics" label="Analityka" route={ROUTES.PANEL_ADMIN} requiresAuth />

                  {userRole === "admin" && FEATURE_FLAGS.DEV_LABS && (
                    <OpItem iconName="debug" label="Debug Tools" route="/dev/debug" />
                  )}

                  <Hairline />
                </>
              )}

              <GroupLabel>Ustawienia</GroupLabel>
              <NavItem iconName="settings" label="Ustawienia" route={ROUTES.SETTINGS} />
              {isRouteEnabled("/order-history") && (
                <NavItem iconName="history" label="Historia zamowien" route="/order-history" />
              )}
              {isRouteEnabled("/faq") && (
                <NavItem iconName="faq" label="FAQ" route="/faq" />
              )}

              <Hairline />

              {user?.id ? (
                <NavItem
                  iconName="logout"
                  label="Wyloguj sie"
                  isDanger
                  onClick={() => {
                    signOut();
                    close();
                  }}
                />
              ) : (
                <NavItem
                  iconName="login"
                  label="Zaloguj sie"
                  onClick={() => openAuth()}
                />
              )}
            </div>

            {user?.id && (
              <div
                className="shrink-0 px-4 py-3 flex items-center gap-2.5"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div
                  className="flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "var(--radius-pill)",
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "rgba(255,255,255,0.60)",
                  }}
                >
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium truncate" style={{ color: "rgba(255,255,255,0.65)" }}>
                    {displayName || user.email}
                  </p>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>
                    {roleLabel}
                  </p>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
