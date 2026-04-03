import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { api } from "../api";

type User = {
  id: string;
  username: string;
  display_name: string;
  role: "admin" | "user";
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  needsSetup: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const refresh = async () => {
    try {
      const { user } = await api.auth.me();
      setUser(user);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { needs_setup } = await api.auth.status();
        setNeedsSetup(needs_setup);
        if (!needs_setup) {
          await refresh();
        }
      } catch {
        // API not reachable
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (username: string, password: string) => {
    const { user } = await api.auth.login({ username, password });
    setUser(user);
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, needsSetup, login, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
