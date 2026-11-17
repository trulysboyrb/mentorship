import LegalPage, { Section } from "@/components/LegalPage";
import { CONTACT_EMAIL, REFUND_DAYS } from "@/lib/legal";

export const metadata = { title: "Refund Policy" };

export default function RefundPage() {
  return (
    <LegalPage title="Refund Policy">
      <Section title="1. Our promise">
        <p>
          We want you to be happy with what you learn. If the course is not
          right for you, you can ask for a refund within {REFUND_DAYS} days of
          your payment being confirmed.
        </p>
      </Section>

      <Section title="2. When a refund is available">
        <ul>
          <li>Your request is made within {REFUND_DAYS} days of payment confirmation.</li>
          <li>You have not shared your account or broken the Terms.</li>
          <li>For in-person courses, you have not yet attended a session. Sessions already attended are not refundable.</li>
        </ul>
      </Section>

      <Section title="3. What is not refunded">
        <ul>
          <li>Trading losses or poor trading results. Trading always carries risk and we do not guarantee outcomes.</li>
          <li>Requests made after the refund window.</li>
          <li>Accounts closed for breaking the Terms, such as sharing or copying course content.</li>
        </ul>
      </Section>

      <Section title="4. How to ask">
        <p>
          Message us on WhatsApp or email {CONTACT_EMAIL} from the details you
          signed up with. Tell us your full name and the email on your account.
        </p>
      </Section>

      <Section title="5. How refunds are paid">
        <p>
          Approved refunds are paid back using the same method you paid with,
          where possible, within a reasonable time after we approve the
          request. Your course access will be removed once a refund is paid.
        </p>
      </Section>
    </LegalPage>
  );
}
