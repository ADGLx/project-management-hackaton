import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

function SessionLoader() {
  return (
    <main className="auth-shell">
      <section className="auth-panel loader-panel">
        <p>Checking your session...</p>
      </section>
    </main>
  );
}

interface RouteGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: RouteGateProps) {
  const { user, isBootstrapping, isBudgetBootstrapping, hasCompletedBudgetSetup } = useAuth();

  if (isBootstrapping || isBudgetBootstrapping) {
    return <SessionLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasCompletedBudgetSetup) {
    return <Navigate to="/setup-budget" replace />;
  }

  return children;
}

export function PublicGate({ children }: RouteGateProps) {
  const { user, isBootstrapping, isBudgetBootstrapping, hasCompletedBudgetSetup } = useAuth();

  if (isBootstrapping || isBudgetBootstrapping) {
    return <SessionLoader />;
  }

  if (user) {
    return <Navigate to={hasCompletedBudgetSetup ? "/" : "/setup-budget"} replace />;
  }

  return children;
}

export function BudgetSetupGate({ children }: RouteGateProps) {
  const { user, isBootstrapping, isBudgetBootstrapping, hasCompletedBudgetSetup } = useAuth();

  if (isBootstrapping || isBudgetBootstrapping) {
    return <SessionLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (hasCompletedBudgetSetup) {
    return <Navigate to="/" replace />;
  }

  return children;
}
