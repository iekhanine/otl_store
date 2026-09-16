import {
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  Store,
  UserRound,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ==========================================================
   STORE HEADER 001
   Main commerce header
   ========================================================== */

export default function StoreHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [hardwareMenuOpen, setHardwareMenuOpen] = useState(false);
  const hardwareMenuRef = useRef<HTMLDivElement>(null);

  /* ========================================================
     STORE HEADER 002
     Search routing
     ======================================================== */

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = query.trim();

    if (!trimmed) {
      navigate("/hardware");
      return;
    }

    navigate(`/hardware?q=${encodeURIComponent(trimmed)}`);
  }

  /* ========================================================
     STORE HEADER 003
     Hardware department menu behavior
     ======================================================== */

  useEffect(() => {
    setHardwareMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        hardwareMenuRef.current &&
        !hardwareMenuRef.current.contains(event.target as Node)
      ) {
        setHardwareMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const hardwareActive = location.pathname.startsWith("/hardware");
  const hardwareQuery = new URLSearchParams(location.search)
    .get("q")
    ?.trim()
    .toLowerCase();
  const ramActive = location.pathname === "/hardware" && hardwareQuery === "ram";

  return (
    <header className="store-header">
      {/* ======================================================
          STORE HEADER 004
          Brand + search + account actions
          ====================================================== */}
      <div className="store-header-main">
        <div className="store-shell store-header-main-inner">
          <NavLink to="/" className="store-brand">
            <img src="/images/onetimelabs.png" alt="OneTime Labs" />
            <div>
              <strong>OneTime Labs</strong>
              <span>Store</span>
            </div>
          </NavLink>

          <form className="store-search" onSubmit={submitSearch}>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search software, RAM, hardware..."
              aria-label="Search the OneTime Labs Store"
            />
            <button type="submit">Search</button>
          </form>

          <div className="header-actions">
            {user ? (
              <>
                <NavLink
                  to="/account"
                  className="header-account-link"
                  title={user.email ?? "Your account"}
                >
                  <span className="header-action-icon">
                    <UserRound size={16} />
                  </span>
                  <span className="header-account-copy">
                    <span className="header-account-email">
                      {user.email ?? "Your account"}
                    </span>
                  </span>
                </NavLink>
              </>
            ) : (
              <NavLink to="/login" className="header-account-link">
                <LogIn size={17} />
                <span>Sign in</span>
              </NavLink>
            )}

            <NavLink
              to={user ? "/seller" : "/login?return=/seller"}
              className="header-sell-link"
            >
              <span className="header-action-icon">
                <Store size={16} />
              </span>
              <span>Seller Center</span>
            </NavLink>

            <span className="header-cart-link" aria-label="Cart">
              <span className="header-action-icon">
                <ShoppingBag size={16} />
              </span>
              <span>Cart</span>
            </span>

            {user ? (
              <button
                className="header-icon-link header-signout-link"
                aria-label="Sign out"
                title="Sign out"
                onClick={() => void signOut()}
              >
                <LogOut size={17} />
              </button>
            ) : null}

            <button className="mobile-menu" aria-label="Menu">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================
          STORE HEADER 005
          Left navigation + isolated seller CTA
          ====================================================== */}
      <nav className="store-department-nav" aria-label="Store departments">
        <div className="store-shell store-department-inner">
          <NavLink to="/" end>
            Home
          </NavLink>

          <NavLink to="/software">Software</NavLink>

          <div
            ref={hardwareMenuRef}
            className={`store-department-dropdown${
              hardwareActive ? " active" : ""
            }${hardwareMenuOpen ? " open" : ""}`}
          >
            <button
              type="button"
              className="store-department-trigger"
              aria-haspopup="menu"
              aria-expanded={hardwareMenuOpen}
              onClick={() => setHardwareMenuOpen((current) => !current)}
            >
              <span>Hardware</span>
              <ChevronDown size={13} aria-hidden="true" />
            </button>

            <div className="store-department-menu" role="menu">
              <NavLink
                to="/hardware"
                end
                role="menuitem"
                className={() =>
                  location.pathname === "/hardware" && !hardwareQuery
                    ? "active"
                    : ""
                }
              >
                All Hardware
              </NavLink>
              <NavLink
                to="/hardware?q=RAM"
                role="menuitem"
                className={() => (ramActive ? "active" : "")}
              >
                RAM
              </NavLink>
              <NavLink to="/hardware?q=storage" role="menuitem">
                Storage
              </NavLink>
            </div>
          </div>

          <NavLink to="/support">Support</NavLink>

          <NavLink
            to={user ? "/seller" : "/login?return=/seller"}
            className="store-sell-cta"
          >
            Sell on OneTime Labs
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
