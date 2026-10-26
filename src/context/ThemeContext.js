import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const lightTheme = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  subtext: '#8E8E93',
  border: '#E5E5EA',
  accent: '#C29B57',
  iconBg: '#F2F2F7',
  searchBg: '#E3E3E8',
};

export const darkTheme = {
  bg: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  subtext: '#8E8E93',
  border: '#38383A',
  accent: '#C29B57',
  iconBg: '#2C2C2E',
  searchBg: '#1C1C1E',
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}