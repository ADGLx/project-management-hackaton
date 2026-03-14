import type {
  AuthResponseBody,
  AuthResult,
  BudgetFetchResult,
  BudgetHistoryResponseBody,
  BudgetHistoryResult,
  BudgetResponseBody,
  BudgetSaveResult,
  HouseholdCreateResult,
  HouseholdFetchResult,
  HouseholdInviteResult,
  HouseholdLeaveResponseBody,
  HouseholdLeaveResult,
  HouseholdResponseBody,
  HouseholdTransactionCreateResult,
  HouseholdTransactionDeleteResponseBody,
  HouseholdTransactionDeleteResult,
  HouseholdTransactionListResponseBody,
  HouseholdTransactionListResult,
  HouseholdTransactionResponseBody,
  HouseholdSettlementFetchResult,
  HouseholdSettlementResponseBody,
  HouseholdTransactionUpdateResult,
  TransactionCreateResponseBody,
  TransactionCreateResult,
  TransactionDeleteResponseBody,
  TransactionDeleteResult,
  TransactionHistoryResponseBody,
  TransactionHistoryResult,
  TransactionListResponseBody,
  TransactionListResult,
  TransactionTypeCreateResponseBody,
  TransactionTypeCreateResult,
  TransactionTypeDeleteResponseBody,
  TransactionTypeDeleteResult,
  TransactionTypesFetchResult,
  TransactionTypesResponseBody,
  TransactionUpdateResponseBody,
  TransactionUpdateResult,
  User,
} from "../types/auth";

