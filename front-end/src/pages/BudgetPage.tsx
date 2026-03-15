import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import AddTransactionFab from "../components/AddTransactionFab";
import MobileNav from "../components/MobileNav";
import PageSidePanel from "../components/PageSidePanel";
import { getMyTransactionHistory } from "../lib/api";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "../state/AuthContext";
import type { MonthlySpendingPoint } from "../types/auth";

function currentMonthStartDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function monthLabel(monthStart: string): string {
  const [year, month] = monthStart.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function currentMonthDateMeta() {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return {
    dayOfMonth,
    daysInMonth,
  };
}

export default function BudgetPage() {
  const { budgetAmountCad } = useAuth();
  const [spendingHistory, setSpendingHistory] = useState<MonthlySpendingPoint[]>([]);
  const [dataError, setDataError] = useState("");
  const [isPredictionInfoModalOpen, setIsPredictionInfoModalOpen] = useState(false);
  const currentMonthStart = useMemo(() => currentMonthStartDateString(), []);
  const { dayOfMonth, daysInMonth } = useMemo(() => currentMonthDateMeta(), []);

  const formattedCurrency = useMemo(
    () =>
      new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 2,
      }),
    [],
  );

  const currentMonthLabel = useMemo(() => monthLabel(currentMonthStart), [currentMonthStart]);

  const spendingByMonth = useMemo(() => {
    const byMonth = new Map<string, number>();

    for (const point of spendingHistory) {
      byMonth.set(point.monthStart, point.spendingAmountCad);
    }

    return byMonth;
  }, [spendingHistory]);

  const currentMonthSpending = spendingByMonth.get(currentMonthStart) ?? 0;

  const recentCompletedMonths = useMemo(() => {
    return spendingHistory
      .filter((point) => point.monthStart < currentMonthStart)
      .sort((left, right) => right.monthStart.localeCompare(left.monthStart))
      .slice(0, 3);
  }, [currentMonthStart, spendingHistory]);

  const historicalAverage = useMemo(() => {
    if (recentCompletedMonths.length === 0) {
      return null;
    }

    const total = recentCompletedMonths.reduce((sum, month) => sum + month.spendingAmountCad, 0);
    return total / recentCompletedMonths.length;
  }, [recentCompletedMonths]);

  const currentRunRateProjection = useMemo(() => {
    if (dayOfMonth <= 0) {
      return 0;
    }

    return (currentMonthSpending / dayOfMonth) * daysInMonth;
  }, [currentMonthSpending, dayOfMonth, daysInMonth]);

  const predictedSpending = useMemo(() => {
    if (historicalAverage === null) {
      return currentRunRateProjection;
    }

    const elapsedRatio = dayOfMonth / daysInMonth;
    const runRateWeight = elapsedRatio < 0.2 ? 0.4 : elapsedRatio < 0.4 ? 0.55 : 0.65;

    return currentRunRateProjection * runRateWeight + historicalAverage * (1 - runRateWeight);
  }, [currentRunRateProjection, dayOfMonth, daysInMonth, historicalAverage]);

  const predictedVarianceToBudget = typeof budgetAmountCad === "number" ? budgetAmountCad - predictedSpending : null;

  const predictionChartData = useMemo(() => {
    if (recentCompletedMonths.length > 0) {
      return [
        ...recentCompletedMonths.slice().reverse().map((month) => ({
          label: monthLabel(month.monthStart),
          amountCad: month.spendingAmountCad,
        })),
        {
          label: monthLabel(currentMonthStart),
          amountCad: predictedSpending,
        },
      ];
    }

    return [
      {
        label: "Spent",
        amountCad: currentMonthSpending,
      },
      {
        label: "Predicted",
        amountCad: predictedSpending,
      },
    ];
  }, [recentCompletedMonths, currentMonthStart, predictedSpending, currentMonthSpending]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const result = await getMyTransactionHistory();

      if (!isMounted) {
        return;
      }

      if (!result.ok) {
        setDataError("Predicted spending could not be loaded right now.");
        return;
      }

      setDataError("");
      setSpendingHistory(result.history);
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isPredictionInfoModalOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPredictionInfoModalOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPredictionInfoModalOpen]);

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

      <section className="dashboard-card budget-prediction-card">
        <div className="budget-prediction-header">
          <div className="budget-prediction-title-wrap">
            <h2>Predicted Spending</h2>
            <button
              className="dashboard-title-info-button"
              type="button"
              onClick={() => setIsPredictionInfoModalOpen(true)}
              aria-label="Open predicted spending info"
              title="Predicted spending info"
            >
              <FontAwesomeIcon icon={faCircleInfo} aria-hidden="true" />
            </button>
          </div>
          <p className="budget-prediction-month-title">{currentMonthLabel}</p>
        </div>

        <div className="budget-prediction-chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={predictionChartData} margin={{ top: 8, right: 10, left: -20, bottom: 8 }}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickFormatter={(value: number) => `$${Math.round(value)}`}
              />
              <Tooltip
                formatter={(value: number) => formattedCurrency.format(Number(value))}
                labelFormatter={(label) => `Period: ${String(label)}`}
              />
              <Line
                type="monotone"
                dataKey="amountCad"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "var(--primary)", stroke: "var(--panel)", strokeWidth: 2 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="budget-prediction-meta-grid">
          <article className="budget-prediction-tile">
            <p className="budget-summary-label">Spent so far</p>
            <p className="budget-prediction-tile-value">{formattedCurrency.format(currentMonthSpending)}</p>
          </article>
          <article className="budget-prediction-tile">
            <p className="budget-summary-label">Run-rate projection</p>
            <p className="budget-prediction-tile-value">{formattedCurrency.format(currentRunRateProjection)}</p>
          </article>
          <article className="budget-prediction-tile">
            <p className="budget-summary-label">3-month average</p>
            <p className="budget-prediction-tile-value">
              {historicalAverage === null ? "Not enough data" : formattedCurrency.format(historicalAverage)}
            </p>
          </article>
          <article className="budget-prediction-tile">
            <p className="budget-summary-label">Compared to budget</p>
            <p className={`budget-prediction-tile-value ${predictedVarianceToBudget !== null && predictedVarianceToBudget >= 0 ? "amount-positive" : ""}`}>
              {predictedVarianceToBudget === null
                ? "Budget not set"
                : predictedVarianceToBudget >= 0
                  ? `${formattedCurrency.format(predictedVarianceToBudget)} under`
                  : `${formattedCurrency.format(Math.abs(predictedVarianceToBudget))} over`}
            </p>
          </article>
        </div>
      </section>

      {dataError ? <p className="feedback error">{dataError}</p> : null}

      {isPredictionInfoModalOpen ? (
        <div className="modal-overlay" role="presentation" onClick={() => setIsPredictionInfoModalOpen(false)}>
          <section
            className="modal-card household-info-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prediction-info-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="page-title-row page-title-actions">
              <h2 id="prediction-info-modal-title">How prediction works</h2>
              <button className="secondary-button" type="button" onClick={() => setIsPredictionInfoModalOpen(false)}>
                Close
              </button>
            </div>

            <p>
              We blend your current month pace with your last 3 completed months to forecast the end of this month.
            </p>
            <p>
              Current pace is based on <strong>{dayOfMonth}</strong> of <strong>{daysInMonth}</strong> elapsed days.
            </p>
            <p>
              If it is early in the month, we rely more on historical months to reduce volatility.
            </p>
          </section>
        </div>
      ) : null}

      <AddTransactionFab />
      <MobileNav />
    </main>
  );
}
