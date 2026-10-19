import LegalPage, { Section } from "@/components/LegalPage";
import { BUSINESS_NAME, CONTACT_EMAIL, GOVERNING_COUNTRY } from "@/lib/legal";

export const metadata = { title: "Terms and Risk Disclaimer" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms and Risk Disclaimer">
      <Section title="1. About these terms">
        <p>
          These terms govern your use of the {BUSINESS_NAME} website and
          courses. By creating an account you confirm that you have read and
          accept them, along with our Privacy Policy and Refund Policy.
        </p>
      </Section>

      <Section title="2. Who can join">
        <p>You must be at least 18 years old to create an account.</p>
      </Section>

      <Section title="3. Risk disclaimer">
        <p>
          Trading forex, crypto and other financial instruments carries a high
          level of risk. You can lose some or all of your money. Only trade
          with money you can afford to lose.
        </p>
        <ul>
          <li>Our courses are for education only.</li>
          <li>Nothing we teach or say is financial, investment, tax or legal advice.</li>
          <li>We do not guarantee profits, income, or any particular result.</li>
          <li>Past results, ours or anyone else&apos;s, do not guarantee future results.</li>
          <li>Any example trades are for teaching and are not recommendations to buy or sell.</li>
          <li>You are fully responsible for your own trading decisions and any losses.</li>
        </ul>
        <p>
          Consider speaking to a licensed financial adviser before you invest
          or trade.
        </p>
      </Section>

      <Section title="4. Your account">
        <ul>
          <li>Your account is personal to you. Do not share your login or let anyone else use it.</li>
          <li>Your account can be used on a limited number of devices at once. You can manage them on your Profile page.</li>
          <li>Give us accurate details when you sign up and keep them up to date.</li>
          <li>Keep your password private. You are responsible for activity on your account.</li>
          <li>We may suspend or close accounts that break these terms.</li>
        </ul>
      </Section>

      <Section title="5. Payment and access">
        <p>
          After you sign up, payment is arranged with our team, currently
          through WhatsApp. Your course access is unlocked once we confirm your
          payment. Fees are the ones we agree with you before you pay.
        </p>
        <p>
          We will never ask for your broker password, your wallet seed phrase,
          or your bank PIN. Only pay through the methods our team gives you
          directly.
        </p>
      </Section>

      <Section title="5a. Referral discount">
        <p>
          Students who join using a valid referral code from a paid student receive a
          5% discount on a one-time course fee. The discount is agreed with our team
          when you pay and cannot be combined with other offers. We may withdraw codes
          that are abused.
        </p>
      </Section>

      <Section title="6. Course content">
        <p>
          All videos, notes and materials belong to {BUSINESS_NAME}. You get a
          personal, non-transferable licence to view them for your own
          learning. You must not copy, record, resell, share or publish them,
          in whole or in part, without written permission.
        </p>
      </Section>

      <Section title="7. In-person classes">
        <p>
          If you chose in-person learning, dates, times and venues are agreed
          with our team. We may reschedule a session and will tell you as early
          as we can.
        </p>
      </Section>

      <Section title="8. Brokers and third-party sites">
        <p>
          Our lessons may link to or mention brokers, platforms and tools
          owned by other companies. We do not control them and are not
          responsible for their services or fees. Any decision to open an
          account with a third party is yours.
        </p>
        <p>
          If we ever earn a referral commission from a broker, we will say so
          clearly. (Edit or remove this paragraph to match your situation.)
        </p>
      </Section>

      <Section title="9. Acceptable use">
        <ul>
          <li>Do not try to bypass the access controls, or access content you have not unlocked.</li>
          <li>Do not attempt to disrupt, scrape, or break into the site.</li>
          <li>Be respectful to staff and other students.</li>
          <li>
            Lesson comments are visible to other students and our staff. Do not post
            spam, abuse, other people&apos;s private information, or promotions for
            other services. We may delete comments and suspend accounts that do.
          </li>
        </ul>
      </Section>

      <Section title="10. Limits on our responsibility">
        <p>
          We work hard to keep the site and courses available and accurate, but
          we provide them &quot;as is&quot;. To the extent the law allows, we
          are not liable for trading losses, lost profits, or indirect losses
          arising from your use of the site or courses. Nothing in these terms
          limits liability that cannot be limited by law.
        </p>
      </Section>

      <Section title="11. Changes">
        <p>
          We may update these terms. If we make a significant change, we will
          let you know on the site or by message. Continuing to use the site
          after a change means you accept it.
        </p>
      </Section>

      <Section title="12. Governing law">
        <p>These terms are governed by the laws of {GOVERNING_COUNTRY}.</p>
      </Section>

      <Section title="13. Contact">
        <p>Questions about these terms: {CONTACT_EMAIL}</p>
      </Section>
    </LegalPage>
  );
}
