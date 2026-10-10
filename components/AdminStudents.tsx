"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CertificateModal, { type CertItem } from "@/components/CertificateModal";

type Student = {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  learning_mode: string | null;
  payment_status: string;
  created_at: string;
};

export default function AdminStudents({
  students,
  completed,
  totalLessons,
  certificates,
}: {
  students: Student[];
  completed: Record<string, number>;
  totalLessons: number;
  certificates: Record<string, CertItem[]>;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "pending" | "cleared">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [certFor, setCertFor] = useState<string | null>(null);

  const shown = students.filter((s) => filter === "all" || s.payment_status === filter);
  const clearedCount = students.filter((s) => s.payment_status === "cleared").length;

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

  const tab = (value: typeof filter, label: string) => (
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
      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          ["Total", students.length],
          ["Cleared", clearedCount],
          ["Pending", students.length - clearedCount],
        ].map(([label, n]) => (
          <div key={label} className="rounded-card border border-line bg-surface p-5">
            <p className="text-[10px] font-extrabold tracking-widest text-muted uppercase">{label}</p>
            <p className="mt-2 text-3xl font-black">{n}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-3">
        {tab("all", "All")}
        {tab("pending", "Pending")}
        {tab("cleared", "Cleared")}
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

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
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setCertFor(s.id)}
                      className="rounded-control border border-line px-4 py-1.5 text-xs font-extrabold tracking-wider text-white uppercase hover:border-accent"
                    >
                      Give Certificate
                      {(certificates[s.id]?.length ?? 0) > 0 && (
                        <span className="ml-2 text-accent">({certificates[s.id].length})</span>
                      )}
                    </button>
                    <button
                      disabled={busy === s.id}
                      onClick={() => setStatus(s, cleared ? "pending" : "cleared")}
                      className={`rounded-control border px-4 py-1.5 text-xs font-extrabold tracking-wider uppercase disabled:opacity-50 ${
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
    </>
  );
}
