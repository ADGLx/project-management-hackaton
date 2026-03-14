import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays, faCamera, faCircleInfo, faFileCode, faFileCsv, faFilter, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useSearchParams } from "react-router-dom";
import MobileNav from "../components/MobileNav";
import PageSidePanel from "../components/PageSidePanel";
import {
  createMyHousehold,
  createMyHouseholdTransaction,
  deleteMyHouseholdTransaction,
  getMyHousehold,
  getMyHouseholdSettlement,
  getMyTransactionTypes,
  getMyHouseholdTransactions,
  inviteToHousehold,
  leaveMyHousehold,
  scanTransactionReceipt,
  updateMyHouseholdTransaction,
} from "../lib/api";
import { buildExportDateStamp, downloadTextFile, rowsToCsv } from "../lib/export";
import { useAuth } from "../state/AuthContext";
import type { Household, HouseholdSettlementSummary, HouseholdTransaction, TransactionType } from "../types/auth";

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

function currentMonthInputValue(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthValueToLabel(monthValue: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthValue)) {
    return monthValue;
  }

  const [yearText, monthText] = monthValue.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return monthValue;
  }

  const parsedDate = new Date(Date.UTC(year, month - 1, 1));

  if (Number.isNaN(parsedDate.getTime())) {
    return monthValue;
  }

  return parsedDate.toLocaleString("en-CA", { month: "long", timeZone: "UTC" });
}

type RecurrenceFrequency = "weekly" | "monthly" | "yearly";
type RecurrenceEndMode = "never" | "onDate" | "afterOccurrences";
type SortOption = "dateDesc" | "dateAsc" | "amountDesc" | "amountAsc";
type SettlementDetailsModal = "owedToYou" | "youOwe";

