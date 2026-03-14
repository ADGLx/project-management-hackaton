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
  TransactionHistoryResponseBody,
  TransactionHistoryResult,
  TransactionListResponseBody,
  TransactionListResult,
  User,
} from "../types/auth";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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

interface CreateTransactionPayload {
  amountCad: number;
  type: string;
  transactionDate: string;
}

export async function createMyTransaction(payload: CreateTransactionPayload): Promise<TransactionCreateResult> {
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
