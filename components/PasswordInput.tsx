"use client";

import { useState } from "react";
import { inputCls } from "@/components/ui";

// Password box with a Show / Hide button (helps a lot on phones).
export default function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "className">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={`${inputCls} pr-16`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 px-4 text-[10px] font-extrabold tracking-widest text-muted uppercase hover:text-accent"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
