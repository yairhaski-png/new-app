import { $, esc, fmtDate, prepareImage, scoreRing, toast } from "./ui.js";

function bar(score) {
  return `<div class="bar" role="img" aria-label="${score} out of 10"><i style="width:${Math.max(0, Math.min(10, score)) * 10}%"></i></div>`;
}

export function lookResultHtml(r) {
  return `
    <div class="card result">
      <div class="result-head">${scoreRing(r.overall_score)}
        <div><h2>Your look score</h2>${r.face_shape ? `<p class="chip">Face shape: ${esc(r.face_shape)}</p>` : ""}</div></div>
      <p class="lead">${esc(r.summary)}</p>
      <div class="cats">${(r.categories || []).map((c) => `
        <div class="cat"><div class="cat-top"><span>${esc(c.name)}</span><b>${Number(c.score).toFixed(1)}</b></div>${bar(c.score)}<p>${esc(c.note)}</p></div>`).join("")}</div>
    </div>
    <div class="card two">
      <div><h3>Working for you</h3><ul class="plain">${(r.strengths || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
      <div><h3>Holding you back</h3><ul class="plain">${(r.weaknesses || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
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
    <p class="fine">This is an AI opinion based on one photo. Lighting and angle change the result.</p>`;
}

export async function renderLooks(root, ctx) {
  const list = await ctx.backend.listLooks();
  const latest = list[0];
  root.innerHTML = `
    ${ctx.reminderHtml || ""}
    <section class="card hero">
      <div class="hero-text">
        <h1>${latest ? "Rate a new photo" : "Get your honest rating"}</h1>
        <p>Face the camera, daylight, no filter, hair as you normally wear it.</p>
      </div>
      <label class="btn primary big" for="look-file">${latest ? "Take or choose a photo" : "Take a selfie"}</label>
      <input id="look-file" type="file" accept="image/*" hidden>
    </section>
    <div id="look-out" aria-live="polite">${latest ? lookResultHtml(latest.result) : `<div class="empty"><p>Your score, tips and haircut ideas show up here after your first photo.</p></div>`}</div>
    ${list.length > 1 || (latest && list.length) ? `
    <section class="history"><h3>History</h3>
      <div class="hist-list">${list.map((l, i) => `
        <button class="hist" data-i="${i}" type="button">
          <img src="${l.thumb}" alt="Photo from ${esc(fmtDate(l.created_at))}">
          <span class="hist-score">${Number(l.score).toFixed(1)}</span>
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
    out.innerHTML = `<div class="card loading"><div class="spinner" aria-hidden="true"></div><p>Looking closely. This takes about 15 seconds.</p></div>`;
    out.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const { base64, thumb } = await prepareImage(file);
      const result = await ctx.backend.analyze("look", base64, {});
      if (!result.usable) {
        out.innerHTML = `<div class="card"><h3>Can't rate this photo</h3><p>${esc(result.unusable_reason || "The photo was not usable.")}</p><p class="fine">Try again with your face clearly visible and good light.</p></div>`;
        return;
      }
      await ctx.backend.addLook({ score: result.overall_score, result, thumb });
      toast("Saved to your history");
      await renderLooks(root, ctx);
      root.scrollIntoView({ block: "start" });
    } catch (ex) {
      out.innerHTML = `<div class="card"><h3>That didn't work</h3><p class="error">${esc(ex.message)}</p></div>`;
    }
  };
}
