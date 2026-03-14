import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

function nameFromEmail(email?: string): string {
  if (!email) {
    return "Team Member";
  }

  const [leftSide] = email.split("@");

  return leftSide
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user, logout, profileName, apiUrl, budgetAmountCad } = useAuth();
  const displayName = user?.name || profileName || nameFromEmail(user?.email);
  const formattedBudget =
    typeof budgetAmountCad === "number"
      ? new Intl.NumberFormat("en-CA", {
          style: "currency",
          currency: "CAD",
          maximumFractionDigits: 0,
        }).format(budgetAmountCad)
      : "Not set";

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <main className="home-shell">
      <section className="home-hero">
        <p className="eyebrow">Control Center</p>
        <h1>Welcome, {displayName}</h1>
        <p>
          You are signed in and ready to drive the next milestone. This screen intentionally stays lean so your live demo can focus on
          product story and flow.
        </p>
      </section>

      <section className="home-grid">
        <article className="dashboard-card">
          <h2>Monthly Budget</h2>
          <p>
            <strong>{formattedBudget}</strong>
          </p>
        </article>

        <article className="dashboard-card">
          <h2>Session</h2>
          <p>
            Signed in as <strong>{user?.email}</strong>
          </p>
        </article>

        <article className="dashboard-card">
          <h2>API Endpoint</h2>
          <p>
            <code>{apiUrl}</code>
          </p>
        </article>
      </section>

      <button className="secondary-button" type="button" onClick={onLogout}>
        Logout
      </button>
    </main>
  );
}
