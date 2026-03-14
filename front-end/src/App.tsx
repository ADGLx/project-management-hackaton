import { Navigate, Route, Routes } from "react-router-dom";
import { AuthGate, BudgetSetupGate, PublicGate } from "./components/RouteGates";
import BudgetSetupPage from "./pages/BudgetSetupPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AuthGate>
            <HomePage />
          </AuthGate>
        }
      />
      <Route
        path="/setup-budget"
        element={
          <BudgetSetupGate>
            <BudgetSetupPage />
          </BudgetSetupGate>
        }
      />
      <Route
        path="/login"
        element={
          <PublicGate>
            <LoginPage />
          </PublicGate>
        }
      />
      <Route
        path="/register"
        element={
          <PublicGate>
            <RegisterPage />
          </PublicGate>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
