import { $, esc, fmtDate, prepareImage, toast } from "./ui.js";
import { DEMO } from "./backend.js";
import { buildGuide, HAIR_TYPES, LENGTHS, SHAPES } from "./data.js";

export function lookResultHtml(r) {
  return `
    <div class="card result">
      <h2>Your style and grooming guide</h2>
      ${r.face_shape ? `<p class="chip">Face shape: ${esc(r.face_shape)}</p>` : ""}
      <p class="lead">${esc(r.summary)}</p>
      <div class="cats">${(r.categories || []).map((c) => `
        <div class="cat"><b>${esc(c.name)}</b><p>${esc(c.note)}</p></div>`).join("")}</div>
    </div>
    <div class="card two">
      <div><h3>Working for you</h3><ul class="plain">${(r.strengths || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
      <div><h3>Easy upgrades</h3><ul class="plain">${(r.weaknesses || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
    </div>
    <div class="card"><h3>What to do next</h3>
      ${(r.tips || []).map((t) => `<div class="tip"><b>${esc(t.title)}</b><p>${esc(t.detail)}</p></div>`).join("")}
    </div>
    <div class="card"><h3>Haircuts to try</h3>
      ${(r.haircuts || []).map((h) => `
        <details class="cut"><summary>${esc(h.name)}</summary>
          <p>${esc(h.why)}</p>
          <dl><dt>Front</dt><dd>${esc(h.front)}</dd><dt>Sides</dt><dd>${esc(h.sides)}</dd><dt>Back</dt><dd>${esc(h.back)}</dd><dt>Tell the barber</dt><dd>${esc(h.ask_barber)}</dd></dl>
        </details>`).join("")}
    </div>
    <p class="fine">Ideas, not a verdict. A barber who sees your hair in person has the final say.</p>`;
}

function chips(name, opts, value) {
  return `<div class="chips" role="radiogroup" aria-label="${name}">${opts.map(([v, l]) => `<label class="chip-opt"><input type="radio" name="${name}" value="${v}"${v === value ? " checked" : ""}><span>${esc(l)}</span></label>`).join("")}</div>`;
}

function readSel() {
  try { return JSON.parse(localStorage.getItem("lm_style_sel") || "null"); } catch { return null; }
}

function renderLocalStyle(root, ctx) {
  const sel = readSel() || { type: "wavy", length: "short", shape: "unsure" };
  root.innerHTML = `
    ${ctx.reminderHtml || ""}
    <form id="style-form" class="card hero">
      <div class="hero-text"><h1>Find your cut</h1><p>Pick what matches you. Get haircut ideas and grooming tips for it.</p></div>
      <fieldset><legend>Hair type</legend>${chips("type", HAIR_TYPES, sel.type)}</fieldset>
      <fieldset><legend>Length now</legend>${chips("length", LENGTHS, sel.length)}</fieldset>
      <fieldset><legend>Face shape</legend>${chips("shape", SHAPES, sel.shape)}</fieldset>
      <button class="btn primary big" type="submit">Show my guide</button>
    </form>
    <div id="look-out" aria-live="polite"></div>`;
  const out = $("#look-out", root);
  const show = () => {
    const f = new FormData($("#style-form", root));
    const cur = { type: f.get("type"), length: f.get("length"), shape: f.get("shape") };
    try { localStorage.setItem("lm_style_sel", JSON.stringify(cur)); } catch { /* ignore */ }
    out.innerHTML = lookResultHtml(buildGuide(cur));
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  $("#style-form", root).onsubmit = (e) => { e.preventDefault(); show(); };
  if (readSel()) out.innerHTML = lookResultHtml(buildGuide(sel));
}

export async function renderLooks(root, ctx) {
  if (DEMO) return renderLocalStyle(root, ctx);
  const list = await ctx.backend.listLooks();
  const latest = list[0];
  root.innerHTML = `
    ${ctx.reminderHtml || ""}
    <section class="card hero">
      <div class="hero-text">
        <h1>${latest ? "Try a new photo" : "Get your style guide"}</h1>
        <p>Daylight, no filter, hair as you normally wear it. You get haircut ideas and grooming tips.</p>
      </div>
      <label class="btn primary big" for="look-file">${latest ? "Take or choose a photo" : "Take a selfie"}</label>
      <input id="look-file" type="file" accept="image/*" hidden>
    </section>
    <div id="look-out" aria-live="polite">${latest ? lookResultHtml(latest.result) : `<div class="empty"><p>Haircut ideas and grooming tips show up here after your first photo.</p></div>`}</div>
    ${list.length > 1 || (latest && list.length) ? `
    <section class="history"><h3>History</h3>
      <div class="hist-list">${list.map((l, i) => `
        <button class="hist" data-i="${i}" type="button">
          <img src="${l.thumb}" alt="Photo from ${esc(fmtDate(l.created_at))}">
          <span class="hist-date">${esc(fmtDate(l.created_at))}</span>
        </button>`).join("")}</div></section>` : ""}`;

  const out = $("#look-out", root);
  root.querySelectorAll(".hist").forEach((b) => {
    b.onclick = () => { out.innerHTML = lookResultHtml(list[+b.dataset.i].result); out.scrollIntoView({ behavior: "smooth", block: "start" }); };
  });

  $("#look-file", root).onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    out.innerHTML = `<div class="card loading"><div class="spinner" aria-hidden="true"></div><p>Putting your guide together. About 15 seconds.</p></div>`;
    out.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const { base64, thumb } = await prepareImage(file);
      const result = await ctx.backend.analyze("look", base64, {});
      if (!result.usable) {
        out.innerHTML = `<div class="card"><h3>Can't rate this photo</h3><p>${esc(result.unusable_reason || "The photo was not usable.")}</p><p class="fine">Try again with your face clearly visible and good light.</p></div>`;
        return;
      }
      await ctx.backend.addLook({ score: null, result, thumb });
      toast("Saved to your history");
      await renderLooks(root, ctx);
      root.scrollIntoView({ block: "start" });
    } catch (ex) {
      out.innerHTML = `<div class="card"><h3>That didn't work</h3><p class="error">${esc(ex.message)}</p></div>`;
    }
  };
}
