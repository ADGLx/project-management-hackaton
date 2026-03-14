import { useNavigate } from "react-router-dom";

export default function AddTransactionFab() {
  const navigate = useNavigate();

  return (
    <button
      className="fab-button"
      type="button"
      onClick={() => navigate("/transactions?new=1")}
      aria-label="Add transaction"
      title="Add transaction"
    >
      +
    </button>
  );
}
