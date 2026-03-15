import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import AddTransactionFab from "../components/AddTransactionFab";
import MobileNav from "../components/MobileNav";
import PageSidePanel from "../components/PageSidePanel";
import { createMyTransactionType, deleteMyTransactionType, getMyTransactionTypes } from "../lib/api";
import { useAuth } from "../state/AuthContext";
import type { TransactionType } from "../types/auth";

export default function UserPage() {
  const { t } = useTranslation();
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
      setError(t("user.typeNameRequired"));
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
          <img className="dashboard-title-icon" src="/diversity.svg" alt="" aria-hidden="true" />
          <span>{user?.name ?? t("user.profile")}</span>
        </h1>
        <button className="secondary-button" type="button" onClick={onLogout}>
          {t("common.logout")}
        </button>
      </section>

      <section className="dashboard-card">
        <h2>{t("user.transactionTypes")}</h2>

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
            placeholder={t("user.addNewType")}
            disabled={isSaving}
            required
          />
          <button type="submit" disabled={isSaving}>
            {isSaving ? t("user.adding") : t("user.addType")}
          </button>
        </form>

        {error ? <p className="feedback error">{error}</p> : null}

        {isLoading ? (
          <p>{t("user.loadingTypes")}</p>
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
                  {isDeletingTypeId === transactionType.id ? t("user.deleting") : t("common.delete")}
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
