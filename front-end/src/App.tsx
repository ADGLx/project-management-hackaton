import { Navigate, Route, Routes } from "react-router-dom";
import { AuthGate, BudgetSetupGate, PublicGate } from "./components/RouteGates";
import TopRightControls from "./components/TopRightControls";
import BudgetSetupPage from "./pages/BudgetSetupPage";
import HomePage from "./pages/HomePage";
import HouseholdPage from "./pages/HouseholdPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TransactionsPage from "./pages/TransactionsPage";
import UserPage from "./pages/UserPage";

export default function App() {
  return (
    <>
      <TopRightControls />
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
          path="/user"
          element={
            <AuthGate>
              <UserPage />
            </AuthGate>
          }
        />
        <Route
          path="/household"
          element={
            <AuthGate>
              <HouseholdPage />
            </AuthGate>
          }
        />
        <Route
          path="/transactions"
          element={
            <AuthGate>
              <TransactionsPage />
            </AuthGate>
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
    </>
  );
}
