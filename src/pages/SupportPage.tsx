import {
  BookOpen,
  CheckCircle2,
  CircleHelp,
  KeyRound,
  Mail,
  Send,
  Wrench,
} from "lucide-react";
import {
  FormEvent,
  useRef,
  useState,
} from "react";

/* ==========================================================
   HEADER 001
   StreamSafe support documentation links
   ========================================================== */

const supportItems = [
  {
    icon: BookOpen,
    title: "Installation Guide",
    description: "Install StreamSafe and configure OBS.",
    href: "https://otles.onetimelabs.net/o/onetimelabs/ssafe-001-e3586dc9d2d34fa0a0c75810e136236e",
  },
  {
    icon: KeyRound,
    title: "Activation Help",
    description: "Activate a perpetual StreamSafe license.",
    href: "https://otles.onetimelabs.net/o/onetimelabs/ssafe-002-34a4f3d406bb4298a5ebbe59bc000e37",
  },
  {
    icon: CircleHelp,
    title: "Using StreamSafe",
    description: "Recall windows, Float, DUMP, and Test Mode.",
    href: "https://otles.onetimelabs.net/o/onetimelabs/ssafe-003-d8d098f5e3614ef1864e345ad95e3dd5",
  },
  {
    icon: Wrench,
    title: "Troubleshooting",
    description: "Common installation and streaming issues.",
    href: "https://otles.onetimelabs.net/o/onetimelabs/ssafe-004-e70979cf71a84e25bdf94a2cf40031aa",
  },
];

type SupportResult = {
  ok?: boolean;
  error?: string;
};

export default function SupportPage() {
  const contactRef = useRef<HTMLElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  /* ========================================================
     HEADER 002
     Contact form submit handler
     ======================================================== */

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/support-contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let result: SupportResult = {};

      try {
        result = await response.json() as SupportResult;
      } catch {
        result = {};
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
          "Unable to send your message right now. Please try again.",
        );
      }

      form.reset();
      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to send your message right now. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openContactForm() {
    setSubmitted(false);
    setSubmitError("");

    window.requestAnimationFrame(() => {
      contactRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <main className="store-shell support-page">
      {/* =====================================================
          HEADER 003
          Support heading
          ===================================================== */}
      <div className="support-heading">
        <span className="eyebrow dark">SUPPORT</span>
        <h1>Need help?</h1>
        <p>
          Installation, activation, and StreamSafe documentation.
        </p>
      </div>

      {/* =====================================================
          HEADER 004
          Support resources
          ===================================================== */}
      <div className="support-list">
        {supportItems.map(item => {
          const Icon = item.icon;

          return (
            <a
              key={item.title}
              className="support-row"
              href={item.href}
              target="_blank"
              rel="noreferrer"
            >
              <span className="support-icon">
                <Icon size={19} />
              </span>

              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>

              <span className="support-arrow">›</span>
            </a>
          );
        })}

        <button
          className="support-row support-contact-row"
          type="button"
          onClick={openContactForm}
        >
          <span className="support-icon">
            <Mail size={19} />
          </span>

          <span>
            <strong>Contact OneTime Labs</strong>
            <small>Send a support request directly to OneTime Labs.</small>
          </span>

          <span className="support-arrow">›</span>
        </button>
      </div>

      {/* =====================================================
          HEADER 005
          Contact OneTime Labs form
          ===================================================== */}
      <section
        ref={contactRef}
        id="contact-onetime-labs"
        className="support-contact-card"
      >
        <div className="support-contact-heading">
          <div>
            <span className="eyebrow dark">CONTACT ONETIME LABS</span>
            <h2>Tell us what happened.</h2>
            <p>
              StreamSafe support requests are sent directly to
              inquiry@onetimelabs.net.
            </p>
          </div>

          <span className="support-contact-mail-icon" aria-hidden="true">
            <Mail size={21} />
          </span>
        </div>

        {submitted ? (
          <div className="support-contact-success" role="status">
            <CheckCircle2 size={27} strokeWidth={1.6} />

            <div>
              <strong>Message sent.</strong>
              <p>
                Your StreamSafe support request has been sent to OneTime Labs.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSubmitted(false)}
            >
              Send another message
            </button>
          </div>
        ) : (
          <form
            className="support-contact-form"
            onSubmit={handleSubmit}
          >
            <div className="support-form-grid">
              <label>
                <span>Name *</span>
                <input
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={120}
                  placeholder="Your name"
                />
              </label>

              <label>
                <span>Email *</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={200}
                  placeholder="you@example.com"
                />
              </label>

              <label>
                <span>Issue type *</span>
                <select
                  name="issueType"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choose an issue
                  </option>
                  <option value="Installation">Installation</option>
                  <option value="Activation">Activation</option>
                  <option value="OBS connection">OBS connection</option>
                  <option value="Protection / DUMP">Protection / DUMP</option>
                  <option value="Twitch connection">Twitch connection</option>
                  <option value="Purchase / license">Purchase / license</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label>
                <span>StreamSafe version</span>
                <input
                  name="version"
                  type="text"
                  maxLength={40}
                  placeholder="Example: 0.12.10"
                />
              </label>
            </div>

            <label className="support-form-full">
              <span>Subject *</span>
              <input
                name="subject"
                type="text"
                required
                maxLength={180}
                placeholder="Short description of the problem"
              />
            </label>

            <label className="support-form-full">
              <span>What happened? *</span>
              <textarea
                name="message"
                required
                rows={7}
                maxLength={5000}
                placeholder="Tell us what you were doing, what you expected, what actually happened, and any error message you saw."
              />
            </label>

            {/* Bot trap. Real users never see or fill this field. */}
            <label className="support-form-honeypot" aria-hidden="true">
              <span>Website</span>
              <input
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </label>

            <div className="support-form-footer">
              <p>
                Do not include passwords, Twitch stream keys, or your complete
                StreamSafe license key.
              </p>

              <div className="support-form-submit-wrap">
                {submitError && (
                  <p className="support-form-error" role="alert">
                    {submitError}
                  </p>
                )}

                <button
                  className="support-form-submit"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Sending..." : "Send Support Request"}
                  {!submitting && <Send size={15} />}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
