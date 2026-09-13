import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { LockKeyhole, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
        navigate(returnTo, { replace: true });
      } else {
        const result = await signUp(email.trim(), password);
        if (result.needsEmailConfirmation) {
          setMessage("Account created. Check your email to confirm it, then sign in.");
          setMode("signin");
        } else {
          navigate(returnTo, { replace: true });
        }
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="store-shell auth-page">
      <section className="auth-card">
        <div className="auth-icon"><LockKeyhole size={23} /></div>
        <span className="eyebrow dark">ONETIME LABS ACCOUNT</span>
        <h1>{mode === "signin" ? "Sign in" : "Create your account"}</h1>
        <p>Purchases, downloads, and StreamSafe licenses stay attached to your account.</p>

        <div className="auth-mode-switch">
          <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}><UserPlus size={15} /> Create account</button>
        </div>

        <form onSubmit={submit} className="auth-form">
          <label>
            Email
            <input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          </label>

          {error && <div className="checkout-error" role="alert">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <button className="button primary full-width" type="submit" disabled={busy}>
            {busy ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
