import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'v1' | 'v2';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('v1');

    useEffect(() => {
        const savedTheme = localStorage.getItem('ui-theme') as Theme;
        if (savedTheme && (savedTheme === 'v1' || savedTheme === 'v2')) {
            setThemeState(savedTheme);
        }
    }, []);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('ui-theme', newTheme);

        // Update body class for global styling
        if (newTheme === 'v2') {
            document.body.classList.add('theme-v2');
        } else {
            document.body.classList.remove('theme-v2');
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
