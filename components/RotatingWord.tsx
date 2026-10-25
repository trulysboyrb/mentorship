"use client";

import { useEffect, useState } from "react";

// Swaps a word every couple of seconds. The first word is what search engines and no-JS visitors see.
export default function RotatingWord({ words, every = 2400 }: { words: string[]; every?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (words.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % words.length), every);
    return () => clearInterval(id);
  }, [words.length, every]);
  return (
    <span key={i} className="anim-word inline-block text-accent">
      {words[i]}
    </span>
  );
}
