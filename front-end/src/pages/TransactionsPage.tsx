import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AddTransactionFab from "../components/AddTransactionFab";
import MobileNav from "../components/MobileNav";
import {
  createMyTransaction,
  deleteMyTransaction,
  getMyTransactionTypes,
  getMyTransactions,
  updateMyTransaction,
} from "../lib/api";
import type { TransactionType, UserTransaction } from "../types/auth";

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

export default function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [dataError, setDataError] = useState("");
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isSavingTransaction, setIsSavingTransaction] = useState(false);
  const [isDeletingTransactionId, setIsDeletingTransactionId] = useState<string | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState("");
  const [transactionAmountDraft, setTransactionAmountDraft] = useState("");
  const [transactionTypeDraft, setTransactionTypeDraft] = useState("");
  const [transactionDescriptionDraft, setTransactionDescriptionDraft] = useState("");
  const [transactionDateDraft, setTransactionDateDraft] = useState(todayAsDateInputValue);

  const formattedCurrency = useMemo(
    () =>
      new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 2,
      }),
    [],
  );

  const modalTypeOptions = useMemo(() => {
    const fromServer = transactionTypes.map((transactionType) => transactionType.name);

    if (editingTransactionId && transactionTypeDraft && !fromServer.includes(transactionTypeDraft)) {
      return [transactionTypeDraft, ...fromServer];
    }

    return fromServer;
  }, [editingTransactionId, transactionTypeDraft, transactionTypes]);

  async function loadTransactionsData() {
    setDataError("");
    const [transactionsResult, transactionTypesResult] = await Promise.all([getMyTransactions(), getMyTransactionTypes()]);

    if (transactionsResult.ok) {
      setTransactions(transactionsResult.transactions);
    }

    if (transactionTypesResult.ok) {
      setTransactionTypes(transactionTypesResult.transactionTypes);
    }

    if (!transactionsResult.ok || !transactionTypesResult.ok) {
      setDataError("Some transaction data could not be loaded right now.");
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!isMounted) {
        return;
      }

      const [transactionsResult, transactionTypesResult] = await Promise.all([getMyTransactions(), getMyTransactionTypes()]);

      if (!isMounted) {
        return;
      }

      if (transactionsResult.ok) {
        setTransactions(transactionsResult.transactions);
      }

      if (transactionTypesResult.ok) {
        setTransactionTypes(transactionTypesResult.transactionTypes);
      }

      if (!transactionsResult.ok || !transactionTypesResult.ok) {
        setDataError("Some transaction data could not be loaded right now.");
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("new") !== "1") {
      return;
    }

    openTransactionModal();
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("new");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, transactionTypes]);

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

  function openTransactionModal() {
    setTransactionError("");
    setTransactionAmountDraft("");
    setTransactionTypeDraft(transactionTypes[0]?.name ?? "");
    setTransactionDescriptionDraft("");
    setTransactionDateDraft(todayAsDateInputValue());
    setEditingTransactionId(null);
    setIsTransactionModalOpen(true);
  }

  function openEditTransactionModal(transaction: UserTransaction) {
    setTransactionError("");
    setTransactionAmountDraft(String(transaction.amountCad));
    setTransactionTypeDraft(transaction.type);
    setTransactionDescriptionDraft(transaction.description);
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

    if (!transactionDescriptionDraft.trim()) {
      setTransactionError("Description is required.");
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
      description: transactionDescriptionDraft.trim(),
      transactionDate: transactionDateDraft,
    };
    const result = editingTransactionId ? await updateMyTransaction(editingTransactionId, payload) : await createMyTransaction(payload);

    if (!result.ok) {
      setTransactionError(result.message);
      setIsSavingTransaction(false);
      return;
    }

    await loadTransactionsData();
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

    await loadTransactionsData();
    setIsDeletingTransactionId(null);
  }

  return (
    <main className="home-shell">
      <section className="page-title-row page-title-actions">
        <h1>Transactions</h1>
        <button type="button" onClick={openTransactionModal}>
          Add Transaction
        </button>
      </section>

      <section className="dashboard-card transactions-card">
        {transactions.length > 0 ? (
          <div className="transactions-list" role="list">
            {transactions.map((transaction) => (
              <article className="transaction-row" role="listitem" key={transaction.id}>
                <div className="transaction-main">
                  <p className="transaction-merchant">{transaction.type}</p>
                  <p className="transaction-meta">{transaction.description}</p>
                </div>
                <p className="transaction-date">{formatDateForDisplay(transaction.transactionDate)}</p>
                <p className="transaction-amount">{formattedCurrency.format(transaction.amountCad)}</p>
                <div className="transaction-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => openEditTransactionModal(transaction)}
                    disabled={isSavingTransaction || isDeletingTransactionId === transaction.id}
                    aria-label={`Edit ${transaction.description}`}
                  >
                    Edit
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => void onDeleteTransaction(transaction.id)}
                    disabled={isDeletingTransactionId === transaction.id || isSavingTransaction}
                    aria-label={`Delete ${transaction.description}`}
                  >
                    {isDeletingTransactionId === transaction.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>No transactions yet. Use Add Transaction to create your first one.</p>
        )}
      </section>

      {dataError ? <p className="feedback error">{dataError}</p> : null}
      {transactionError && !isTransactionModalOpen ? <p className="feedback error">{transactionError}</p> : null}

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
                <select
                  value={transactionTypeDraft}
                  onChange={(event) => setTransactionTypeDraft(event.target.value)}
                  disabled={isSavingTransaction || modalTypeOptions.length === 0}
                  required
                >
                  {modalTypeOptions.length === 0 ? <option value="">No types available</option> : null}
                  {modalTypeOptions.map((typeName) => (
                    <option key={typeName} value={typeName}>
                      {typeName}
                    </option>
                  ))}
                </select>
              </label>

              {modalTypeOptions.length === 0 ? (
                <p className="feedback error">No transaction types found. Add one in your user page first.</p>
              ) : null}

              <label>
                Description
                <input
                  type="text"
                  value={transactionDescriptionDraft}
                  onChange={(event) => setTransactionDescriptionDraft(event.target.value)}
                  disabled={isSavingTransaction}
                  placeholder="Short note about this transaction"
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
                <button type="submit" disabled={isSavingTransaction || modalTypeOptions.length === 0}>
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

      <AddTransactionFab />
      <MobileNav />
    </main>
  );
}
