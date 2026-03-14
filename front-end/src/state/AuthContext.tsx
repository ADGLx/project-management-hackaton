import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { API_URL, getCurrentUser, logoutRequest, sendAuthRequest } from "../lib/api";
import type { AuthContextValue } from "../types/auth";

const profileKey = "pmh_profile_name";

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthContextValue["user"]>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [profileName, setProfileName] = useState(() => localStorage.getItem(profileKey) ?? "");

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const currentUser = await getCurrentUser();

      if (isMounted) {
        setUser(currentUser);
        setIsBootstrapping(false);
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const result = await sendAuthRequest("/auth/login", { email, password });

    if (result.ok) {
      setUser(result.user);
    }

    return result;
  }

  async function register(name: string, email: string, password: string) {
    const result = await sendAuthRequest("/auth/register", { name, email, password });

    if (!result.ok) {
      return result;
    }

    setUser(result.user);
    const savedName = result.user.name || name.trim();

    if (savedName) {
      localStorage.setItem(profileKey, savedName);
      setProfileName(savedName);
    }

    return result;
  }

  async function logout() {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isBootstrapping,
      login,
      register,
      logout,
      profileName,
      apiUrl: API_URL,
    }),
    [user, isBootstrapping, profileName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
