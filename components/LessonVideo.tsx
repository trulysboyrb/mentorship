"use client";

import { useState } from "react";

// Keeps the video address fixed so background refreshes never restart playback.
export default function LessonVideo({ src }: { src: string }) {
  const [stable] = useState(src);
  return (
    <video
      src={stable}
      controls
      controlsList="nodownload"
      className="h-full w-full"
    />
  );
}
