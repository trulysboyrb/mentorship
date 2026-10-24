"use client";

import { useState } from "react";

// Two-step delete: type DELETE, then (only if the student has something to lose) confirm the warnings.
export default function DeleteStudentModal({
  student,
  onClose,
  onDeleted,
}: {
  student: { id: string; full_name: string; email: string | null };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[] | null>(null);

  async function run(force: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/delete-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: student.id, force }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        needsConfirm?: boolean;
        warnings?: string[];
      };
      if (res.status === 409 && json.needsConfirm) {
        setWarnings(json.warnings ?? []);
        setBusy(false);
        return;
      }
      if (!res.ok) {
        setError(json.error ?? "Could not delete this student.");
        setBusy(false);
        return;
      }
      onDeleted();
    } catch {
      setError("Could not reach the server. Check your internet and try again.");
      setBusy(false);
    }
  }

  const ready = typed.trim().toUpperCase() === "DELETE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={busy ? undefined : onClose}>
      <div
        className="w-full max-w-md rounded-card border border-danger bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="text-lg font-black text-danger">Delete student</h3>
        <p className="mt-3 text-sm">
          <span className="font-bold">{student.full_name || "This student"}</span>
          {student.email && <span className="text-muted"> ({student.email})</span>}
        </p>
        <p className="mt-3 text-sm text-muted">
          This permanently erases their account, progress, devices, notes and certificates. They will have to sign up
          again from scratch, and can use the same email. This cannot be undone. Their payment records are kept for
          your accounts.
        </p>

        {warnings ? (
          <div className="mt-4 border border-danger p-3 text-sm">
            <p className="font-bold text-danger">Please read before continuing:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <label htmlFor="del-confirm" className="mt-5 block text-[10px] font-semibold tracking-widest text-muted uppercase">
              Type DELETE to confirm
            </label>
            <input
              id="del-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="mt-2 w-full rounded-control border border-line bg-black px-4 py-3 text-sm text-white focus:border-danger focus:outline-none"
            />
          </>
        )}

        {error && (
          <p role="alert" className="mt-4 border border-danger p-3 text-xs text-danger">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-control border border-line px-4 py-2.5 text-xs font-extrabold tracking-wider uppercase hover:border-white disabled:opacity-50"
          >
            Cancel
          </button>
          {warnings ? (
            <button
              onClick={() => run(true)}
              disabled={busy}
              className="rounded-control bg-danger px-4 py-2.5 text-xs font-extrabold tracking-wider text-white uppercase disabled:opacity-50"
            >
              {busy ? "Deleting..." : "Delete anyway"}
            </button>
          ) : (
            <button
              onClick={() => run(false)}
              disabled={busy || !ready}
              className="rounded-control bg-danger px-4 py-2.5 text-xs font-extrabold tracking-wider text-white uppercase disabled:opacity-40"
            >
              {busy ? "Deleting..." : "Delete student"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
