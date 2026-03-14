import { useNavigate } from "react-router-dom";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  const { user, logout, profileName, budgetAmountCad } = useAuth();
  const displayName = user?.name || profileName || nameFromEmail(user?.email);
  const formattedBudget =
    typeof budgetAmountCad === "number"
      ? new Intl.NumberFormat("en-CA", {
          style: "currency",
          currency: "CAD",
          maximumFractionDigits: 0,
        }).format(budgetAmountCad)
      : "Not set";

  const monthlyComparisonData = [
    { month: "Oct", budget: 3200, spending: 2980 },
    { month: "Nov", budget: 3200, spending: 3050 },
    { month: "Dec", budget: 3400, spending: 3325 },
    { month: "Jan", budget: 3600, spending: 3510 },
    { month: "Feb", budget: 3600, spending: 3260 },
    { month: "Mar", budget: 3800, spending: 3440 },
  ];

  const placeholderTransactions = [
    { id: "TXN-001", date: "2026-03-02", merchant: "Metro Grocery", category: "Food", amountCad: 126 },
    { id: "TXN-002", date: "2026-03-03", merchant: "Figma", category: "Software", amountCad: 22 },
    { id: "TXN-003", date: "2026-03-04", merchant: "Uber", category: "Transport", amountCad: 34 },
    { id: "TXN-004", date: "2026-03-06", merchant: "AWS", category: "Infrastructure", amountCad: 148 },
    { id: "TXN-005", date: "2026-03-07", merchant: "Indie Coffee", category: "Meals", amountCad: 19 },
    { id: "TXN-006", date: "2026-03-08", merchant: "Notion", category: "Software", amountCad: 14 },
    { id: "TXN-007", date: "2026-03-09", merchant: "Air Canada", category: "Travel", amountCad: 388 },
    { id: "TXN-008", date: "2026-03-10", merchant: "Slack", category: "Software", amountCad: 11 },
    { id: "TXN-009", date: "2026-03-11", merchant: "Canva", category: "Design", amountCad: 18 },
    { id: "TXN-010", date: "2026-03-12", merchant: "Staples", category: "Supplies", amountCad: 63 },
    { id: "TXN-011", date: "2026-03-13", merchant: "GitHub", category: "Software", amountCad: 10 },
    { id: "TXN-012", date: "2026-03-14", merchant: "Pizza Corner", category: "Team Meal", amountCad: 72 },
  ];

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <main className="home-shell">
      <section className="home-hero dashboard-header">
        <div>
          <p className="eyebrow">Control Center</p>
          <h1>Welcome, {displayName}</h1>
          <p className="dashboard-description">Placeholder: This budgeting app helps teams track monthly spending, compare budget performance, and keep every transaction visible in one place.</p>
        </div>

        <button className="secondary-button" type="button" onClick={onLogout}>
          Logout
        </button>
      </section>

      <section className="dashboard-card budget-card">
        <p className="eyebrow">Monthly Budget</p>
        <p className="budget-value">{formattedBudget}</p>
        <p>Placeholder: this is your configured monthly limit in CAD.</p>
      </section>

      <section className="dashboard-card chart-card">
        <h2>Budget vs Spending (Previous Months)</h2>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyComparisonData} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.32} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(value) => `$${value}`} />
              <Tooltip formatter={(value) => `CAD $${value}`} />
              <Legend />
              <Bar dataKey="spending" name="Spending" fill="#0e7a74" radius={[6, 6, 0, 0]} />
              <Line
                type="monotone"
                dataKey="budget"
                name="Budget"
                stroke="#f08c3a"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="dashboard-card transactions-card">
        <h2>Transactions</h2>
        <div className="transactions-list" role="list">
          {placeholderTransactions.map((transaction) => (
            <article className="transaction-row" role="listitem" key={transaction.id}>
              <div>
                <p className="transaction-merchant">{transaction.merchant}</p>
                <p className="transaction-meta">
                  {transaction.id} · {transaction.category}
                </p>
              </div>

              <div className="transaction-right">
                <p>{transaction.date}</p>
                <p className="transaction-amount">CAD ${transaction.amountCad}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
