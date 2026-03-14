import AddTransactionFab from "../components/AddTransactionFab";
import MobileNav from "../components/MobileNav";

export default function HouseholdPage() {
  return (
    <main className="home-shell">
      <section className="page-title-row">
        <h1>Household</h1>
      </section>

      <section className="dashboard-card">
        <h2>Shared Space</h2>
        <p>Household tools are coming next. This section will be used for shared planning and coordination.</p>
      </section>

      <AddTransactionFab />
      <MobileNav />
    </main>
  );
}
