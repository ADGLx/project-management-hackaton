import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  createMyTransaction,
  deleteMyTransaction,
  getMyMonthlyBudgetHistory,
  getMyTransactionHistory,
  getMyTransactions,
  updateMyTransaction,
} from "../lib/api";
import { useAuth } from "../state/AuthContext";
import type { BudgetHistoryPoint, MonthlySpendingPoint, UserTransaction } from "../types/auth";

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

function todayAsDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateForDisplay(dateValue: string): string {
  const [year, month, day] = dateValue.split("-");

  if (!year || !month || !day) {
    return dateValue;
  }

  return `${year}-${month}-${day}`;
}

function monthSortKey(monthStart: string): number {
  const [yearPart, monthPart] = monthStart.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return 0;
  }

  return year * 100 + month;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user, logout, profileName, budgetAmountCad, saveMonthlyBudget } = useAuth();
  const [budgetHistory, setBudgetHistory] = useState<BudgetHistoryPoint[]>([]);
  const [spendingHistory, setSpendingHistory] = useState<MonthlySpendingPoint[]>([]);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [dataError, setDataError] = useState("");
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isSavingTransaction, setIsSavingTransaction] = useState(false);
  const [isDeletingTransactionId, setIsDeletingTransactionId] = useState<string | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState("");
  const [transactionAmountDraft, setTransactionAmountDraft] = useState("");
  const [transactionTypeDraft, setTransactionTypeDraft] = useState("");
  const [transactionDateDraft, setTransactionDateDraft] = useState(todayAsDateInputValue);
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

  const monthlyComparisonData = useMemo(() => {
    const byMonth = new Map<string, { monthStart: string; month: string; budget: number; spending: number }>();

    for (const point of budgetHistory) {
      const monthStart = point.monthStart;
      byMonth.set(monthStart, {
        monthStart,
        month: monthLabelFromMonthStart(monthStart),
        budget: point.budgetAmountCad,
        spending: byMonth.get(monthStart)?.spending ?? 0,
      });
    }

    for (const point of spendingHistory) {
      const monthStart = point.monthStart;
      byMonth.set(monthStart, {
        monthStart,
        month: monthLabelFromMonthStart(monthStart),
        budget: byMonth.get(monthStart)?.budget ?? 0,
        spending: point.spendingAmountCad,
      });
    }

    return Array.from(byMonth.values()).sort((left, right) => monthSortKey(left.monthStart) - monthSortKey(right.monthStart));
  }, [budgetHistory, spendingHistory]);

  async function loadDashboardData() {
    setDataError("");
    const [budgetHistoryResult, spendingHistoryResult, transactionsResult] = await Promise.all([
      getMyMonthlyBudgetHistory(),
      getMyTransactionHistory(),
      getMyTransactions(),
    ]);

    if (budgetHistoryResult.ok) {
      setBudgetHistory(budgetHistoryResult.history);
    }

    if (spendingHistoryResult.ok) {
      setSpendingHistory(spendingHistoryResult.history);
    }

    if (transactionsResult.ok) {
      setTransactions(transactionsResult.transactions);
    }

    if (!budgetHistoryResult.ok || !spendingHistoryResult.ok || !transactionsResult.ok) {
      setDataError("Some dashboard data could not be loaded right now.");
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!isMounted) {
        return;
      }

      const [budgetHistoryResult, spendingHistoryResult, transactionsResult] = await Promise.all([
        getMyMonthlyBudgetHistory(),
        getMyTransactionHistory(),
        getMyTransactions(),
      ]);

      if (!isMounted) {
        return;
      }

      if (budgetHistoryResult.ok) {
        setBudgetHistory(budgetHistoryResult.history);
      }

      if (spendingHistoryResult.ok) {
        setSpendingHistory(spendingHistoryResult.history);
      }

      if (transactionsResult.ok) {
        setTransactions(transactionsResult.transactions);
      }

      if (!budgetHistoryResult.ok || !spendingHistoryResult.ok || !transactionsResult.ok) {
        setDataError("Some dashboard data could not be loaded right now.");
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (isSavingTransaction) {
          return;
        }

        setIsTransactionModalOpen(false);
        setTransactionError("");
        setEditingTransactionId(null);
      }
    }

    if (!isTransactionModalOpen) {
      return;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isTransactionModalOpen, isSavingTransaction]);

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

  function openTransactionModal() {
    setTransactionError("");
    setTransactionAmountDraft("");
    setTransactionTypeDraft("");
    setTransactionDateDraft(todayAsDateInputValue());
    setEditingTransactionId(null);
    setIsTransactionModalOpen(true);
  }

  function openEditTransactionModal(transaction: UserTransaction) {
    setTransactionError("");
    setTransactionAmountDraft(String(transaction.amountCad));
    setTransactionTypeDraft(transaction.type);
    setTransactionDateDraft(transaction.transactionDate);
    setEditingTransactionId(transaction.id);
    setIsTransactionModalOpen(true);
  }

  function closeTransactionModal() {
    if (isSavingTransaction) {
      return;
    }

    setIsTransactionModalOpen(false);
    setTransactionError("");
    setEditingTransactionId(null);
  }

  async function onSaveTransaction() {
    setTransactionError("");

    const amountCad = Number(transactionAmountDraft);
    if (!Number.isFinite(amountCad) || amountCad <= 0) {
      setTransactionError("Please enter a valid amount greater than 0.");
      return;
    }

    if (!transactionTypeDraft.trim()) {
      setTransactionError("Type is required.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDateDraft)) {
      setTransactionError("Date must be in YYYY-MM-DD format.");
      return;
    }

    setIsSavingTransaction(true);
    const payload = {
      amountCad,
      type: transactionTypeDraft.trim(),
      transactionDate: transactionDateDraft,
    };
    const result = editingTransactionId ? await updateMyTransaction(editingTransactionId, payload) : await createMyTransaction(payload);

    if (!result.ok) {
      setTransactionError(result.message);
      setIsSavingTransaction(false);
      return;
    }

    await loadDashboardData();
    setIsSavingTransaction(false);
    setIsTransactionModalOpen(false);
    setEditingTransactionId(null);
  }

  async function onDeleteTransaction(transactionId: string) {
    setTransactionError("");
    setIsDeletingTransactionId(transactionId);
    const result = await deleteMyTransaction(transactionId);

    if (!result.ok) {
      setTransactionError(result.message);
      setIsDeletingTransactionId(null);
      return;
    }

    await loadDashboardData();
    setIsDeletingTransactionId(null);
  }

  return (
    <main className="home-shell">
      <section className="home-hero dashboard-header">
        <div>
          <p className="eyebrow">Control Center</p>
          <h1>Welcome, {displayName}</h1>
          <p className="dashboard-description">Track your budget against real spending and keep every transaction in one place for clear monthly visibility.</p>
        </div>

        <button className="secondary-button" type="button" onClick={onLogout}>
          Logout
        </button>
      </section>

      <section className="dashboard-card overview-card">
        <div className="overview-section budget-card">
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
              <p>This is your configured monthly limit in CAD.</p>
              <button className="secondary-button" type="button" onClick={startEditingBudget}>
                Edit budget
              </button>
            </>
          )}
        </div>

        <div className="overview-section chart-card">
          <h2>Budget vs Spending (Previous Months)</h2>
          {monthlyComparisonData.length > 0 ? (
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
          ) : (
            <p>No monthly chart data yet. Add your first transaction to start tracking spending.</p>
          )}
        </div>

        <div className="overview-section transactions-card">
          <h2>Transactions</h2>
          {transactions.length > 0 ? (
            <div className="transactions-list" role="list">
              {transactions.map((transaction) => (
                <article className="transaction-row" role="listitem" key={transaction.id}>
                  <div>
                    <p className="transaction-merchant">{transaction.type}</p>
                  </div>

                  <div className="transaction-right">
                    <p>{formatDateForDisplay(transaction.transactionDate)}</p>
                    <p className="transaction-amount">{formattedCurrency.format(transaction.amountCad)}</p>
                    <div className="transaction-actions">
                      <button
                        className="transaction-action secondary-button"
                        type="button"
                        onClick={() => openEditTransactionModal(transaction)}
                        disabled={isSavingTransaction || isDeletingTransactionId === transaction.id}
                      >
                        Edit
                      </button>
                      <button
                        className="transaction-action secondary-button"
                        type="button"
                        onClick={() => void onDeleteTransaction(transaction.id)}
                        disabled={isDeletingTransactionId === transaction.id || isSavingTransaction}
                      >
                        {isDeletingTransactionId === transaction.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p>No transactions yet. Use the + button to add your first one.</p>
          )}
        </div>
      </section>

      {dataError ? <p className="feedback error">{dataError}</p> : null}
      {transactionError && !isTransactionModalOpen ? <p className="feedback error">{transactionError}</p> : null}

      <button className="fab-button" type="button" onClick={openTransactionModal} aria-label="Add transaction">
        +
      </button>

      {isTransactionModalOpen ? (
        <div className="modal-overlay" role="presentation" onClick={closeTransactionModal}>
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="transaction-modal-title">{editingTransactionId ? "Edit Transaction" : "Add Transaction"}</h2>

            <form
              className="transaction-form"
              onSubmit={(event) => {
                event.preventDefault();
                void onSaveTransaction();
              }}
            >
              <label>
                Amount (CAD)
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  inputMode="decimal"
                  value={transactionAmountDraft}
                  onChange={(event) => setTransactionAmountDraft(event.target.value)}
                  disabled={isSavingTransaction}
                  required
                />
              </label>

              <label>
                Type
                <input
                  type="text"
                  value={transactionTypeDraft}
                  onChange={(event) => setTransactionTypeDraft(event.target.value)}
                  disabled={isSavingTransaction}
                  placeholder="e.g. groceries, tools, payroll"
                  required
                />
              </label>

              <label>
                Date
                <input
                  type="date"
                  value={transactionDateDraft}
                  onChange={(event) => setTransactionDateDraft(event.target.value)}
                  disabled={isSavingTransaction}
                  required
                />
              </label>

              {transactionError ? <p className="feedback error">{transactionError}</p> : null}

              <div className="modal-actions">
                <button type="submit" disabled={isSavingTransaction}>
                  {isSavingTransaction ? "Saving..." : editingTransactionId ? "Save Changes" : "Save Transaction"}
                </button>
                <button className="secondary-button" type="button" onClick={closeTransactionModal} disabled={isSavingTransaction}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
