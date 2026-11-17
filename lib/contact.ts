// "Contact Us" mail templates. Pure functions, so they can be tested.

export const TOPICS = [
  { id: "payment", label: "Payment problem", subject: "Payment problem", intro: "I have a problem with my payment." },
  { id: "access", label: "I can't open my course", subject: "Can't access my course", intro: "I can't open my course or lessons." },
  { id: "certificate", label: "Certificate", subject: "Certificate question", intro: "I have a question about my certificate." },
  { id: "technical", label: "Technical problem", subject: "Technical problem", intro: "Something on the website is not working." },
  { id: "referral", label: "Referral or payout", subject: "Referral / payout question", intro: "I have a question about referrals or my payout." },
  { id: "before", label: "Question before joining", subject: "Question before joining", intro: "I have a question before I join." },
  { id: "other", label: "Something else", subject: "Question", intro: "I have a question." },
] as const;

export type TopicId = (typeof TOPICS)[number]["id"];

export function topicOf(id: string) {
  return TOPICS.find((t) => t.id === id) ?? TOPICS[TOPICS.length - 1];
}

export type TemplateInput = {
  topic: string;
  name: string;
  email: string;
  reference?: string;
  business: string;
};

const clean = (s: string, max: number) => s.replace(/[\r\n]+/g, " ").trim().slice(0, max);

export function buildSubject(topic: string, name: string): string {
  const t = topicOf(topic);
  const n = clean(name, 60);
  return n ? `${t.subject} (${n})` : t.subject;
}

export function buildTemplate(i: TemplateInput): string {
  const t = topicOf(i.topic);
  const name = clean(i.name, 80);
  const email = clean(i.email, 120);
  const ref = clean(i.reference ?? "", 80);
  const lines = [`Hello ${clean(i.business, 80) || "team"},`, "", t.intro, "", "(Write more details here)", ""];
  if (ref) lines.push(`Payment reference: ${ref}`);
  if (name) lines.push(`Name: ${name}`);
  if (email) lines.push(`My account email: ${email}`);
  lines.push("", "Thank you.");
  return lines.join("\n");
}

// Long bodies break mail links in some apps, so keep the link body short. The full text stays in the box.
const MAX_BODY = 1800;
const trimBody = (b: string) => (b.length > MAX_BODY ? b.slice(0, MAX_BODY) : b);

export function mailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(clean(subject, 150))}&body=${encodeURIComponent(trimBody(body))}`;
}

export function gmailUrl(to: string, subject: string, body: string): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(clean(subject, 150))}&body=${encodeURIComponent(trimBody(body))}`;
}

export function whatsappTextUrl(number: string, body: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(trimBody(body))}`;
}
