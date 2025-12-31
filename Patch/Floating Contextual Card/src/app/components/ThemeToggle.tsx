import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-14 h-14 rounded-full bg-white dark:bg-gray-800 shadow-lg" />
    );
  }

  const isDark = theme === "dark";

  return (
    <motion.button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="fixed top-6 right-6 z-50 w-14 h-14 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center border border-gray-200 dark:border-gray-700"
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        {isDark ? (
          <Moon className="w-6 h-6 text-blue-400" />
        ) : (
          <Sun className="w-6 h-6 text-amber-500" />
        )}
      </motion.div>
    </motion.button>
  );
}
