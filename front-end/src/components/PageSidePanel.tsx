import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function PageSidePanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

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
              <span className="side-panel-brand-icon" aria-hidden="true">
                ⚜
              </span>
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
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
