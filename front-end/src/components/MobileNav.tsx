import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartColumn, faHouse, faReceipt, faUser } from "@fortawesome/free-solid-svg-icons";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", icon: faChartColumn, label: "Dashboard" },
  { to: "/transactions", icon: faReceipt, label: "Transactions" },
  { to: "/household", icon: faHouse, label: "Household" },
  { to: "/user", icon: faUser, label: "Profile" },
];

export default function MobileNav() {
  return (
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
    </nav>
  );
}
