import { createContext } from "react";
import type { Account } from "../utils/api";

export type Role = "phong-dao-tao" | "ban-chu-nhiem" | "giang-vien" | "sinh-vien";

export interface AuthContextType {
  user: Account | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updatedAccount: Account) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
