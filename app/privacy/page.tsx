import LegalPage, { Section } from "@/components/LegalPage";
import { BUSINESS_NAME, CONTACT_EMAIL } from "@/lib/legal";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <Section title="1. Who we are">
        <p>
          {BUSINESS_NAME} runs this website and its online and in-person trading
          courses. This page explains what personal information we collect and
          how we use it.
        </p>
      </Section>

      <Section title="2. What we collect">
        <ul>
          <li>
            <strong>Account details:</strong> your full name, email address,
            password (stored securely, we cannot read it), WhatsApp number and
            country.
          </li>
          <li>
            <strong>Course preferences:</strong> whether you learn online or in
            person, your trading experience level, and how you heard about us.
          </li>
          <li>
            <strong>Learning activity:</strong> which lessons you have opened
            and completed, and how much of each video you have watched.
          </li>
          <li>
            <strong>Lesson comments:</strong> questions and replies you post
            under lessons. Other enrolled students and our staff can see them,
            shown with your first name and last initial.
          </li>
          <li>
            <strong>Certificates:</strong> certificates we issue to you, which
            include your name.
          </li>
          <li>
            <strong>Live classes and quizzes:</strong> which live classes you set
            a reminder for, and your quiz attempts and scores.
          </li>
          <li>
            <strong>Referral earnings:</strong> if you refer friends, we record
            what you have earned, and the payout requests you make, including
            where you asked us to send the money (for example a Wave number).
          </li>
          <li>
            <strong>Staff notes:</strong> private notes our team may keep about
            your account, for example about payment or class arrangements.
            Students cannot see these.
          </li>
          <li>
            <strong>Payment status:</strong> whether your payment has been
            confirmed. We record that it was confirmed, not your card or wallet
            details.
          </li>
          <li>
            <strong>Devices:</strong> to limit account sharing, a random device
            ID is stored in a cookie on each browser you use, together with a
            short description of that device (for example &quot;Chrome on
            Android&quot;) and when it was last used. You can see and remove your
            devices on your Profile page.
          </li>
          <li>
            <strong>Referral codes:</strong> each student has a referral code.
            If you join with someone&apos;s code, we record whose code it was so
            the discount can be applied.
          </li>
          <li>
            <strong>Technical data:</strong> a login cookie that keeps you
            signed in, plus basic server logs created by our hosting providers.
          </li>
        </ul>
      </Section>

      <Section title="3. How we use it">
        <ul>
          <li>To create your account and let you log in.</li>
          <li>To confirm your payment and unlock your courses.</li>
          <li>To show your progress and unlock lessons in order.</li>
          <li>To contact you about your course, payment, schedule or account.</li>
          <li>To keep the site secure and prevent misuse or account sharing.</li>
          <li>To understand which parts of the academy need improving.</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </Section>

      <Section title="4. Who we share it with">
        <p>
          We use trusted companies to run the site. They process data for us
          and only for that purpose:
        </p>
        <ul>
          <li>Supabase, for our database, logins and video storage.</li>
          <li>Vercel, for hosting the website.</li>
          <li>An email service, to send account and password emails.</li>
          <li>WhatsApp, when you message us or we message you about payment.</li>
        </ul>
        <p>
          When online payments are added, the payment provider will process
          your payment details under its own privacy policy. We may also share
          information if the law requires it.
        </p>
      </Section>

      <Section title="5. Where your data is stored">
        <p>
          Our providers may store data on servers outside The Gambia. We choose
          providers that use appropriate security measures.
        </p>
      </Section>

      <Section title="6. Cookies">
        <p>
          We use only the cookies needed to keep you logged in. We do not use
          advertising or tracking cookies at this time.
        </p>
      </Section>

      <Section title="7. How long we keep it">
        <p>
          We keep your information while your account is active and for as long
          as needed afterwards for record-keeping, legal and dispute purposes.
          You can ask us to delete your account.
        </p>
      </Section>

      <Section title="8. Your choices">
        <ul>
          <li>You can view and update your name, WhatsApp number, country and learning preferences on your Profile page.</li>
          <li>You can ask us for a copy of your data, a correction, or deletion of your account by emailing {CONTACT_EMAIL}.</li>
        </ul>
      </Section>

      <Section title="9. Security">
        <p>
          Access to student information is limited to authorised staff, and
          course content is protected by login. No system is perfectly secure,
          so please use a strong, unique password and do not share it.
        </p>
      </Section>

      <Section title="10. Age">
        <p>Our courses are for people aged 18 and over.</p>
      </Section>

      <Section title="11. Changes and contact">
        <p>
          We may update this policy and will change the date at the top when we
          do. Questions: {CONTACT_EMAIL}
        </p>
      </Section>
    </LegalPage>
  );
}
