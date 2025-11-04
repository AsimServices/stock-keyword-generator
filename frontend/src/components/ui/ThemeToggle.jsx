import React from 'react'
import { useTheme } from '../../context/ThemeContext'
import { Sun, Moon } from 'lucide-react'

const ThemeToggle = ({ className = "" }) => {
  const { theme, toggleTheme, isDark } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-5 h-5">
        <Sun 
          className={`absolute inset-0 w-5 h-5 text-yellow-500 transition-all duration-300 ${
            isDark ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'
          }`}
        />
        <Moon 
          className={`absolute inset-0 w-5 h-5 text-blue-500 transition-all duration-300 ${
            isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'
          }`}
        />
      </div>
    </button>
  )
}

export default ThemeToggle
