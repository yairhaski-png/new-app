export const KCAL_PER_KG = 7700;

export const ACTIVITY = [
  { v: 1.2, label: "Mostly sitting" },
  { v: 1.375, label: "Light: 1-3 workouts a week" },
  { v: 1.55, label: "Moderate: 3-5 workouts a week" },
  { v: 1.725, label: "Very active: 6-7 workouts a week" },
];

export function profileComplete(p) {
  return !!(p && p.weight_kg > 0 && p.height_cm > 0 && p.age > 0 && p.sex);
}

// Mifflin-St Jeor resting energy, then scaled by activity.
export function maintenanceKcal(p) {
  const base = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age;
  const bmr = p.sex === "female" ? base - 161 : base + 5;
  return Math.round(bmr * (p.activity || 1.375));
}

export function localDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Estimated weight from logged meals. Only finished days count (before today),
// and a day only counts when at least 40% of maintenance was logged, because a
// day with a forgotten meal would otherwise look like a huge deficit.
export function estimateWeight(profile, meals, today = localDate()) {
  const maintenance = maintenanceKcal(profile);
  const start = profile.start_date || today;
  const perDay = new Map();
  for (const m of meals) {
    if (m.eaten_on < start || m.eaten_on >= today) continue;
    perDay.set(m.eaten_on, (perDay.get(m.eaten_on) || 0) + (Number(m.kcal) || 0));
  }
  let surplus = 0;
  let days = 0;
  for (const kcal of perDay.values()) {
    if (kcal < maintenance * 0.4) continue;
    surplus += kcal - maintenance;
    days += 1;
  }
  const change = surplus / KCAL_PER_KG;
  return { maintenance, days, change, estimate: profile.weight_kg + change };
}
