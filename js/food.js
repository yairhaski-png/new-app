import { $, esc, fmtDate, prepareImage, scoreRing, toast } from "./ui.js";
import { DEMO } from "./backend.js";
import { FOODS } from "./data.js";
import { estimateWeight, localDate, maintenanceKcal, profileComplete } from "./calc.js";

function weightCard(profile, meals) {
  if (!profileComplete(profile)) {
    return `<section class="card"><h3>Estimated weight</h3><p>Add your weight, height and age in Settings to see how your eating changes your weight.</p></section>`;
  }
  const w = estimateWeight(profile, meals);
  const sign = w.change >= 0 ? "+" : "−";
  return `<section class="card weight">
    <h3>Estimated weight</h3>
    <div class="weight-row"><span class="big-num">${w.estimate.toFixed(1)}<small> kg</small></span>
      <span class="delta ${w.change >= 0 ? "up" : "down"}">${sign}${Math.abs(w.change).toFixed(2)} kg since ${esc(profile.start_date || "start")}</span></div>
    <p class="fine">Based on ${w.days} fully logged ${w.days === 1 ? "day" : "days"} against about ${w.maintenance} kcal a day to stay the same. It is an estimate. A day counts only once it has ended and most of your meals are logged. If you are still growing, do not use this to diet. Talk to a parent or doctor first.</p>
  </section>`;
}

function mealRow(m) {
  return `<li class="meal" data-id="${esc(m.id)}">
    ${m.thumb ? `<img src="${m.thumb}" alt="">` : `<span class="meal-ph" aria-hidden="true"></span>`}
    <div class="meal-main"><label class="sr" for="n-${esc(m.id)}">Meal name</label>
      <textarea id="n-${esc(m.id)}" class="meal-name" rows="3" maxlength="80">${esc(m.name)}</textarea>
      <span class="meal-meta">${esc(fmtDate(m.created_at))}${m.health_score ? ` · health ${m.health_score}/10` : ""}</span></div>
    <div class="meal-side"><div class="meal-kcal"><label class="sr" for="k-${esc(m.id)}">Calories</label>
      <input id="k-${esc(m.id)}" class="meal-k" type="number" inputmode="numeric" min="0" max="5000" value="${Number(m.kcal)}"><span>kcal</span></div>
      <button class="del" type="button">Delete</button></div>
  </li>`;
}

function reviewHtml(r) {
  return `<section class="card review">
    <div class="result-head">${scoreRing(r.health_score)}<div><h2>Health score</h2><p class="chip">Confidence: ${esc(r.confidence)}</p></div></div>
    <p class="fine">Edit anything that looks wrong before saving.</p>
    <ul class="items">${r.items.map((it, i) => `
      <li><div class="item-main"><label class="sr" for="it-n-${i}">Item</label><input id="it-n-${i}" class="it-name" value="${esc(it.name)}"><span class="meal-meta">${esc(it.portion)}</span></div>
      <div class="meal-kcal"><label class="sr" for="it-k-${i}">Calories</label><input id="it-k-${i}" class="it-k" type="number" inputmode="numeric" min="0" value="${Number(it.kcal)}"><span>kcal</span></div></li>`).join("")}</ul>
    <div class="total-row"><span>Total</span><b id="rv-total">0 kcal</b></div>
    ${r.tip ? `<p class="lead">${esc(r.tip)}</p>` : ""}
    <div class="row"><button class="btn primary" id="rv-save" type="button">Save meal</button><button class="btn ghost" id="rv-cancel" type="button">Discard</button></div>
  </section>`;
}

