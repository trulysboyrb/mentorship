"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { issueCertificate, type CertTemplate } from "@/lib/issueCertificate";
import CertificateModal, { type CertItem } from "@/components/CertificateModal";
import StudentNotesModal, { type NoteItem } from "@/components/StudentNotesModal";
import AdminDevicesModal from "@/components/AdminDevicesModal";
import DeleteStudentModal from "@/components/DeleteStudentModal";
import { formatGMD, priceFor, DEFAULT_PRICING, type Pricing } from "@/lib/pricing";
import { clearedViaLabel, type ClearedVia } from "@/lib/paymentMethods";
import OptionsMenu, { type MenuItem } from "@/components/OptionsMenu";
import CountUp from "@/components/CountUp";
import Avatar from "@/components/Avatar";
import { fireConfetti } from "@/lib/confetti";
import { toCsv } from "@/lib/csv";

type Student = {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  learning_mode: string | null;
  payment_status: string;
  cleared_via: string | null;
  created_at: string;
  referral_discount: boolean;
  referrer_name: string | null;
  avatar_url?: string | null;
};

type Filter = "all" | "pending" | "cleared" | "finished";
type Sort = "newest" | "oldest" | "name" | "progress";

const actionBtn =
  "rounded-control border px-3 py-2 text-xs font-extrabold tracking-wider uppercase disabled:opacity-50";

