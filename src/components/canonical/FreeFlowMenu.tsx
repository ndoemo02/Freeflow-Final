import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
    ShoppingCart,
    Settings,
    User,
    UserPlus,
    Package,
    Bell,
    Shield,
    Palette,
    Mic,
    Eye,
    ChevronRight,
    Sparkles
} from "lucide-react";

const menuItems = [
    {
        id: "login",
        icon: <User size={20} />,
        label: "Zaloguj",
        route: "/login",
        type: "auth",
        color: "from-blue-500 to-cyan-400",
        glowColor: "shadow-blue-500/50"
    },
    {
        id: "register",
        icon: <UserPlus size={20} />,
        label: "Zarejestruj",
        route: "/register",
        type: "auth",
        color: "from-green-500 to-emerald-400",
        glowColor: "shadow-green-500/50"
    },
    {
        id: "cart",
        icon: <ShoppingCart size={20} />,
        label: "Koszyk",
        route: "/cart",
        type: "orders",
        color: "from-orange-500 to-red-400",
        glowColor: "shadow-orange-500/50",
        badge: true,
        pulse: true
    },
    {
        id: "orders",
        icon: <Package size={20} />,
        label: "Zamówienia",
        route: "/orders",
        type: "orders",
        color: "from-purple-500 to-pink-400",
        glowColor: "shadow-purple-500/50"
    },
    {
        id: "settings",
        icon: <Settings size={20} />,
        label: "Ustawienia",
        route: "/settings",
        type: "system",
        color: "from-gray-500 to-slate-400",
        glowColor: "shadow-gray-500/50"
    },
];

const subMenuItems = {
    settings: [
        { icon: <User size={16} />, label: "Profil użytkownika", desc: "Nazwa, język, preferencje" },
        { icon: <Mic size={16} />, label: "Asystent głosowy", desc: "Voice Mode, TTS/STT" },
        { icon: <Palette size={16} />, label: "Motyw / UI", desc: "Jasny/ciemny, akcent" },
        { icon: <Bell size={16} />, label: "Powiadomienia", desc: "Push, SMS, e-mail" },
        { icon: <Shield size={16} />, label: "Prywatność", desc: "Brak profilowania ❤️" },
    ],
    orders: [
        { icon: <ShoppingCart size={16} />, label: "Mój koszyk", desc: "Produkty w koszyku" },
        { icon: <Package size={16} />, label: "Historia", desc: "Poprzednie zamówienia" },
        { icon: <Eye size={16} />, label: "Status", desc: "Śledzenie zamówień" },
    ]
};

interface FreeFlowMenuProps {
    variant?: "bottom" | "side" | "advanced";
    onNavigate?: (route: string) => void;
}

