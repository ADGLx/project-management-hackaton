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
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <SessionLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function PublicGate({ children }: RouteGateProps) {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <SessionLoader />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
