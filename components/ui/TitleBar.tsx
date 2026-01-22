"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    api?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
    };
  }
}

export default function TitleBar() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains("dark");
      setIsDark(isDarkMode);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const handleMinimize = () => {
    if (typeof window !== "undefined" && window.api) {
      window.api.minimize();
    }
  };

  const handleMaximize = () => {
    if (typeof window !== "undefined" && window.api) {
      window.api.maximize();
    }
  };

  const handleClose = () => {
    if (typeof window !== "undefined" && window.api) {
      window.api.close();
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-4 py-2 border-b border-gold-500/10 bg-surface-100 dark:bg-surface-900">
      <div className="flex items-center gap-3">
        <svg
          className="w-5 h-5"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFC107" />
              <stop offset="100%" stopColor="#FFB300" />
            </linearGradient>
          </defs>
          <g>
            <ellipse cx="32" cy="30" rx="18" ry="14" stroke="currentColor" strokeWidth="2.5" fill="none" />
            <circle cx="24" cy="28" r="6" fill="url(#goldGradient)" />
            <circle cx="40" cy="28" r="6" fill="url(#goldGradient)" />
            <circle cx="24" cy="28" r="2.5" fill="currentColor" />
            <circle cx="40" cy="28" r="2.5" fill="currentColor" />
            <circle cx="25" cy="26" r="1" fill="url(#goldGradient)" />
            <circle cx="39" cy="26" r="1" fill="url(#goldGradient)" />
          </g>
        </svg>
        <span className="text-sm font-semibold text-foreground">OS Athena</span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={handleMinimize}
          className="w-9 h-9 rounded-md hover:bg-surface-200 dark:hover:bg-surface-700 flex items-center justify-center transition-colors"
          title="Minimize"
          aria-label="Minimize"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="10" width="16" height="2" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="w-9 h-9 rounded-md hover:bg-surface-200 dark:hover:bg-surface-700 flex items-center justify-center transition-colors"
          title="Maximize"
          aria-label="Maximize"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="1" />
          </svg>
        </button>
        <button
          onClick={handleClose}
          className="w-9 h-9 rounded-md hover:bg-red-500/20 dark:hover:bg-red-500/30 flex items-center justify-center transition-colors"
          title="Close"
          aria-label="Close"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
