import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartColumn, faClockRotateLeft, faHouse, faWallet } from "@fortawesome/free-solid-svg-icons";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function MobileNav() {
  const { t } = useTranslation();
  const navItems = [
    { to: "/", icon: faChartColumn, label: t("nav.dashboard") },
    { to: "/household", icon: faHouse, label: t("nav.household") },
    { to: "/budget", icon: faWallet, label: t("nav.budget") },
    { to: "/transactions", icon: faClockRotateLeft, label: t("nav.history") },
  ];

  return (
    <nav className="mobile-nav" aria-label={t("nav.primary")}>
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
    </nav>
  );
}
