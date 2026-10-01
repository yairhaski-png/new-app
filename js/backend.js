import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

// ---------- Demo backend (this device only, sample AI output) ----------
function demoBackend() {
  const K = (n) => "lm_demo_" + n;
  const read = (n, d) => { try { return JSON.parse(localStorage.getItem(K(n))) ?? d; } catch { return d; } };
  const write = (n, v) => { try { localStorage.setItem(K(n), JSON.stringify(v)); } catch { /* storage full or blocked */ } };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  return {
    async init() {},
    async getUser() { return read("user", null); },
    async signUp(email) { write("user", { id: "demo", email }); return { id: "demo", email }; },
    async signIn(email) { write("user", { id: "demo", email }); return { id: "demo", email }; },
    async signOut() { localStorage.removeItem(K("user")); },
    async getProfile() { return read("profile", null); },
    async saveProfile(p) { write("profile", p); return p; },
    async listLooks() { return read("looks", []); },
    async addLook(row) { const r = { id: uid(), created_at: new Date().toISOString(), ...row }; write("looks", [r, ...read("looks", [])]); return r; },
    async listMeals() { return read("meals", []); },
    async addMeal(row) { const r = { id: uid(), created_at: new Date().toISOString(), ...row }; write("meals", [r, ...read("meals", [])]); return r; },
    async updateMeal(id, patch) { write("meals", read("meals", []).map((m) => (m.id === id ? { ...m, ...patch } : m))); },
    async deleteMeal(id) { write("meals", read("meals", []).filter((m) => m.id !== id)); },
    async analyze(mode) {
      await sleep(900);
      if (mode === "look") return DEMO_LOOK;
      return DEMO_FOOD;
    },
  };
}

const DEMO_LOOK = {
  usable: true, unusable_reason: "", face_shape: "oval",
  summary: "Sample guide. Connect the server to get ideas based on your own photo.",
  categories: [
    { name: "Hair", note: "Sample note about hair." },
    { name: "Skin", note: "Sample note about skin care." },
    { name: "Grooming", note: "Sample note about grooming." },
    { name: "Style", note: "Sample note about clothes." },
  ],
  strengths: ["Sample thing that works"], weaknesses: ["Sample easy upgrade"],
  tips: [{ title: "Sample tip", detail: "Real tips will be specific to your photo." }],
  haircuts: [{ name: "Textured crop", why: "Sample reasoning.", ask_barber: "Sample barber wording.", front: "Short textured fringe.", sides: "Faded short.", back: "Tapered neckline." }],
};
const DEMO_FOOD = {
  is_food: true, confidence: "low", health_score: 6, tip: "Sample tip. Real estimates come from the AI once connected.",
  items: [{ name: "Sample meal item", portion: "1 plate (~300 g)", kcal: 520 }, { name: "Sample side", portion: "1 small bowl", kcal: 140 }],
  total_kcal: 660,
};

// ---------- Supabase backend ----------
async function supabaseBackend() {
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm");
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const unwrap = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  const me = async () => { const { data } = await sb.auth.getSession(); return data.session?.user ?? null; };
  return {
    async init() {},
    async getUser() { const u = await me(); return u ? { id: u.id, email: u.email } : null; },
    async signUp(email, password) {
      const d = unwrap(await sb.auth.signUp({ email, password }));
      if (!d.session) throw new Error("Account created. Check your email to confirm it, then log in.");
      return { id: d.user.id, email: d.user.email };
    },
    async signIn(email, password) {
      const d = unwrap(await sb.auth.signInWithPassword({ email, password }));
      return { id: d.user.id, email: d.user.email };
    },
    async signOut() { await sb.auth.signOut(); },
    async getProfile() { return unwrap(await sb.from("profiles").select("*").maybeSingle()); },
    async saveProfile(p) {
      const u = await me();
      return unwrap(await sb.from("profiles").upsert({ ...p, user_id: u.id, updated_at: new Date().toISOString() }).select().single());
    },
    async listLooks() { return unwrap(await sb.from("looks_ratings").select("*").order("created_at", { ascending: false })); },
    async addLook(row) { return unwrap(await sb.from("looks_ratings").insert(row).select().single()); },
    async listMeals() { return unwrap(await sb.from("meals").select("*").order("created_at", { ascending: false })); },
    async addMeal(row) { return unwrap(await sb.from("meals").insert(row).select().single()); },
    async updateMeal(id, patch) { unwrap(await sb.from("meals").update(patch).eq("id", id)); },
    async deleteMeal(id) { unwrap(await sb.from("meals").delete().eq("id", id)); },
    async analyze(mode, image, hints) {
      const { data, error } = await sb.functions.invoke("analyze", { body: { mode, image, hints } });
      if (error) {
        let msg = error.message;
        try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch { /* keep default */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
  };
}

export async function createBackend() {
  return DEMO ? demoBackend() : supabaseBackend();
}
