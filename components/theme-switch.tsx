'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <button
        className={cn(
          "relative flex items-center justify-center w-9 h-9 rounded-sm border border-border transition-all duration-300",
          className
        )}
        aria-label="Toggle theme"
      >
        <span className="w-4 h-4" />
      </button>
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => {
        document.documentElement.classList.add('theme-transition')
        setTheme(isDark ? 'light' : 'dark')
        setTimeout(() => {
          document.documentElement.classList.remove('theme-transition')
        }, 350)
      }}
      className={cn(
        "relative flex items-center justify-center w-9 h-9 rounded-sm border border-border transition-all duration-300 hover:border-foreground/30 group",
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'The Parchment' : 'The Speakeasy'}
    >
      {/* Sun — serif 'S' glyph for Parchment */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "w-4 h-4 transition-all duration-300",
          isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
        )}
        style={{ position: 'absolute' }}
      >
        {/* Sun circle */}
        <circle cx="12" cy="12" r="4" />
        {/* Sun rays — serif style with small terminals */}
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
        <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
        <line x1="2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="22" y2="12" />
        <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
        <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
      </svg>

      {/* Moon — elegant crescent */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "w-4 h-4 transition-all duration-300",
          isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
        )}
        style={{ position: 'absolute' }}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        {/* Small star accent */}
        <circle cx="19" cy="5" r="0.5" fill="currentColor" />
      </svg>
    </button>
  )
}