export const API_URL = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Request failed";
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_URL}/auth/me`, { credentials: "include" });

    if (!response.ok) {
      return null;
    }

    const data = await readJson<AuthResponseBody>(response);
    return data?.user ?? null;
  } catch {
    return null;
  }
}

export async function sendAuthRequest(path: "/auth/login" | "/auth/register", payload: Record<string, string>): Promise<AuthResult> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await readJson<AuthResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Request failed",
      };
    }

    if (!data?.user) {
      return {
        ok: false,
        message: "Server returned an invalid auth response",
      };
    }

    return {
      ok: true,
      user: data.user,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function logoutRequest(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function getMyMonthlyBudget(): Promise<BudgetFetchResult> {
  try {
    const response = await fetch(`${API_URL}/budget/me`, {
      method: "GET",
      credentials: "include",
    });

    const data = await readJson<BudgetResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to load budget",
      };
    }

    if (data?.budgetAmountCad === null || data?.budgetAmountCad === undefined) {
      return {
        ok: true,
        budgetAmountCad: null,
      };
    }

    if (typeof data.budgetAmountCad !== "number") {
      return {
        ok: false,
        message: "Server returned an invalid budget response",
      };
    }

    return {
      ok: true,
      budgetAmountCad: data.budgetAmountCad,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function saveMyMonthlyBudget(budgetAmountCad: number): Promise<BudgetSaveResult> {
  try {
    const response = await fetch(`${API_URL}/budget/me`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ budgetAmountCad }),
    });

    const data = await readJson<BudgetResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to save budget",
      };
    }

    if (typeof data?.budgetAmountCad !== "number") {
      return {
        ok: false,
        message: "Server returned an invalid budget response",
      };
    }

    return {
      ok: true,
      budgetAmountCad: data.budgetAmountCad,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function getMyMonthlyBudgetHistory(): Promise<BudgetHistoryResult> {
  try {
    const response = await fetch(`${API_URL}/budget/history`, {
      method: "GET",
      credentials: "include",
    });

    const data = await readJson<BudgetHistoryResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to load budget history",
      };
    }

    if (!Array.isArray(data?.history)) {
      return {
        ok: false,
        message: "Server returned an invalid budget history response",
      };
    }

    return {
      ok: true,
      history: data.history,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export interface UpsertTransactionPayload {
  amountCad: number;
  type: string;
  description: string;
  transactionDate: string;
}

export interface UpsertHouseholdTransactionPayload {
  amountCad: number;
  type: string;
  description: string;
  transactionDate: string;
  participantUserIds: string[];
}

export async function createMyTransaction(payload: UpsertTransactionPayload): Promise<TransactionCreateResult> {
  try {
    const response = await fetch(`${API_URL}/transactions/me`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await readJson<TransactionCreateResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to save transaction",
      };
    }

    if (!data?.transaction) {
      return {
        ok: false,
        message: "Server returned an invalid transaction response",
      };
    }

    return {
      ok: true,
      transaction: data.transaction,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function updateMyTransaction(transactionId: string, payload: UpsertTransactionPayload): Promise<TransactionUpdateResult> {
  try {
    const response = await fetch(`${API_URL}/transactions/me/${transactionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await readJson<TransactionUpdateResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to update transaction",
      };
    }

    if (!data?.transaction) {
      return {
        ok: false,
        message: "Server returned an invalid transaction response",
      };
    }

    return {
      ok: true,
      transaction: data.transaction,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function deleteMyTransaction(transactionId: string): Promise<TransactionDeleteResult> {
  try {
    const response = await fetch(`${API_URL}/transactions/me/${transactionId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await readJson<TransactionDeleteResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to delete transaction",
      };
    }

    if (!data?.ok) {
      return {
        ok: false,
        message: "Server returned an invalid delete response",
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function getMyTransactions(): Promise<TransactionListResult> {
  try {
    const response = await fetch(`${API_URL}/transactions/me`, {
      method: "GET",
      credentials: "include",
    });

    const data = await readJson<TransactionListResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to load transactions",
      };
    }

    if (!Array.isArray(data?.transactions)) {
      return {
        ok: false,
        message: "Server returned an invalid transactions response",
      };
    }

    return {
      ok: true,
      transactions: data.transactions,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function getMyTransactionHistory(): Promise<TransactionHistoryResult> {
  try {
    const response = await fetch(`${API_URL}/transactions/history`, {
      method: "GET",
      credentials: "include",
    });

    const data = await readJson<TransactionHistoryResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to load transaction history",
      };
    }

    if (!Array.isArray(data?.history)) {
      return {
        ok: false,
        message: "Server returned an invalid transaction history response",
      };
    }

    return {
      ok: true,
      history: data.history,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function getMyTransactionTypes(): Promise<TransactionTypesFetchResult> {
  try {
    const response = await fetch(`${API_URL}/transaction-types/me`, {
      method: "GET",
      credentials: "include",
    });

    const data = await readJson<TransactionTypesResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to load transaction types",
      };
    }

    if (!Array.isArray(data?.transactionTypes)) {
      return {
        ok: false,
        message: "Server returned an invalid transaction types response",
      };
    }

    return {
      ok: true,
      transactionTypes: data.transactionTypes,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function createMyTransactionType(name: string): Promise<TransactionTypeCreateResult> {
  try {
    const response = await fetch(`${API_URL}/transaction-types/me`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name }),
    });

    const data = await readJson<TransactionTypeCreateResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to create transaction type",
      };
    }

    if (!data?.transactionType) {
      return {
        ok: false,
        message: "Server returned an invalid transaction type response",
      };
    }

    return {
      ok: true,
      transactionType: data.transactionType,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function deleteMyTransactionType(typeId: string): Promise<TransactionTypeDeleteResult> {
  try {
    const response = await fetch(`${API_URL}/transaction-types/me/${typeId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await readJson<TransactionTypeDeleteResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to delete transaction type",
      };
    }

    if (!data?.ok) {
      return {
        ok: false,
        message: "Server returned an invalid delete response",
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function getMyHousehold(): Promise<HouseholdFetchResult> {
  try {
    const response = await fetch(`${API_URL}/households/me`, {
      method: "GET",
      credentials: "include",
    });

    const data = await readJson<HouseholdResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to load household",
      };
    }

    return {
      ok: true,
      household: data?.household ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function createMyHousehold(name: string): Promise<HouseholdCreateResult> {
  try {
    const response = await fetch(`${API_URL}/households/me`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name }),
    });

    const data = await readJson<HouseholdResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to create household",
      };
    }

    if (!data?.household) {
      return {
        ok: false,
        message: "Server returned an invalid household response",
      };
    }

    return {
      ok: true,
      household: data.household,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function inviteToHousehold(householdId: string, email: string): Promise<HouseholdInviteResult> {
  try {
    const response = await fetch(`${API_URL}/households/${householdId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });

    const data = await readJson<HouseholdResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to invite user",
      };
    }

    if (!data?.household) {
      return {
        ok: false,
        message: "Server returned an invalid household response",
      };
    }

    return {
      ok: true,
      household: data.household,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function leaveMyHousehold(): Promise<HouseholdLeaveResult> {
  try {
    const response = await fetch(`${API_URL}/households/me`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await readJson<HouseholdLeaveResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to leave household",
      };
    }

    if (!data?.ok) {
      return {
        ok: false,
        message: "Server returned an invalid leave response",
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function getMyHouseholdTransactions(): Promise<HouseholdTransactionListResult> {
  try {
    const response = await fetch(`${API_URL}/household-finances/transactions/me`, {
      method: "GET",
      credentials: "include",
    });

    const data = await readJson<HouseholdTransactionListResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to load household transactions",
      };
    }

    if (!Array.isArray(data?.transactions)) {
      return {
        ok: false,
        message: "Server returned an invalid household transactions response",
      };
    }

    return {
      ok: true,
      transactions: data.transactions,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function getMyHouseholdSettlement(month?: string): Promise<HouseholdSettlementFetchResult> {
  try {
    const query = month ? `?month=${encodeURIComponent(month)}` : "";
    const response = await fetch(`${API_URL}/household-finances/settlements/me${query}`, {
      method: "GET",
      credentials: "include",
    });

    const data = await readJson<HouseholdSettlementResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to load household settlement",
      };
    }

    if (typeof data?.month !== "string" || typeof data.totalPaidByCurrentUserCad !== "number" || !Array.isArray(data.youOwe)) {
      return {
        ok: false,
        message: "Server returned an invalid settlement response",
      };
    }

    return {
      ok: true,
      summary: {
        month: data.month,
        totalPaidByCurrentUserCad: data.totalPaidByCurrentUserCad,
        youOwe: data.youOwe,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function createMyHouseholdTransaction(payload: UpsertHouseholdTransactionPayload): Promise<HouseholdTransactionCreateResult> {
  try {
    const response = await fetch(`${API_URL}/household-finances/transactions/me`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await readJson<HouseholdTransactionResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to save household transaction",
      };
    }

    if (!data?.transaction) {
      return {
        ok: false,
        message: "Server returned an invalid household transaction response",
      };
    }

    return {
      ok: true,
      transaction: data.transaction,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function updateMyHouseholdTransaction(
  transactionId: string,
  payload: UpsertHouseholdTransactionPayload,
): Promise<HouseholdTransactionUpdateResult> {
  try {
    const response = await fetch(`${API_URL}/household-finances/transactions/me/${transactionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await readJson<HouseholdTransactionResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to update household transaction",
      };
    }

    if (!data?.transaction) {
      return {
        ok: false,
        message: "Server returned an invalid household transaction response",
      };
    }

    return {
      ok: true,
      transaction: data.transaction,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function deleteMyHouseholdTransaction(transactionId: string): Promise<HouseholdTransactionDeleteResult> {
  try {
    const response = await fetch(`${API_URL}/household-finances/transactions/me/${transactionId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await readJson<HouseholdTransactionDeleteResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Failed to delete household transaction",
      };
    }

    if (!data?.ok) {
      return {
        ok: false,
        message: "Server returned an invalid delete response",
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}
