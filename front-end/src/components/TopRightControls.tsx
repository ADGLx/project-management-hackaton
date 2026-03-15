import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import { getMyAlerts, respondToAlert } from "../lib/api";
import { useAuth } from "../state/AuthContext";
import type { UserAlert } from "../types/auth";
import SubscriptionControl from "./SubscriptionControl";

const ALERT_POLL_INTERVAL_MS = 5_000;

export default function TopRightControls() {
  const { t, i18n } = useTranslation();
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
      <div className="top-right-controls" aria-label={t("topControls.accountControls")}>
        <SubscriptionControl />

        <button
          className={`subscription-trigger alert-trigger secondary-button${isAlertsModalOpen ? " active" : ""}`}
          type="button"
          onClick={() => setIsAlertsModalOpen(true)}
          aria-label={`${t("topControls.alerts")}${pendingAlertCount > 0 ? ` (${t("topControls.pendingSuffix", { count: pendingAlertCount })})` : ""}`}
          title={t("topControls.alerts")}
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
              <button
                className="secondary-button modal-close-button"
                type="button"
                onClick={closeAlertsModal}
                disabled={Boolean(isRespondingAlertId)}
                aria-label={t("topControls.closeAlerts")}
                title={t("common.close")}
              >
                <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
              </button>
              <h2 id="alerts-modal-title">{t("topControls.alerts")}</h2>
            </div>

            {isLoadingAlerts ? <p>{t("topControls.loadingAlerts")}</p> : null}
            {alertError ? <p className="feedback error">{alertError}</p> : null}

            {!isLoadingAlerts && alerts.length === 0 ? <p>{t("topControls.noAlerts")}</p> : null}

            {alerts.length > 0 ? (
              <div className="alerts-list" role="list">
                {alerts.map((alert) => {
                  const inviterName = alert.invitedByName || t("topControls.householdCreator");
                  const householdName = alert.householdName || t("topControls.aHousehold");
                  const timestampDate = new Date(alert.createdAt);
                  const timestamp = Number.isNaN(timestampDate.getTime())
                    ? ""
                    : new Intl.DateTimeFormat(i18n.language === "fr-CA" ? "fr-CA" : "en-CA", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(timestampDate);
                  const isPending = alert.status === "pending";
                  const isBusy = isRespondingAlertId === alert.id;

                  return (
                    <article className="alert-row" role="listitem" key={alert.id}>
                      <div className="alert-copy">
                        <p>
                          {t("topControls.invitedYou", { inviter: inviterName, household: householdName })}
                        </p>
                        {timestamp ? <p className="transaction-meta">{timestamp}</p> : null}
                        {!isPending ? (
                          <p className="alert-status-label">{alert.status === "accepted" ? t("topControls.accepted") : t("topControls.declined")}</p>
                        ) : null}
                      </div>

                      {isPending ? (
                        <div className="alert-actions">
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => void onRespondToAlert(alert.id, "decline")}
                            disabled={Boolean(isRespondingAlertId)}
                          >
                            {isBusy ? t("topControls.working") : t("topControls.decline")}
                          </button>
                          <button type="button" onClick={() => void onRespondToAlert(alert.id, "accept")} disabled={Boolean(isRespondingAlertId)}>
                            {isBusy ? t("topControls.working") : t("topControls.accept")}
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
