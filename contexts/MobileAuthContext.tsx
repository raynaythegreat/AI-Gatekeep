'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MobileAuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const MobileAuthContext = createContext<MobileAuthContextType | null>(null);

export function MobileAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session storage for auth
    const auth = sessionStorage.getItem('mobile-auth');
    setIsAuthenticated(auth === 'true');
    setLoading(false);
  }, []);

  const login = async (password: string): Promise<boolean> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      sessionStorage.setItem('mobile-auth', 'true');
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem('mobile-auth');
    setIsAuthenticated(false);
  };

  return (
    <MobileAuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>
      {children}
    </MobileAuthContext.Provider>
  );
}

export const useMobileAuth = () => {
  const context = useContext(MobileAuthContext);
  if (!context) {
    throw new Error('useMobileAuth must be used within MobileAuthProvider');
  }
  return context;
};
