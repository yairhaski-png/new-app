// Supabase Edge Function: looks rating and food analysis with Claude vision.
// The API key lives only in the function secret ANTHROPIC_API_KEY.
import Anthropic from "npm:@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";
const MAX_IMAGE_B64 = 4_500_000; // ~3.3 MB of image bytes
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const str = { type: "string" };
const num = { type: "number" };

const LOOK_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["usable", "unusable_reason", "overall_score", "face_shape", "summary", "categories", "strengths", "weaknesses", "tips", "haircuts"],
  properties: {
    usable: { type: "boolean" }, unusable_reason: str, overall_score: num, face_shape: str, summary: str,
    categories: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "score", "note"], properties: { name: str, score: num, note: str } } },
    strengths: { type: "array", items: str }, weaknesses: { type: "array", items: str },
    tips: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "detail"], properties: { title: str, detail: str } } },
    haircuts: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "why", "ask_barber", "front", "sides", "back"], properties: { name: str, why: str, ask_barber: str, front: str, sides: str, back: str } } },
  },
};

const FOOD_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["is_food", "confidence", "health_score", "tip", "items", "total_kcal"],
  properties: {
    is_food: { type: "boolean" }, confidence: { type: "string", enum: ["low", "medium", "high"] },
    health_score: num, tip: str, total_kcal: num,
    items: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "portion", "kcal"], properties: { name: str, portion: str, kcal: num } } },
  },
};

const LOOK_PROMPT = `You are a direct, kind grooming and style coach. The user sent a photo of themselves and wants an honest rating with specifics.

Rules:
- If no clear face is visible, or the photo is too dark, blurred or heavily filtered to judge, set usable=false, explain in unusable_reason, and fill the other fields with neutral placeholders (overall_score 0, empty arrays, empty strings).
- If the person looks under 18, set usable=false and say the app only rates adults.
- Score on a realistic 1-10 scale where 5 is an average person. Do not inflate. Give each of these categories a score and a one or two sentence note: Skin, Hair, Face structure, Grooming, Style. Judge only what is visible.
- Focus on things the person can change (skin care, hair, facial hair, eyebrows, glasses, clothing, posture, photo habits). Be specific, never insulting, never about race, disability or medical conditions.
- strengths and weaknesses: 2 to 4 short items each. tips: 4 to 6 concrete actions in order of impact, each with a title and a detail.
- face_shape: one or two words (oval, square, round, heart, oblong, diamond).
- haircuts: 5 to 7 suggestions that fit this face shape and current hair type and length. For each give why it suits them, plain words to tell the barber, and what it looks like from the front, the sides and the back.
- Add in the summary that this is based on one photo.`;

const FOOD_PROMPT = `You estimate calories from a photo of a meal.

Rules:
- If the photo does not show food or drink, set is_food=false, items=[], total_kcal=0, health_score=0, confidence "low".
- List each distinct item with a portion estimate in grams or common units, and kcal using typical nutrition database values. Include visible oil, sauces and drinks.
- total_kcal must equal the sum of item kcal.
- health_score 1-10: 10 is whole foods, vegetables, lean protein, sensible portions; 1 is ultra-processed and sugary. 
- confidence reflects how clearly you could see the portion sizes.
- tip: one practical sentence about this meal.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const { mode, image } = await req.json();
    if (mode !== "look" && mode !== "food") return json({ error: "Unknown mode." }, 400);
    if (typeof image !== "string" || image.length < 100) return json({ error: "No image received." }, 400);
    if (image.length > MAX_IMAGE_B64) return json({ error: "Image is too large." }, 413);
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "Server is missing ANTHROPIC_API_KEY." }, 500);

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: mode === "look" ? LOOK_PROMPT : FOOD_PROMPT,
      output_config: {
        effort: mode === "look" ? "medium" : "low",
        format: { type: "json_schema", schema: mode === "look" ? LOOK_SCHEMA : FOOD_SCHEMA },
      },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
          { type: "text", text: mode === "look" ? "Rate my look." : "Estimate this meal." },
        ],
      }],
    });

    if (response.stop_reason === "refusal") return json({ error: "The AI declined to analyze this photo. Try a different one." }, 422);
    if (response.stop_reason === "max_tokens") return json({ error: "The answer was cut off. Try again." }, 502);
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return json({ error: "Empty answer from the AI." }, 502);
    const out = JSON.parse(text.text);

    if (mode === "food" && Array.isArray(out.items)) {
      out.total_kcal = out.items.reduce((s: number, i: { kcal: number }) => s + (Number(i.kcal) || 0), 0);
    }
    if (mode === "look" && out.usable) {
      out.overall_score = Math.max(1, Math.min(10, Number(out.overall_score) || 1));
    }
    return json(out);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Too many requests right now. Wait a minute and try again." }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: `AI service error (${e.status}).` }, 502);
    return json({ error: "Something went wrong analyzing the photo." }, 500);
  }
});
