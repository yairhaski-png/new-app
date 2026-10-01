import { createBackend, DEMO } from "./backend.js";
import { renderAuth } from "./auth.js";
import { renderLooks } from "./looks.js";
import { renderFood } from "./food.js";
import { renderSettings, REMINDER_DEFAULTS } from "./settings.js";
import { $, esc } from "./ui.js";
import { localDate } from "./calc.js";

const TABS = [
  { title: "Looks", render: renderLooks },
  { title: "Food", render: renderFood },
  { title: "Settings", render: renderSettings },
];
const MOTIVATION = [
  "Small daily habits beat big rare efforts.",
  "You do not need to feel ready. Start the set.",
  "Skin, sleep, water, protein. Boring works.",
  "Do the next right thing, then the one after.",
  "Your future self is watching what you do today.",
];

let backend, user, current = -1, token = 0;
const view = $("#view");

function show(id) {
  for (const el of ["boot", "auth", "shell"]) $("#" + el).hidden = el !== id;
}

async function reminderHtml() {
  let prof;
  try { prof = await backend.getProfile(); } catch { return ""; }
  const rem = prof?.reminders || {};
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  let dismissed = {};
  try { dismissed = JSON.parse(localStorage.getItem("lm_dismissed") || "{}"); } catch { /* ignore */ }
  const today = localDate();
  const due = Object.keys(REMINDER_DEFAULTS).map((k) => ({ k, ...REMINDER_DEFAULTS[k], ...(rem[k] || {}) }))
    .filter((r) => r.on && r.time <= hhmm && dismissed[r.k] !== today);
  if (!due.length) return "";
  // newest due reminder only, so the screen never fills with banners
  const r = due.sort((a, b) => b.time.localeCompare(a.time))[0];
  const text = r.k === "motivation" ? MOTIVATION[now.getDate() % MOTIVATION.length] : r.text;
  return `<div class="nudge" data-k="${esc(r.k)}"><div><b>${esc(r.label)}</b><p>${esc(text)}</p></div><button class="icon-btn" type="button" aria-label="Dismiss reminder">✕</button></div>`;
}

async function go(i) {
  const my = ++token;
  const dir = i >= current ? 1 : -1;
  current = i;
  document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-current", String(+t.dataset.tab === i)));
  $("#topbar-title").textContent = TABS[i].title;
  view.style.setProperty("--dir", dir);
  view.classList.remove("enter");
  view.innerHTML = `<div class="loading-pad"><div class="spinner" aria-hidden="true"></div></div>`;
  try {
    const ctx = { backend, user, onSignOut: signOut, reminderHtml: i < 2 ? await reminderHtml() : "" };
    if (my !== token) return;
    view.innerHTML = "";
    await TABS[i].render(view, ctx);
    if (my !== token) return;
    view.querySelectorAll(".nudge").forEach((n) => {
      $("button", n).onclick = () => {
        let d = {};
        try { d = JSON.parse(localStorage.getItem("lm_dismissed") || "{}"); localStorage.setItem("lm_dismissed", JSON.stringify({ ...d, [n.dataset.k]: localDate() })); } catch { /* ignore */ }
        n.remove();
      };
    });
  } catch (ex) {
    view.innerHTML = `<div class="card"><h3>Something went wrong</h3><p class="error">${esc(ex.message)}</p></div>`;
  }
  void view.offsetWidth;
  view.classList.add("enter");
  window.scrollTo(0, 0);
}

async function signOut() {
  await backend.signOut();
  user = null; current = -1;
  startAuth();
}

function startAuth() {
  show("auth");
  renderAuth($("#auth"), backend, (u) => { user = u; startApp(); });
}

function startApp() {
  show("shell");
  go(0);
}

document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => { if (+t.dataset.tab !== current) go(+t.dataset.tab); }));

(async function boot() {
  if (DEMO) $("#demo-banner").hidden = false;
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  try {
    backend = await createBackend();
    user = await backend.getUser();
  } catch (ex) {
    $("#boot").textContent = "Could not start: " + ex.message;
    return;
  }
  user ? startApp() : startAuth();
})();
