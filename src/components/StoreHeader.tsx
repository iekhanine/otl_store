import {
  Download,
  Menu,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { NavLink } from "react-router-dom";

export default function StoreHeader() {
  return (
    <header className="store-header">
      <div className="store-shell header-inner">
        <NavLink to="/" className="store-brand">
          <img src="/images/onetimelabs.png" alt="OneTime Labs" />
          <div>
            <strong>OneTime Labs</strong>
            <span>Store</span>
          </div>
        </NavLink>

        <nav className="desktop-nav" aria-label="Store navigation">
          <NavLink to="/">Store</NavLink>
          <NavLink to="/support">Support</NavLink>
          <NavLink to="/account">My Software</NavLink>
        </nav>

        <div className="header-actions">
          <NavLink to="/account" className="header-icon-link" aria-label="My software">
            <UserRound size={18} />
          </NavLink>
          <NavLink to="/account" className="header-icon-link" aria-label="Downloads">
            <Download size={18} />
          </NavLink>
          <span className="header-icon-link static-icon" aria-label="Cart">
            <ShoppingBag size={18} />
          </span>
          <button className="mobile-menu" aria-label="Menu">
            <Menu size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
