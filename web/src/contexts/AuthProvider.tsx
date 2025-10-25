import React, { useEffect, useState, type ReactNode } from "react";
import { apiClient, type Account } from "../utils/api";
import { AuthContext, type AuthContextType } from "./AuthContext";
import { socketManager } from "../services/socketManager";

interface AuthProviderProps { children: ReactNode }

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    (async () => {
      try {
        const res = (await apiClient.getCurrentUser()) as { success: boolean; account: Account };
        if (res.success) {
          setUser(res.account);
          // Connect to Socket.IO and authenticate
          socketManager.connect();
          socketManager.authenticate({
            id: res.account.id,
            name: res.account.name,
            role: res.account.role
          });
        }
      } catch {
        // no valid session
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Setup Socket.IO connection when user changes
  useEffect(() => {
    if (user) {
      // Ensure Socket.IO is connected and authenticated
      if (!socketManager.connected) {
        socketManager.connect();
      }
      socketManager.authenticate({
        id: user.id,
        name: user.name,
        role: user.role
      });
    } else {
      // Disconnect when user logs out
      socketManager.disconnect();
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    const res = (await apiClient.login(email, password)) as { success: boolean; account: Account };
    if (res.success) {
      setUser(res.account);
      // Connect to Socket.IO after successful login
      socketManager.connect();
      socketManager.authenticate({
        id: res.account.id,
        name: res.account.name,
        role: res.account.role
      });
    } else {
      throw new Error("Login failed");
    }
  };

  const logout = async () => {
    try { 
      await apiClient.logout(); 
      socketManager.disconnect();
    } finally { 
      setUser(null); 
    }
  };

  const refreshUser = async () => {
    try {
      const res = (await apiClient.getCurrentUser()) as { success: boolean; account: Account };
      if (res.success) setUser(res.account);
    } catch { setUser(null); }
  };

  const updateUser = (updatedAccount: Account) => {
    setUser(updatedAccount);
  };

  const value: AuthContextType = { user, isAuthenticated, isLoading, login, logout, refreshUser, updateUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
