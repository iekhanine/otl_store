import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { LockKeyhole, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";

/* ==========================================================
   HEADER 001
   STORE LOGIN / ACCOUNT CREATION
   ========================================================== */

export default function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const returnTo = searchParams.get("return") || "/account";

  if (!loading && user) {
    return <Navigate to={returnTo} replace />;
  }

  /* ========================================================
     HEADER 002
     AUTH SUBMIT HANDLER
     ======================================================== */

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
        navigate(returnTo, { replace: true });
        return;
      }

      const result = await signUp(email.trim(), password);

      if (result.needsEmailConfirmation) {
        setMessage(
          "Account created. Check your email to confirm it, then sign in.",
        );
        setMode("signin");
        return;
      }

      navigate(returnTo, { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Authentication failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  /* ========================================================
     HEADER 003
     STORE-WIDTH AUTH PANEL

     The white Sign In panel uses the exact same store-shell width
     as the main storefront. The actual form stays compact and
     centered inside the panel.
     ======================================================== */

  return (
    <main className="store-shell auth-page">
      <section className="auth-card" aria-labelledby="store-auth-title">
        <div className="auth-card-content">
          <div className="auth-icon">
            <LockKeyhole size={23} />
          </div>

          <span className="eyebrow dark">ONETIME LABS STORE</span>

          <h1 id="store-auth-title">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h1>

          <p>
            One account for purchases, software, seller tools, and Store
            activity.
          </p>

          <div className="auth-mode-switch">
            <button
              type="button"
              className={mode === "signin" ? "active" : ""}
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>

            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => setMode("signup")}
            >
              <UserPlus size={15} />
              Create account
            </button>
          </div>

          <form onSubmit={submit} className="auth-form">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
              />
            </label>

            {error && (
              <div className="checkout-error" role="alert">
                {error}
              </div>
            )}

            {message && <div className="auth-message">{message}</div>}

            <button
              className="button primary full-width"
              type="submit"
              disabled={busy}
            >
              {busy
                ? "Working..."
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
