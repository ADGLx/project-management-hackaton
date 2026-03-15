import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export default function LoginPage() {
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
        <p className="eyebrow">Welcome</p>
        <h1 className="app-brand-title">
          <span className="app-brand-icon" aria-hidden="true">
            🍁
          </span>
          <span>Coloc Calcul</span>
        </h1>
        <p>Budget tailored to Canadias.</p>
      </section>

      <section className="auth-panel form-panel">

        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@team.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="At least 8 characters"
              required
              minLength={8}
            />
          </label>

          {error ? <p className="feedback error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
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
            Use demo account
          </button>
        </form>


        <p className="switch-link">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
