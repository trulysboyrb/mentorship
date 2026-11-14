// Text for the landing page. Edit freely, no other file needs to change.

export const STEPS: { title: string; text: string }[] = [
  { title: "Create your account", text: "Sign up in a minute and pick online or in-person learning." },
  { title: "Pay your way", text: "Pay with Wave, card or crypto and your courses unlock by themselves, or pay on WhatsApp and we confirm it." },
  { title: "Learn module by module", text: "Watch each lesson, pass the quiz, and unlock the next one." },
  { title: "Earn your certificate", text: "Finish the course and we issue your certificate." },
];

export const FAQ: { q: string; a: string }[] = [
  {
    q: "What is The Forbes Academy?",
    a: "The Forbes Academy is a professional training institute based in The Gambia, dedicated to empowering leaders, cultivating excellence, and strengthening institutional performance across sectors.",
  },
  {
    q: "What type of training does The Forbes Academy offer?",
    a: "Training, mentoring and coaching for aspiring public speakers and presenters, online or in person.",
  },
  {
    q: "How do I pay?",
    a: "After you sign up you can pay online with Wave, card or crypto, and your courses unlock automatically once the payment is verified. You can also pay on WhatsApp and we confirm it by hand. It is a one-time payment.",
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
    q: "Will I get a certificate?",
    a: "Yes. Students who finish the whole course receive a certificate with their name.",
  },
];

// Add REAL student words here and the testimonials section appears on the landing page.
// Leave the list empty and the section stays hidden. Please only use quotes that students
// have actually given you, with their permission.
export type Testimonial = { name: string; text: string; detail?: string };
export const TESTIMONIALS: Testimonial[] = [];
