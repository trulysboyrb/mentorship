// Dark / light theme. Dark is the default. The choice is remembered on the device.
export const THEME_KEY = "apex_theme";
export type Theme = "dark" | "light";

export function isTheme(v: unknown): v is Theme {
  return v === "dark" || v === "light";
}

// Runs in the page <head> before anything is painted, so there is no flash of the wrong theme.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}else{document.documentElement.setAttribute("data-theme","dark")}}catch(e){document.documentElement.setAttribute("data-theme","dark")}try{if(localStorage.getItem("apex_gold")==="1")document.documentElement.setAttribute("data-gold","1")}catch(e){}})();`;
