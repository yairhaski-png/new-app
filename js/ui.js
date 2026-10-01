export const $ = (sel, root = document) => root.querySelector(sel);

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

export function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
    " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image. Try a JPG or PNG photo.")); };
    img.src = url;
  });
}

function drawScaled(img, max, quality) {
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}

// Returns { base64 (no prefix, for the AI), thumb (data URL for history) }.
export async function prepareImage(file) {
  const img = await loadImage(file);
  const full = drawScaled(img, 1024, 0.82);
  const thumb = drawScaled(img, 240, 0.7);
  return { base64: full.split(",")[1], thumb };
}

export function scoreRing(score, size = 112) {
  const r = 44, C = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(10, score)) / 10;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 112 112" role="img" aria-label="Score ${score} out of 10">
    <circle cx="56" cy="56" r="${r}" class="ring-bg"/>
    <circle cx="56" cy="56" r="${r}" class="ring-fg" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}" transform="rotate(-90 56 56)"/>
    <text x="56" y="62" text-anchor="middle" class="ring-num">${Number(score).toFixed(1)}</text>
    <text x="56" y="80" text-anchor="middle" class="ring-of">of 10</text></svg>`;
}