export default function AdminStudents({
  students,
  completed,
  totalLessons,
  finished,
  certificates,
  notes,
  initialQuery = "",
  pricing = DEFAULT_PRICING,
  certTemplate = null,
}: {
  certTemplate?: CertTemplate;
  initialQuery?: string;
  pricing?: Pricing;
  students: Student[];
  completed: Record<string, number>;
  totalLessons: number;
  finished: Record<string, boolean>;
  certificates: Record<string, CertItem[]>;
  notes: Record<string, NoteItem[]>;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<Sort>("newest");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [certFor, setCertFor] = useState<string | null>(null);
  const [notesFor, setNotesFor] = useState<string | null>(null);
  const [devicesFor, setDevicesFor] = useState<string | null>(null);
  const [deleteFor, setDeleteFor] = useState<string | null>(null);

  const needle = query.trim().toLowerCase();
  const shown = students
    .filter((s) => {
      if (needle) {
        const hay = `${s.full_name} ${s.email ?? ""} ${s.whatsapp ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (filter === "all") return true;
      if (filter === "finished") return !!finished[s.id];
      return s.payment_status === filter;
    })
    .sort((a, b) => {
      if (sort === "oldest") return a.created_at.localeCompare(b.created_at);
      if (sort === "name") return a.full_name.localeCompare(b.full_name);
      if (sort === "progress") return (completed[b.id] ?? 0) - (completed[a.id] ?? 0);
      return b.created_at.localeCompare(a.created_at);
    });

  function exportCsv() {
    const csv = toCsv(
      ["Name", "Email", "WhatsApp", "Mode", "Status", "Paid via", "Lessons completed", "Signed up"],
      shown.map((s) => [
        s.full_name,
        s.email,
        s.whatsapp,
        s.learning_mode === "in_person" ? "In person" : "Online",
        s.payment_status,
        s.cleared_via,
        s.payment_status === "cleared" ? (completed[s.id] ?? 0) : "",
        s.created_at.slice(0, 10),
      ])
    );
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const clearedCount = students.filter((s) => s.payment_status === "cleared").length;
  const finishedCount = students.filter((s) => finished[s.id]).length;

  async function setStatus(s: Student, status: "cleared" | "pending") {
    if (status === "pending" && !window.confirm(`Lock courses for ${s.full_name}?`)) return;
    setBusy(s.id);
    setError("");
    const { error } = await createClient().rpc("set_payment_status", {
      target: s.id,
      new_status: status,
    });
    if (error) setError(error.message);
    else if (status === "cleared") fireConfetti(110);
    setBusy(null);
    router.refresh();
  }

  // One click: builds the certificate PDF with the student's name (on the admin's template if one is set) and issues it.
  async function approveCertificate(s: Student) {
    const how = certTemplate ? "using your certificate template" : "with the standard design";
    if (!window.confirm(`Issue a Certificate of Completion to ${s.full_name} ${how}?`)) return;
    setBusy(s.id);
    setError("");
    try {
      await issueCertificate(createClient(), s, certTemplate);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
    setBusy(null);
    router.refresh();
  }

  function menuFor(s: Student, cleared: boolean, certCount: number, noteCount: number): MenuItem[] {
    return [
      cleared
        ? { key: "unclear", label: "Unclear (lock courses)", onClick: () => setStatus(s, "pending"), tone: "danger" }
        : { key: "clear", label: "Clear (unlock courses)", onClick: () => setStatus(s, "cleared"), tone: "accent" },
      { key: "cert", label: "Give certificate", badge: certCount, onClick: () => setCertFor(s.id), dividerBefore: true },
      { key: "notes", label: "Notes", badge: noteCount, onClick: () => setNotesFor(s.id) },
      { key: "devices", label: "Devices", onClick: () => setDevicesFor(s.id) },
      ...(s.whatsapp
        ? [{ key: "wa", label: "Open WhatsApp chat", onClick: () => window.open(`https://wa.me/${s.whatsapp!.replace(/\D/g, "")}`, "_blank", "noopener,noreferrer") } as MenuItem]
        : []),
      { key: "delete", label: "Delete student", onClick: () => setDeleteFor(s.id), tone: "danger", dividerBefore: true },
    ];
  }

  const tab = (value: Filter, label: string) => (
    <button
      onClick={() => setFilter(value)}
      className={`rounded-control border px-4 py-2 text-xs font-semibold tracking-wider uppercase ${
        filter === value ? "border-accent text-white" : "border-line text-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Total", students.length],
          ["Cleared", clearedCount],
          ["Pending", students.length - clearedCount],
          ["Finished course", finishedCount],
        ].map(([label, n]) => (
          <div key={label} className="lift rounded-card border border-line bg-surface p-5">
            <p className="text-[10px] font-extrabold tracking-widest text-muted uppercase">{label}</p>
            <p className="mt-2 text-3xl font-black"><CountUp value={n} /></p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {tab("all", "All")}
        {tab("pending", "Pending")}
        {tab("cleared", "Cleared")}
        {tab("finished", "Finished")}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email or WhatsApp"
          aria-label="Search students"
          className="min-w-0 flex-1 rounded-control border border-line bg-black px-4 py-2.5 text-sm text-white placeholder:text-muted/70 focus:border-accent focus:outline-none sm:max-w-xs"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Sort students"
          className="rounded-control border border-line bg-black px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A to Z</option>
          <option value="progress">Most lessons done</option>
        </select>
        <button type="button" onClick={exportCsv} disabled={shown.length === 0}
          className="rounded-control border border-line px-4 py-2.5 text-xs font-extrabold tracking-wider uppercase hover:border-accent disabled:opacity-50">
          Export CSV
        </button>
        <span className="text-xs text-muted">
          Showing {shown.length} of {students.length}
        </span>
      </div>

      {error && <p className="mt-4 break-words text-sm text-danger">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-card border border-line">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-[10px] tracking-widest text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Mode / price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s, idx) => {
              const cleared = s.payment_status === "cleared";
              const certCount = certificates[s.id]?.length ?? 0;
              const noteCount = notes[s.id]?.length ?? 0;
              const canApprove = cleared && finished[s.id] && certCount === 0;
              return (
                <tr key={s.id} className="anim-row border-b border-line transition-colors last:border-0 hover:bg-surface-2/60" style={{ "--d": `${Math.min(idx, 12) * 0.03}s` } as React.CSSProperties}>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <Avatar url={s.avatar_url} name={s.full_name} size={32} className="border border-line" />
                      <span>{s.full_name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{s.email}</td>
                  <td className="px-4 py-3 text-muted">
                    {s.whatsapp && (
                      <a href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`}
                        target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                        {s.whatsapp}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {s.learning_mode === "in_person" ? "In person" : "Online"}
                    <span className="block text-xs">
                      {formatGMD(priceFor(s.learning_mode, s.referral_discount, pricing).final)}
                    </span>
                    {s.referral_discount && (
                      <span className="block text-[10px] font-extrabold tracking-widest text-accent uppercase">
                        {pricing.referralPercent}% referral{s.referrer_name ? ` · ${s.referrer_name}` : ""}
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-3 ${cleared ? "text-accent" : "text-danger"}`}>
                    {cleared ? "Cleared" : "Pending"}
                    {cleared && s.cleared_via && (
                      <span className="mt-0.5 block text-[10px] font-semibold tracking-widest text-muted uppercase">
                        via {clearedViaLabel(s.cleared_via as ClearedVia)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {cleared ? `${completed[s.id] ?? 0} / ${totalLessons}` : "-"}
                    {finished[s.id] && (
                      <span className="ml-2 text-[10px] font-extrabold tracking-widest text-accent uppercase">
                        Finished
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canApprove && (
                        <button
                          disabled={busy === s.id}
                          onClick={() => approveCertificate(s)}
                          className={`${actionBtn} border-accent bg-accent text-black`}
                        >
                          Approve certificate
                        </button>
                      )}
                      <OptionsMenu busy={busy === s.id} items={menuFor(s, cleared, certCount, noteCount)} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  {needle || filter !== "all" ? "No students match." : "No students here yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {certFor && students.find((x) => x.id === certFor) && (
        <CertificateModal
          student={students.find((x) => x.id === certFor)!}
          certificates={certificates[certFor] ?? []}
          template={certTemplate}
          onClose={() => setCertFor(null)}
        />
      )}
      {devicesFor && students.find((x) => x.id === devicesFor) && (
        <AdminDevicesModal
          student={students.find((x) => x.id === devicesFor)!}
          onClose={() => setDevicesFor(null)}
        />
      )}
      {deleteFor && students.find((x) => x.id === deleteFor) && (
        <DeleteStudentModal
          student={students.find((x) => x.id === deleteFor)!}
          onClose={() => setDeleteFor(null)}
          onDeleted={() => {
            setDeleteFor(null);
            router.refresh();
          }}
        />
      )}
      {notesFor && students.find((x) => x.id === notesFor) && (
        <StudentNotesModal
          student={students.find((x) => x.id === notesFor)!}
          notes={notes[notesFor] ?? []}
          onClose={() => setNotesFor(null)}
        />
      )}
    </>
  );
}
