import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
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

function monthLabel(monthStart: string, locale: string): string {
  const [year, month] = monthStart.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return new Intl.DateTimeFormat(locale, {
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
  const { t, i18n } = useTranslation();
  const { budgetAmountCad } = useAuth();
  const [spendingHistory, setSpendingHistory] = useState<MonthlySpendingPoint[]>([]);
  const [dataError, setDataError] = useState("");
  const [isPredictionInfoModalOpen, setIsPredictionInfoModalOpen] = useState(false);
  const currentMonthStart = useMemo(() => currentMonthStartDateString(), []);
  const { dayOfMonth, daysInMonth } = useMemo(() => currentMonthDateMeta(), []);

  const locale = i18n.language === "fr-CA" ? "fr-CA" : "en-CA";
  const formattedCurrency = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 2,
      }),
    [locale],
  );

  const currentMonthLabel = useMemo(() => monthLabel(currentMonthStart, locale), [currentMonthStart, locale]);

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
      const oldestToNewest = recentCompletedMonths.slice().reverse();
      const lastHistoricalIndex = oldestToNewest.length - 1;

      return [
        ...oldestToNewest.map((month, index) => ({
          label: monthLabel(month.monthStart, locale),
          actualCad: month.spendingAmountCad,
          predictedCad: index === lastHistoricalIndex ? month.spendingAmountCad : null,
        })),
        {
          label: monthLabel(currentMonthStart, locale),
          actualCad: currentMonthSpending,
          predictedCad: predictedSpending,
        },
      ];
    }

    return [
      {
        label: t("budget.current"),
        actualCad: currentMonthSpending,
        predictedCad: currentMonthSpending,
      },
      {
        label: t("budget.forecastPoint"),
        actualCad: null,
        predictedCad: predictedSpending,
      },
    ];
  }, [recentCompletedMonths, currentMonthStart, predictedSpending, currentMonthSpending, locale, t]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const result = await getMyTransactionHistory();

      if (!isMounted) {
        return;
      }

      if (!result.ok) {
        setDataError(t("budget.loadError"));
        return;
      }

      setDataError("");
      setSpendingHistory(result.history);
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [t]);

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
          <img className="dashboard-title-icon" src="/diversity.svg" alt="" aria-hidden="true" />
          <span>{t("budget.title")}</span>
        </h1>
      </section>

      <section className="dashboard-card budget-prediction-card">
        <div className="budget-prediction-header">
          <div className="budget-prediction-title-wrap">
            <h2>{t("budget.forecast")}</h2>
            <button
              className="dashboard-title-info-button"
              type="button"
              onClick={() => setIsPredictionInfoModalOpen(true)}
               aria-label={t("budget.openPredictionInfo")}
               title={t("budget.predictionInfo")}
            >
              <FontAwesomeIcon icon={faCircleInfo} aria-hidden="true" />
            </button>
          </div>
          <p className="budget-prediction-month-title">{currentMonthLabel}</p>
        </div>

        <div className="budget-prediction-chart-wrap">
          <div className="budget-chart-legend" aria-hidden="true">
            <span className="budget-chart-legend-item">
              <span className="budget-chart-legend-swatch budget-chart-legend-swatch-actual" />
              <span>{t("budget.actual")}</span>
            </span>
            <span className="budget-chart-legend-item">
              <span className="budget-chart-legend-swatch budget-chart-legend-swatch-predicted" />
              <span>{t("budget.predicted")}</span>
            </span>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={predictionChartData} margin={{ top: 32, right: 10, left: -20, bottom: 8 }}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickFormatter={(value: number) => `$${Math.round(value)}`}
              />
              <Tooltip
                formatter={(value: number, seriesName: string) => [formattedCurrency.format(Number(value)), seriesName]}
                labelFormatter={(label) => t("budget.period", { label: String(label) })}
              />
              <Line
                type="monotone"
                name={t("budget.actual")}
                dataKey="actualCad"
                stroke="var(--chart-category-1)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "var(--chart-category-1)", stroke: "var(--panel)", strokeWidth: 2 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                name={t("budget.predicted")}
                dataKey="predictedCad"
                stroke="var(--chart-category-5)"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={{ r: 4, fill: "var(--chart-category-5)", stroke: "var(--panel)", strokeWidth: 2 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="budget-prediction-meta-grid">
          <article className="budget-prediction-tile">
            <p className="budget-summary-label">{t("home.spent")}</p>
            <p className="budget-prediction-tile-value">{formattedCurrency.format(currentMonthSpending)}</p>
          </article>
          <article className="budget-prediction-tile">
            <p className="budget-summary-label">{t("budget.runRate")}</p>
            <p className="budget-prediction-tile-value">{formattedCurrency.format(currentRunRateProjection)}</p>
          </article>
          <article className="budget-prediction-tile">
            <p className="budget-summary-label">{t("budget.avg3Month")}</p>
            <p className="budget-prediction-tile-value">
              {historicalAverage === null ? t("budget.notEnoughData") : formattedCurrency.format(historicalAverage)}
            </p>
          </article>
          <article className="budget-prediction-tile">
            <p className="budget-summary-label">{t("budget.comparison")}</p>
            <p className={`budget-prediction-tile-value ${predictedVarianceToBudget !== null && predictedVarianceToBudget >= 0 ? "amount-positive" : ""}`}>
              {predictedVarianceToBudget === null
                ? t("budget.budgetNotSet")
                : predictedVarianceToBudget >= 0
                  ? t("budget.under", { amount: formattedCurrency.format(predictedVarianceToBudget) })
                  : t("budget.over", { amount: formattedCurrency.format(Math.abs(predictedVarianceToBudget)) })}
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
              <h2 id="prediction-info-modal-title">{t("budget.howPredictionWorks")}</h2>
              <button className="secondary-button" type="button" onClick={() => setIsPredictionInfoModalOpen(false)}>
                {t("common.close")}
              </button>
            </div>

            <p>{t("budget.blendExplanation")}</p>
            <p>
              {t("budget.paceExplanation", { dayOfMonth, daysInMonth })}
            </p>
            <p>{t("budget.formula")}</p>
            <p>{t("budget.earlyMonth")}</p>
          </section>
        </div>
      ) : null}

      <AddTransactionFab />
      <MobileNav />
    </main>
  );
}
