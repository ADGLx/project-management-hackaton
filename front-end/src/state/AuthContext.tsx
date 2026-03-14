import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { API_URL, getCurrentUser, getMyMonthlyBudget, logoutRequest, saveMyMonthlyBudget, sendAuthRequest, updateMySubscription } from "../lib/api";
import type { AuthContextValue } from "../types/auth";

const profileKey = "pmh_profile_name";

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthContextValue["user"]>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isBudgetBootstrapping, setIsBudgetBootstrapping] = useState(false);
  const [budgetAmountCad, setBudgetAmountCad] = useState<number | null>(null);
  const [profileName, setProfileName] = useState(() => localStorage.getItem(profileKey) ?? "");

  async function refreshBudgetForCurrentUser() {
    setIsBudgetBootstrapping(true);
    const budgetResult = await getMyMonthlyBudget();

    if (budgetResult.ok) {
      setBudgetAmountCad(budgetResult.budgetAmountCad);
    } else {
      setBudgetAmountCad(null);
    }

    setIsBudgetBootstrapping(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const currentUser = await getCurrentUser();

      if (!isMounted) {
        return;
      }

      setUser(currentUser);

      if (!currentUser) {
        setBudgetAmountCad(null);
        setIsBudgetBootstrapping(false);
        setIsBootstrapping(false);
        return;
      }

      setIsBudgetBootstrapping(true);
      const budgetResult = await getMyMonthlyBudget();

      if (!isMounted) {
        return;
      }

      if (budgetResult.ok) {
        setBudgetAmountCad(budgetResult.budgetAmountCad);
      } else {
        setBudgetAmountCad(null);
      }

      setIsBudgetBootstrapping(false);
      setIsBootstrapping(false);
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
      await refreshBudgetForCurrentUser();
    }

    return result;
  }

  async function register(name: string, email: string, password: string) {
    const result = await sendAuthRequest("/auth/register", { name, email, password });

    if (!result.ok) {
      return result;
    }

    setUser(result.user);
    await refreshBudgetForCurrentUser();
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
      setBudgetAmountCad(null);
      setIsBudgetBootstrapping(false);
    }
  }

  async function refreshBudget() {
    if (!user) {
      setBudgetAmountCad(null);
      setIsBudgetBootstrapping(false);
      return;
    }

    await refreshBudgetForCurrentUser();
  }

  async function saveMonthlyBudget(budget: number) {
    const result = await saveMyMonthlyBudget(budget);

    if (result.ok) {
      setBudgetAmountCad(result.budgetAmountCad);
    }

    return result;
  }

  async function updateSubscriptionStatus(subscribers: boolean) {
    const result = await updateMySubscription(subscribers);

    if (result.ok) {
      setUser(result.user);
    }

    return result;
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isBootstrapping,
      isBudgetBootstrapping,
      budgetAmountCad,
      hasCompletedBudgetSetup: typeof budgetAmountCad === "number" && budgetAmountCad > 0,
      login,
      register,
      refreshBudget,
      saveMonthlyBudget,
      updateSubscriptionStatus,
      logout,
      profileName,
      apiUrl: API_URL,
    }),
    [user, isBootstrapping, isBudgetBootstrapping, budgetAmountCad, profileName],
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
