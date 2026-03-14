import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartPie, faGaugeHigh, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import AddTransactionFab from "../components/AddTransactionFab";
import { Cell, Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from "recharts";
import { getMyTransactionHistory, getMyTransactions } from "../lib/api";
import MobileNav from "../components/MobileNav";
import SubscriptionControl from "../components/SubscriptionControl";
import { useAuth } from "../state/AuthContext";
import type { MonthlySpendingPoint, UserTransaction } from "../types/auth";

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
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [dataError, setDataError] = useState("");
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [chartView, setChartView] = useState<"progress" | "breakdown">("progress");
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
  const currentMonthPrefix = currentMonthStart.slice(0, 7);
  const budgetPeriodLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-CA", {
        month: "long",
        year: "numeric",
      }).format(new Date(currentMonthStart)),
    [currentMonthStart],
  );

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
  const progressPercentLabel = `${cappedBudgetUsagePercent.toFixed(1)}%`;
  const progressChartData = useMemo(
    () => [
      {
        value: cappedBudgetUsagePercent,
      },
    ],
    [cappedBudgetUsagePercent],
  );

  const currentMonthBreakdownData = useMemo(() => {
    const groupedByType = new Map<string, number>();

    for (const transaction of transactions) {
      if (!transaction.transactionDate.startsWith(currentMonthPrefix)) {
        continue;
      }

      groupedByType.set(transaction.type, (groupedByType.get(transaction.type) ?? 0) + transaction.amountCad);
    }

    return Array.from(groupedByType.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value);
  }, [currentMonthPrefix, transactions]);

  const breakdownColors = ["#0e7a74", "#188e87", "#2ca59c", "#57bdb6", "#89d4cf", "#b2e5e1"];

  async function loadDashboardData() {
    setDataError("");
    const [spendingHistoryResult, transactionsResult] = await Promise.all([getMyTransactionHistory(), getMyTransactions()]);

    if (spendingHistoryResult.ok) {
      setSpendingHistory(spendingHistoryResult.history);
    }

    if (transactionsResult.ok) {
      setTransactions(transactionsResult.transactions);
    }

    if (!spendingHistoryResult.ok || !transactionsResult.ok) {
      setDataError("Some dashboard data could not be loaded right now.");
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!isMounted) {
        return;
      }

      const [spendingHistoryResult, transactionsResult] = await Promise.all([getMyTransactionHistory(), getMyTransactions()]);

      if (!isMounted) {
        return;
      }

      if (spendingHistoryResult.ok) {
        setSpendingHistory(spendingHistoryResult.history);
      }

      if (transactionsResult.ok) {
        setTransactions(transactionsResult.transactions);
      }

      if (!spendingHistoryResult.ok || !transactionsResult.ok) {
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
      <SubscriptionControl />

      <section className="page-title-row">
        <h1 className="dashboard-title">
          <span className="dashboard-title-icon" aria-hidden="true">
            ⚜
          </span>
          <span>Coloc Calcul</span>
        </h1>
      </section>

      <section className="dashboard-card overview-card">
        <div className="overview-section budget-card budget-summary-card">
          <div className="budget-summary-header">
            <div>
              <p className="budget-summary-label">Budget period</p>
              <p className="budget-period-value">{budgetPeriodLabel}</p>
            </div>
            <button
              className="chart-toggle-button secondary-button"
              type="button"
              onClick={() => setChartView((current) => (current === "progress" ? "breakdown" : "progress"))}
              aria-label={chartView === "progress" ? "Switch to spending by type" : "Switch to budget progress"}
              title={chartView === "progress" ? "Switch to spending by type" : "Switch to budget progress"}
            >
              <FontAwesomeIcon icon={chartView === "progress" ? faChartPie : faGaugeHigh} />
            </button>
          </div>

          <div className="budget-stats-layout">
            <div className="budget-main-tile budget-summary-main">
              <p className="eyebrow">Monthly budget amount</p>

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
                  <button
                    className="budget-edit-button secondary-button"
                    type="button"
                    onClick={startEditingBudget}
                    aria-label="Edit monthly budget"
                    title="Edit monthly budget"
                  >
                    <FontAwesomeIcon icon={faPenToSquare} />
                  </button>
                </div>
              )}
            </div>

            <div className="budget-summary-progress">
              <p className="budget-progress-percent">{progressPercentLabel}</p>

              <div
                className="budget-progress-track"
                role="progressbar"
                aria-label="Budget usage"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Number(cappedBudgetUsagePercent.toFixed(1))}
              >
                <span className="budget-progress-fill" style={{ width: `${cappedBudgetUsagePercent}%` }} />
              </div>

              <div className="budget-amounts-row">
                <div className="budget-amount-block budget-amount-block-left">
                  <p className="budget-summary-label">Spent</p>
                  <p className="budget-amount-value">{formattedCurrency.format(currentMonthSpending)}</p>
                </div>
                <div className="budget-amount-block budget-amount-block-right">
                  <p className="budget-summary-label">Left</p>
                  <p className="budget-amount-value">
                    {remainingBudgetCad === null ? "Not set" : formattedCurrency.format(Math.max(remainingBudgetCad, 0))}
                  </p>
                </div>
              </div>

              {isOverBudget && remainingBudgetCad !== null ? (
                <p className="budget-progress-note">Over by {formattedCurrency.format(Math.abs(remainingBudgetCad))}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="overview-section chart-card">
          <p className="chart-card-title">{chartView === "progress" ? "Budget Progress" : "Spending by Type"}</p>

          {chartView === "progress" ? (
            currentMonthBudgetCad !== null && currentMonthBudgetCad > 0 ? (
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
                <div className="budget-progress-overlay budget-progress-overlay-progress" aria-hidden="true">
                  <p className="budget-progress-value">{cappedBudgetUsagePercent.toFixed(1)}%</p>
                  <p className="budget-progress-meta">
                    {formattedCurrency.format(currentMonthSpending)} of {formattedCurrency.format(currentMonthBudgetCad)}
                  </p>
                  {isOverBudget && remainingBudgetCad !== null ? (
                    <p className="budget-progress-note">Over by {formattedCurrency.format(Math.abs(remainingBudgetCad))}</p>
                  ) : null}
                </div>
                <div className="budget-progress-labels" aria-hidden="true">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            ) : (
              <p>Set your monthly budget to start tracking progress.</p>
            )
          ) : currentMonthBreakdownData.length > 0 ? (
            <div className="chart-wrap chart-wrap-donut">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={currentMonthBreakdownData} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="84%" paddingAngle={2}>
                    {currentMonthBreakdownData.map((entry, index) => (
                      <Cell key={entry.name} fill={breakdownColors[index % breakdownColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formattedCurrency.format(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="budget-progress-overlay budget-progress-overlay-donut" aria-hidden="true">
                <p className="budget-progress-value">{formattedCurrency.format(currentMonthSpending)}</p>
                <p className="budget-progress-meta">Spent this month</p>
              </div>
            </div>
          ) : (
            <p>No transactions in the current month to show type breakdown.</p>
          )}
        </div>
      </section>

      {dataError ? <p className="feedback error">{dataError}</p> : null}

      <AddTransactionFab />
      <MobileNav />
    </main>
  );
}
