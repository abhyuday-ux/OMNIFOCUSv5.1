
import React, { createContext, useContext, useState, useEffect } from 'react';

export type AccentColor = 'indigo' | 'blue' | 'violet' | 'fuchsia' | 'pink' | 'rose' | 'orange' | 'amber' | 'emerald' | 'teal' | 'cyan' | 'sky';

interface ThemeContextType {
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  accent: 'cyan',
  setAccent: () => {},
});

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [accent, setAccent] = useState<AccentColor>('cyan');

  useEffect(() => {
    // Initial Load
    const saved = localStorage.getItem('ekagrazone_theme_accent');
    if (saved) setAccent(saved as AccentColor);

    // Listener for cloud sync or tab changes
    const handleStorageUpdate = () => {
        const updated = localStorage.getItem('ekagrazone_theme_accent');
        if (updated) {
            setAccent(updated as AccentColor);
        } else {
            // Reset to default if key removed (factory reset)
            setAccent('cyan');
        }
    };

    window.addEventListener('ekagrazone_sync_complete', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
        window.removeEventListener('ekagrazone_sync_complete', handleStorageUpdate);
        window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const updateAccent = (newAccent: AccentColor) => {
    setAccent(newAccent);
    localStorage.setItem('ekagrazone_theme_accent', newAccent);
  };

  return (
    <ThemeContext.Provider value={{ accent, setAccent: updateAccent }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export const ACCENT_COLORS: { id: AccentColor; label: string; colorClass: string }[] = [
    { id: 'cyan', label: 'Cyan', colorClass: 'bg-cyan-500' },
    { id: 'sky', label: 'Sky', colorClass: 'bg-sky-500' },
    { id: 'blue', label: 'Blue', colorClass: 'bg-blue-500' },
    { id: 'indigo', label: 'Indigo', colorClass: 'bg-indigo-500' },
    { id: 'violet', label: 'Violet', colorClass: 'bg-violet-500' },
    { id: 'fuchsia', label: 'Fuchsia', colorClass: 'bg-fuchsia-500' },
    { id: 'pink', label: 'Pink', colorClass: 'bg-pink-500' },
    { id: 'rose', label: 'Rose', colorClass: 'bg-rose-500' },
    { id: 'orange', label: 'Orange', colorClass: 'bg-orange-500' },
    { id: 'amber', label: 'Amber', colorClass: 'bg-amber-500' },
    { id: 'emerald', label: 'Emerald', colorClass: 'bg-emerald-500' },
    { id: 'teal', label: 'Teal', colorClass: 'bg-teal-500' },
];
