"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/config";
import { buildCertificatePdf, makeSerial } from "@/lib/certificatePdf";
import CertificateModal, { type CertItem } from "@/components/CertificateModal";
import StudentNotesModal, { type NoteItem } from "@/components/StudentNotesModal";

type Student = {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  learning_mode: string | null;
  payment_status: string;
  created_at: string;
};

type Filter = "all" | "pending" | "cleared" | "finished";

const actionBtn =
  "rounded-control border px-3 py-1.5 text-xs font-extrabold tracking-wider uppercase disabled:opacity-50";

export default function AdminStudents({
  students,
  completed,
  totalLessons,
  finished,
  certificates,
  notes,
}: {
  students: Student[];
  completed: Record<string, number>;
  totalLessons: number;
  finished: Record<string, boolean>;
  certificates: Record<string, CertItem[]>;
  notes: Record<string, NoteItem[]>;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [certFor, setCertFor] = useState<string | null>(null);
  const [notesFor, setNotesFor] = useState<string | null>(null);

  const shown = students.filter((s) => {
    if (filter === "all") return true;
    if (filter === "finished") return !!finished[s.id];
    return s.payment_status === filter;
  });
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
    setBusy(null);
    router.refresh();
  }

  // One click: builds the certificate PDF with the student's name and issues it.
  async function approveCertificate(s: Student) {
    if (!window.confirm(`Issue a Certificate of Completion to ${s.full_name}?`)) return;
    setBusy(s.id);
    setError("");
    const supabase = createClient();
    let path: string | null = null;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const now = new Date();
      const serial = makeSerial(now);
      const bytes = await buildCertificatePdf({
        name: s.full_name,
        courseName: BRAND,
        dateText: now.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        serial,
      });

      path = `${s.id}/${Date.now()}-certificate-of-completion.pdf`;
      const { error: upErr } = await supabase.storage
        .from("certificates")
        .upload(path, new Blob([bytes.slice().buffer as ArrayBuffer], { type: "application/pdf" }), {
          contentType: "application/pdf",
        });
      if (upErr) throw new Error(upErr.message);

      const { error: dbErr } = await supabase.from("certificates").insert({
        user_id: s.id,
        title: "Certificate of Completion",
        file_path: path,
        issued_by: user?.id,
        serial,
      });
      if (dbErr) {
        await supabase.storage.from("certificates").remove([path]);
        throw new Error(dbErr.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }

    setBusy(null);
    router.refresh();
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
          <div key={label} className="rounded-card border border-line bg-surface p-5">
            <p className="text-[10px] font-extrabold tracking-widest text-muted uppercase">{label}</p>
            <p className="mt-2 text-3xl font-black">{n}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {tab("all", "All")}
        {tab("pending", "Pending")}
        {tab("cleared", "Cleared")}
        {tab("finished", "Finished")}
      </div>

      {error && <p className="mt-4 break-words text-sm text-danger">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-card border border-line">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-[10px] tracking-widest text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => {
              const cleared = s.payment_status === "cleared";
              const certCount = certificates[s.id]?.length ?? 0;
              const noteCount = notes[s.id]?.length ?? 0;
              const canApprove = cleared && finished[s.id] && certCount === 0;
              return (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">{s.full_name}</td>
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
                  </td>
                  <td className={`px-4 py-3 ${cleared ? "text-accent" : "text-danger"}`}>
                    {cleared ? "Cleared" : "Pending"}
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
                    <div className="flex flex-wrap justify-end gap-2">
                      {canApprove && (
                        <button
                          disabled={busy === s.id}
                          onClick={() => approveCertificate(s)}
                          className={`${actionBtn} border-accent bg-accent text-black`}
                        >
                          Approve certificate
                        </button>
                      )}
                      <button
                        onClick={() => setCertFor(s.id)}
                        className={`${actionBtn} border-line text-white hover:border-accent`}
                      >
                        Give Certificate
                        {certCount > 0 && <span className="ml-2 text-accent">({certCount})</span>}
                      </button>
                      <button
                        onClick={() => setNotesFor(s.id)}
                        className={`${actionBtn} border-line text-white hover:border-accent`}
                      >
                        Notes
                        {noteCount > 0 && <span className="ml-2 text-accent">({noteCount})</span>}
                      </button>
                      <button
                        disabled={busy === s.id}
                        onClick={() => setStatus(s, cleared ? "pending" : "cleared")}
                        className={`${actionBtn} ${
                          cleared
                            ? "border-line text-muted hover:border-danger hover:text-danger"
                            : "border-accent bg-accent text-black"
                        }`}
                      >
                        {cleared ? "Unclear" : "Clear"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No students here yet.
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
          onClose={() => setCertFor(null)}
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
