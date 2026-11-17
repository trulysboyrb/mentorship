// "Keep me signed in" on the login page.
// Ticked: nothing special, the login lasts (Supabase default).
// Unticked: we leave two small cookies. "fa_nokeep" lasts a year and says "do not keep this login".
// "fa_alive" is a session cookie that the browser deletes when it is closed. If we later see
// "fa_nokeep" without "fa_alive", the browser was closed since login, so we sign the person out.
const NOKEEP = "fa_nokeep";
const ALIVE = "fa_alive";

function has(name: string): boolean {
  return document.cookie.split("; ").some((c) => c.startsWith(name + "="));
}
function put(name: string, maxAge?: number) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=1; path=/; SameSite=Lax${maxAge ? `; Max-Age=${maxAge}` : ""}${secure}`;
}
function drop(name: string) {
  document.cookie = `${name}=; path=/; Max-Age=0; SameSite=Lax`;
}

export function rememberChoice(keep: boolean) {
  if (keep) {
    drop(NOKEEP);
    drop(ALIVE);
  } else {
    put(NOKEEP, 60 * 60 * 24 * 365);
    put(ALIVE);
  }
}

// True when this login was meant to end with the browser and the browser has been closed since.
export function loginShouldEnd(): boolean {
  return has(NOKEEP) && !has(ALIVE);
}

export function clearChoice() {
  drop(NOKEEP);
  drop(ALIVE);
}
