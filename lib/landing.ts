// Text for the landing page. Edit freely, no other file needs to change.

export const STEPS: { title: string; text: string }[] = [
  { title: "Create your account", text: "Sign up in a minute and pick online or in-person learning." },
  { title: "Pay on WhatsApp", text: "Message us, pay, and we unlock your courses straight away." },
  { title: "Learn module by module", text: "Watch each lesson, pass the quiz, and unlock the next one." },
  { title: "Earn your certificate", text: "Finish the course and we issue your certificate." },
];

export const FAQ: { q: string; a: string }[] = [
  {
    q: "Do I need any trading experience?",
    a: "No. The course starts from the very first step: setting up your platform and a demo account.",
  },
  {
    q: "How do I pay?",
    a: "After you sign up, message us on WhatsApp and we arrange payment with you. It is a one-time payment, and your courses unlock as soon as we confirm it.",
  },
  {
    q: "What is the difference between Online and In Person?",
    a: "Online gives you the full course on your phone or laptop. In Person adds classes with us face to face.",
  },
  {
    q: "Can I use my account on my phone and laptop?",
    a: "Yes. Each account works on a small number of devices (2 to start with). Please do not share your login.",
  },
  {
    q: "Is there a discount?",
    a: "Yes. If a friend who is already a student gives you their referral code, you get 5% off.",
  },
  {
    q: "Is this financial advice?",
    a: "No. Everything here is for education only. Trading carries a high risk and you can lose money. Read our Terms and Risk Disclaimer before you join.",
  },
  {
    q: "Will I get a certificate?",
    a: "Yes. Students who finish the whole course receive a certificate with their name.",
  },
];

// Add REAL student words here and the testimonials section appears on the landing page.
// Leave the list empty and the section stays hidden. Please only use quotes that students
// have actually given you, with their permission.
export type Testimonial = { name: string; text: string; detail?: string };
export const TESTIMONIALS: Testimonial[] = [];