export async function renderFood(root, ctx) {
  const [meals, profile] = await Promise.all([ctx.backend.listMeals(), ctx.backend.getProfile()]);
  const today = localDate();
  const todays = meals.filter((m) => m.eaten_on === today);
  const todayKcal = todays.reduce((s, m) => s + Number(m.kcal), 0);
  const maint = profileComplete(profile) ? maintenanceKcal(profile) : null;
  const earlier = {};
  for (const m of meals) if (m.eaten_on !== today) (earlier[m.eaten_on] ||= []).push(m);
  const earlierDays = Object.keys(earlier).sort().reverse().slice(0, 7);

  root.innerHTML = `
    ${ctx.reminderHtml || ""}
    ${DEMO ? `
    <section class="card hero">
      <div class="hero-text"><h1>What are you eating?</h1><p>Search a food, pick how many, and add it. Or type your own.</p></div>
      <label class="sr" for="f-search">Search foods</label>
      <input id="f-search" type="search" placeholder="Search: rice, egg, pizza..." autocomplete="off">
      <ul id="f-results" class="results"></ul>
      <details class="custom"><summary>Add something not on the list</summary>
        <label for="c-name">Name</label><input id="c-name" maxlength="60">
        <label for="c-kcal">Calories</label><input id="c-kcal" type="number" inputmode="numeric" min="0" max="5000">
        <button class="btn primary" id="c-add" type="button">Add</button></details>
    </section>` : `
    <section class="card hero">
      <div class="hero-text"><h1>What are you eating?</h1><p>Photograph the plate. Calories and a health score appear in a few seconds.</p></div>
      <label class="btn primary big" for="food-file">Snap a meal</label>
      <input id="food-file" type="file" accept="image/*" hidden>
    </section>`}
    <div id="food-out" aria-live="polite"></div>
    <section class="card today">
      <div class="today-top"><h3>Today</h3><span><b>${todayKcal}</b>${maint ? ` / ${maint}` : ""} kcal</span></div>
      ${maint ? `<div class="bar thick" role="img" aria-label="${todayKcal} of ${maint} kilocalories"><i style="width:${Math.min(100, (todayKcal / maint) * 100)}%"></i></div>` : ""}
      ${todays.length ? `<ul class="meals">${todays.map(mealRow).join("")}</ul>` : `<p class="fine">No meals logged yet today.</p>`}
    </section>
    ${weightCard(profile, meals)}
    ${earlierDays.length ? `<section class="history"><h3>Earlier</h3>${earlierDays.map((d) => {
      const ms = earlier[d];
      return `<details class="day"><summary><span>${esc(d)}</span><b>${ms.reduce((s, m) => s + Number(m.kcal), 0)} kcal</b></summary><ul class="meals">${ms.map(mealRow).join("")}</ul></details>`;
    }).join("")}</section>` : ""}`;

  // inline edits and delete
  root.querySelectorAll(".meal").forEach((li) => {
    const id = li.dataset.id;
    const save = async () => {
      const name = $(".meal-name", li).value.replace(/\s+/g, " ").trim() || "Meal";
      const kcal = Math.max(0, Math.round(Number($(".meal-k", li).value) || 0));
      await ctx.backend.updateMeal(id, { name, kcal });
      toast("Updated");
      await renderFood(root, ctx);
    };
    $(".meal-name", li).onchange = save;
    $(".meal-k", li).onchange = save;
    $(".del", li).onclick = async () => { await ctx.backend.deleteMeal(id); toast("Meal deleted"); await renderFood(root, ctx); };
  });

  const out = $("#food-out", root);
  if (DEMO) { wireManual(root, ctx); return; }
  $("#food-file", root).onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    out.innerHTML = `<div class="card loading"><div class="spinner" aria-hidden="true"></div><p>Identifying the food...</p></div>`;
    try {
      const { base64, thumb } = await prepareImage(file);
      const r = await ctx.backend.analyze("food", base64, {});
      if (!r.is_food || !r.items?.length) {
        out.innerHTML = `<div class="card"><h3>No food found</h3><p>I could not see a meal in that photo. Try again closer, with the whole plate in view.</p></div>`;
        return;
      }
      out.innerHTML = reviewHtml(r);
      const total = () => [...out.querySelectorAll(".it-k")].reduce((s, i) => s + (Number(i.value) || 0), 0);
      const upd = () => { $("#rv-total", out).textContent = `${total()} kcal`; };
      out.querySelectorAll(".it-k").forEach((i) => i.addEventListener("input", upd));
      upd();
      $("#rv-cancel", out).onclick = () => { out.innerHTML = ""; };
      $("#rv-save", out).onclick = async () => {
        const items = r.items.map((it, i) => ({
          ...it,
          name: out.querySelectorAll(".it-name")[i].value.trim() || it.name,
          kcal: Math.max(0, Math.round(Number(out.querySelectorAll(".it-k")[i].value) || 0)),
        }));
        const kcal = items.reduce((s, it) => s + it.kcal, 0);
        await ctx.backend.addMeal({
          eaten_on: localDate(), name: items.map((it) => it.name).join(", ").slice(0, 80),
          kcal, health_score: Math.round(r.health_score), items, thumb, notes: r.tip || "",
        });
        toast("Meal saved");
        await renderFood(root, ctx);
      };
      out.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (ex) {
      out.innerHTML = `<div class="card"><h3>That didn't work</h3><p class="error">${esc(ex.message)}</p></div>`;
    }
  };
}

function wireManual(root, ctx) {
  const list = $("#f-results", root);
  const draw = () => {
    const q = $("#f-search", root).value.trim().toLowerCase();
    const hits = (q ? FOODS.filter((f) => f[0].toLowerCase().includes(q)) : FOODS.slice(0, 8)).slice(0, 12);
    list.innerHTML = hits.length ? hits.map((f, i) => `<li><div><b>${esc(f[0])}</b><span class="meal-meta">${esc(f[1])} · ${f[2]} kcal</span></div>
      <div class="qty"><label class="sr" for="q-${i}">How many</label><input id="q-${i}" type="number" min="0.5" max="10" step="0.5" value="1" inputmode="decimal"><button class="btn primary add" type="button" data-i="${FOODS.indexOf(f)}" data-q="q-${i}">Add</button></div></li>`).join("") : `<li class="fine">Nothing found. Use "Add something not on the list" below.</li>`;
  };
  const save = async (name, kcal, qty) => {
    await ctx.backend.addMeal({ eaten_on: localDate(), name: qty && qty !== 1 ? `${name} x${qty}` : name, kcal: Math.round(kcal), health_score: null, items: [], thumb: null, notes: "" });
    toast("Added");
    await renderFood(root, ctx);
  };
  $("#f-search", root).addEventListener("input", draw);
  draw();
  list.onclick = (e) => {
    const b = e.target.closest(".add");
    if (!b) return;
    const f = FOODS[+b.dataset.i];
    const qty = Math.max(0.5, Math.min(10, Number($("#" + b.dataset.q, root).value) || 1));
    save(f[0], f[2] * qty, qty);
  };
  $("#c-add", root).onclick = () => {
    const name = $("#c-name", root).value.trim();
    const kcal = Number($("#c-kcal", root).value);
    if (!name || !(kcal >= 0)) { toast("Enter a name and calories."); return; }
    save(name, kcal, 1);
  };
}
