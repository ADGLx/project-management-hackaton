import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faUser, faUsers } from "@fortawesome/free-solid-svg-icons";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function AddTransactionFab() {
  const { t } = useTranslation();
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

    if (location.pathname === "/transactions") {
      const nextParams = new URLSearchParams(location.search);
      nextParams.set("new", "1");
      navigate(`/transactions?${nextParams.toString()}`);
      return;
    }

    navigate("/transactions?new=1");
  }

  function openSharedTransactionModal() {
    setIsMenuOpen(false);

    if (location.pathname === "/household") {
      const nextParams = new URLSearchParams(location.search);
      nextParams.set("new", "1");
      navigate(`/household?${nextParams.toString()}`);
      return;
    }

    navigate("/household?new=1");
  }

  return (
    <div className="fab-menu" ref={menuRef}>
      {isMenuOpen ? <div className="fab-menu-backdrop" aria-hidden="true" onClick={() => setIsMenuOpen(false)} /> : null}

      {isMenuOpen ? (
        <div className="fab-menu-panel" role="menu" aria-label={t("fab.chooseType")}>
          <button className="fab-option-card" type="button" role="menuitem" onClick={openPersonalTransactionModal}>
            <span className="fab-option-icon" aria-hidden="true">
              <FontAwesomeIcon icon={faUser} />
            </span>
            <span className="fab-option-title">{t("fab.personal")}</span>
            <span className="fab-option-description">{t("fab.personalDesc")}</span>
          </button>

          <button className="fab-option-card" type="button" role="menuitem" onClick={openSharedTransactionModal}>
            <span className="fab-option-icon" aria-hidden="true">
              <FontAwesomeIcon icon={faUsers} />
            </span>
            <span className="fab-option-title">{t("fab.shared")}</span>
            <span className="fab-option-description">{t("fab.sharedDesc")}</span>
          </button>
        </div>
      ) : null}

      <button
        className="fab-button"
        type="button"
        onClick={() => setIsMenuOpen((current) => !current)}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        aria-label={t("fab.addTransaction")}
        title={t("fab.addTransaction")}
      >
        <FontAwesomeIcon icon={faPlus} />
      </button>
    </div>
  );
}