export default function FreeFlowMenu({ variant = "advanced", onNavigate }: FreeFlowMenuProps) {
    const [activeItem, setActiveItem] = useState<any>(null);
    const [showSubMenu, setShowSubMenu] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    // Motion values for advanced effects
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
    const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

    const handleItemClick = (item: any) => {
        if (item.type === "system" || item.type === "orders") {
            setActiveItem(item);
            setShowSubMenu(true);
        } else {
            onNavigate?.(item.route);
            console.log(`Navigating to: ${item.route}`);
        }
    };

    const handleSubItemClick = (route: string) => {
        onNavigate?.(route);
        console.log(`Navigating to: ${route}`);
    };

    const handleMouseMove = (event: React.MouseEvent) => {
        const rect = event.currentTarget.getBoundingClientRect();
        mouseX.set(event.clientX - rect.left - rect.width / 2);
        mouseY.set(event.clientY - rect.top - rect.height / 2);
    };

    const containerVariants = {
        hidden: { opacity: 0, y: variant === "advanced" ? 100 : 80, scale: variant === "advanced" ? 0.8 : 1 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 15,
                staggerChildren: 0.1,
                delayChildren: variant === "advanced" ? 0.2 : 0
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: variant === "advanced" ? 30 : 20, scale: variant === "advanced" ? 0.8 : 1 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: variant === "advanced" ? 200 : 200,
                damping: variant === "advanced" ? 20 : 20
            }
        },
        hover: {
            scale: variant === "advanced" ? 1.15 : 1.1,
            y: variant === "advanced" ? -8 : -2,
            transition: {
                type: "spring",
                stiffness: variant === "advanced" ? 400 : 300,
                damping: 10
            }
        }
    };

    const subMenuVariants = {
        hidden: {
            opacity: 0,
            height: 0,
            y: variant === "advanced" ? -30 : -20,
            scale: variant === "advanced" ? 0.9 : 1
        },
        visible: {
            opacity: 1,
            height: "auto",
            y: 0,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: variant === "advanced" ? 25 : 30
            }
        },
        exit: {
            opacity: 0,
            height: 0,
            y: variant === "advanced" ? -30 : -20,
            scale: variant === "advanced" ? 0.9 : 1,
            transition: {
                duration: variant === "advanced" ? 0.3 : 0.2,
                ease: "easeInOut"
            }
        }
    };

    if (variant === "side") {
        return (
            <motion.div
                className="fixed left-0 top-0 h-full w-80 bg-[#0d0d1a]/95 backdrop-blur-xl text-white border-r border-fuchsia-500/20 z-50"
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
            >
                <div className="p-6">
                    <motion.h2
                        className="text-2xl font-bold bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent mb-8"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        FreeFlow
                    </motion.h2>

                    <div className="space-y-2">
                        {menuItems.map((item, index) => (
                            <motion.button
                                key={item.label}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + index * 0.1 }}
                                whileHover={{ x: 10, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleItemClick(item)}
                                className={`w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br ${item.color} transition-all duration-200 hover:bg-white/5`}
                            >
                                {item.icon}
                                <span className="font-medium text-white">{item.label}</span>
                                {item.badge && (
                                    <motion.div
                                        className="ml-auto w-2 h-2 bg-fuchsia-500 rounded-full"
                                        animate={{ scale: [1, 1.3, 1] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                    />
                                )}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="fixed bottom-0 left-0 w-full z-50">
            {/* Main Menu */}
            <motion.div
                className="bg-[#0d0d1a]/90 backdrop-blur-xl text-white flex justify-around py-4 border-t border-fuchsia-500/20"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                onMouseMove={variant === "advanced" ? handleMouseMove : undefined}
                style={variant === "advanced" ? {
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d"
                } : {}}
            >
                {menuItems.map((item, index) => (
                    <motion.div
                        key={item.id}
                        variants={itemVariants}
                        whileHover={variant === "advanced" ? "hover" : { scale: 1.1, y: -2 }}
                        onHoverStart={() => setHoveredItem(item.id)}
                        onHoverEnd={() => setHoveredItem(null)}
                        className="relative"
                    >
                        <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => handleItemClick(item)}
                            className={`flex flex-col items-center gap-2 ${variant === "advanced" ? 'p-3 rounded-2xl' : 'gap-1'} bg-gradient-to-br ${item.color} ${item.glowColor} shadow-lg transition-all duration-300 relative overflow-hidden`}
                            style={variant === "advanced" ? {
                                transformStyle: "preserve-3d"
                            } : {}}
                        >
                            {/* Pulse effect for cart */}
                            {item.pulse && variant === "advanced" && (
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-br from-fuchsia-400/20 to-purple-400/20 rounded-2xl"
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        opacity: [0.5, 0.8, 0.5]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                />
                            )}

                            {/* Badge */}
                            {item.badge && (
                                <motion.div
                                    className={`absolute -top-1 -right-1 ${variant === "advanced" ? 'w-4 h-4' : 'w-3 h-3'} bg-fuchsia-500 rounded-full flex items-center justify-center`}
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        rotate: variant === "advanced" ? [0, 180, 360] : 0
                                    }}
                                    transition={{
                                        duration: variant === "advanced" ? 1.5 : 1,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                >
                                    {variant === "advanced" && <Sparkles size={8} className="text-white" />}
                                </motion.div>
                            )}

                            {/* Hover glow effect */}
                            {variant === "advanced" && (
                                <AnimatePresence>
                                    {hoveredItem === item.id && (
                                        <motion.div
                                            className="absolute inset-0 bg-white/20 rounded-2xl"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            transition={{ duration: 0.2 }}
                                        />
                                    )}
                                </AnimatePresence>
                            )}

                            <motion.div
                                animate={variant === "advanced" && hoveredItem === item.id ? {
                                    rotate: [0, 5, -5, 0],
                                    scale: [1, 1.1, 1]
                                } : {}}
                                transition={{ duration: 0.5 }}
                            >
                                {item.icon}
                            </motion.div>

                            <motion.span
                                className={`${variant === "advanced" ? 'text-xs font-semibold' : 'text-xs font-medium'} text-white`}
                                animate={variant === "advanced" && hoveredItem === item.id ? {
                                    y: [-2, 2, -2],
                                    color: ["#ffffff", "#f0f0f0", "#ffffff"]
                                } : {}}
                                transition={{ duration: 0.3 }}
                            >
                                {item.label}
                            </motion.span>
                        </motion.button>
                    </motion.div>
                ))}
            </motion.div>

            {/* Sub Menu */}
            <AnimatePresence>
                {showSubMenu && activeItem && (
                    <motion.div
                        className={`bg-[#0d0d1a]/95 backdrop-blur-xl border-t border-fuchsia-500/30`}
                        variants={subMenuVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        style={variant === "advanced" ? {
                            transformStyle: "preserve-3d"
                        } : {}}
                    >
                        <div className={variant === "advanced" ? "p-6" : "p-4"}>
                            {variant === "advanced" && (
                                <motion.div
                                    className="flex items-center gap-3 mb-4"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <div className={`p-2 rounded-lg bg-gradient-to-br ${activeItem.color}`}>
                                        {activeItem.icon}
                                    </div>
                                    <h3 className="text-fuchsia-400 text-lg font-semibold">
                                        {activeItem.label}
                                    </h3>
                                </motion.div>
                            )}

                            {!variant.includes("advanced") && (
                                <h3 className="text-fuchsia-400 text-sm font-semibold mb-3">
                                    {activeItem.label}
                                </h3>
                            )}

                            <div className={variant === "advanced" ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-2"}>
                                {subMenuItems[activeItem.type as 'settings' | 'orders']?.map((subItem, index) => (
                                    <motion.button
                                        key={subItem.label}
                                        initial={{ opacity: 0, x: -30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: variant === "advanced" ? 0.3 + index * 0.1 : 0 }}
                                        whileHover={{
                                            scale: variant === "advanced" ? 1.02 : 1.05,
                                            x: variant === "advanced" ? 10 : 5,
                                            transition: { type: "spring", stiffness: 400 }
                                        }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleSubItemClick(subItem.route || '#')}
                                        className={`flex items-center ${variant === "advanced" ? 'gap-4 p-4' : 'gap-2 p-3'} rounded-xl bg-white/5 hover:bg-white/10 transition-all group`}
                                    >
                                        {variant === "advanced" && (
                                            <motion.div
                                                className="p-2 rounded-lg bg-fuchsia-500/20 group-hover:bg-fuchsia-500/30 transition-colors"
                                                whileHover={{ rotate: 5 }}
                                            >
                                                {subItem.icon}
                                            </motion.div>
                                        )}
                                        {!variant.includes("advanced") && subItem.icon}
                                        <div className={variant === "advanced" ? "flex-1 text-left" : "flex-1"}>
                                            <p className={`text-white ${variant === "advanced" ? 'font-medium' : 'text-sm'}`}>{subItem.label}</p>
                                            {variant === "advanced" && subItem.desc && (
                                                <p className="text-gray-400 text-sm">{subItem.desc}</p>
                                            )}
                                        </div>
                                        {variant === "advanced" && (
                                            <ChevronRight size={16} className="text-gray-400 group-hover:text-fuchsia-400 transition-colors" />
                                        )}
                                    </motion.button>
                                ))}
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowSubMenu(false)}
                                className={`${variant === "advanced" ? 'mt-6 py-3 bg-fuchsia-500/10 hover:bg-fuchsia-500/20' : 'mt-3 py-2'} w-full text-fuchsia-400 text-sm ${variant === "advanced" ? 'font-semibold' : 'font-medium'} rounded-xl transition-all`}
                                initial={variant === "advanced" ? { opacity: 0, y: 20 } : {}}
                                animate={variant === "advanced" ? { opacity: 1, y: 0 } : {}}
                                transition={variant === "advanced" ? { delay: 0.5 } : {}}
                            >
                                Zamknij
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
