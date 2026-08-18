const parseEnvFlag = (value: unknown, fallback = false): boolean => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

export const ROUTES = {
  HOME: "/",
  UI_LAB: "/ui-lab",
  BUSINESS_READONLY: "/business",
  LEGACY_PANEL_CUSTOMER: "/legacy/panel/customer",
  PANEL_BUSINESS: "/panel/business",
  PANEL_MANAGE: "/panel/manage",
  PANEL_RESTAURANT_MANAGER: "/panel/restaurant-manager",
  PANEL_BUSINESS_KDS: "/panel/business-kds",
  QUALITY_LAB: "/panel/quality",
  PANEL_DRIVER: "/panel/driver",
  PANEL_CLIENT: "/panel/client",
  SETTINGS: "/settings",
  ORDERS: "/orders",
  PROFILE: "/profile",
} as const;

export const ROUTE_ALIASES = [
  { from: "/driver", to: ROUTES.PANEL_DRIVER },
  { from: "/client", to: ROUTES.PANEL_CLIENT },
  { from: "/restaurants", to: ROUTES.PANEL_CLIENT },
  { from: "/panel/customer", to: ROUTES.PANEL_CLIENT },
  { from: "/notifications", to: ROUTES.ORDERS },
  { from: "/history", to: ROUTES.ORDERS },
  { from: "/order-history", to: ROUTES.ORDERS },
  { from: "/panel/business-v2", to: ROUTES.PANEL_BUSINESS },
  { from: "/business-panel", to: ROUTES.PANEL_BUSINESS },
  { from: "/panel/business_kds", to: ROUTES.PANEL_BUSINESS_KDS },
  { from: "/business_kds", to: ROUTES.PANEL_BUSINESS_KDS },
] as const;

export const FEATURE_FLAGS = {
  RESERVATIONS: parseEnvFlag(import.meta.env.VITE_FEATURE_RESERVATIONS, false),
  ORDER_HISTORY: parseEnvFlag(import.meta.env.VITE_FEATURE_ORDER_HISTORY, false),
  FAVORITES: parseEnvFlag(import.meta.env.VITE_FEATURE_FAVORITES, false),
  TAXI_HISTORY: parseEnvFlag(import.meta.env.VITE_FEATURE_TAXI_HISTORY, false),
  HOTEL_HISTORY: parseEnvFlag(import.meta.env.VITE_FEATURE_HOTEL_HISTORY, false),
  PROFILE: parseEnvFlag(import.meta.env.VITE_FEATURE_PROFILE, false),
  VOICE_SETTINGS: parseEnvFlag(import.meta.env.VITE_FEATURE_VOICE_SETTINGS, false),
  NOTIFICATIONS: parseEnvFlag(import.meta.env.VITE_FEATURE_NOTIFICATIONS, false),
  FAQ: parseEnvFlag(import.meta.env.VITE_FEATURE_FAQ, false),
  CONTACT: parseEnvFlag(import.meta.env.VITE_FEATURE_CONTACT, false),
  DEV_LABS: parseEnvFlag(import.meta.env.VITE_FEATURE_DEV_LABS, false),
} as const;

const OPTIONAL_MENU_ROUTE_FLAGS: Record<string, boolean> = {
  "/reservations": FEATURE_FLAGS.RESERVATIONS,
  "/order-history": FEATURE_FLAGS.ORDER_HISTORY,
  "/favorites": FEATURE_FLAGS.FAVORITES,
  "/my-taxis": FEATURE_FLAGS.TAXI_HISTORY,
  "/my-hotels": FEATURE_FLAGS.HOTEL_HISTORY,
  "/profile": FEATURE_FLAGS.PROFILE,
  "/voice-settings": FEATURE_FLAGS.VOICE_SETTINGS,
  "/notifications": FEATURE_FLAGS.NOTIFICATIONS,
  "/faq": FEATURE_FLAGS.FAQ,
  "/contact": FEATURE_FLAGS.CONTACT,
  "/dev/api-tests": FEATURE_FLAGS.DEV_LABS,
  "/dev/analytics": FEATURE_FLAGS.DEV_LABS,
  "/dev/debug": FEATURE_FLAGS.DEV_LABS,
  "/dev/database": FEATURE_FLAGS.DEV_LABS,
  "/dev/logs": FEATURE_FLAGS.DEV_LABS,
};

export const isRouteEnabled = (route: string): boolean => {
  if (!(route in OPTIONAL_MENU_ROUTE_FLAGS)) return true;
  return OPTIONAL_MENU_ROUTE_FLAGS[route];
};
