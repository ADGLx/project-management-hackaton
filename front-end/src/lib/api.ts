import type {
  AlertRespondResult,
  AlertResponseBody,
  AlertsFetchResult,
  AlertsResponseBody,
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
  ReceiptScanResponseBody,
  ReceiptScanResult,
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
import i18n from "../i18n";

export const API_URL = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

const apiErrorTranslationMap: Record<string, string> = {
  "Request failed": "errors.requestFailed",
  "Server returned an invalid auth response": "errors.serverInvalidAuth",
  "Server returned an invalid subscription response": "errors.serverInvalidSubscription",
  "Server returned an invalid budget response": "errors.serverInvalidBudget",
  "Server returned an invalid budget history response": "errors.serverInvalidBudgetHistory",
  "Server returned an invalid transaction response": "errors.serverInvalidTransaction",
  "Server returned an invalid receipt scan response": "errors.serverInvalidReceiptScan",
  "Server returned an invalid delete response": "errors.serverInvalidDelete",
  "Server returned an invalid transactions response": "errors.serverInvalidTransactions",
  "Server returned an invalid transaction history response": "errors.serverInvalidTransactionHistory",
  "Server returned an invalid transaction types response": "errors.serverInvalidTransactionTypes",
  "Server returned an invalid transaction type response": "errors.serverInvalidTransactionType",
  "Server returned an invalid household response": "errors.serverInvalidHousehold",
  "Server returned an invalid leave response": "errors.serverInvalidLeave",
  "Server returned an invalid alerts response": "errors.serverInvalidAlerts",
  "Server returned an invalid alert response": "errors.serverInvalidAlert",
  "Server returned an invalid household transactions response": "errors.serverInvalidHouseholdTransactions",
  "Server returned an invalid settlement response": "errors.serverInvalidSettlement",
  "Server returned an invalid household transaction response": "errors.serverInvalidHouseholdTransaction",
  "Failed to update subscription": "errors.failedUpdateSubscription",
  "Failed to load budget": "errors.failedLoadBudget",
  "Failed to save budget": "errors.failedSaveBudget",
  "Failed to load budget history": "errors.failedLoadBudgetHistory",
  "Failed to save transaction": "errors.failedSaveTransaction",
  "Failed to scan receipt": "errors.failedScanReceipt",
  "Failed to update transaction": "errors.failedUpdateTransaction",
  "Failed to delete transaction": "errors.failedDeleteTransaction",
  "Failed to load transactions": "errors.failedLoadTransactions",
  "Failed to load transaction history": "errors.failedLoadTransactionHistory",
  "Failed to load transaction types": "errors.failedLoadTransactionTypes",
  "Failed to create transaction type": "errors.failedCreateType",
  "Failed to delete transaction type": "errors.failedDeleteType",
  "Failed to load household": "errors.failedLoadHousehold",
  "Failed to create household": "errors.failedCreateHousehold",
  "Failed to invite user": "errors.failedInviteUser",
  "Failed to leave household": "errors.failedLeaveHousehold",
  "Failed to load alerts": "errors.failedLoadAlerts",
  "Failed to respond to invite": "errors.failedRespondInvite",
  "Failed to load household transactions": "errors.failedLoadHouseholdTransactions",
  "Failed to load household settlement": "errors.failedLoadHouseholdSettlement",
  "Failed to save household transaction": "errors.failedSaveHouseholdTransaction",
  "Failed to update household transaction": "errors.failedUpdateHouseholdTransaction",
  "Failed to delete household transaction": "errors.failedDeleteHouseholdTransaction",
  "Authentication required": "errors.authenticationRequired",
  "Invalid email or password": "errors.invalidEmailOrPassword",
  "Email is already in use": "errors.emailInUse",
  "User not found": "errors.userNotFound",
  "subscribers must be a boolean": "errors.subscribersBoolean",
  "Type already exists": "errors.typeAlreadyExists",
  "Type not found": "errors.typeNotFound",
  "Household not found": "errors.householdNotFound",
  "You are not in a household": "errors.notInHousehold",
  "Transaction not found": "errors.transactionNotFound",
  "Amount must be a positive number": "errors.amountPositive",
  "Transaction date must be in YYYY-MM-DD format": "errors.transactionDateInvalid",
  "Receipt scanning is available to subscribers only": "errors.receiptSubscriberOnly",
  "Invalid image upload": "errors.invalidImageUpload",
  "Image is too large. Please upload up to 6MB.": "errors.imageTooLarge",
  "Receipt image is required": "errors.receiptImageRequired",
  "Uploaded image is empty": "errors.uploadedImageEmpty",
  "OCR is not configured on the server": "errors.ocrNotConfigured",
  "OCR provider returned an empty response": "errors.ocrEmptyResponse",
  "Could not extract receipt details. Please try another photo.": "errors.receiptExtractFailed",
  "Could not match receipt to your transaction types.": "errors.receiptTypeNoMatch",
  "Month must be in YYYY-MM format": "errors.monthFormatInvalid",
  "Please select at least one household member": "errors.selectHouseholdMember",
  "All selected participants must belong to your household": "errors.participantsOutOfHousehold",
  "Please provide a valid registered email": "errors.validRegisteredEmail",
  "No registered user matches that email": "errors.noRegisteredUserByEmail",
  "This user already has a pending invite": "errors.pendingInviteExists",
  "Creator cannot leave while other members are still in the household": "errors.creatorCannotLeave",
  "Invalid registration payload": "errors.invalidRegistrationPayload",
  "Failed to register user": "errors.failedRegisterUser",
  "Invalid login payload": "errors.invalidLoginPayload",
  "Failed to login": "errors.failedLogin",
  "Failed to load user": "errors.failedLoadUser",
  "Household name is required (max 80 characters)": "errors.householdNameRequired",
  "You are already in a household": "errors.alreadyInHousehold",
  "Household id is required": "errors.householdIdRequired",
  "You can only invite users to your own household": "errors.inviteOwnHouseholdOnly",
  "Only the household creator can invite members": "errors.inviteCreatorOnly",
  "This user is already in a household": "errors.userAlreadyInHousehold",
  "Transaction id is required": "errors.transactionIdRequired",
  "Type id is required": "errors.typeIdRequired",
};

function translateApiMessage(message: string): string {
  const translationKey = apiErrorTranslationMap[message];

  if (!translationKey) {
    return message;
  }

  return i18n.t(translationKey);
}

function resolveApiMessage(message: string | undefined, fallback: string): string {
  return translateApiMessage(message ?? fallback);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return translateApiMessage(error.message);
  }

  return translateApiMessage("Request failed");
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
        message: resolveApiMessage(data?.message, "Request failed"),
      };
    }

    if (!data?.user) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid auth response"),
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

