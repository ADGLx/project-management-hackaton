import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

const MIN_BUDGET_CAD = 1;

export default function BudgetSetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { saveMonthlyBudget } = useAuth();

  const [budgetAmountCad, setBudgetAmountCad] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parsedAmount = Number(budgetAmountCad);

    if (!Number.isInteger(parsedAmount) || parsedAmount < MIN_BUDGET_CAD) {
      setError(t("errors.budgetWholeNumber"));
      return;
    }

    setIsSubmitting(true);
    const result = await saveMonthlyBudget(parsedAmount);

    if (!result.ok) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    navigate("/");
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel brand-panel">
        <p className="eyebrow">{t("auth.firstStep")}</p>
        <h1>{t("auth.budgetSetupTitle")}</h1>
        <p>{t("auth.budgetSetupDescription")}</p>
      </section>

      <section className="auth-panel form-panel">
        <h2>{t("auth.monthlyBudgetCad")}</h2>
        <p>{t("auth.monthlyBudgetHint")}</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            {t("auth.budgetAmount")}
            <div className="currency-field">
              <span aria-hidden="true">CAD $</span>
              <input
                type="number"
                inputMode="numeric"
                min={MIN_BUDGET_CAD}
                step={1}
                value={budgetAmountCad}
                onChange={(event) => setBudgetAmountCad(event.target.value)}
                placeholder={t("auth.budgetAmount")}
                required
              />
            </div>
          </label>

          {error ? <p className="feedback error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("auth.savingBudget") : t("auth.saveAndContinue")}
          </button>
        </form>
      </section>
    </main>
  );
}
