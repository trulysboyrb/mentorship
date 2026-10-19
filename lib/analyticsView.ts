import { priceFor } from "./pricing";

export type Totals = {
  students: number;
  cleared: number;
  started: number;
  finished: number;
  certified: number;
};

export type LessonStat = {
  id: string;
  title: string;
  module: number;
  position: number;
  has_video: boolean;
  started: number;
  completed: number;
};

export type Analytics = {
  totals: Totals;
  weeks: { week: string; signups: number; paid: number }[];
  lessons: LessonStat[];
  sources: { k: string; n: number }[];
  experience: { k: string; n: number }[];
  modes: { k: string; n: number }[];
  referrers: { name: string; total: number; paid: number }[];
};

export function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

export function funnelSteps(t: Totals) {
  const steps: [string, number][] = [
    ["Signed up", t.students],
    ["Paid", t.cleared],
    ["Started a lesson", t.started],
    ["Finished the course", t.finished],
    ["Got a certificate", t.certified],
  ];
  return steps.map(([label, count], i) => ({
    label,
    count,
    ofPrevious: i === 0 ? 100 : pct(count, steps[i - 1][1]),
    ofFirst: pct(count, steps[0][1]),
  }));
}

// Lessons that have a video, in course order, with how many paid students
// finished each one and where the biggest drop-off happens.
export function lessonRows(lessons: LessonStat[], clearedStudents: number) {
  const rows = lessons
    .filter((l) => l.has_video)
    .map((l) => ({
      ...l,
      completedPct: pct(l.completed, clearedStudents),
      startedPct: pct(l.started, clearedStudents),
      drop: 0,
      biggestDrop: false,
    }));

  rows.forEach((r, i) => {
    r.drop = i === 0 ? 0 : rows[i - 1].completedPct - r.completedPct;
  });

  const worst = rows.reduce<number>(
    (best, r, i) => (r.drop > (best < 0 ? 0 : rows[best].drop) ? i : best),
    -1
  );
  if (worst >= 0 && rows[worst].drop >= 15) rows[worst].biggestDrop = true;

  return rows;
}

export function estimateRevenue(
  paidStudents: { learning_mode: string | null; referral_discount: boolean }[]
) {
  let online = 0;
  let inPerson = 0;
  for (const s of paidStudents) {
    const { final } = priceFor(s.learning_mode, s.referral_discount);
    if (s.learning_mode === "in_person") inPerson += final;
    else online += final;
  }
  return { total: online + inPerson, online, inPerson, count: paidStudents.length };
}

const LABELS: Record<string, string> = {
  friend: "A friend",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  other: "Other",
  unknown: "Not said",
  online: "Online",
  in_person: "In person",
  beginner: "Beginner",
  intermediate: "Intermediate",
  experienced: "Experienced",
};

export function labelFor(key: string): string {
  return LABELS[key] ?? key;
}