export async function updateMySubscription(subscribers: boolean): Promise<AuthResult> {
  try {
    const response = await fetch(`${API_URL}/auth/me/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ subscribers }),
    });

    const data = await readJson<AuthResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: resolveApiMessage(data?.message, "Failed to update subscription"),
      };
    }

    if (!data?.user) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid subscription response"),
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
        message: resolveApiMessage(data?.message, "Failed to load budget"),
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
        message: translateApiMessage("Server returned an invalid budget response"),
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
        message: resolveApiMessage(data?.message, "Failed to save budget"),
      };
    }

    if (typeof data?.budgetAmountCad !== "number") {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid budget response"),
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
        message: resolveApiMessage(data?.message, "Failed to load budget history"),
      };
    }

    if (!Array.isArray(data?.history)) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid budget history response"),
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
        message: resolveApiMessage(data?.message, "Failed to save transaction"),
      };
    }

    if (!data?.transaction) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid transaction response"),
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

export async function scanTransactionReceipt(file: File): Promise<ReceiptScanResult> {
  try {
    const formData = new FormData();
    formData.append("receiptImage", file);

    const response = await fetch(`${API_URL}/transactions/me/ocr`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await readJson<ReceiptScanResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: resolveApiMessage(data?.message, "Failed to scan receipt"),
      };
    }

    if (!data?.suggestion || typeof data.suggestion.amountCad !== "number" || !data.suggestion.type || !data.suggestion.description) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid receipt scan response"),
      };
    }

    return {
      ok: true,
      suggestion: data.suggestion,
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
        message: resolveApiMessage(data?.message, "Failed to update transaction"),
      };
    }

    if (!data?.transaction) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid transaction response"),
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
        message: resolveApiMessage(data?.message, "Failed to delete transaction"),
      };
    }

    if (!data?.ok) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid delete response"),
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
        message: resolveApiMessage(data?.message, "Failed to load transactions"),
      };
    }

    if (!Array.isArray(data?.transactions)) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid transactions response"),
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
        message: resolveApiMessage(data?.message, "Failed to load transaction history"),
      };
    }

    if (!Array.isArray(data?.history)) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid transaction history response"),
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
        message: resolveApiMessage(data?.message, "Failed to load transaction types"),
      };
    }

    if (!Array.isArray(data?.transactionTypes)) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid transaction types response"),
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
        message: resolveApiMessage(data?.message, "Failed to create transaction type"),
      };
    }

    if (!data?.transactionType) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid transaction type response"),
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
        message: resolveApiMessage(data?.message, "Failed to delete transaction type"),
      };
    }

    if (!data?.ok) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid delete response"),
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
        message: resolveApiMessage(data?.message, "Failed to load household"),
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
        message: resolveApiMessage(data?.message, "Failed to create household"),
      };
    }

    if (!data?.household) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid household response"),
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
        message: resolveApiMessage(data?.message, "Failed to invite user"),
      };
    }

    if (!data?.household) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid household response"),
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
        message: resolveApiMessage(data?.message, "Failed to leave household"),
      };
    }

    if (!data?.ok) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid leave response"),
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

export async function getMyAlerts(): Promise<AlertsFetchResult> {
  try {
    const response = await fetch(`${API_URL}/alerts/me`, {
      method: "GET",
      credentials: "include",
    });

    const data = await readJson<AlertsResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: resolveApiMessage(data?.message, "Failed to load alerts"),
      };
    }

    if (!Array.isArray(data?.alerts)) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid alerts response"),
      };
    }

    return {
      ok: true,
      alerts: data.alerts,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function respondToAlert(alertId: string, decision: "accept" | "decline"): Promise<AlertRespondResult> {
  try {
    const response = await fetch(`${API_URL}/alerts/${alertId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ decision }),
    });

    const data = await readJson<AlertResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: resolveApiMessage(data?.message, "Failed to respond to invite"),
      };
    }

    if (!data?.alert) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid alert response"),
      };
    }

    return {
      ok: true,
      alert: data.alert,
    };
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
        message: resolveApiMessage(data?.message, "Failed to load household transactions"),
      };
    }

    if (!Array.isArray(data?.transactions)) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid household transactions response"),
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
        message: resolveApiMessage(data?.message, "Failed to load household settlement"),
      };
    }

    if (
      typeof data?.month !== "string" ||
      typeof data.totalPaidByCurrentUserCad !== "number" ||
      !Array.isArray(data.youOwe) ||
      !Array.isArray(data.owedToYou)
    ) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid settlement response"),
      };
    }

    return {
      ok: true,
      summary: {
        month: data.month,
        totalPaidByCurrentUserCad: data.totalPaidByCurrentUserCad,
        youOwe: data.youOwe,
        owedToYou: data.owedToYou,
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
        message: resolveApiMessage(data?.message, "Failed to save household transaction"),
      };
    }

    if (!data?.transaction) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid household transaction response"),
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
        message: resolveApiMessage(data?.message, "Failed to update household transaction"),
      };
    }

    if (!data?.transaction) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid household transaction response"),
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
        message: resolveApiMessage(data?.message, "Failed to delete household transaction"),
      };
    }

    if (!data?.ok) {
      return {
        ok: false,
        message: translateApiMessage("Server returned an invalid delete response"),
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
