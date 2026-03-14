import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

const MIN_BUDGET_CAD = 1;

export default function BudgetSetupPage() {
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
      setError("Please enter a whole number greater than 0.");
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
        <p className="eyebrow">First Step</p>
        <h1>Set your monthly budget before entering your control center.</h1>
        <p>
          This helps us personalize your planning workflows from the very first session.
        </p>
      </section>

      <section className="auth-panel form-panel">
        <h2>Monthly Budget (CAD)</h2>
        <p>Enter the amount your team plans to allocate this month.</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            Budget amount
            <div className="currency-field">
              <span aria-hidden="true">CAD $</span>
              <input
                type="number"
                inputMode="numeric"
                min={MIN_BUDGET_CAD}
                step={1}
                value={budgetAmountCad}
                onChange={(event) => setBudgetAmountCad(event.target.value)}
                placeholder="3000"
                required
              />
            </div>
          </label>

          {error ? <p className="feedback error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving budget..." : "Save and continue"}
          </button>
        </form>
      </section>
    </main>
  );
}
