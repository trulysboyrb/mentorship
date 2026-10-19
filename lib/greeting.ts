// Greeting and avatar helpers. The hour comes from the device clock.

export function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Good Morning";
  if (h >= 12 && h < 17) return "Good Afternoon";
  if (h >= 17 && h < 21) return "Good Evening";
  return "Good Night";
}

export function firstNameOf(fullName: string | null | undefined): string {
  const first = (fullName ?? "").trim().split(/\s+/)[0];
  return first || "Trader";
}

export function initialOf(fullName: string | null | undefined): string {
  const ch = Array.from((fullName ?? "").trim())[0];
  return ch ? ch.toUpperCase() : "T";
}
