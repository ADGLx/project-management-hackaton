import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getMyMonthlyBudgetHistory } from "../lib/api";
import { useAuth } from "../state/AuthContext";

function nameFromEmail(email?: string): string {
  if (!email) {
    return "Team Member";
  }

  const [leftSide] = email.split("@");

  return leftSide
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function monthLabelFromMonthStart(monthStart: string): string {
  const monthPart = monthStart.split("-")[1];
  const monthIndex = Number(monthPart) - 1;
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return monthStart;
  }

  return monthLabels[monthIndex];
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user, logout, profileName, budgetAmountCad, saveMonthlyBudget } = useAuth();
  const [historyBudgetByMonth, setHistoryBudgetByMonth] = useState<Record<string, number>>({});
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const displayName = user?.name || profileName || nameFromEmail(user?.email);
  const formattedBudget =
    typeof budgetAmountCad === "number"
      ? new Intl.NumberFormat("en-CA", {
          style: "currency",
          currency: "CAD",
          maximumFractionDigits: 0,
        }).format(budgetAmountCad)
      : "Not set";

  const placeholderMonthlySpending = [
    { month: "Oct", budget: 3200, spending: 2980 },
    { month: "Nov", budget: 3200, spending: 3050 },
    { month: "Dec", budget: 3400, spending: 3325 },
    { month: "Jan", budget: 3600, spending: 3510 },
    { month: "Feb", budget: 3600, spending: 3260 },
    { month: "Mar", budget: 3800, spending: 3440 },
  ];

  async function loadBudgetHistory() {
    const result = await getMyMonthlyBudgetHistory();

    if (!result.ok) {
      return;
    }

    const nextByMonth: Record<string, number> = {};

    for (const point of result.history) {
      const monthLabel = monthLabelFromMonthStart(point.monthStart);
      nextByMonth[monthLabel] = point.budgetAmountCad;
    }

    setHistoryBudgetByMonth(nextByMonth);
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!isMounted) {
        return;
      }

      const result = await getMyMonthlyBudgetHistory();

      if (!isMounted || !result.ok) {
        return;
      }

      const nextByMonth: Record<string, number> = {};

      for (const point of result.history) {
        const monthLabel = monthLabelFromMonthStart(point.monthStart);
        nextByMonth[monthLabel] = point.budgetAmountCad;
      }

      setHistoryBudgetByMonth(nextByMonth);
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const monthlyComparisonData = placeholderMonthlySpending.map((point) => ({
    ...point,
    budget: historyBudgetByMonth[point.month] ?? point.budget,
  }));

  const placeholderTransactions = [
    { id: "TXN-001", date: "2026-03-02", merchant: "Metro Grocery", category: "Food", amountCad: 126 },
    { id: "TXN-002", date: "2026-03-03", merchant: "Figma", category: "Software", amountCad: 22 },
    { id: "TXN-003", date: "2026-03-04", merchant: "Uber", category: "Transport", amountCad: 34 },
    { id: "TXN-004", date: "2026-03-06", merchant: "AWS", category: "Infrastructure", amountCad: 148 },
    { id: "TXN-005", date: "2026-03-07", merchant: "Indie Coffee", category: "Meals", amountCad: 19 },
    { id: "TXN-006", date: "2026-03-08", merchant: "Notion", category: "Software", amountCad: 14 },
    { id: "TXN-007", date: "2026-03-09", merchant: "Air Canada", category: "Travel", amountCad: 388 },
    { id: "TXN-008", date: "2026-03-10", merchant: "Slack", category: "Software", amountCad: 11 },
    { id: "TXN-009", date: "2026-03-11", merchant: "Canva", category: "Design", amountCad: 18 },
    { id: "TXN-010", date: "2026-03-12", merchant: "Staples", category: "Supplies", amountCad: 63 },
    { id: "TXN-011", date: "2026-03-13", merchant: "GitHub", category: "Software", amountCad: 10 },
    { id: "TXN-012", date: "2026-03-14", merchant: "Pizza Corner", category: "Team Meal", amountCad: 72 },
  ];

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  async function onSaveBudget() {
    setBudgetError("");

    const parsedBudget = Number(budgetDraft);

    if (!Number.isInteger(parsedBudget) || parsedBudget <= 0) {
      setBudgetError("Please enter a whole number greater than 0.");
      return;
    }

    setIsSavingBudget(true);
    const result = await saveMonthlyBudget(parsedBudget);

    if (!result.ok) {
      setBudgetError(result.message);
      setIsSavingBudget(false);
      return;
    }

    await loadBudgetHistory();
    setIsSavingBudget(false);
    setIsEditingBudget(false);
    setBudgetError("");
  }

  function startEditingBudget() {
    setBudgetDraft(typeof budgetAmountCad === "number" ? String(budgetAmountCad) : "");
    setBudgetError("");
    setIsEditingBudget(true);
  }

  function cancelEditingBudget() {
    setBudgetError("");
    setIsEditingBudget(false);
  }

  return (
    <main className="home-shell">
      <section className="home-hero dashboard-header">
        <div>
          <p className="eyebrow">Control Center</p>
          <h1>Welcome, {displayName}</h1>
          <p className="dashboard-description">Placeholder: This budgeting app helps teams track monthly spending, compare budget performance, and keep every transaction visible in one place.</p>
        </div>

        <button className="secondary-button" type="button" onClick={onLogout}>
          Logout
        </button>
      </section>

      <section className="dashboard-card budget-card">
        <p className="eyebrow">Monthly Budget</p>
        <p className="budget-value">{formattedBudget}</p>

        {isEditingBudget ? (
          <div className="budget-edit-form">
            <div className="budget-edit-row">
              <span>CAD $</span>
              <input
                className="budget-input"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={budgetDraft}
                onChange={(event) => setBudgetDraft(event.target.value)}
                disabled={isSavingBudget}
              />
            </div>

            <div className="budget-actions">
              <button type="button" onClick={onSaveBudget} disabled={isSavingBudget}>
                {isSavingBudget ? "Saving..." : "Save"}
              </button>
              <button className="secondary-button" type="button" onClick={cancelEditingBudget} disabled={isSavingBudget}>
                Cancel
              </button>
            </div>

            {budgetError ? <p className="feedback error">{budgetError}</p> : null}
          </div>
        ) : (
          <>
            <p>Placeholder: this is your configured monthly limit in CAD.</p>
            <button className="secondary-button" type="button" onClick={startEditingBudget}>
              Edit budget
            </button>
          </>
        )}
      </section>

      <section className="dashboard-card chart-card">
        <h2>Budget vs Spending (Previous Months)</h2>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyComparisonData} margin={{ top: 12, right: 18, left: 10, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.32} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(value) => `$${value}`} />
              <Tooltip formatter={(value) => `CAD $${value}`} />
              <Legend />
              <Bar dataKey="spending" name="Spending" fill="#0e7a74" radius={[6, 6, 0, 0]} />
              <Line
                type="monotone"
                dataKey="budget"
                name="Budget"
                stroke="#f08c3a"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="dashboard-card transactions-card">
        <h2>Transactions</h2>
        <div className="transactions-list" role="list">
          {placeholderTransactions.map((transaction) => (
            <article className="transaction-row" role="listitem" key={transaction.id}>
              <div>
                <p className="transaction-merchant">{transaction.merchant}</p>
                <p className="transaction-meta">
                  {transaction.id} · {transaction.category}
                </p>
              </div>

              <div className="transaction-right">
                <p>{transaction.date}</p>
                <p className="transaction-amount">CAD ${transaction.amountCad}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
