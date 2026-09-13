import {
  Download,
  LogIn,
  LogOut,
  Menu,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function StoreHeader() {
  const { user, signOut } = useAuth();

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
          {user ? (
            <>
              <NavLink to="/account" className="header-account-link">
                <UserRound size={17} />
                <span>{user.email}</span>
              </NavLink>
              <button className="header-icon-link" aria-label="Sign out" onClick={() => void signOut()}>
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <NavLink to="/login" className="header-account-link">
              <LogIn size={17} />
              <span>Sign in</span>
            </NavLink>
          )}
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
