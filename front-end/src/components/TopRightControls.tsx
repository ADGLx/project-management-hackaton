import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { getMyAlerts, respondToAlert } from "../lib/api";
import { useAuth } from "../state/AuthContext";
import type { UserAlert } from "../types/auth";
import SubscriptionControl from "./SubscriptionControl";

const ALERT_POLL_INTERVAL_MS = 5_000;

function formatAlertTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}

export default function TopRightControls() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [alertError, setAlertError] = useState("");
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isRespondingAlertId, setIsRespondingAlertId] = useState<string | null>(null);

  const pendingAlerts = useMemo(() => alerts.filter((alert) => alert.status === "pending"), [alerts]);
  const pendingAlertCount = pendingAlerts.length;

  async function loadAlerts(silent: boolean) {
    if (!silent) {
      setIsLoadingAlerts(true);
    }

    const result = await getMyAlerts();

    if (!result.ok) {
      setAlertError(result.message);

      if (!silent) {
        setIsLoadingAlerts(false);
      }

      return;
    }

    setAlerts(result.alerts);
    setAlertError("");

    if (!silent) {
      setIsLoadingAlerts(false);
    }
  }

  async function onRespondToAlert(alertId: string, decision: "accept" | "decline") {
    setAlertError("");
    setIsRespondingAlertId(alertId);

    const result = await respondToAlert(alertId, decision);
    setIsRespondingAlertId(null);

    if (!result.ok) {
      setAlertError(result.message);
      return;
    }

    await loadAlerts(true);
  }

  function closeAlertsModal() {
    if (isRespondingAlertId) {
      return;
    }

    setIsAlertsModalOpen(false);
  }

  useEffect(() => {
    if (!user) {
      setAlerts([]);
      setAlertError("");
      setIsLoadingAlerts(false);
      return;
    }

    let isMounted = true;

    async function initialLoad() {
      const result = await getMyAlerts();

      if (!isMounted) {
        return;
      }

      if (!result.ok) {
        setAlertError(result.message);
      } else {
        setAlerts(result.alerts);
      }

      setIsLoadingAlerts(false);
    }

    void initialLoad();

    const intervalId = window.setInterval(() => {
      void loadAlerts(true);
    }, ALERT_POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !isAlertsModalOpen) {
      return;
    }

    void loadAlerts(true);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeAlertsModal();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAlertsModalOpen, isRespondingAlertId]);

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="top-right-controls" aria-label="Account controls">
        <SubscriptionControl />

        <button
          className={`subscription-trigger alert-trigger secondary-button${isAlertsModalOpen ? " active" : ""}`}
          type="button"
          onClick={() => setIsAlertsModalOpen(true)}
          aria-label={`Alerts${pendingAlertCount > 0 ? ` (${pendingAlertCount} pending)` : ""}`}
          title="Alerts"
        >
          <span className="alert-icon-wrap">
            <FontAwesomeIcon className="mobile-nav-icon" icon={faBell} aria-hidden="true" />
            {pendingAlertCount > 0 ? <span className="alert-badge">{pendingAlertCount}</span> : null}
          </span>
        </button>
      </div>

      {isAlertsModalOpen ? (
        <div className="modal-overlay" role="presentation" onClick={closeAlertsModal}>
          <section
            className="modal-card alerts-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="alerts-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-title-row">
              <h2 id="alerts-modal-title">Alerts</h2>
              <button className="secondary-button" type="button" onClick={closeAlertsModal} disabled={Boolean(isRespondingAlertId)}>
                Close
              </button>
            </div>

            {isLoadingAlerts ? <p>Loading alerts...</p> : null}
            {alertError ? <p className="feedback error">{alertError}</p> : null}

            {!isLoadingAlerts && alerts.length === 0 ? <p>No alerts right now.</p> : null}

            {alerts.length > 0 ? (
              <div className="alerts-list" role="list">
                {alerts.map((alert) => {
                  const inviterName = alert.invitedByName || "A household creator";
                  const householdName = alert.householdName || "a household";
                  const timestamp = formatAlertTimestamp(alert.createdAt);
                  const isPending = alert.status === "pending";
                  const isBusy = isRespondingAlertId === alert.id;

                  return (
                    <article className="alert-row" role="listitem" key={alert.id}>
                      <div className="alert-copy">
                        <p>
                          <strong>{inviterName}</strong> invited you to join <strong>{householdName}</strong>.
                        </p>
                        {timestamp ? <p className="transaction-meta">{timestamp}</p> : null}
                        {!isPending ? <p className="alert-status-label">{alert.status === "accepted" ? "Accepted" : "Declined"}</p> : null}
                      </div>

                      {isPending ? (
                        <div className="alert-actions">
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => void onRespondToAlert(alert.id, "decline")}
                            disabled={Boolean(isRespondingAlertId)}
                          >
                            {isBusy ? "Working..." : "Decline"}
                          </button>
                          <button type="button" onClick={() => void onRespondToAlert(alert.id, "accept")} disabled={Boolean(isRespondingAlertId)}>
                            {isBusy ? "Working..." : "Accept"}
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
