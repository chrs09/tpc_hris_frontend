const CONTACT_EMAIL = "tytanprime.system@gmail.com";
const EFFECTIVE_DATE = "September 19, 2026";

const Section = ({ title, children }) => (
  <section className="mt-8">
    <h2 className="text-xl font-semibold text-fg">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-6 text-fg-muted">
      {children}
    </div>
  </section>
);

export default function LegalNotice() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-fg">Privacy Policy</h1>
        <p className="mt-2 text-sm text-fg-subtle">
          Tytan Portal (the "App") · Effective {EFFECTIVE_DATE}
        </p>

        <p className="mt-6 text-sm leading-6 text-fg-muted">
          Tytan Portal is a workforce and trip management app operated by Tytan
          Prime Corporation ("we", "us"). It is used by our employees, drivers,
          and administrators. This policy explains what information the App
          collects, why, and how it is handled.
        </p>

        <Section title="Information we collect">
          <p>
            <strong className="text-fg">Account information.</strong> Your
            name, username, role, employee ID, and login credentials, provided
            by your employer when your account is created.
          </p>
          <p>
            <strong className="text-fg">Location.</strong> Precise location
            (GPS) when you check in or out for attendance, and during trips.
            While a trip is in progress, the App records your route, including
            when the App is in the background or the screen is off, so that
            deliveries can be verified. Location is not collected when you are
            not on a trip or using an attendance feature.
          </p>
          <p>
            <strong className="text-fg">Photos.</strong> Photos you take
            through the App, such as attendance selfies and delivery documents
            (invoices, load manifests, unloading and proof-of-delivery photos).
          </p>
          <p>
            <strong className="text-fg">Work records.</strong> Attendance,
            trip, store visit, and delivery records created by using the App.
          </p>
          <p>
            <strong className="text-fg">Device and diagnostic data.</strong>{" "}
            App version and error or crash information, used to find and fix
            problems.
          </p>
        </Section>

        <Section title="How we use your information">
          <ul className="list-disc space-y-1 pl-5">
            <li>To record attendance and verify where and when work happened.</li>
            <li>To track trips and confirm deliveries to stores.</li>
            <li>To calculate work-related pay and process approvals.</li>
            <li>To keep the App secure and to fix bugs.</li>
          </ul>
          <p>We do not use your information for advertising.</p>
        </Section>

        <Section title="Sharing">
          <p>
            We do not sell your personal information. Information is visible to
            authorized Tytan Prime personnel (for example coordinators, office
            staff, finance, and administrators) as needed for their work, and
            is processed on servers and services we use to run the App. We may
            disclose information if required by law.
          </p>
        </Section>

        <Section title="Security">
          <p>
            Data is sent between the App and our servers over encrypted
            (HTTPS) connections, and access is limited by account and role.
            No system is perfectly secure, but we take reasonable steps to
            protect your information.
          </p>
        </Section>

        <Section title="Retention and deletion">
          <p>
            We keep information for as long as needed for the purposes above and
            for our business and legal record-keeping. You can ask us to
            correct or delete your information, subject to our legal and
            payroll record-keeping obligations, by emailing{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="Permissions the App requests">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-fg">Location (including background):</strong>{" "}
              attendance and trip tracking.
            </li>
            <li>
              <strong className="text-fg">Camera:</strong> attendance selfies
              and delivery photos.
            </li>
            <li>
              <strong className="text-fg">Photos / files:</strong> attaching
              document images.
            </li>
          </ul>
          <p>
            You can change these permissions in your device settings, but some
            features will not work without them.
          </p>
        </Section>

        <Section title="Children">
          <p>The App is intended for adults and is not directed at children.</p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this policy from time to time. The effective date at
            the top shows when it was last changed.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about this policy or your data? Email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
