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
  required: ["usable", "unusable_reason", "face_shape", "summary", "categories", "strengths", "weaknesses", "tips", "haircuts"],
  properties: {
    usable: { type: "boolean" }, unusable_reason: str, face_shape: str, summary: str,
    categories: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "note"], properties: { name: str, note: str } } },
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

const LOOK_PROMPT = `You are a friendly grooming and style coach. The user sent a photo of themselves and wants practical haircut ideas and grooming tips. The user may be a teenager or an adult.

Rules:
- Never give a score, rating, ranking or number about how someone looks, and never say how attractive, good-looking or ugly anyone is. Do not compare the person to others. Do not comment on body shape, weight, race, disability or medical conditions.
- If no clear face or head is visible, or the photo is too dark or blurred to see hair and face shape, set usable=false, explain in unusable_reason, and fill the other fields with neutral placeholders (empty strings and empty arrays).
- Describe only what can be changed or chosen: hair, skin care habits, facial hair or grooming, eyebrows, glasses, clothes, posture, how to take better photos. Keep the tone warm, specific and encouraging.
- face_shape: one or two words (oval, square, round, heart, oblong, diamond), used only to choose haircuts.
- categories: give notes (no scores) for Hair, Skin care, Grooming and Style. One or two sentences each.
- strengths: 2 to 3 things that already work. weaknesses: 2 to 3 easy upgrades, phrased as upgrades, never as flaws.
- tips: 4 to 6 concrete actions in order of impact, each with a title and a detail. For a young person keep skin and hair advice gentle and basic, and suggest seeing a doctor for persistent skin problems.
- haircuts: 5 to 7 suggestions that fit the face shape and the current hair type and length. For each give why it suits them, plain words to tell the barber, and what it looks like from the front, the sides and the back.
- Mention in the summary that this is based on one photo.`;

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
    return json(out);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Too many requests right now. Wait a minute and try again." }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: `AI service error (${e.status}).` }, 502);
    return json({ error: "Something went wrong analyzing the photo." }, 500);
  }
});
