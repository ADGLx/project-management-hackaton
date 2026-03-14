import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare, faChartPie, faGaugeHigh, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import AddTransactionFab from "../components/AddTransactionFab";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { getMyTransactionHistory, getMyTransactions } from "../lib/api";
import MobileNav from "../components/MobileNav";
import PageSidePanel from "../components/PageSidePanel";
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

function hashString(input: string): number {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
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
    () => {
      const [year, month] = currentMonthStart.split("-");
      const budgetPeriodDate = new Date(Number(year), Number(month) - 1, 1);

      return new Intl.DateTimeFormat("en-CA", {
        month: "long",
        year: "numeric",
      }).format(budgetPeriodDate);
    },
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
  const topSpendingTypes = currentMonthBreakdownData.slice(0, 4);

  const chartCategoryColors = [
    "var(--chart-category-1)",
    "var(--chart-category-2)",
    "var(--chart-category-3)",
    "var(--chart-category-4)",
    "var(--chart-category-5)",
    "var(--chart-category-6)",
    "var(--chart-category-7)",
    "var(--chart-category-8)",
    "var(--chart-category-9)",
    "var(--chart-category-10)",
  ];

  const breakdownColorByType = useMemo(
    () =>
      new Map(
        currentMonthBreakdownData.map((entry) => {
          const colorIndex = hashString(entry.name) % chartCategoryColors.length;
          return [entry.name, chartCategoryColors[colorIndex]];
        }),
      ),
    [currentMonthBreakdownData],
  );

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
      <section className="page-title-row">
        <h1 className="dashboard-title">
          <PageSidePanel />
          <span className="dashboard-title-icon" aria-hidden="true">
            🍁
          </span>
          <span>Coloc Calcul</span>
        </h1>
      </section>

      <section className="dashboard-card overview-card">
        <div className="overview-section budget-card budget-summary-card">
          <div className="budget-summary-header">
            <div>
              <div className="budget-period-line budget-period-line-labels">
                <span className="budget-summary-label">Budget for</span>
                <span className="budget-period-separator" aria-hidden="true" />
                <span className="budget-summary-label">Amount</span>
              </div>
              <div className="budget-period-line budget-period-line-values">
                <span className="budget-period-value">{budgetPeriodLabel}</span>
                <span className="budget-period-separator" aria-hidden="true" />
                <span className="budget-period-amount-row">
                  <span className="budget-period-amount">{formattedBudget}</span>
                  {!isEditingBudget ? (
                    <button
                      className="budget-edit-button secondary-button"
                      type="button"
                      onClick={startEditingBudget}
                      aria-label="Edit monthly budget"
                      title="Edit monthly budget"
                    >
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                  ) : null}
                </span>
              </div>

              {isEditingBudget ? (
                <div className="budget-header-edit-form budget-edit-form">
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
              ) : null}
            </div>
            <button
              className="chart-toggle-button secondary-button"
              type="button"
              onClick={() => setChartView((current) => (current === "progress" ? "breakdown" : "progress"))}
              aria-label={chartView === "progress" ? "Switch to spending breakdown chart" : "Switch to top spending types"}
              title={chartView === "progress" ? "Switch to spending breakdown chart" : "Switch to top spending types"}
            >
              <FontAwesomeIcon icon={chartView === "progress" ? faChartPie : faGaugeHigh} />
            </button>
          </div>

          <div className="budget-stats-layout">
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
                  <p className={`budget-amount-value ${remainingBudgetCad !== null && remainingBudgetCad > 0 ? "amount-positive" : ""}`}>
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
          <div className="chart-card-toolbar">
            <p className="chart-card-title">{chartView === "progress" ? "Top Spending Categories" : "Spending by Category"}</p>
            <Link
              className="chart-details-link"
              to="/transactions"
              aria-label="See details in transactions"
              title="See details in transactions"
            >
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            </Link>
          </div>

          {chartView === "progress" ? (
            topSpendingTypes.length > 0 ? (
              <div className="top-spending-grid" role="list">
                {topSpendingTypes.map((entry, index) => {
                  const sharePercent = currentMonthSpending > 0 ? (entry.value / currentMonthSpending) * 100 : 0;

                  return (
                    <article className="top-spending-tile" role="listitem" key={entry.name}>
                      <div className="top-spending-head">
                        <p className="top-spending-rank">#{index + 1}</p>
                        <p className="top-spending-share">{sharePercent.toFixed(1)}%</p>
                      </div>
                      <p className="top-spending-type">{entry.name}</p>
                      <p className="top-spending-amount">{formattedCurrency.format(entry.value)}</p>
                      <div className="top-spending-progress" aria-hidden="true">
                        <span className="top-spending-progress-fill" style={{ width: `${Math.min(sharePercent, 100)}%` }} />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p>No transactions in the current month to show top spending types.</p>
            )
          ) : currentMonthBreakdownData.length > 0 ? (
            <div className="chart-wrap chart-wrap-donut">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={currentMonthBreakdownData} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="84%" paddingAngle={2}>
                    {currentMonthBreakdownData.map((entry) => (
                      <Cell key={entry.name} fill={breakdownColorByType.get(entry.name) ?? "var(--chart-category-1)"} />
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
