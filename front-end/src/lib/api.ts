import type {
  AuthResponseBody,
  AuthResult,
  BudgetFetchResult,
  BudgetHistoryResponseBody,
  BudgetHistoryResult,
  BudgetResponseBody,
  BudgetSaveResult,
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
