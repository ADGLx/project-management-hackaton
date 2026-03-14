import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faUser, faUsers } from "@fortawesome/free-solid-svg-icons";
import { useLocation, useNavigate } from "react-router-dom";

export default function AddTransactionFab() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function onDocumentClick(event: MouseEvent) {
      if (!menuRef.current) {
        return;
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", onDocumentClick);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("mousedown", onDocumentClick);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMenuOpen]);

  function openPersonalTransactionModal() {
    setIsMenuOpen(false);
    navigate("/transactions?new=1");
  }

  function openSharedTransactionModal() {
    setIsMenuOpen(false);
    navigate("/household?new=1");
  }

  return (
    <div className="fab-menu" ref={menuRef}>
      {isMenuOpen ? (
        <div className="fab-menu-panel" role="menu" aria-label="Choose transaction type">
          <button className="fab-option-card" type="button" role="menuitem" onClick={openPersonalTransactionModal}>
            <span className="fab-option-icon" aria-hidden="true">
              <FontAwesomeIcon icon={faUser} />
            </span>
            <span className="fab-option-title">Personal</span>
            <span className="fab-option-description">Personal budget only</span>
          </button>

          <button className="fab-option-card" type="button" role="menuitem" onClick={openSharedTransactionModal}>
            <span className="fab-option-icon" aria-hidden="true">
              <FontAwesomeIcon icon={faUsers} />
            </span>
            <span className="fab-option-title">Shared</span>
            <span className="fab-option-description">Split with Household members</span>
          </button>
        </div>
      ) : null}

      <button
        className="fab-button"
        type="button"
        onClick={() => setIsMenuOpen((current) => !current)}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        aria-label="Add transaction"
        title="Add transaction"
      >
        <FontAwesomeIcon icon={faPlus} />
      </button>
    </div>
  );
}
