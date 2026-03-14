import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddTransactionFab from "../components/AddTransactionFab";
import MobileNav from "../components/MobileNav";
import PageSidePanel from "../components/PageSidePanel";
import { createMyTransactionType, deleteMyTransactionType, getMyTransactionTypes } from "../lib/api";
import { useAuth } from "../state/AuthContext";
import type { TransactionType } from "../types/auth";

export default function UserPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingTypeId, setIsDeletingTypeId] = useState<string | null>(null);

  async function loadTypes() {
    setError("");
    const result = await getMyTransactionTypes();

    if (!result.ok) {
      setError(result.message);
      setIsLoading(false);
      return;
    }

    setTransactionTypes(result.transactionTypes);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadTypes();
  }, []);

  async function onAddType() {
    setError("");

    const name = newTypeName.trim();
    if (!name) {
      setError("Type name is required.");
      return;
    }

    setIsSaving(true);
    const result = await createMyTransactionType(name);

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setNewTypeName("");
    await loadTypes();
    setIsSaving(false);
  }

  async function onDeleteType(typeId: string) {
    setError("");
    setIsDeletingTypeId(typeId);

    const result = await deleteMyTransactionType(typeId);

    if (!result.ok) {
      setError(result.message);
      setIsDeletingTypeId(null);
      return;
    }

    await loadTypes();
    setIsDeletingTypeId(null);
  }

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <main className="home-shell">
      <section className="page-title-row page-title-actions">
        <h1 className="dashboard-title">
          <PageSidePanel />
          <span className="dashboard-title-icon" aria-hidden="true">
            🍁
          </span>
          <span>{user?.name ?? "Profile"}</span>
        </h1>
        <button className="secondary-button" type="button" onClick={onLogout}>
          Logout
        </button>
      </section>

      <section className="dashboard-card">
        <h2>Transaction Types</h2>

        <form
          className="type-form"
          onSubmit={(event) => {
            event.preventDefault();
            void onAddType();
          }}
        >
          <input
            type="text"
            value={newTypeName}
            onChange={(event) => setNewTypeName(event.target.value)}
            placeholder="Add a new type"
            disabled={isSaving}
            required
          />
          <button type="submit" disabled={isSaving}>
            {isSaving ? "Adding..." : "Add Type"}
          </button>
        </form>

        {error ? <p className="feedback error">{error}</p> : null}

        {isLoading ? (
          <p>Loading types...</p>
        ) : (
          <div className="type-list" role="list">
            {transactionTypes.map((transactionType) => (
              <article className="type-row" role="listitem" key={transactionType.id}>
                <p className="transaction-merchant">{transactionType.name}</p>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void onDeleteType(transactionType.id)}
                  disabled={isDeletingTypeId === transactionType.id || isSaving}
                >
                  {isDeletingTypeId === transactionType.id ? "Deleting..." : "Delete"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <AddTransactionFab />
      <MobileNav />
    </main>
  );
}
