import { useEffect, useMemo, useState } from "react";
import AddTransactionFab from "../components/AddTransactionFab";
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { getMyTransactionHistory } from "../lib/api";
import MobileNav from "../components/MobileNav";
import { useAuth } from "../state/AuthContext";
import type { MonthlySpendingPoint } from "../types/auth";

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

function currentMonthStartDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export default function HomePage() {
  const { user, profileName, budgetAmountCad, saveMonthlyBudget } = useAuth();
  const [spendingHistory, setSpendingHistory] = useState<MonthlySpendingPoint[]>([]);
  const [dataError, setDataError] = useState("");
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

  const formattedCurrency = useMemo(
    () =>
      new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 2,
      }),
    [],
  );

  const currentMonthStart = useMemo(() => currentMonthStartDateString(), []);

  const spendingByMonth = useMemo(() => {
    const byMonth = new Map<string, number>();

    for (const point of spendingHistory) {
      byMonth.set(point.monthStart, point.spendingAmountCad);
    }

    return byMonth;
  }, [spendingHistory]);

  const currentMonthSpending = spendingByMonth.get(currentMonthStart) ?? 0;
  const currentMonthBudgetCad = typeof budgetAmountCad === "number" ? budgetAmountCad : null;

  const remainingBudgetCad = currentMonthBudgetCad === null ? null : currentMonthBudgetCad - currentMonthSpending;
  const budgetUsagePercent =
    currentMonthBudgetCad !== null && currentMonthBudgetCad > 0 ? (currentMonthSpending / currentMonthBudgetCad) * 100 : null;
  const cappedBudgetUsagePercent = budgetUsagePercent === null ? 0 : Math.min(budgetUsagePercent, 100);
  const isOverBudget = remainingBudgetCad !== null && remainingBudgetCad < 0;
  const currentStandingLabel =
    remainingBudgetCad === null ? "Budget not set" : remainingBudgetCad >= 0 ? "On track" : "Over budget";
  const progressChartData = useMemo(
    () => [
      {
        value: cappedBudgetUsagePercent,
      },
    ],
    [cappedBudgetUsagePercent],
  );

  async function loadDashboardData() {
    setDataError("");
    const spendingHistoryResult = await getMyTransactionHistory();

    if (spendingHistoryResult.ok) {
      setSpendingHistory(spendingHistoryResult.history);
    }

    if (!spendingHistoryResult.ok) {
      setDataError("Some dashboard data could not be loaded right now.");
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!isMounted) {
        return;
      }

      const spendingHistoryResult = await getMyTransactionHistory();

      if (!isMounted) {
        return;
      }

      if (spendingHistoryResult.ok) {
        setSpendingHistory(spendingHistoryResult.history);
      }

      if (!spendingHistoryResult.ok) {
        setDataError("Some dashboard data could not be loaded right now.");
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

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

    await loadDashboardData();
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
      <section className="page-title-row">
        <h1>Welcome, {displayName}</h1>
      </section>

      <section className="dashboard-card overview-card">
        <div className="overview-section chart-card">
          {currentMonthBudgetCad !== null && currentMonthBudgetCad > 0 ? (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={progressChartData}
                  startAngle={180}
                  endAngle={0}
                  cx="50%"
                  cy="72%"
                  innerRadius="75%"
                  outerRadius="98%"
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
                  <RadialBar dataKey="value" cornerRadius={10} fill="#0e7a74" background={{ fill: "rgba(77, 104, 116, 0.2)" }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="budget-progress-overlay" aria-hidden="true">
                <p className="budget-progress-value">{cappedBudgetUsagePercent.toFixed(1)}%</p>
                <p className="budget-progress-meta">
                  {formattedCurrency.format(currentMonthSpending)} of {formattedCurrency.format(currentMonthBudgetCad)}
                </p>
                {isOverBudget && remainingBudgetCad !== null ? (
                  <p className="budget-progress-note">Over by {formattedCurrency.format(Math.abs(remainingBudgetCad))}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <p>Set your monthly budget to start tracking progress.</p>
          )}
        </div>
        <div className="overview-section budget-card">
          <div className="budget-stats-layout">
            <div className="budget-main-tile">
              <p className="eyebrow">Monthly Budget</p>

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
                <div className="budget-value-row">
                  <p className="budget-value">{formattedBudget}</p>
                  <button className="budget-edit-button secondary-button" type="button" onClick={startEditingBudget}>
                    Edit Budget
                  </button>
                </div>
              )}
            </div>

            <div className="current-month-stats">
              <p className="current-month-title">Current Month</p>
              <div className="current-month-grid">
                <div className="current-month-item">
                  <p className="current-month-label">Standing</p>
                  <p className="current-month-value">{currentStandingLabel}</p>
                </div>
                <div className="current-month-item">
                  <p className="current-month-label">Used (%)</p>
                  <p className="current-month-value">{budgetUsagePercent === null ? "--" : `${budgetUsagePercent.toFixed(1)}%`}</p>
                </div>
                <div className="current-month-item">
                  <p className="current-month-label">Spent</p>
                  <p className="current-month-value">{formattedCurrency.format(currentMonthSpending)}</p>
                </div>
                <div className="current-month-item">
                  <p className="current-month-label">Remaining</p>
                  <p className="current-month-value">
                    {remainingBudgetCad === null ? "--" : formattedCurrency.format(Math.abs(remainingBudgetCad))}
                    {remainingBudgetCad !== null && remainingBudgetCad < 0 ? " over" : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {dataError ? <p className="feedback error">{dataError}</p> : null}

      <AddTransactionFab />
      <MobileNav />
    </main>
  );
}
