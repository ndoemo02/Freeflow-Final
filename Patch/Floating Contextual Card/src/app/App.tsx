import { FloatingCard } from "./components/FloatingCard";
import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeToggle } from "./components/ThemeToggle";

export default function App() {
  return (
    <ThemeProvider>
      <div className="size-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Main Avatar/Orb - wyższy z-index */}
        <div className="relative z-40">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 shadow-2xl flex items-center justify-center">
            <div className="text-white text-4xl">👤</div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 px-4 py-1 rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300">Main Avatar</span>
          </div>
        </div>

        {/* Floating Card - niższy z-index (z-30) */}
        <FloatingCard />
      </div>
    </ThemeProvider>
  );
}