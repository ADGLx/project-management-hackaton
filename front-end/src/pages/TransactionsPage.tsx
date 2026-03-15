import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faFileCode, faFileCsv, faFilter, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import AddTransactionFab from "../components/AddTransactionFab";
import MobileNav from "../components/MobileNav";
import PageSidePanel from "../components/PageSidePanel";
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

function formatDateForDisplay(dateValue: string, locale: string): string {
  const [year, month, day] = dateValue.split("-");

  if (!year || !month || !day) {
    return dateValue;
  }

  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isNaN(date.getTime())
    ? dateValue
    : new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "UTC",
      }).format(date);
}

type RecurrenceFrequency = "weekly" | "monthly" | "yearly";
type RecurrenceEndMode = "never" | "onDate" | "afterOccurrences";
type SortOption = "dateDesc" | "dateAsc" | "amountDesc" | "amountAsc";
type CategoryFilterOption = "all" | "fixed" | "variable";
type TransactionCategory = "Fixed" | "Variable";

const FIXED_TRANSACTION_TYPES = new Set(["housing", "transport", "utility"]);

function classifyTransactionCategory(type: string): TransactionCategory {
  const normalizedType = type.trim().toLowerCase();
  return FIXED_TRANSACTION_TYPES.has(normalizedType) ? "Fixed" : "Variable";
}

