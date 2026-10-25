// "Gold mode": a hidden alternative accent colour, switched by the Konami code. Browser only.
export const GOLD_KEY = "apex_gold";

export function isGold(): boolean {
  return document.documentElement.getAttribute("data-gold") === "1";
}

export function toggleGold(): boolean {
  const next = !isGold();
  if (next) document.documentElement.setAttribute("data-gold", "1");
  else document.documentElement.removeAttribute("data-gold");
  try {
    if (next) localStorage.setItem(GOLD_KEY, "1");
    else localStorage.removeItem(GOLD_KEY);
  } catch {
    /* private mode: lasts until the tab closes */
  }
  return next;
}
