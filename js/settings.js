import { $, esc, toast } from "./ui.js";
import { ACTIVITY, localDate, maintenanceKcal, profileComplete } from "./calc.js";

export const REMINDER_DEFAULTS = {
  eat: { on: true, time: "12:30", label: "Eat something", text: "Time to eat. Log it with a photo." },
  gym: { on: true, time: "18:00", label: "Go to the gym", text: "Gym time. Show up and the rest follows." },
  motivation: { on: true, time: "08:30", label: "Morning motivation", text: "Small daily habits beat big rare efforts." },
};

export async function renderSettings(root, ctx) {
  let p = (await ctx.backend.getProfile()) || {};
  const rem = { ...REMINDER_DEFAULTS, ...(p.reminders || {}) };
  for (const k of Object.keys(REMINDER_DEFAULTS)) rem[k] = { ...REMINDER_DEFAULTS[k], ...(p.reminders?.[k] || {}) };
  const user = ctx.user;

  root.innerHTML = `
    <form id="prof" class="card" novalidate>
      <h3>Your body</h3>
      <p class="fine">Used only to estimate how many calories you burn per day.</p>
      <div class="grid2">
        <div><label for="s-weight">Starting weight (kg)</label><input id="s-weight" type="number" inputmode="decimal" step="0.1" min="20" max="400" value="${p.weight_kg ?? ""}"></div>
        <div><label for="s-height">Height (cm)</label><input id="s-height" type="number" inputmode="numeric" min="100" max="250" value="${p.height_cm ?? ""}"></div>
        <div><label for="s-age">Age</label><input id="s-age" type="number" inputmode="numeric" min="13" max="100" value="${p.age ?? ""}"></div>
        <div><label for="s-sex">Sex</label><select id="s-sex"><option value="male"${p.sex === "male" ? " selected" : ""}>Male</option><option value="female"${p.sex === "female" ? " selected" : ""}>Female</option></select></div>
      </div>
      <label for="s-act">Activity</label>
      <select id="s-act">${ACTIVITY.map((a) => `<option value="${a.v}"${Number(p.activity || 1.375) === a.v ? " selected" : ""}>${esc(a.label)}</option>`).join("")}</select>
      <label for="s-start">Tracking since</label>
      <input id="s-start" type="date" value="${esc(p.start_date || localDate())}" max="${localDate()}">
      <p id="s-maint" class="fine"></p>
      <p id="s-err" class="error" role="alert" hidden></p>
      <button class="btn primary" type="submit">Save</button>
    </form>

    <section class="card" id="rem">
      <h3>Reminders</h3>
      <p class="fine">Shown inside the app when you open it after the set time. They are not phone notifications.</p>
      ${Object.entries(rem).map(([k, r]) => `
        <div class="rem-row"><label class="switch"><input type="checkbox" id="r-${k}-on"${r.on ? " checked" : ""}><span>${esc(r.label)}</span></label>
          <input type="time" id="r-${k}-time" value="${esc(r.time)}" aria-label="${esc(r.label)} time"></div>`).join("")}
    </section>

    <section class="card">
      <h3>Account</h3>
      <p>${esc(user.email)}</p>
      <button class="btn ghost" id="signout" type="button">Log out</button>
    </section>
    <p class="fine pad">Scores and calories are AI estimates, not medical advice.</p>`;

  const maintLine = () => {
    const cur = { weight_kg: +$("#s-weight", root).value, height_cm: +$("#s-height", root).value, age: +$("#s-age", root).value, sex: $("#s-sex", root).value, activity: +$("#s-act", root).value };
    $("#s-maint", root).textContent = profileComplete(cur) ? `You burn about ${maintenanceKcal(cur)} kcal a day.` : "";
  };
  root.querySelectorAll("#prof input, #prof select").forEach((el) => el.addEventListener("input", maintLine));
  maintLine();

  const collectReminders = () => Object.fromEntries(Object.keys(rem).map((k) => [k, { on: $(`#r-${k}-on`, root).checked, time: $(`#r-${k}-time`, root).value || rem[k].time }]));

  $("#prof", root).onsubmit = async (e) => {
    e.preventDefault();
    const err = $("#s-err", root);
    const cur = { weight_kg: +$("#s-weight", root).value, height_cm: +$("#s-height", root).value, age: +$("#s-age", root).value, sex: $("#s-sex", root).value, activity: +$("#s-act", root).value, start_date: $("#s-start", root).value || localDate() };
    if (!profileComplete(cur) || cur.weight_kg < 20 || cur.height_cm < 100 || cur.age < 13) {
      err.textContent = "Fill in weight, height and age with realistic numbers (age 13 or older)."; err.hidden = false; return;
    }
    err.hidden = true;
    try {
      p = await ctx.backend.saveProfile({ ...cur, reminders: collectReminders() });
      toast("Saved");
    } catch (ex) { err.textContent = ex.message; err.hidden = false; }
  };

  // reminders save on change (stored with the profile, so body fields must be valid first)
  root.querySelectorAll("#rem input").forEach((el) => el.addEventListener("change", async () => {
    try { p = await ctx.backend.saveProfile({ ...p, reminders: collectReminders() }); toast("Reminders saved"); } catch (ex) { toast(ex.message); }
  }));

  $("#signout", root).onclick = ctx.onSignOut;
}
