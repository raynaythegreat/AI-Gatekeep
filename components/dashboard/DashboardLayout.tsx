"use client";

import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const mobileNavItems = [
  {
    id: "mobile",
    label: "Mobile",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <path d="M12 18h.01" />
      </svg>
    )
  },
  {
    id: "repos",
    label: "Repos",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
      </svg>
    ),
  },
  {
    id: "deploy",
    label: "Deploy",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    id: "history",
    label: "History",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    )
  },
];

export default function DashboardLayout({ children, activeTab, onTabChange }: DashboardLayoutProps) {
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
    <div className="flex h-screen supports-[height:100dvh]:h-dvh bg-surface-50 dark:bg-black">
      
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />

      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Window Controls Bar (Desktop Only) - Always visible */}
        <div className="hidden md:flex items-center justify-end px-4 py-2 bg-background border-b-2 border-border shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={handleMinimize}
              className="w-8 h-8 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 flex items-center justify-center transition-all duration-150 text-muted-foreground hover:text-foreground active:scale-95"
              title="Minimize"
              aria-label="Minimize"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="10" width="16" height="2" />
              </svg>
            </button>
            <button
              onClick={handleMaximize}
              className="w-8 h-8 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 flex items-center justify-center transition-all duration-150 text-muted-foreground hover:text-foreground active:scale-95"
              title="Maximize"
              aria-label="Maximize"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="1" />
              </svg>
            </button>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-md hover:bg-red-500/20 dark:hover:bg-red-500/30 flex items-center justify-center transition-all duration-150 text-foreground hover:text-red-500 active:scale-95"
              title="Close"
              aria-label="Close"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Header - Only for non-chat pages */}
        {activeTab !== 'chat' && (
          <Header activeTab={activeTab} />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 bg-surface-50 dark:bg-black">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav
          id="mobile-nav"
          className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t-2 border-border z-50 pb-[env(safe-area-inset-bottom)]"
        >
          <div className="flex items-center justify-between h-16 px-4">

            {/* Navigation Items */}
            <div className="flex items-center gap-2 flex-1">
              {mobileNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={"flex flex-col items-center justify-center flex-1 h-full py-1 px-1 rounded-lg transition-all duration-150 " + (
                    activeTab === item.id
                      ? "text-blue-500 bg-blue-500/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-200 dark:hover:bg-surface-800"
                      )}
                >
                  <span className={activeTab === item.id ? "text-blue-500" : ""}>
                    {item.icon}
                  </span>
                  <span className="text-[10px] mt-1 font-bold">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Window Controls - Always visible on mobile */}
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={handleMinimize}
                className="w-8 h-8 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 flex items-center justify-center transition-all duration-150 text-muted-foreground hover:text-foreground active:scale-95"
                title="Minimize"
                aria-label="Minimize"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="10" width="16" height="2" />
                </svg>
              </button>
              <button
                onClick={handleMaximize}
                className="w-8 h-8 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 flex items-center justify-center transition-all duration-150 text-muted-foreground hover:text-foreground active:scale-95"
                title="Maximize"
                aria-label="Maximize"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="1" />
                </svg>
              </button>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-md hover:bg-red-500/20 dark:hover:bg-red-500/30 flex items-center justify-center transition-all duration-150 text-foreground hover:text-red-500 active:scale-95"
                title="Close"
                aria-label="Close"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