export default function TransactionsPage() {
  const { t, i18n } = useTranslation();
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
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<CategoryFilterOption>("all");
  const [selectedSortOption, setSelectedSortOption] = useState<SortOption>("dateDesc");
  const [selectedTransaction, setSelectedTransaction] = useState<UserTransaction | null>(null);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  const locale = i18n.language === "fr-CA" ? "fr-CA" : "en-CA";
  const labelForCategory = (category: TransactionCategory): string => (category === "Fixed" ? t("transactions.fixed") : t("transactions.variable"));
  const formattedCurrency = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 2,
      }),
    [locale],
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
    const filteredByCategory =
      selectedCategoryFilter === "all"
        ? transactions
        : transactions.filter((transaction) => {
            const category = classifyTransactionCategory(transaction.type);
            return selectedCategoryFilter === "fixed" ? category === "Fixed" : category === "Variable";
          });
    const filteredTransactions =
      selectedTypeFilter === "all"
        ? filteredByCategory
        : filteredByCategory.filter((transaction) => transaction.type === selectedTypeFilter);
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
  }, [selectedCategoryFilter, selectedSortOption, selectedTypeFilter, transactions]);

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
      setDataError(t("errors.failedLoadTransactions"));
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
        setDataError(t("errors.failedLoadTransactions"));
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [t]);

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
        if (selectedTransaction) {
          setSelectedTransaction(null);
          return;
        }

        if (isSavingTransaction || isExtractingReceipt) {
          return;
        }

        setIsTransactionModalOpen(false);
        setTransactionError("");
        setEditingTransactionId(null);
      }
    }

    if (!isTransactionModalOpen && !selectedTransaction) {
      return;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isExtractingReceipt, isTransactionModalOpen, isSavingTransaction, selectedTransaction]);

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

  function openTransactionDetailsModal(transaction: UserTransaction) {
    setSelectedTransaction(transaction);
  }

  function closeTransactionDetailsModal() {
    setSelectedTransaction(null);
  }

  function onEditFromTransactionDetails() {
    if (!selectedTransaction) {
      return;
    }

    closeTransactionDetailsModal();
    openEditTransactionModal(selectedTransaction);
  }

  async function onDeleteFromTransactionDetails() {
    if (!selectedTransaction) {
      return;
    }

    const didDelete = await onDeleteTransaction(selectedTransaction.id);

    if (didDelete) {
      closeTransactionDetailsModal();
    }
  }

  function onScanReceiptClick() {
    if (!canScanReceipt) {
      setReceiptError(t("transactions.upgradeForReceipt"));
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
      setTransactionError(t("errors.amountGreaterThanZero"));
      return;
    }

    if (!transactionTypeDraft.trim()) {
      setTransactionError(t("errors.typeRequired"));
      return;
    }

    if (!transactionDescriptionDraft.trim()) {
      setTransactionError(t("errors.descriptionRequired"));
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDateDraft)) {
      setTransactionError(t("errors.invalidDateFormat"));
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

  async function onDeleteTransaction(transactionId: string): Promise<boolean> {
    setTransactionError("");
    setIsDeletingTransactionId(transactionId);
    const result = await deleteMyTransaction(transactionId);

    if (!result.ok) {
      setTransactionError(result.message);
      setIsDeletingTransactionId(null);
      return false;
    }

    await loadTransactionsData();
    setIsDeletingTransactionId(null);
    return true;
  }

  function exportTransactionsAsCsv() {
    if (!canExportTransactions || transactions.length === 0) {
      return;
    }

    const rows = transactions.map((transaction) => ({
      transactionDate: transaction.transactionDate,
      amountCad: transaction.amountCad,
      category: classifyTransactionCategory(transaction.type),
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
      category: classifyTransactionCategory(transaction.type),
      type: transaction.type,
      description: transaction.description,
    }));
    const dateStamp = buildExportDateStamp();
    downloadTextFile(`personal-transactions-${dateStamp}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  }

  return (
    <main className="home-shell">
      <section className="page-title-row page-title-actions">
        <h1 className="dashboard-title">
          <PageSidePanel />
          <img className="dashboard-title-icon" src="/diversity.svg" alt="" aria-hidden="true" />
          <span>{t("transactions.title")}</span>
        </h1>
      </section>

      <section className="dashboard-card transactions-card">
        <div className="page-title-row page-title-actions">
          <button
            className="secondary-button filter-sort-button filter-sort-icon-button"
            type="button"
            onClick={() => setIsFilterSortOpen((current) => !current)}
            aria-expanded={isFilterSortOpen}
            aria-controls="transactions-filter-sort-panel"
            aria-label={t("transactions.toggleFilterSort")}
            title={t("transactions.filterSortTitle")}
          >
            <FontAwesomeIcon icon={faFilter} aria-hidden="true" />
          </button>
          <div className="card-top-right-actions">
            <div className="export-actions" role="group" aria-label={t("transactions.exportTransactions")}>
              <button
                className="secondary-button export-button"
                type="button"
                onClick={exportTransactionsAsCsv}
                disabled={!canExportTransactions || transactions.length === 0}
                aria-label={t("transactions.exportCsv")}
              >
                <FontAwesomeIcon icon={faFileCsv} aria-hidden="true" />
                <span>CSV</span>
              </button>
              <button
                className="secondary-button export-button"
                type="button"
                onClick={exportTransactionsAsJson}
                disabled={!canExportTransactions || transactions.length === 0}
                aria-label={t("transactions.exportJson")}
              >
                <FontAwesomeIcon icon={faFileCode} aria-hidden="true" />
                <span>JSON</span>
              </button>
            </div>
          </div>
        </div>

        {isFilterSortOpen ? (
          <div className="filter-sort-panel" id="transactions-filter-sort-panel">
            <label>
              {t("transactions.category")}
              <select value={selectedCategoryFilter} onChange={(event) => setSelectedCategoryFilter(event.target.value as CategoryFilterOption)}>
                <option value="all">{t("transactions.allCategories")}</option>
                <option value="fixed">{t("transactions.fixed")}</option>
                <option value="variable">{t("transactions.variable")}</option>
              </select>
            </label>

            <label>
              {t("transactions.filterByType")}
              <select value={selectedTypeFilter} onChange={(event) => setSelectedTypeFilter(event.target.value)}>
                <option value="all">{t("transactions.allTypes")}</option>
                {availableTypeFilters.map((typeName) => (
                  <option key={typeName} value={typeName}>
                    {typeName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t("transactions.sortBy")}
              <select value={selectedSortOption} onChange={(event) => setSelectedSortOption(event.target.value as SortOption)}>
                <option value="dateDesc">{t("transactions.dateNewest")}</option>
                <option value="dateAsc">{t("transactions.dateOldest")}</option>
                <option value="amountDesc">{t("transactions.amountHighest")}</option>
                <option value="amountAsc">{t("transactions.amountLowest")}</option>
              </select>
            </label>
          </div>
        ) : null}

        {!canExportTransactions ? <p className="feedback">{t("transactions.exportSubscriberOnly")}</p> : null}

        {visibleTransactions.length > 0 ? (
          <div className="transactions-list" role="list">
            {visibleTransactions.map((transaction) => (
              <button
                className="household-transaction-row"
                type="button"
                role="listitem"
                key={transaction.id}
                onClick={() => openTransactionDetailsModal(transaction)}
                aria-label={t("transactions.openDetailsFor", { description: transaction.description })}
              >
                <span className="household-transaction-main-line">
                  <span className="household-transaction-description">{transaction.description}</span>
                  <span className="household-transaction-amount">{formattedCurrency.format(transaction.amountCad)}</span>
                </span>
                <span className="household-transaction-meta-line">
                  <span>
                    {t("transactions.category")}: {labelForCategory(classifyTransactionCategory(transaction.type))}
                  </span>
                  <span className="household-transaction-type">
                    {transaction.type} • {formatDateForDisplay(transaction.transactionDate, locale)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p>
            {transactions.length > 0
              ? t("transactions.noMatches")
              : t("transactions.noTransactionsYet")}
          </p>
        )}
      </section>

      {dataError ? <p className="feedback error">{dataError}</p> : null}
      {transactionError && !isTransactionModalOpen ? <p className="feedback error">{transactionError}</p> : null}

      {selectedTransaction ? (
        <div className="modal-overlay" role="presentation" onClick={closeTransactionDetailsModal}>
          <section
            className="modal-card household-transaction-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-title-row">
              <button
                className="secondary-button modal-close-button"
                type="button"
                onClick={closeTransactionDetailsModal}
                aria-label={t("transactions.closeDetailsModal")}
                title={t("common.close")}
              >
                <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
              </button>
              <h2 id="transaction-details-title">{t("transactions.transactionDetails")}</h2>
            </div>

            <div className="household-transaction-details-grid">
              <p>
                <span className="household-transaction-detail-label">{t("transactions.description")}</span>
                <strong className="household-transaction-detail-value">{selectedTransaction.description}</strong>
              </p>
              <p>
                <span className="household-transaction-detail-label">{t("home.amount")}</span>
                <strong className="household-transaction-detail-value">{formattedCurrency.format(selectedTransaction.amountCad)}</strong>
              </p>
              <p>
                <span className="household-transaction-detail-label">{t("transactions.category")}</span>
                <strong className="household-transaction-detail-value">{labelForCategory(classifyTransactionCategory(selectedTransaction.type))}</strong>
              </p>
              <p>
                <span className="household-transaction-detail-label">{t("transactions.type")}</span>
                <strong className="household-transaction-detail-value">{selectedTransaction.type}</strong>
              </p>
              <p>
                <span className="household-transaction-detail-label">{t("transactions.date")}</span>
                <strong className="household-transaction-detail-value">{formatDateForDisplay(selectedTransaction.transactionDate, locale)}</strong>
              </p>
            </div>

            <div className="household-transaction-details-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={onEditFromTransactionDetails}
                disabled={isSavingTransaction || isDeletingTransactionId === selectedTransaction.id}
              >
                {t("common.edit")}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => void onDeleteFromTransactionDetails()}
                disabled={isDeletingTransactionId === selectedTransaction.id || isSavingTransaction}
              >
                {isDeletingTransactionId === selectedTransaction.id ? t("transactions.deleting") : t("common.delete")}
              </button>
            </div>
          </section>
        </div>
      ) : null}

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
                aria-label={t("transactions.closeModal")}
                title={t("common.close")}
              >
                <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
              </button>
              <h2 id="transaction-modal-title">{editingTransactionId ? t("transactions.editTransaction") : t("transactions.addTransaction")}</h2>
              {!editingTransactionId ? (
                <button
                  className="secondary-button scan-receipt-button"
                  type="button"
                  onClick={onScanReceiptClick}
                  disabled={isSavingTransaction || isExtractingReceipt || modalTypeOptions.length === 0 || !canScanReceipt}
                  aria-label={isExtractingReceipt ? t("transactions.scanningReceipt") : canScanReceipt ? t("transactions.scanReceipt") : t("transactions.subscribersOnly")}
                  title={isExtractingReceipt ? t("transactions.scanningReceipt") : canScanReceipt ? t("transactions.scanReceipt") : t("transactions.subscribersOnly")}
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
              <p className="feedback">{t("transactions.upgradeForReceipt")}</p>
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
                {t("transactions.date")}
                <input
                  type="date"
                  value={transactionDateDraft}
                  onChange={(event) => setTransactionDateDraft(event.target.value)}
                  disabled={isSavingTransaction || isExtractingReceipt}
                  required
                />
              </label>

              <label>
                {t("transactions.type")}
                <select
                  value={transactionTypeDraft}
                  onChange={(event) => setTransactionTypeDraft(event.target.value)}
                  disabled={isSavingTransaction || isExtractingReceipt || modalTypeOptions.length === 0}
                  required
                >
                  {modalTypeOptions.length === 0 ? <option value="">{t("transactions.noTypesAvailable")}</option> : null}
                  {modalTypeOptions.map((typeName) => (
                    <option key={typeName} value={typeName}>
                      {typeName}
                    </option>
                  ))}
                </select>
              </label>

              {modalTypeOptions.length === 0 ? (
                <p className="feedback error">{t("transactions.noTypesFound")}</p>
              ) : null}

              <label>
                {t("transactions.amountCad")}
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

              <label className="transaction-description-field">
                {t("transactions.description")}
                <input
                  type="text"
                  value={transactionDescriptionDraft}
                  onChange={(event) => setTransactionDescriptionDraft(event.target.value)}
                  disabled={isSavingTransaction || isExtractingReceipt}
                  placeholder={t("transactions.shortNote")}
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
                  <span>{t("transactions.recurringToggle")}</span>
                </label>

                {isRecurringDraft && canUseRecurringTransactions ? (
                  <div className="recurrence-fields-grid">
                    <label>
                      {t("transactions.frequency")}
                      <select
                        value={recurrenceFrequencyDraft}
                        onChange={(event) => setRecurrenceFrequencyDraft(event.target.value as RecurrenceFrequency)}
                        disabled={isSavingTransaction || isExtractingReceipt}
                      >
                        <option value="weekly">{t("transactions.weekly")}</option>
                        <option value="monthly">{t("transactions.monthly")}</option>
                        <option value="yearly">{t("transactions.yearly")}</option>
                      </select>
                    </label>

                    <label>
                      {t("transactions.startsOn")}
                      <input
                        type="date"
                        value={recurrenceStartDateDraft}
                        onChange={(event) => setRecurrenceStartDateDraft(event.target.value)}
                        disabled={isSavingTransaction || isExtractingReceipt}
                      />
                    </label>

                    <label>
                      {t("transactions.ends")}
                      <select
                        value={recurrenceEndModeDraft}
                        onChange={(event) => setRecurrenceEndModeDraft(event.target.value as RecurrenceEndMode)}
                        disabled={isSavingTransaction || isExtractingReceipt}
                      >
                        <option value="never">{t("transactions.never")}</option>
                        <option value="onDate">{t("transactions.onDate")}</option>
                        <option value="afterOccurrences">{t("transactions.afterOccurrences")}</option>
                      </select>
                    </label>

                    {recurrenceEndModeDraft === "onDate" ? (
                      <label>
                        {t("transactions.endDate")}
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
                        {t("transactions.occurrences")}
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

                    <p className="recurrence-preview-note">{t("transactions.recurrencePreview")}</p>
                  </div>
                ) : null}

                {!canUseRecurringTransactions ? <p className="feedback">{t("transactions.recurringSubscriberOnly")}</p> : null}
              </fieldset>

              {transactionError ? <p className="feedback error">{transactionError}</p> : null}

              <div className="modal-actions">
                <button type="submit" disabled={isSavingTransaction || isExtractingReceipt || modalTypeOptions.length === 0}>
                  {isSavingTransaction ? t("home.saving") : editingTransactionId ? t("transactions.saveChanges") : t("transactions.saveTransaction")}
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
