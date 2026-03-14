import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faFileCode, faFileCsv, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useSearchParams } from "react-router-dom";
import AddTransactionFab from "../components/AddTransactionFab";
import MobileNav from "../components/MobileNav";
import {
  createMyTransaction,
  deleteMyTransaction,
  getMyTransactionTypes,
  getMyTransactions,
  scanTransactionReceipt,
  updateMyTransaction,
} from "../lib/api";
import { buildExportDateStamp, downloadTextFile, rowsToCsv } from "../lib/export";
import { useAuth } from "../state/AuthContext";
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

type RecurrenceFrequency = "weekly" | "monthly" | "yearly";
type RecurrenceEndMode = "never" | "onDate" | "afterOccurrences";
type SortOption = "dateDesc" | "dateAsc" | "amountDesc" | "amountAsc";

export default function TransactionsPage() {
  const { user } = useAuth();
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
  const [isRecurringDraft, setIsRecurringDraft] = useState(false);
  const [recurrenceFrequencyDraft, setRecurrenceFrequencyDraft] = useState<RecurrenceFrequency>("monthly");
  const [recurrenceStartDateDraft, setRecurrenceStartDateDraft] = useState(todayAsDateInputValue);
  const [recurrenceEndModeDraft, setRecurrenceEndModeDraft] = useState<RecurrenceEndMode>("never");
  const [recurrenceEndDateDraft, setRecurrenceEndDateDraft] = useState("");
  const [recurrenceOccurrencesDraft, setRecurrenceOccurrencesDraft] = useState("12");
  const [isExtractingReceipt, setIsExtractingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const [isFilterSortOpen, setIsFilterSortOpen] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [selectedSortOption, setSelectedSortOption] = useState<SortOption>("dateDesc");
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

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
  const canScanReceipt = Boolean(user?.subscribers);
  const canUseRecurringTransactions = Boolean(user?.subscribers);
  const canExportTransactions = Boolean(user?.subscribers);
  const availableTypeFilters = useMemo(() => {
    const typeSet = new Set<string>();

    for (const transactionType of transactionTypes) {
      typeSet.add(transactionType.name);
    }

    for (const transaction of transactions) {
      typeSet.add(transaction.type);
    }

    return Array.from(typeSet).sort((left, right) => left.localeCompare(right));
  }, [transactionTypes, transactions]);

  const visibleTransactions = useMemo(() => {
    const filteredTransactions =
      selectedTypeFilter === "all"
        ? transactions
        : transactions.filter((transaction) => transaction.type === selectedTypeFilter);
    const sortedTransactions = [...filteredTransactions];

    sortedTransactions.sort((left, right) => {
      switch (selectedSortOption) {
        case "dateAsc":
          return left.transactionDate.localeCompare(right.transactionDate);
        case "amountDesc":
          return right.amountCad - left.amountCad;
        case "amountAsc":
          return left.amountCad - right.amountCad;
        case "dateDesc":
        default:
          return right.transactionDate.localeCompare(left.transactionDate);
      }
    });

    return sortedTransactions;
  }, [selectedSortOption, selectedTypeFilter, transactions]);

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
        if (isSavingTransaction || isExtractingReceipt) {
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
  }, [isExtractingReceipt, isTransactionModalOpen, isSavingTransaction]);

  function openTransactionModal() {
    setTransactionError("");
    setReceiptError("");
    setTransactionAmountDraft("");
    setTransactionTypeDraft(transactionTypes[0]?.name ?? "");
    setTransactionDescriptionDraft("");
    const defaultDate = todayAsDateInputValue();
    setTransactionDateDraft(defaultDate);
    setIsRecurringDraft(false);
    setRecurrenceFrequencyDraft("monthly");
    setRecurrenceStartDateDraft(defaultDate);
    setRecurrenceEndModeDraft("never");
    setRecurrenceEndDateDraft("");
    setRecurrenceOccurrencesDraft("12");
    setEditingTransactionId(null);
    setIsTransactionModalOpen(true);
  }

  function openEditTransactionModal(transaction: UserTransaction) {
    setTransactionError("");
    setReceiptError("");
    setTransactionAmountDraft(String(transaction.amountCad));
    setTransactionTypeDraft(transaction.type);
    setTransactionDescriptionDraft(transaction.description);
    setTransactionDateDraft(transaction.transactionDate);
    setIsRecurringDraft(false);
    setRecurrenceFrequencyDraft("monthly");
    setRecurrenceStartDateDraft(transaction.transactionDate);
    setRecurrenceEndModeDraft("never");
    setRecurrenceEndDateDraft("");
    setRecurrenceOccurrencesDraft("12");
    setEditingTransactionId(transaction.id);
    setIsTransactionModalOpen(true);
  }

  function closeTransactionModal() {
    if (isSavingTransaction || isExtractingReceipt) {
      return;
    }

    setIsTransactionModalOpen(false);
    setTransactionError("");
    setReceiptError("");
    setEditingTransactionId(null);
  }

  function onScanReceiptClick() {
    if (!canScanReceipt) {
      setReceiptError("Receipt scanning is available to subscribers only.");
      return;
    }

    setReceiptError("");
    receiptInputRef.current?.click();
  }

  async function onReceiptFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setReceiptError("");
    setTransactionError("");
    setIsExtractingReceipt(true);

    const result = await scanTransactionReceipt(file);

    if (!result.ok) {
      setReceiptError(result.message);
      setIsExtractingReceipt(false);
      return;
    }

    setTransactionAmountDraft(result.suggestion.amountCad.toFixed(2));
    setTransactionTypeDraft(result.suggestion.type);
    setTransactionDescriptionDraft(result.suggestion.description);
    setIsExtractingReceipt(false);
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

  function exportTransactionsAsCsv() {
    if (!canExportTransactions || transactions.length === 0) {
      return;
    }

    const rows = transactions.map((transaction) => ({
      transactionDate: transaction.transactionDate,
      amountCad: transaction.amountCad,
      type: transaction.type,
      description: transaction.description,
    }));
    const csv = rowsToCsv(rows);
    const dateStamp = buildExportDateStamp();
    downloadTextFile(`personal-transactions-${dateStamp}.csv`, csv, "text/csv;charset=utf-8");
  }

  function exportTransactionsAsJson() {
    if (!canExportTransactions || transactions.length === 0) {
      return;
    }

    const payload = transactions.map((transaction) => ({
      transactionDate: transaction.transactionDate,
      amountCad: transaction.amountCad,
      type: transaction.type,
      description: transaction.description,
    }));
    const dateStamp = buildExportDateStamp();
    downloadTextFile(`personal-transactions-${dateStamp}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  }

  return (
    <main className="home-shell">
      <section className="page-title-row page-title-actions">
        <h1>Transactions</h1>
        <button className="compact-primary-button" type="button" onClick={openTransactionModal}>
          Add Transaction
        </button>
      </section>

      <section className="dashboard-card transactions-card">
        <div className="card-header-actions-row">
          <button
            className="secondary-button filter-sort-button"
            type="button"
            onClick={() => setIsFilterSortOpen((current) => !current)}
            aria-expanded={isFilterSortOpen}
            aria-controls="transactions-filter-sort-panel"
          >
            Filter & Sort
          </button>
          <div className="export-actions" role="group" aria-label="Export transactions">
            <button
              className="secondary-button export-button"
              type="button"
              onClick={exportTransactionsAsCsv}
              disabled={!canExportTransactions || transactions.length === 0}
              aria-label="Export transactions as CSV"
            >
              <FontAwesomeIcon icon={faFileCsv} aria-hidden="true" />
              <span>CSV</span>
            </button>
            <button
              className="secondary-button export-button"
              type="button"
              onClick={exportTransactionsAsJson}
              disabled={!canExportTransactions || transactions.length === 0}
              aria-label="Export transactions as JSON"
            >
              <FontAwesomeIcon icon={faFileCode} aria-hidden="true" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {isFilterSortOpen ? (
          <div className="filter-sort-panel" id="transactions-filter-sort-panel">
            <label>
              Filter by type
              <select value={selectedTypeFilter} onChange={(event) => setSelectedTypeFilter(event.target.value)}>
                <option value="all">All types</option>
                {availableTypeFilters.map((typeName) => (
                  <option key={typeName} value={typeName}>
                    {typeName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Sort by
              <select value={selectedSortOption} onChange={(event) => setSelectedSortOption(event.target.value as SortOption)}>
                <option value="dateDesc">Date (newest first)</option>
                <option value="dateAsc">Date (oldest first)</option>
                <option value="amountDesc">Amount (highest first)</option>
                <option value="amountAsc">Amount (lowest first)</option>
              </select>
            </label>
          </div>
        ) : null}

        {!canExportTransactions ? <p className="feedback">Export is a subscriber feature.</p> : null}

        {visibleTransactions.length > 0 ? (
          <div className="transactions-list" role="list">
            {visibleTransactions.map((transaction) => (
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
          <p>
            {transactions.length > 0
              ? "No transactions match your current filters."
              : "No transactions yet. Use Add Transaction to create your first one."}
          </p>
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
            <div className="modal-title-row">
              <button
                className="secondary-button modal-close-button"
                type="button"
                onClick={closeTransactionModal}
                disabled={isSavingTransaction || isExtractingReceipt}
                aria-label="Close transaction modal"
                title="Close"
              >
                <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
              </button>
              <h2 id="transaction-modal-title">{editingTransactionId ? "Edit Transaction" : "Add Transaction"}</h2>
              {!editingTransactionId ? (
                <button
                  className="secondary-button scan-receipt-button"
                  type="button"
                  onClick={onScanReceiptClick}
                  disabled={isSavingTransaction || isExtractingReceipt || modalTypeOptions.length === 0 || !canScanReceipt}
                  aria-label={isExtractingReceipt ? "Scanning receipt" : canScanReceipt ? "Scan receipt" : "Subscribers only"}
                  title={isExtractingReceipt ? "Scanning receipt" : canScanReceipt ? "Scan receipt" : "Subscribers only"}
                >
                  <FontAwesomeIcon icon={faCamera} aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <input
              ref={receiptInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="receipt-file-input"
              onChange={(event) => void onReceiptFileChange(event)}
              disabled={isSavingTransaction || isExtractingReceipt || modalTypeOptions.length === 0}
            />

            {!canScanReceipt && !editingTransactionId ? (
              <p className="feedback">Upgrade to subscriber to unlock receipt scanning.</p>
            ) : null}

            {receiptError ? <p className="feedback error">{receiptError}</p> : null}

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
                  disabled={isSavingTransaction || isExtractingReceipt}
                  required
                />
              </label>

              <label>
                Type
                <select
                  value={transactionTypeDraft}
                  onChange={(event) => setTransactionTypeDraft(event.target.value)}
                  disabled={isSavingTransaction || isExtractingReceipt || modalTypeOptions.length === 0}
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
                  disabled={isSavingTransaction || isExtractingReceipt}
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
                  disabled={isSavingTransaction || isExtractingReceipt}
                  required
                />
              </label>

              <fieldset className="recurrence-fieldset">
                <label className="recurrence-toggle-row">
                  <input
                    type="checkbox"
                    checked={isRecurringDraft}
                    onChange={(event) => {
                      const nextValue = event.target.checked;
                      setIsRecurringDraft(nextValue);

                      if (nextValue && !recurrenceStartDateDraft) {
                        setRecurrenceStartDateDraft(transactionDateDraft);
                      }
                    }}
                    disabled={isSavingTransaction || isExtractingReceipt || !canUseRecurringTransactions}
                  />
                  <span>Make this transaction recurring</span>
                </label>

                {isRecurringDraft && canUseRecurringTransactions ? (
                  <div className="recurrence-fields-grid">
                    <label>
                      Frequency
                      <select
                        value={recurrenceFrequencyDraft}
                        onChange={(event) => setRecurrenceFrequencyDraft(event.target.value as RecurrenceFrequency)}
                        disabled={isSavingTransaction || isExtractingReceipt}
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </label>

                    <label>
                      Starts on
                      <input
                        type="date"
                        value={recurrenceStartDateDraft}
                        onChange={(event) => setRecurrenceStartDateDraft(event.target.value)}
                        disabled={isSavingTransaction || isExtractingReceipt}
                      />
                    </label>

                    <label>
                      Ends
                      <select
                        value={recurrenceEndModeDraft}
                        onChange={(event) => setRecurrenceEndModeDraft(event.target.value as RecurrenceEndMode)}
                        disabled={isSavingTransaction || isExtractingReceipt}
                      >
                        <option value="never">Never</option>
                        <option value="onDate">On date</option>
                        <option value="afterOccurrences">After occurrences</option>
                      </select>
                    </label>

                    {recurrenceEndModeDraft === "onDate" ? (
                      <label>
                        End date
                        <input
                          type="date"
                          value={recurrenceEndDateDraft}
                          onChange={(event) => setRecurrenceEndDateDraft(event.target.value)}
                          disabled={isSavingTransaction || isExtractingReceipt}
                        />
                      </label>
                    ) : null}

                    {recurrenceEndModeDraft === "afterOccurrences" ? (
                      <label>
                        Occurrences
                        <input
                          type="number"
                          min={1}
                          step={1}
                          inputMode="numeric"
                          value={recurrenceOccurrencesDraft}
                          onChange={(event) => setRecurrenceOccurrencesDraft(event.target.value)}
                          disabled={isSavingTransaction || isExtractingReceipt}
                        />
                      </label>
                    ) : null}

                    <p className="recurrence-preview-note">Preview only for now. Automation will be enabled in a future backend update.</p>
                  </div>
                ) : null}

                {!canUseRecurringTransactions ? <p className="feedback">Recurring transactions are a subscriber feature.</p> : null}
              </fieldset>

              {transactionError ? <p className="feedback error">{transactionError}</p> : null}

              <div className="modal-actions">
                <button type="submit" disabled={isSavingTransaction || isExtractingReceipt || modalTypeOptions.length === 0}>
                  {isSavingTransaction ? "Saving..." : editingTransactionId ? "Save Changes" : "Save Transaction"}
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