export default function HouseholdPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [household, setHousehold] = useState<Household | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");

  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const [leaveError, setLeaveError] = useState("");
  const [leaveSuccess, setLeaveSuccess] = useState("");
  const [isLeaving, setIsLeaving] = useState(false);
  const [isHouseholdInfoModalOpen, setIsHouseholdInfoModalOpen] = useState(false);

  const [householdTransactions, setHouseholdTransactions] = useState<HouseholdTransaction[]>([]);
  const [householdSettlement, setHouseholdSettlement] = useState<HouseholdSettlementSummary | null>(null);
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [financeError, setFinanceError] = useState("");
  const [isFinanceLoading, setIsFinanceLoading] = useState(false);

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
  const [participantUserIdsDraft, setParticipantUserIdsDraft] = useState<string[]>([]);
  const [isExtractingReceipt, setIsExtractingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const [isFilterSortOpen, setIsFilterSortOpen] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [selectedSortOption, setSelectedSortOption] = useState<SortOption>("dateDesc");
  const [selectedSettlementMonth, setSelectedSettlementMonth] = useState(currentMonthInputValue);
  const [settlementDetailsModal, setSettlementDetailsModal] = useState<SettlementDetailsModal | null>(null);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);
  const monthInputRef = useRef<HTMLInputElement | null>(null);

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

    for (const transaction of householdTransactions) {
      typeSet.add(transaction.type);
    }

    return Array.from(typeSet).sort((left, right) => left.localeCompare(right));
  }, [householdTransactions, transactionTypes]);

  const visibleHouseholdTransactions = useMemo(() => {
    const filteredTransactions =
      selectedTypeFilter === "all"
        ? householdTransactions
        : householdTransactions.filter((transaction) => transaction.type === selectedTypeFilter);
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
  }, [householdTransactions, selectedSortOption, selectedTypeFilter]);
  const owedToYouTotalCad = useMemo(
    () => (householdSettlement?.owedToYou ?? []).reduce((sum, line) => sum + line.amountCad, 0),
    [householdSettlement],
  );
  const youOweTotalCad = useMemo(
    () => (householdSettlement?.youOwe ?? []).reduce((sum, line) => sum + line.amountCad, 0),
    [householdSettlement],
  );

  async function loadHouseholdFinanceData() {
    if (!household) {
      return;
    }

    setFinanceError("");
    setIsFinanceLoading(true);

    const [transactionsResult, settlementResult, transactionTypesResult] = await Promise.all([
      getMyHouseholdTransactions(),
      getMyHouseholdSettlement(selectedSettlementMonth),
      getMyTransactionTypes(),
    ]);

    if (transactionsResult.ok) {
      setHouseholdTransactions(transactionsResult.transactions);
    }

    if (settlementResult.ok) {
      setHouseholdSettlement(settlementResult.summary);
    }

    if (transactionTypesResult.ok) {
      setTransactionTypes(transactionTypesResult.transactionTypes);
    }

    if (!transactionsResult.ok || !settlementResult.ok || !transactionTypesResult.ok) {
      setFinanceError("Shared household data could not be loaded right now.");
    }

    setIsFinanceLoading(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadHousehold() {
      setIsLoading(true);
      setLoadingError("");

      const result = await getMyHousehold();

      if (!isMounted) {
        return;
      }

      if (!result.ok) {
        setLoadingError(result.message);
      } else {
        setHousehold(result.household);
      }

      setIsLoading(false);
    }

    void loadHousehold();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!household) {
      setHouseholdTransactions([]);
      setHouseholdSettlement(null);
      setTransactionTypes([]);
      setFinanceError("");
      return;
    }

    void loadHouseholdFinanceData();
  }, [household, selectedSettlementMonth]);

  useEffect(() => {
    if (searchParams.get("new") !== "1" || !household) {
      return;
    }

    openTransactionModal();
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("new");
    setSearchParams(nextParams, { replace: true });
  }, [household, searchParams, setSearchParams, transactionTypes]);

  async function onCreateHousehold() {
    setCreateError("");
    setInviteSuccess("");
    setLeaveError("");
    setLeaveSuccess("");
    setFinanceError("");

    const name = newHouseholdName.trim();

    if (!name) {
      setCreateError("Please enter a household name.");
      return;
    }

    setIsCreating(true);
    const result = await createMyHousehold(name);
    setIsCreating(false);

    if (!result.ok) {
      setCreateError(result.message);
      return;
    }

    setHousehold(result.household);
    setNewHouseholdName("");
  }

  async function onInviteMember() {
    if (!household) {
      return;
    }

    setInviteError("");
    setInviteSuccess("");
    setLeaveError("");
    setLeaveSuccess("");
    setFinanceError("");

    const email = inviteEmail.trim().toLowerCase();

    if (!email) {
      setInviteError("Please enter a registered email.");
      return;
    }

    setIsInviting(true);
    const result = await inviteToHousehold(household.id, email);
    setIsInviting(false);

    if (!result.ok) {
      setInviteError(result.message);
      return;
    }

    setHousehold(result.household);
    setInviteEmail("");
    setInviteSuccess("Invite sent. The user will appear in the members list once they accept the invitation.");
  }

  async function onLeaveHousehold() {
    setLeaveError("");
    setLeaveSuccess("");
    setInviteSuccess("");

    setIsLeaving(true);
    const result = await leaveMyHousehold();
    setIsLeaving(false);

    if (!result.ok) {
      setLeaveError(result.message);
      return;
    }

    setHousehold(null);
    setInviteEmail("");
    setIsHouseholdInfoModalOpen(false);
    setLeaveSuccess("You left the household.");
  }

  function closeHouseholdInfoModal() {
    if (isInviting || isLeaving) {
      return;
    }

    setIsHouseholdInfoModalOpen(false);
  }

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
    setParticipantUserIdsDraft((household?.members ?? []).map((member) => member.userId));
    setEditingTransactionId(null);
    setIsTransactionModalOpen(true);
  }

  function openEditTransactionModal(transaction: HouseholdTransaction) {
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
    setParticipantUserIdsDraft(transaction.participants.map((participant) => participant.userId));
    setEditingTransactionId(transaction.id);
    setIsTransactionModalOpen(true);
  }

  function toggleParticipant(userId: string) {
    setParticipantUserIdsDraft((current) => {
      if (current.includes(userId)) {
        return current.filter((id) => id !== userId);
      }

      return [...current, userId];
    });
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

  async function onSaveHouseholdTransaction() {
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

    if (participantUserIdsDraft.length === 0) {
      setTransactionError("Select at least one member who should pay for this transaction.");
      return;
    }

    const payload = {
      amountCad,
      type: transactionTypeDraft.trim(),
      description: transactionDescriptionDraft.trim(),
      transactionDate: transactionDateDraft,
      participantUserIds: participantUserIdsDraft,
    };

    setIsSavingTransaction(true);
    const result = editingTransactionId
      ? await updateMyHouseholdTransaction(editingTransactionId, payload)
      : await createMyHouseholdTransaction(payload);
    setIsSavingTransaction(false);

    if (!result.ok) {
      setTransactionError(result.message);
      return;
    }

    await loadHouseholdFinanceData();
    setIsTransactionModalOpen(false);
    setEditingTransactionId(null);
  }

  async function onDeleteHouseholdTransaction(transactionId: string) {
    setTransactionError("");
    setIsDeletingTransactionId(transactionId);

    const result = await deleteMyHouseholdTransaction(transactionId);
    setIsDeletingTransactionId(null);

    if (!result.ok) {
      setTransactionError(result.message);
      return;
    }

    await loadHouseholdFinanceData();
  }

  function onSettlementMonthChange(event: ChangeEvent<HTMLInputElement>) {
    const nextMonth = event.target.value;

    if (!nextMonth) {
      return;
    }

    setSelectedSettlementMonth(nextMonth);
  }

  function onMonthPickerButtonClick() {
    const monthInput = monthInputRef.current;

    if (!monthInput) {
      return;
    }

    if ("showPicker" in monthInput && typeof monthInput.showPicker === "function") {
      monthInput.showPicker();
      return;
    }

    monthInput.click();
    monthInput.focus();
  }

  function closeSettlementDetailsModal() {
    setSettlementDetailsModal(null);
  }

  function exportHouseholdTransactionsAsCsv() {
    if (!canExportTransactions || householdTransactions.length === 0) {
      return;
    }

    const rows = householdTransactions.map((transaction) => ({
      transactionDate: transaction.transactionDate,
      amountCad: transaction.amountCad,
      type: transaction.type,
      description: transaction.description,
      createdByName: transaction.createdByName,
      participants: transaction.participants.map((participant) => participant.name).join(", "),
    }));
    const csv = rowsToCsv(rows);
    const dateStamp = buildExportDateStamp();
    downloadTextFile(`household-transactions-${dateStamp}.csv`, csv, "text/csv;charset=utf-8");
  }

  function exportHouseholdTransactionsAsJson() {
    if (!canExportTransactions || householdTransactions.length === 0) {
      return;
    }

    const payload = householdTransactions.map((transaction) => ({
      transactionDate: transaction.transactionDate,
      amountCad: transaction.amountCad,
      type: transaction.type,
      description: transaction.description,
      createdByName: transaction.createdByName,
      participants: transaction.participants.map((participant) => participant.name),
    }));
    const dateStamp = buildExportDateStamp();
    downloadTextFile(`household-transactions-${dateStamp}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeHouseholdInfoModal();
        closeSettlementDetailsModal();
      }
    }

    if (!isHouseholdInfoModalOpen && !settlementDetailsModal) {
      return;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isHouseholdInfoModalOpen, isInviting, isLeaving, settlementDetailsModal]);

  return (
    <main className="home-shell household-shell">
      <section className="page-title-row page-title-actions">
        <h1 className="dashboard-title">
          <PageSidePanel />
          <span className="dashboard-title-icon" aria-hidden="true">
            ⚜
          </span>
          <span>Household</span>
          {household ? (
            <button
              className="dashboard-title-info-button"
              type="button"
              onClick={() => setIsHouseholdInfoModalOpen(true)}
              aria-label="Open household info"
              title="Household Info"
            >
              <FontAwesomeIcon icon={faCircleInfo} aria-hidden="true" />
            </button>
          ) : null}
        </h1>
      </section>

      <section className="dashboard-card">
        {isLoading ? (
          <p>Loading household...</p>
        ) : household ? (() => {
          const isCreator = household.createdByUserId === user?.id;

          return (
            <>
                <div className="household-finance-panel">
                  <div className="household-month-row">
                    <h2 className="household-month-title">{monthValueToLabel(selectedSettlementMonth)}</h2>
                    <button
                      className="secondary-button household-month-picker-button"
                      type="button"
                      onClick={onMonthPickerButtonClick}
                      aria-label="Select settlement month"
                      title="Select month"
                    >
                      <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" />
                    </button>
                    <input
                      ref={monthInputRef}
                      id="household-month-picker"
                      className="visually-hidden"
                      type="month"
                      value={selectedSettlementMonth}
                      onChange={onSettlementMonthChange}
                      max={currentMonthInputValue()}
                      aria-label="Select settlement month"
                    />
                  </div>

                  <div className="household-settlement-grid">
                    <section className="household-settlement-card" aria-labelledby="owed-to-you-title">
                      <div className="household-settlement-card-header">
                        <h3 id="owed-to-you-title">Owed to you</h3>
                      </div>

                      <p className="household-settlement-total">{formattedCurrency.format(owedToYouTotalCad)}</p>

                      <button
                        className="secondary-button household-settlement-details-button"
                        type="button"
                        onClick={() => setSettlementDetailsModal("owedToYou")}
                      >
                        Details
                      </button>
                    </section>

                    <section className="household-settlement-card" aria-labelledby="you-owe-title">
                      <div className="household-settlement-card-header">
                        <h3 id="you-owe-title">You owe</h3>
                      </div>

                      <p className="household-settlement-total">{formattedCurrency.format(youOweTotalCad)}</p>

                      <button
                        className="secondary-button household-settlement-details-button"
                        type="button"
                        onClick={() => setSettlementDetailsModal("youOwe")}
                      >
                        Details
                      </button>
                    </section>
                  </div>

                  {settlementDetailsModal ? (
                    <div className="modal-overlay" role="presentation" onClick={closeSettlementDetailsModal}>
                      <section
                        className="modal-card household-settlement-details-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="household-settlement-details-title"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="page-title-row page-title-actions">
                          <h3 id="household-settlement-details-title">{settlementDetailsModal === "owedToYou" ? "Owed to you" : "You owe"}</h3>
                          <button className="secondary-button" type="button" onClick={closeSettlementDetailsModal}>
                            Close
                          </button>
                        </div>

                        <p className="household-settlement-detail-note">
                          This is the net balance for {selectedSettlementMonth}, calculated from all shared transactions and split participants.
                        </p>

                        {settlementDetailsModal === "owedToYou" ? (
                          householdSettlement?.owedToYou.length ? (
                            <ul className="household-owe-list">
                              {householdSettlement.owedToYou.map((line) => (
                                <li key={`detail-${line.fromUserId}-${line.amountCad}`}>
                                  {line.fromName} owes you <strong>{formattedCurrency.format(line.amountCad)}</strong>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>No one owes you.</p>
                          )
                        ) : householdSettlement?.youOwe.length ? (
                          <ul className="household-owe-list">
                            {householdSettlement.youOwe.map((line) => (
                              <li key={`detail-${line.toUserId}-${line.amountCad}`}>
                                You owe {line.toName} <strong>{formattedCurrency.format(line.amountCad)}</strong>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>You owe no one.</p>
                        )}
                      </section>
                    </div>
                  ) : null}

                  <div className="page-title-row page-title-actions">
                    <button
                      className="secondary-button filter-sort-button filter-sort-icon-button"
                      type="button"
                      onClick={() => setIsFilterSortOpen((current) => !current)}
                      aria-expanded={isFilterSortOpen}
                      aria-controls="shared-transactions-filter-sort-panel"
                      aria-label="Toggle filter and sort"
                      title="Filter & Sort"
                    >
                      <FontAwesomeIcon icon={faFilter} aria-hidden="true" />
                    </button>
                    <div className="card-top-right-actions">
                      <div className="export-actions" role="group" aria-label="Export household transactions">
                        <button
                          className="secondary-button export-button"
                          type="button"
                          onClick={exportHouseholdTransactionsAsCsv}
                          disabled={!canExportTransactions || householdTransactions.length === 0}
                          aria-label="Export household transactions as CSV"
                        >
                          <FontAwesomeIcon icon={faFileCsv} aria-hidden="true" />
                          <span>CSV</span>
                        </button>
                        <button
                          className="secondary-button export-button"
                          type="button"
                          onClick={exportHouseholdTransactionsAsJson}
                          disabled={!canExportTransactions || householdTransactions.length === 0}
                          aria-label="Export household transactions as JSON"
                        >
                          <FontAwesomeIcon icon={faFileCode} aria-hidden="true" />
                          <span>JSON</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {isFilterSortOpen ? (
                    <div className="filter-sort-panel" id="shared-transactions-filter-sort-panel">
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

                {isFinanceLoading ? (
                  <p>Loading shared data...</p>
                ) : visibleHouseholdTransactions.length > 0 ? (
                  <div className="transactions-list" role="list">
                    {visibleHouseholdTransactions.map((transaction) => (
                      <article className="transaction-row" role="listitem" key={transaction.id}>
                        <div className="transaction-main">
                          <p className="transaction-merchant">{transaction.type}</p>
                          <p className="transaction-meta">{transaction.description}</p>
                          <p className="transaction-meta">Added by {transaction.createdByName}</p>
                          <p className="transaction-meta">
                            Split with {transaction.participants.map((participant) => participant.name).join(", ") || "nobody"}
                          </p>
                        </div>
                        <p className="transaction-date">{formatDateForDisplay(transaction.transactionDate)}</p>
                        <p className="transaction-amount">{formattedCurrency.format(transaction.amountCad)}</p>
                        <div className="transaction-actions">
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => openEditTransactionModal(transaction)}
                            disabled={isSavingTransaction || isDeletingTransactionId === transaction.id}
                          >
                            Edit
                          </button>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => void onDeleteHouseholdTransaction(transaction.id)}
                            disabled={isDeletingTransactionId === transaction.id || isSavingTransaction}
                          >
                            {isDeletingTransactionId === transaction.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>
                    {householdTransactions.length > 0
                      ? "No shared transactions match your current filters."
                      : "No shared transactions yet."}
                  </p>
                )}

                {transactionError && !isTransactionModalOpen ? <p className="feedback error">{transactionError}</p> : null}
              </div>

              {isTransactionModalOpen ? (
                <div className="modal-overlay" role="presentation" onClick={closeTransactionModal}>
                  <section
                    className="modal-card"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="household-transaction-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="modal-title-row">
                      <button
                        className="secondary-button modal-close-button"
                        type="button"
                        onClick={closeTransactionModal}
                        disabled={isSavingTransaction || isExtractingReceipt}
                        aria-label="Close shared transaction modal"
                        title="Close"
                      >
                        <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
                      </button>
                      <h2 id="household-transaction-modal-title">{editingTransactionId ? "Edit Shared Transaction" : "Add Shared Transaction"}</h2>
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
                        void onSaveHouseholdTransaction();
                      }}
                    >
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

                      <label className="transaction-description-field">
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

                      <fieldset className="household-participants-fieldset">
                        <legend>Who should pay for this transaction?</legend>
                        <p className="transaction-meta">Select members included in the split. You can include or exclude yourself.</p>
                        <div className="household-participants-grid">
                          {(household?.members ?? []).map((member) => {
                            const checked = participantUserIdsDraft.includes(member.userId);

                            return (
                              <label key={member.userId} className={`household-participant-pill${checked ? " selected" : ""}`}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleParticipant(member.userId)}
                                    disabled={isSavingTransaction || isExtractingReceipt}
                                  />
                                  <span>{member.name}</span>
                                </label>
                            );
                          })}
                        </div>
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

              {isHouseholdInfoModalOpen ? (
                <div className="modal-overlay" role="presentation" onClick={closeHouseholdInfoModal}>
                  <section
                    className="modal-card household-info-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="household-info-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="page-title-row page-title-actions">
                      <h2 id="household-info-modal-title">Household Info</h2>
                      <button className="secondary-button" type="button" onClick={closeHouseholdInfoModal} disabled={isInviting || isLeaving}>
                        Close
                      </button>
                    </div>

                    <p>
                      Household name: <strong>{household.name}</strong>
                    </p>

                    <div className="household-members">
                      <h3>Members</h3>
                      <ul className="household-member-list">
                        {household.members.map((member) => (
                          <li key={member.userId} className="household-member-row">
                            <span>{member.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {isCreator ? (
                      <div className="household-invite-form">
                        <label htmlFor="invite-email">Invite member by email</label>
                        <div className="household-inline-form">
                          <input
                            id="invite-email"
                            type="email"
                            value={inviteEmail}
                            onChange={(event) => setInviteEmail(event.target.value)}
                            placeholder="name@example.com"
                            disabled={isInviting}
                          />
                          <button type="button" onClick={onInviteMember} disabled={isInviting}>
                            {isInviting ? "Inviting..." : "Invite"}
                          </button>
                        </div>
                        {inviteError ? <p className="feedback error">{inviteError}</p> : null}
                        {inviteSuccess ? <p className="feedback success">{inviteSuccess}</p> : null}
                      </div>
                    ) : null}

                    <button className="secondary-button" type="button" onClick={onLeaveHousehold} disabled={isLeaving}>
                      {isLeaving ? "Leaving..." : "Leave household"}
                    </button>
                  </section>
                </div>
              ) : null}
            </>
          );
        })() : (
          <>
            <h2>Create your household</h2>
            <p>Start by creating a household, then invite registered users by email.</p>

            <div className="household-inline-form">
              <input
                type="text"
                value={newHouseholdName}
                onChange={(event) => setNewHouseholdName(event.target.value)}
                placeholder="Ex: The Rivera Household"
                disabled={isCreating}
                maxLength={80}
              />
              <button type="button" onClick={onCreateHousehold} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create"}
              </button>
            </div>
            {createError ? <p className="feedback error">{createError}</p> : null}
          </>
        )}

        {leaveError ? <p className="feedback error">{leaveError}</p> : null}
        {leaveSuccess ? <p className="feedback success">{leaveSuccess}</p> : null}
        {financeError ? <p className="feedback error">{financeError}</p> : null}
        {loadingError ? <p className="feedback error">{loadingError}</p> : null}
      </section>

      <MobileNav />
    </main>
  );
}
