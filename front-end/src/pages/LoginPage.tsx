import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await login(email, password);

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
        <p className="eyebrow">{t("auth.welcome")}</p>
        <h1 className="app-brand-title">
          <img className="app-brand-icon" src="/diversity-white.svg" alt="" aria-hidden="true" />
          <span>Coloc Calcul</span>
        </h1>
        <p>{t("auth.appTagline")}</p>
      </section>

      <section className="auth-panel form-panel">

        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            {t("auth.email")}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder={t("auth.email")}
              required
            />
          </label>

          <label>
            {t("auth.password")}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder={t("auth.password")}
              required
              minLength={8}
            />
          </label>

          {error ? <p className="feedback error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
          </button>

          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setEmail("test@test.com");
              setPassword("test1234");
            }}
            disabled={isSubmitting}
          >
            {t("auth.useDemo")}
          </button>
        </form>


        <p className="switch-link">
          {t("auth.newHere")} <Link to="/register">{t("auth.createAccountLink")}</Link>
        </p>
      </section>
    </main>
  );
}
