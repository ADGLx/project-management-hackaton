import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import MobileNav from "../components/MobileNav";
import {
  createMyHousehold,
  createMyHouseholdTransaction,
  deleteMyHouseholdTransaction,
  getMyHousehold,
  getMyHouseholdBudget,
  getMyHouseholdTransactions,
  inviteToHousehold,
  leaveMyHousehold,
  saveMyHouseholdBudget,
  updateMyHouseholdTransaction,
} from "../lib/api";
import { useAuth } from "../state/AuthContext";
import type { Household, HouseholdTransaction } from "../types/auth";

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

export default function HouseholdPage() {
  const { user } = useAuth();
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

  const [householdBudgetAmountCad, setHouseholdBudgetAmountCad] = useState<number | null>(null);
  const [householdTransactions, setHouseholdTransactions] = useState<HouseholdTransaction[]>([]);
  const [financeError, setFinanceError] = useState("");
  const [isFinanceLoading, setIsFinanceLoading] = useState(false);

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

  const currentMonthPrefix = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const currentMonthTransactions = useMemo(
    () => householdTransactions.filter((transaction) => transaction.transactionDate.startsWith(currentMonthPrefix)),
    [currentMonthPrefix, householdTransactions],
  );

  const contributionByUser = useMemo(() => {
    const byUser = new Map<string, { userId: string; name: string; amountCad: number }>();

    for (const member of household?.members ?? []) {
      byUser.set(member.userId, {
        userId: member.userId,
        name: member.name,
        amountCad: 0,
      });
    }

    for (const transaction of currentMonthTransactions) {
      const existing = byUser.get(transaction.createdByUserId);

      if (existing) {
        existing.amountCad += transaction.amountCad;
        continue;
      }

      byUser.set(transaction.createdByUserId, {
        userId: transaction.createdByUserId,
        name: transaction.createdByName,
        amountCad: transaction.amountCad,
      });
    }

    return Array.from(byUser.values()).sort((left, right) => right.amountCad - left.amountCad);
  }, [currentMonthTransactions, household?.members]);

  const monthTotals = useMemo(() => {
    const totalSpentCad = currentMonthTransactions.reduce((sum, transaction) => sum + transaction.amountCad, 0);
    const memberCount = household?.members.length ?? 0;
    const equalShareCad = memberCount > 0 ? totalSpentCad / memberCount : 0;
    const currentUserPaidCad =
      user?.id
        ? currentMonthTransactions
            .filter((transaction) => transaction.createdByUserId === user.id)
            .reduce((sum, transaction) => sum + transaction.amountCad, 0)
        : 0;

    return {
      totalSpentCad,
      equalShareCad,
      currentUserPaidCad,
      netCad: currentUserPaidCad - equalShareCad,
    };
  }, [currentMonthTransactions, household?.members.length, user?.id]);

  const settlementRows = useMemo(
    () => contributionByUser.map((entry) => ({ ...entry, netCad: entry.amountCad - monthTotals.equalShareCad })),
    [contributionByUser, monthTotals.equalShareCad],
  );

  async function loadHouseholdFinanceData() {
    if (!household) {
      return;
    }

    setFinanceError("");
    setIsFinanceLoading(true);

    const [budgetResult, transactionsResult] = await Promise.all([getMyHouseholdBudget(), getMyHouseholdTransactions()]);

    if (budgetResult.ok) {
      setHouseholdBudgetAmountCad(budgetResult.budgetAmountCad);
    }

    if (transactionsResult.ok) {
      setHouseholdTransactions(transactionsResult.transactions);
    }

    if (!budgetResult.ok || !transactionsResult.ok) {
      setFinanceError("Some shared household data could not be loaded right now.");
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
      setHouseholdBudgetAmountCad(null);
      setHouseholdTransactions([]);
      setIsEditingBudget(false);
      setBudgetDraft("");
      setBudgetError("");
      setFinanceError("");
      return;
    }

    void loadHouseholdFinanceData();
  }, [household]);

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
    setInviteSuccess("Member added to household.");
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

  function startEditingBudget() {
    setBudgetError("");
    setBudgetDraft(typeof householdBudgetAmountCad === "number" ? String(householdBudgetAmountCad) : "");
    setIsEditingBudget(true);
  }

  function cancelEditingBudget() {
    if (isSavingBudget) {
      return;
    }

    setBudgetError("");
    setIsEditingBudget(false);
  }

  async function onSaveHouseholdBudget() {
    setBudgetError("");

    const parsedBudget = Number(budgetDraft);

    if (!Number.isInteger(parsedBudget) || parsedBudget <= 0) {
      setBudgetError("Please enter a whole number greater than 0.");
      return;
    }

    setIsSavingBudget(true);
    const result = await saveMyHouseholdBudget(parsedBudget);
    setIsSavingBudget(false);

    if (!result.ok) {
      setBudgetError(result.message);
      return;
    }

    setHouseholdBudgetAmountCad(result.budgetAmountCad);
    setIsEditingBudget(false);
  }

  function openTransactionModal() {
    setTransactionError("");
    setTransactionAmountDraft("");
    setTransactionTypeDraft("");
    setTransactionDescriptionDraft("");
    setTransactionDateDraft(todayAsDateInputValue());
    setEditingTransactionId(null);
    setIsTransactionModalOpen(true);
  }

  function openEditTransactionModal(transaction: HouseholdTransaction) {
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

    const payload = {
      amountCad,
      type: transactionTypeDraft.trim(),
      description: transactionDescriptionDraft.trim(),
      transactionDate: transactionDateDraft,
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeHouseholdInfoModal();
      }
    }

    if (!isHouseholdInfoModalOpen) {
      return;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isHouseholdInfoModalOpen, isInviting, isLeaving]);

  return (
    <main className="home-shell">
      <section className="page-title-row page-title-actions">
        <h1>Household</h1>
        {household ? (
          <button className="secondary-button" type="button" onClick={() => setIsHouseholdInfoModalOpen(true)}>
            Household Info
          </button>
        ) : null}
      </section>

      <section className="dashboard-card">
        {isLoading ? (
          <p>Loading household...</p>
        ) : household ? (() => {
          const isCreator = household.createdByUserId === user?.id;
          const formattedBudget =
            typeof householdBudgetAmountCad === "number" ? formattedCurrency.format(householdBudgetAmountCad) : "Not set";

          return (
            <>
              <h2>{household.name}</h2>
              {isCreator ? (
                <p>Invite members and set the shared monthly budget. Everyone can add, edit, and delete shared transactions.</p>
              ) : (
                <p>Only the creator can invite users and set budget. Everyone can add, edit, and delete shared transactions.</p>
              )}

              <div className="household-finance-panel">
                <div className="page-title-row page-title-actions">
                  <h3>Current Month Contributions</h3>
                </div>

                {contributionByUser.length > 0 ? (
                  <div className="household-contribution-chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={contributionByUser} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                        <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={(value) => `$${Number(value).toFixed(0)}`} />
                        <YAxis dataKey="name" type="category" width={90} tick={{ fill: "var(--text)", fontSize: 12 }} />
                        <Tooltip formatter={(value) => formattedCurrency.format(Number(value))} cursor={{ fill: "rgba(14, 122, 116, 0.08)" }} />
                        <Bar dataKey="amountCad" fill="var(--primary)" radius={[6, 6, 6, 6]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p>No shared transactions this month yet.</p>
                )}

                <div className="household-settlement-summary">
                  <p>
                    Total spent this month: <strong>{formattedCurrency.format(monthTotals.totalSpentCad)}</strong>
                  </p>
                  <p>
                    Equal share per member: <strong>{formattedCurrency.format(monthTotals.equalShareCad)}</strong>
                  </p>
                  <p>
                    {monthTotals.netCad > 0.009
                      ? `You should receive ${formattedCurrency.format(monthTotals.netCad)} from other members.`
                      : monthTotals.netCad < -0.009
                        ? `You owe ${formattedCurrency.format(Math.abs(monthTotals.netCad))} to other members.`
                        : "You are settled up for this month."}
                  </p>
                </div>

                {settlementRows.length > 0 ? (
                  <ul className="household-settlement-list">
                    {settlementRows.map((row) => (
                      <li key={row.userId} className="household-settlement-row">
                        <span>{row.name}</span>
                        <span>
                          {row.netCad >= 0
                            ? `+${formattedCurrency.format(row.netCad)}`
                            : `-${formattedCurrency.format(Math.abs(row.netCad))}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="household-finance-panel">
                <div className="page-title-row page-title-actions">
                  <h3>Shared Budget</h3>
                  {isCreator && !isEditingBudget ? (
                    <button className="secondary-button" type="button" onClick={startEditingBudget}>
                      {typeof householdBudgetAmountCad === "number" ? "Edit" : "Set Budget"}
                    </button>
                  ) : null}
                </div>

                {isEditingBudget ? (
                  <div className="household-inline-form">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={budgetDraft}
                      onChange={(event) => setBudgetDraft(event.target.value)}
                      disabled={isSavingBudget}
                    />
                    <div className="household-budget-actions">
                      <button type="button" onClick={onSaveHouseholdBudget} disabled={isSavingBudget}>
                        {isSavingBudget ? "Saving..." : "Save"}
                      </button>
                      <button className="secondary-button" type="button" onClick={cancelEditingBudget} disabled={isSavingBudget}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="budget-value">{formattedBudget}</p>
                )}

                {budgetError ? <p className="feedback error">{budgetError}</p> : null}
              </div>

              <div className="household-finance-panel">
                <div className="page-title-row page-title-actions">
                  <h3>Shared Transactions</h3>
                  <button type="button" onClick={openTransactionModal}>
                    Add Shared Transaction
                  </button>
                </div>

                {isFinanceLoading ? (
                  <p>Loading shared data...</p>
                ) : householdTransactions.length > 0 ? (
                  <div className="transactions-list" role="list">
                    {householdTransactions.map((transaction) => (
                      <article className="transaction-row" role="listitem" key={transaction.id}>
                        <div className="transaction-main">
                          <p className="transaction-merchant">{transaction.type}</p>
                          <p className="transaction-meta">{transaction.description}</p>
                          <p className="transaction-meta">Added by {transaction.createdByName}</p>
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
                  <p>No shared transactions yet.</p>
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
                    <h2 id="household-transaction-modal-title">{editingTransactionId ? "Edit Shared Transaction" : "Add Shared Transaction"}</h2>

                    <form
                      className="transaction-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void onSaveHouseholdTransaction();
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
                          placeholder="Ex: Groceries"
                          required
                        />
                      </label>

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
