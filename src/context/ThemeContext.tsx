import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('app_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.isDarkMode === 'boolean') return parsed.isDarkMode;
      } catch {}
    }
    // fallback: prefers-color-scheme
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    // persist in localStorage
    const saved = localStorage.getItem('app_settings');
    let settings = {};
    if (saved) {
      try { settings = JSON.parse(saved); } catch {}
    }
    localStorage.setItem('app_settings', JSON.stringify({ ...settings, isDarkMode }));
  }, [isDarkMode]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
