import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await register(name, email, password);

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
        <p className="eyebrow">{t("auth.createAccount")}</p>
        <h1>{t("auth.join")}</h1>
        <p>{t("auth.appTagline")}</p>
      </section>

      <section className="auth-panel form-panel">
        <h2>{t("auth.register")}</h2>
        <p>{t("auth.whoAreYou")}</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            {t("auth.fullName")}
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              placeholder={t("auth.fullName")}
              required
            />
          </label>

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
              autoComplete="new-password"
              placeholder={t("auth.password")}
              required
              minLength={8}
            />
          </label>

          {error ? <p className="feedback error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("auth.creatingAccount") : t("auth.createAccount")}
          </button>
        </form>

        <p className="switch-link">
          {t("auth.alreadyHaveAccount")} <Link to="/login">{t("auth.signIn")}</Link>
        </p>
      </section>
    </main>
  );
}
