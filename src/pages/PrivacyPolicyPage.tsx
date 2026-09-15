import { Link } from "react-router-dom";

const sections = [
  { id: "about", label: "1. About this Privacy Notice" },
  { id: "data", label: "2. The data we collect about you" },
  { id: "cookies", label: "3. Cookies and how we use them" },
  { id: "use", label: "4. How we use your personal data" },
  { id: "share", label: "5. How we share your personal data" },
  { id: "transfers", label: "6. International transfers" },
  { id: "security", label: "7. Data security" },
  { id: "rights", label: "8. Your legal rights" },
  { id: "contact", label: "9. Further details" },
] as const;

export function PrivacyPolicyPage() {
  return (
    <div className="page-container py-8 sm:py-12 max-w-3xl">
      <p className="text-sm text-text-muted mb-2">
        <Link to="/" className="hover:text-accent transition-colors">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span>Privacy Policy</span>
      </p>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-text tracking-tight mb-3">
        Privacy and Cookie Notice
      </h1>
      <p className="text-sm text-text-muted mb-8">
        Last updated: 15 September 2026 · One Source (`onesourco.com`)
      </p>

      <nav
        aria-label="Contents"
        className="rounded-2xl border border-border bg-surface p-5 mb-10"
      >
        <h2 className="text-sm font-bold uppercase tracking-wide text-text mb-3">
          Contents
        </h2>
        <ol className="space-y-2 text-sm">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-accent hover:underline">
                {s.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="prose-legal space-y-10 text-[15px] leading-relaxed text-text">
        <section id="about" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3">1. About this Notice</h2>
          <p className="text-text-muted">
            This Privacy and Cookie Notice explains how One Source (“we”, “us”, “our”)
            collects and processes your personal data when you use our website, mobile
            applications, and related services for ordering fresh produce, kitchen ware,
            and delivery across Uganda.
          </p>
        </section>

        <section id="data" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3">2. The data we collect about you</h2>
          <p className="text-text-muted mb-4">
            We collect personal data to provide and improve our products and services.
            Depending on how you use One Source, this may include:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-text-muted">
            <li>
              <strong className="text-text">Information you provide:</strong> name, email
              address, phone number, delivery address, account password, and order notes.
            </li>
            <li>
              <strong className="text-text">Order and payment-related data:</strong> items
              purchased, basket contents, delivery preferences, and payment confirmation
              details processed through our payment partners (we do not store full card
              numbers on our servers).
            </li>
            <li>
              <strong className="text-text">Usage data:</strong> pages and products viewed,
              searches, device type, app version, and approximate technical logs needed to
              keep the service secure and reliable.
            </li>
            <li>
              <strong className="text-text">Communications:</strong> messages you send to
              support, and transactional emails we send (for example login codes, password
              reset links, and order updates).
            </li>
          </ul>
          <p className="text-text-muted mt-4">
            We do not require access to your SMS inbox, full contacts list, or installed
            app list to use One Source shopping features.
          </p>
        </section>

        <section id="cookies" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3">3. Cookies and how we use them</h2>
          <p className="text-text-muted mb-4">
            A cookie (or similar technology) is a small file stored on your device. We use
            cookies and local storage to:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-text-muted">
            <li>Keep you signed in and remember language or currency preferences</li>
            <li>Save your basket and shopping session</li>
            <li>Measure basic site performance and fix errors</li>
            <li>Improve how the shop works for returning customers</li>
          </ul>
          <p className="text-text-muted mt-4">
            You can control cookies through your browser or device settings. Disabling
            some cookies may limit features such as staying signed in or keeping your
            basket.
          </p>
        </section>

        <section id="use" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3">4. How we use your personal data</h2>
          <p className="text-text-muted mb-4">We use your personal data to:</p>
          <ul className="list-disc pl-5 space-y-2 text-text-muted">
            <li>Create and manage your One Source account</li>
            <li>Process, pack, and deliver your orders</li>
            <li>Send service messages (login codes, password resets, order status)</li>
            <li>Provide customer support and resolve disputes</li>
            <li>Improve our website, apps, catalogue, and delivery experience</li>
            <li>Detect fraud, abuse, and security incidents</li>
            <li>Meet legal and accounting obligations</li>
            <li>
              Where permitted, send updates about products or offers — you can opt out of
              marketing messages at any time
            </li>
          </ul>
        </section>

        <section id="share" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3">5. How we share your personal data</h2>
          <p className="text-text-muted mb-4">
            We share personal data only when needed to run One Source, including with:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-text-muted">
            <li>
              <strong className="text-text">Delivery and fulfilment partners</strong> so
              your order can reach you
            </li>
            <li>
              <strong className="text-text">Payment providers</strong> to process payments
              securely
            </li>
            <li>
              <strong className="text-text">Infrastructure providers</strong> (hosting,
              database, email delivery, analytics) acting on our instructions
            </li>
            <li>
              <strong className="text-text">Authorities</strong> when required by law or to
              protect rights, safety, and security
            </li>
          </ul>
          <p className="text-text-muted mt-4">
            We do not sell your personal data. Service providers may only process your data
            for the purposes we specify.
          </p>
        </section>

        <section id="transfers" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3">6. International transfers</h2>
          <p className="text-text-muted">
            Some of our service providers may process data on servers outside Uganda. When
            that happens, we take steps appropriate under applicable law to protect your
            information, and we continue to respect your rights described in this notice.
          </p>
        </section>

        <section id="security" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3">7. Data security</h2>
          <p className="text-text-muted">
            We use technical and organisational measures designed to protect personal data
            against accidental loss, unauthorised access, alteration, or disclosure. Access
            is limited to people and systems that need the data to perform their work.
            No method of transmission over the internet is completely secure; please use a
            strong password and keep your login details private.
          </p>
        </section>

        <section id="rights" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3">8. Your legal rights</h2>
          <p className="text-text-muted mb-4">
            Subject to applicable law, you may have the right to:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-text-muted">
            <li>Access the personal data we hold about you</li>
            <li>Ask us to correct inaccurate data</li>
            <li>Ask us to delete or restrict certain processing</li>
            <li>Object to certain uses of your data</li>
            <li>Unsubscribe from marketing emails</li>
          </ul>
          <p className="text-text-muted mt-4">
            To exercise these rights, contact us using the details below. Please keep your
            account details up to date so we can serve you correctly.
          </p>
        </section>

        <section id="contact" className="scroll-mt-24">
          <h2 className="text-xl font-bold mb-3">9. Further details</h2>
          <p className="text-text-muted mb-4">
            If you have questions about this notice, how we process personal data, or wish
            to exercise your rights, contact One Source:
          </p>
          <ul className="list-none space-y-2 text-text-muted">
            <li>
              Website:{" "}
              <a
                href="https://www.onesourco.com"
                className="text-accent hover:underline"
              >
                https://www.onesourco.com
              </a>
            </li>
            <li>
              Email:{" "}
              <a
                href="mailto:noreply@one-sourcebrand.com"
                className="text-accent hover:underline"
              >
                noreply@one-sourcebrand.com
              </a>
            </li>
          </ul>
          <p className="text-text-muted mt-6">
            We may update this notice from time to time. The “Last updated” date at the top
            of this page will change when we do. Continued use of One Source after an update
            means you acknowledge the revised notice.
          </p>
        </section>
      </article>
    </div>
  );
}
