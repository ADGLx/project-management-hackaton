export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthSuccess {
  ok: true;
  user: User;
}

export interface AuthFailure {
  ok: false;
  message: string;
}

export type AuthResult = AuthSuccess | AuthFailure;

export interface BudgetFetchSuccess {
  ok: true;
  budgetAmountCad: number | null;
}

export interface BudgetSaveSuccess {
  ok: true;
  budgetAmountCad: number;
}

export interface BudgetHistoryPoint {
  monthStart: string;
  budgetAmountCad: number;
}

export interface BudgetHistorySuccess {
  ok: true;
  history: BudgetHistoryPoint[];
}

export interface UserTransaction {
  id: string;
  amountCad: number;
  type: string;
  description: string;
  transactionDate: string;
}

export interface TransactionType {
  id: string;
  name: string;
}

export interface MonthlySpendingPoint {
  monthStart: string;
  spendingAmountCad: number;
}

export interface TransactionListSuccess {
  ok: true;
  transactions: UserTransaction[];
}

export interface TransactionCreateSuccess {
  ok: true;
  transaction: UserTransaction;
}

export interface TransactionHistorySuccess {
  ok: true;
  history: MonthlySpendingPoint[];
}

export interface TransactionUpdateSuccess {
  ok: true;
  transaction: UserTransaction;
}

export interface TransactionDeleteSuccess {
  ok: true;
}

export interface TransactionTypesFetchSuccess {
  ok: true;
  transactionTypes: TransactionType[];
}

export interface TransactionTypeCreateSuccess {
  ok: true;
  transactionType: TransactionType;
}

export interface TransactionTypeDeleteSuccess {
  ok: true;
}

export type BudgetFetchResult = BudgetFetchSuccess | AuthFailure;
export type BudgetSaveResult = BudgetSaveSuccess | AuthFailure;
export type BudgetHistoryResult = BudgetHistorySuccess | AuthFailure;
export type TransactionListResult = TransactionListSuccess | AuthFailure;
export type TransactionCreateResult = TransactionCreateSuccess | AuthFailure;
export type TransactionHistoryResult = TransactionHistorySuccess | AuthFailure;
export type TransactionUpdateResult = TransactionUpdateSuccess | AuthFailure;
export type TransactionDeleteResult = TransactionDeleteSuccess | AuthFailure;
export type TransactionTypesFetchResult = TransactionTypesFetchSuccess | AuthFailure;
export type TransactionTypeCreateResult = TransactionTypeCreateSuccess | AuthFailure;
export type TransactionTypeDeleteResult = TransactionTypeDeleteSuccess | AuthFailure;

export interface AuthContextValue {
  user: User | null;
  isBootstrapping: boolean;
  isBudgetBootstrapping: boolean;
  budgetAmountCad: number | null;
  hasCompletedBudgetSetup: boolean;
  profileName: string;
  apiUrl: string;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  refreshBudget: () => Promise<void>;
  saveMonthlyBudget: (budgetAmountCad: number) => Promise<BudgetSaveResult>;
  logout: () => Promise<void>;
}

export interface AuthResponseBody {
  user?: User;
  message?: string;
}

export interface BudgetResponseBody {
  budgetAmountCad?: number | null;
  message?: string;
}

export interface BudgetHistoryResponseBody {
  history?: BudgetHistoryPoint[];
  message?: string;
}

export interface TransactionListResponseBody {
  transactions?: UserTransaction[];
  message?: string;
}

export interface TransactionCreateResponseBody {
  transaction?: UserTransaction;
  message?: string;
}

export interface TransactionHistoryResponseBody {
  history?: MonthlySpendingPoint[];
  message?: string;
}

export interface TransactionUpdateResponseBody {
  transaction?: UserTransaction;
  message?: string;
}

export interface TransactionDeleteResponseBody {
  ok?: boolean;
  message?: string;
}

export interface TransactionTypesResponseBody {
  transactionTypes?: TransactionType[];
  message?: string;
}

export interface TransactionTypeCreateResponseBody {
  transactionType?: TransactionType;
  message?: string;
}

export interface TransactionTypeDeleteResponseBody {
  ok?: boolean;
  message?: string;
}
