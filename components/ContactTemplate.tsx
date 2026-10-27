"use client";

import { useState } from "react";
import { TOPICS, buildSubject, buildTemplate, gmailUrl, mailtoUrl, whatsappTextUrl } from "@/lib/contact";

const field =
  "w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-sm text-white outline-none focus:border-accent";
const btn =
  "inline-flex items-center justify-center rounded-control border border-line px-4 py-2 text-xs font-bold text-white hover:border-accent";
const btnMain =
  "inline-flex items-center justify-center rounded-control bg-accent px-4 py-2 text-xs font-black text-black hover:opacity-90";

// "Send mail template": pick a topic, the message is written for you, edit it, then send it by email
// (your mail app or Gmail) or by WhatsApp. Nothing is sent from our server.
export default function ContactTemplate({
  business,
  email,
  whatsapp,
  defaultName,
  defaultEmail,
}: {
  business: string;
  email: string; // support email ("" = email buttons hidden)
  whatsapp: string; // digits ("" = WhatsApp button hidden)
  defaultName: string;
  defaultEmail: string;
}) {
  const [topic, setTopic] = useState<string>(TOPICS[0].id);
  const [name, setName] = useState(defaultName);
  const [from, setFrom] = useState(defaultEmail);
  const [ref, setRef] = useState("");
  const [body, setBody] = useState(() =>
    buildTemplate({ topic: TOPICS[0].id, name: defaultName, email: defaultEmail, business })
  );
  const [edited, setEdited] = useState(false);
  const [copied, setCopied] = useState(false);

  const regen = (t: string, n: string, e: string, r: string) =>
    setBody(buildTemplate({ topic: t, name: n, email: e, reference: r, business }));

  // Changing a field rewrites the message, unless the person has already typed their own text.
  const update = (t: string, n: string, e: string, r: string) => {
    setTopic(t);
    setName(n);
    setFrom(e);
    setRef(r);
    if (!edited || window.confirm("Replace the text you wrote with a fresh template?")) {
      regen(t, n, e, r);
      setEdited(false);
    }
  };

  const subject = buildSubject(topic, name);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the text is in the box, they can copy by hand */
    }
  };

  return (
    <div className="rounded-card border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-base font-bold">Send us a message</h2>
      <p className="mt-1 text-xs text-muted">
        Choose a topic and we write the message for you. Add your details, then send it the way you like.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted">
          Topic
          <select className={`${field} mt-1`} value={topic} onChange={(e) => update(e.target.value, name, from, ref)}>
            {TOPICS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Payment reference (optional)
          <input className={`${field} mt-1`} value={ref} maxLength={80} onChange={(e) => update(topic, name, from, e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Your name
          <input className={`${field} mt-1`} value={name} maxLength={80} onChange={(e) => update(topic, e.target.value, from, ref)} />
        </label>
        <label className="text-xs text-muted">
          Your account email
          <input className={`${field} mt-1`} value={from} maxLength={120} onChange={(e) => update(topic, name, e.target.value, ref)} />
        </label>
      </div>

      <label className="mt-3 block text-xs text-muted">
        Message
        <textarea
          className={`${field} mt-1 h-48 font-mono text-xs leading-relaxed`}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setEdited(true);
          }}
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        {email && (
          <a className={btnMain} href={mailtoUrl(email, subject, body)}>Open in my mail app</a>
        )}
        {email && (
          <a className={btn} href={gmailUrl(email, subject, body)} target="_blank" rel="noopener noreferrer">
            Open in Gmail
          </a>
        )}
        {whatsapp && (
          <a className={email ? btn : btnMain} href={whatsappTextUrl(whatsapp, `${subject}\n\n${body}`)} target="_blank" rel="noopener noreferrer">
            Send on WhatsApp
          </a>
        )}
        <button type="button" className={btn} onClick={copy}>{copied ? "Copied" : "Copy message"}</button>
      </div>
      {!email && !whatsapp && (
        <p className="mt-3 text-xs text-muted">No contact details are set up yet. Use Copy message and send it to us another way.</p>
      )}
    </div>
  );
}
