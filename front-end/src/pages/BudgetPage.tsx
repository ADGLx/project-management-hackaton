import { useMemo } from "react";
import AddTransactionFab from "../components/AddTransactionFab";
import MobileNav from "../components/MobileNav";
import PageSidePanel from "../components/PageSidePanel";
import { useAuth } from "../state/AuthContext";

export default function BudgetPage() {
  const { budgetAmountCad } = useAuth();

  const formattedBudget = useMemo(() => {
    if (typeof budgetAmountCad !== "number") {
      return "Not set";
    }

    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(budgetAmountCad);
  }, [budgetAmountCad]);

  return (
    <main className="home-shell">
      <section className="page-title-row">
        <h1 className="dashboard-title">
          <PageSidePanel />
          <span className="dashboard-title-icon" aria-hidden="true">
            🍁
          </span>
          <span>Budget</span>
        </h1>
      </section>

      <section className="dashboard-card">
        <h2>Monthly Budget</h2>
        <p className="budget-period-value">{formattedBudget}</p>
        <p>You can edit this amount from the dashboard budget card.</p>
      </section>

      <AddTransactionFab />
      <MobileNav />
    </main>
  );
}
