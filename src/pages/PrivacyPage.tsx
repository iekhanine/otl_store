import { LockKeyhole, ShieldCheck } from "lucide-react";

/* ==========================================================
   PRIVACY 001
   OneTime Labs Store privacy policy
   ========================================================== */

const effectiveDate = "September 15, 2026";

export default function PrivacyPage() {
  return (
    <main className="store-shell privacy-page">
      <section className="privacy-hero" aria-labelledby="privacy-title">
        <div className="privacy-hero-icon" aria-hidden="true">
          <ShieldCheck size={24} />
        </div>

        <div>
          <span className="eyebrow dark">ONETIME LABS STORE</span>
          <h1 id="privacy-title">Privacy Policy</h1>
          <p>
            This policy explains what information the OneTime Labs Store
            collects, why we use it, and the choices available to you.
          </p>
          <small>Effective and last updated: {effectiveDate}</small>
        </div>
      </section>

      <section className="privacy-summary-card">
        <LockKeyhole size={20} aria-hidden="true" />
        <div>
          <strong>The short version</strong>
          <p>
            We collect the information needed to operate accounts, process
            purchases, issue licenses, deliver software, support customers,
            and run the seller marketplace. We do not sell personal
            information or use the Store for targeted advertising.
          </p>
        </div>
      </section>

      <div className="privacy-content">
        {/* ====================================================
            PRIVACY 002
            Scope
            ==================================================== */}
        <section>
          <h2>1. Scope</h2>
          <p>
            This Privacy Policy applies to the OneTime Labs Store at
            <strong> store.onetimelabs.net</strong>, including Store accounts,
            software purchases, license delivery, downloads, support forms,
            hardware marketplace features, and seller tools.
          </p>
        </section>

        {/* ====================================================
            PRIVACY 003
            Information collected
            ==================================================== */}
        <section>
          <h2>2. Information we collect</h2>

          <h3>Account information</h3>
          <p>
            When you create or use a Store account, we process information such
            as your email address, account identifier, authentication session,
            and profile information associated with your account. Authentication
            is provided through Supabase. OneTime Labs does not store your
            password in plaintext.
          </p>

          <h3>Purchase, license, and download information</h3>
          <p>
            When you purchase software, we may store your name or email,
            purchased product, purchase amount and currency, Stripe transaction
            identifiers, order status, license information, account identifier,
            and information needed to provide authorized software downloads.
            Download access may use short-lived one-time tokens and temporary
            signed download links.
          </p>

          <h3>Software activation information</h3>
          <p>
            OneTime Labs software may send license and activation information
            to our licensing service so that we can validate a license, enforce
            activation limits, prevent abuse, and provide support. The specific
            activation information depends on the product and version being
            activated.
          </p>

          <h3>Payment information</h3>
          <p>
            Payments are processed by Stripe. Stripe may collect payment-card,
            billing, fraud-prevention, and transaction information directly from
            you. OneTime Labs receives transaction details needed to confirm and
            fulfill your purchase, but we do not receive or store your full
            payment-card number.
          </p>

          <h3>Seller and marketplace information</h3>
          <p>
            If you apply to sell through the Store, we may collect your account
            email, company or store name, requested Store handle, description of
            what you plan to sell, seller status, listings, listing images,
            inventory, and sales records. Seller tools may also contain buyer
            names or contact information entered by a seller for a recorded
            sale. Approved seller accounts may also be represented in private
            OneTime Labs administration systems for account and organization
            management.
          </p>

          <h3>Support communications</h3>
          <p>
            If you contact support, we may collect your name, email address,
            product version, issue type, subject, message, and any other
            information you choose to provide.
          </p>

          <h3>Technical information</h3>
          <p>
            Like most online services, our hosting, authentication, payment,
            storage, and security providers may process technical information
            such as IP address, browser or device information, timestamps,
            request logs, and security events when you use the Store.
          </p>
        </section>

        {/* ====================================================
            PRIVACY 004
            Uses
            ==================================================== */}
        <section>
          <h2>3. How we use information</h2>
          <p>We use information collected through the Store to:</p>
          <ul>
            <li>create and secure Store accounts;</li>
            <li>process purchases and confirm payment;</li>
            <li>issue, validate, and support software licenses;</li>
            <li>provide authorized software downloads and updates;</li>
            <li>operate seller applications, listings, inventory, and sales tools;</li>
            <li>respond to support requests and customer communications;</li>
            <li>detect fraud, abuse, security incidents, and unauthorized access;</li>
            <li>maintain accounting, operational, and transaction records; and</li>
            <li>comply with applicable legal obligations.</li>
          </ul>
        </section>

        {/* ====================================================
            PRIVACY 005
            Service providers
            ==================================================== */}
        <section>
          <h2>4. Service providers</h2>
          <p>
            We use third-party service providers to operate the Store. These
            providers may process information on our behalf or directly as part
            of the services they provide. Current Store infrastructure includes:
          </p>
          <ul>
            <li><strong>Supabase</strong> for authentication, database services, and Store storage;</li>
            <li><strong>Stripe</strong> for payment processing;</li>
            <li><strong>Vercel</strong> for web hosting and server-side Store functions;</li>
            <li><strong>Cloudflare R2</strong> for private software-file storage and delivery; and</li>
            <li><strong>Resend</strong> for delivery of support-form email.</li>
          </ul>
          <p>
            These providers may process information according to their own
            privacy policies and contractual obligations.
          </p>
        </section>

        {/* ====================================================
            PRIVACY 006
            Cookies and sessions
            ==================================================== */}
        <section>
          <h2>5. Cookies, sessions, and local storage</h2>
          <p>
            The Store uses authentication sessions and related browser storage
            needed to keep you signed in, protect account access, and complete
            Store functions. We do not intentionally use the Store for
            third-party behavioral advertising or advertising-profile tracking.
          </p>
        </section>

        {/* ====================================================
            PRIVACY 007
            Retention
            ==================================================== */}
        <section>
          <h2>6. Data retention</h2>
          <p>
            We keep information for as long as reasonably necessary to provide
            the Store and its products, maintain purchase and license history,
            prevent fraud or abuse, respond to support requests, meet accounting
            or legal obligations, and resolve disputes. Some transaction and
            license records may need to be retained after an account is closed.
            Short-lived download credentials expire automatically, although
            related order records may remain in our systems.
          </p>
        </section>

        {/* ====================================================
            PRIVACY 008
            Disclosure
            ==================================================== */}
        <section>
          <h2>7. When information may be disclosed</h2>
          <p>
            We may disclose information to the service providers described
            above, when necessary to complete a transaction or provide a Store
            feature, when you direct us to do so, to protect OneTime Labs or
            others from fraud or security threats, or when required by law or a
            valid legal process. We do not sell personal information.
          </p>
        </section>

        {/* ====================================================
            PRIVACY 009
            Security
            ==================================================== */}
        <section>
          <h2>8. Security</h2>
          <p>
            We use reasonable administrative and technical safeguards designed
            to protect Store information. Examples include authenticated account
            access, restricted server credentials, private software storage,
            time-limited download links, and access controls around Store data.
            No online system can be guaranteed to be completely secure.
          </p>
        </section>

        {/* ====================================================
            PRIVACY 010
            User choices
            ==================================================== */}
        <section>
          <h2>9. Your choices and privacy rights</h2>
          <p>
            You may contact us to ask about personal information associated with
            your Store account, request correction of inaccurate information,
            or request deletion where applicable. Depending on where you live,
            applicable law may provide additional privacy rights. We may need to
            verify your identity before completing a request, and some records
            may be retained when required for legal, security, accounting, or
            transaction purposes.
          </p>
        </section>

        {/* ====================================================
            PRIVACY 011
            Children
            ==================================================== */}
        <section>
          <h2>10. Children</h2>
          <p>
            The Store is not directed to children under 13, and we do not
            knowingly collect personal information from children under 13. If
            you believe a child has provided personal information to the Store,
            contact us so we can review the situation.
          </p>
        </section>

        {/* ====================================================
            PRIVACY 012
            Changes
            ==================================================== */}
        <section>
          <h2>11. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy as the Store, its products, or
            legal requirements change. The current version will be posted on
            this page with its effective date.
          </p>
        </section>

        {/* ====================================================
            PRIVACY 013
            Contact
            ==================================================== */}
        <section>
          <h2>12. Contact</h2>
          <p>
            Questions or privacy requests can be sent to
            <a href="mailto:inquiry@onetimelabs.net"> inquiry@onetimelabs.net</a>.
          </p>
          <p>
            <strong>OneTime Labs</strong><br />
            OneTime Labs Store<br />
            store.onetimelabs.net
          </p>
        </section>
      </div>
    </main>
  );
}
