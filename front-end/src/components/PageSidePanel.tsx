import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

type ThemeMode = "light" | "dark";

const themeStorageKey = "coloc-theme";

function detectInitialTheme(): ThemeMode {
  const savedTheme = window.localStorage.getItem(themeStorageKey);
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function PageSidePanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => detectInitialTheme());

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
    window.localStorage.setItem(themeStorageKey, themeMode);
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
        aria-label="Open side panel"
        title="Open side panel"
      >
        {"<"}
      </button>

      {isOpen ? (
        <div className="side-panel-overlay" role="presentation" onClick={() => setIsOpen(false)}>
          <aside
            className="side-panel-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Side panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-panel-header">
              <button
                className="secondary-button side-panel-theme-toggle"
                type="button"
                onClick={toggleThemeMode}
                aria-label={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                <span aria-hidden="true">{themeMode === "dark" ? "☀" : "🌙"}</span>
              </button>
              <button
                className="secondary-button side-panel-close"
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close side panel"
                title="Close side panel"
              >
                {">"}
              </button>
            </div>

            <div className="side-panel-actions">
              <button className="secondary-button side-panel-action" type="button" onClick={() => navigate("/user")}>
                Profile
              </button>
              <button className="secondary-button side-panel-action" type="button" disabled>
                Settings
              </button>
              <button className="secondary-button side-panel-action" type="button" onClick={() => navigate("/")}>
                Stats
              </button>
            </div>

            <div className="side-panel-footer">
              <button className="secondary-button side-panel-action" type="button" onClick={() => void onLogout()}>
                Logout
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
