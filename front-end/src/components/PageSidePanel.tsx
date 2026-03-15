import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

type ThemeMode = "light" | "dark";

function detectInitialTheme(): ThemeMode {
  return "light";
}

export default function PageSidePanel() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => detectInitialTheme());
  const currentLanguage = i18n.resolvedLanguage === "fr-CA" ? "fr-CA" : "en";

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
  }, [themeMode]);

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  function toggleThemeMode() {
    setThemeMode((current) => (current === "dark" ? "light" : "dark"));
  }

  return (
    <>
      <button
        className="secondary-button side-panel-trigger"
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t("sidePanel.open")}
        title={t("sidePanel.open")}
      >
        {"<"}
      </button>

      {isOpen ? (
        <div className="side-panel-overlay" role="presentation" onClick={() => setIsOpen(false)}>
          <aside
            className="side-panel-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t("sidePanel.title")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-panel-header">
              <button
                className="secondary-button side-panel-theme-toggle"
                type="button"
                onClick={toggleThemeMode}
                aria-label={themeMode === "dark" ? t("sidePanel.switchToLight") : t("sidePanel.switchToDark")}
                title={themeMode === "dark" ? t("sidePanel.switchToLight") : t("sidePanel.switchToDark")}
              >
                <span aria-hidden="true">{themeMode === "dark" ? "☀" : "🌙"}</span>
              </button>
              <button
                className="secondary-button side-panel-close"
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={t("sidePanel.close")}
                title={t("sidePanel.close")}
              >
                {">"}
              </button>
            </div>

            <div className="side-panel-language-toggle" role="group" aria-label={t("language.label")}>
              <button
                className={`secondary-button side-panel-language-button${currentLanguage === "en" ? " active" : ""}`}
                type="button"
                onClick={() => void i18n.changeLanguage("en")}
                aria-pressed={currentLanguage === "en"}
                title={t("language.english")}
              >
                EN
              </button>
              <button
                className={`secondary-button side-panel-language-button${currentLanguage === "fr-CA" ? " active" : ""}`}
                type="button"
                onClick={() => void i18n.changeLanguage("fr-CA")}
                aria-pressed={currentLanguage === "fr-CA"}
                title={t("language.frenchCanada")}
              >
                FR
              </button>
            </div>

            <div className="side-panel-actions">
              <button className="secondary-button side-panel-action" type="button" onClick={() => navigate("/user")}>
                {t("sidePanel.profile")}
              </button>
              <button className="secondary-button side-panel-action" type="button" disabled>
                {t("sidePanel.settings")}
              </button>
              <button className="secondary-button side-panel-action" type="button" onClick={() => navigate("/")}>
                {t("sidePanel.stats")}
              </button>
            </div>

            <div className="side-panel-footer">
              <button className="secondary-button side-panel-action" type="button" onClick={() => void onLogout()}>
                {t("common.logout")}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
