import { faCrown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { useAuth } from "../state/AuthContext";

export default function SubscriptionControl() {
  const { user, updateSubscriptionStatus } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  if (!user) {
    return null;
  }

  const nextStatus = !user.subscribers;

  async function onToggleSubscription() {
    setError("");
    setIsSaving(true);

    const result = await updateSubscriptionStatus(nextStatus);
    setIsSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setError("");
    setIsModalOpen(false);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    if (!isModalOpen) {
      return;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen, isSaving]);

  return (
    <>
      <button
        className={`subscription-trigger secondary-button${user.subscribers ? " is-subscribed" : ""}`}
        type="button"
        onClick={() => setIsModalOpen(true)}
        aria-label="Subscription settings"
        title="Subscription settings"
      >
        <FontAwesomeIcon icon={faCrown} />
      </button>

      {isModalOpen ? (
        <div className="modal-overlay" role="presentation" onClick={closeModal}>
          <section
            className="modal-card subscription-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="subscription-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-title-row">
              <h2 id="subscription-modal-title">Subscription</h2>
              <button className="secondary-button" type="button" onClick={closeModal} disabled={isSaving}>
                Close
              </button>
            </div>

            <p>
              Status: <strong>{user.subscribers ? "Subscribed" : "Not subscribed"}</strong>
            </p>

            <p>Use subscription to unlock premium account features in future releases.</p>

            {error ? <p className="feedback error">{error}</p> : null}

            <button type="button" onClick={onToggleSubscription} disabled={isSaving}>
              {isSaving ? "Saving..." : user.subscribers ? "Unsubscribe" : "Subscribe"}
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
