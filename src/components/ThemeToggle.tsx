import React from 'react';
import { Moon, Sun } from 'phosphor-react';
import { useTheme } from 'next-themes';
import { motion } from 'motion/react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-xl bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 transition-colors border border-violet-500/20"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={20} weight="bold" /> : <Moon size={20} weight="bold" />}
    </motion.button>
  );
}
