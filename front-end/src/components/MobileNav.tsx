import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faChartColumn, faHouse, faReceipt, faUser } from "@fortawesome/free-solid-svg-icons";
import { NavLink } from "react-router-dom";
import { getMyAlerts, respondToAlert } from "../lib/api";
import type { UserAlert } from "../types/auth";

const navItems = [
  { to: "/", icon: faChartColumn, label: "Dashboard" },
  { to: "/transactions", icon: faReceipt, label: "Transactions" },
  { to: "/household", icon: faHouse, label: "Household" },
  { to: "/user", icon: faUser, label: "Profile" },
];

const ALERT_POLL_INTERVAL_MS = 5_000;

function formatAlertTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}

export default function MobileNav() {
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
  }, []);

  useEffect(() => {
    if (!isAlertsModalOpen) {
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

  return (
    <>
      <nav className="mobile-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
            aria-label={item.label}
          >
            <FontAwesomeIcon className="mobile-nav-icon" icon={item.icon} aria-hidden="true" />
          </NavLink>
        ))}

        <button
          className={`mobile-nav-link mobile-nav-alert-button${isAlertsModalOpen ? " active" : ""}`}
          type="button"
          onClick={() => setIsAlertsModalOpen(true)}
          aria-label={`Alerts${pendingAlertCount > 0 ? ` (${pendingAlertCount} pending)` : ""}`}
        >
          <span className="mobile-nav-alert-icon-wrap">
            <FontAwesomeIcon className="mobile-nav-icon" icon={faBell} aria-hidden="true" />
            {pendingAlertCount > 0 ? <span className="mobile-nav-alert-badge">{pendingAlertCount}</span> : null}
          </span>
        </button>
      </nav>

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
