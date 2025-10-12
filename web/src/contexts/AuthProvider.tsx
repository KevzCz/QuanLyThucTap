import React, { useEffect, useState, type ReactNode } from "react";
import { apiClient, type Account } from "../utils/api";
import { AuthContext, type AuthContextType } from "./AuthContext";

interface AuthProviderProps { children: ReactNode }

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    (async () => {
      try {
        const res = (await apiClient.getCurrentUser()) as { success: boolean; account: Account };
        if (res.success) setUser(res.account);
      } catch {
        // no valid session
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = (await apiClient.login(email, password)) as { success: boolean; account: Account };
    if (res.success) setUser(res.account);
    else throw new Error("Login failed");
  };

  const logout = async () => {
    try { await apiClient.logout(); } finally { setUser(null); }
  };

  const refreshUser = async () => {
    try {
      const res = (await apiClient.getCurrentUser()) as { success: boolean; account: Account };
      if (res.success) setUser(res.account);
    } catch { setUser(null); }
  };

  const value: AuthContextType = { user, isAuthenticated, isLoading, login, logout, refreshUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
