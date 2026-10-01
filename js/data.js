// Built-in knowledge so the app works with no server and no AI key.

export const HAIR_TYPES = [["straight", "Straight"], ["wavy", "Wavy"], ["curly", "Curly"], ["coily", "Very curly"]];
export const LENGTHS = [["short", "Short"], ["medium", "Medium"], ["long", "Long"]];
export const SHAPES = [["unsure", "Not sure"], ["oval", "Oval"], ["round", "Round"], ["square", "Square"], ["oblong", "Long"], ["heart", "Heart"]];

const SHAPE_NOTE = {
  unsure: "Without knowing your face shape, these cuts are safe for most people.",
  oval: "An oval face suits almost every cut, so pick by hair type and how much time you want to spend.",
  round: "A round face looks sharper with some height on top and shorter sides. Avoid a very heavy fringe.",
  square: "A square face looks balanced with soft, textured tops. Avoid very blocky, boxy shapes.",
  oblong: "A long face looks balanced with a fringe and less height on top. Avoid tall quiffs.",
  heart: "A heart-shaped face suits a side fringe or medium length that adds width near the jaw.",
};
const ALL_SHAPES = ["unsure", "oval", "round", "square", "oblong", "heart"];

const CUTS = [
  { name: "Textured crop, low taper", types: ["straight", "wavy", "curly"], lengths: ["short", "medium"], shapes: ALL_SHAPES,
    why: "Easy to keep and works with most hair. Texture on top, clean sides.",
    ask: "Scissor-cut the top and keep some length, texture it, low taper on the sides and neck.",
    front: "Soft fringe, pushed slightly forward.", sides: "Short, tapering down.", back: "Clean, tapered neckline." },
  { name: "Mid fade with textured top", types: ["straight", "wavy", "curly", "coily"], lengths: ["short", "medium"], shapes: ["unsure", "oval", "round", "oblong", "heart"],
    why: "A sharp contrast between top and sides. Adds height, which suits rounder faces.",
    ask: "Mid fade, leave the top longer and textured, thin it out a little.",
    front: "Hair stands up a little at the front.", sides: "Faded short.", back: "Faded, straight neckline." },
  { name: "Wavy flow, medium length", types: ["wavy", "curly"], lengths: ["medium", "long"], shapes: ["unsure", "oval", "square", "heart", "oblong"],
    why: "Lets the natural wave show. Styled in about two minutes.",
    ask: "Medium length on top, tidy the ends, short around the ears.",
    front: "Fringe falls to the brow.", sides: "Tucked or lightly tapered.", back: "Slightly longer, blended." },
  { name: "Messy quiff", types: ["straight", "wavy"], lengths: ["medium"], shapes: ["unsure", "oval", "round", "square", "heart"],
    why: "Uses the height of your hair and lifts the face area.",
    ask: "Longer on top, brush it up and back, short sides.",
    front: "Hair lifted off the forehead.", sides: "Short and neat.", back: "Tapered." },
  { name: "French crop", types: ["straight", "wavy"], lengths: ["short"], shapes: ["unsure", "oval", "oblong", "heart", "square"],
    why: "Low maintenance and tidy. The short fringe suits longer faces.",
    ask: "Short textured top with a short forward fringe, taper the sides.",
    front: "Short, straight fringe.", sides: "Taper.", back: "Taper." },
  { name: "Curly top with fade", types: ["curly", "coily"], lengths: ["short", "medium"], shapes: ALL_SHAPES,
    why: "Shows off the curls and keeps the sides neat.",
    ask: "Fade on the sides, keep the curls on top, shape the top round, no thinning scissors.",
    front: "Defined curls, slightly forward.", sides: "Faded.", back: "Faded, clean line." },
  { name: "Twist-out or short coils", types: ["coily", "curly"], lengths: ["short", "medium"], shapes: ALL_SHAPES,
    why: "Very low effort, and keeps very curly hair moisturised and healthy.",
    ask: "Even length on top, shaped hairline, low fade or taper at the sides.",
    front: "Soft shaped hairline.", sides: "Low taper.", back: "Taper with a clean line." },
  { name: "Side part", types: ["straight", "wavy"], lengths: ["short", "medium"], shapes: ["unsure", "oval", "round", "square", "oblong", "heart"],
    why: "Looks tidy for school, events and family photos.",
    ask: "Hard or soft part on one side, short sides, longer top that you comb over.",
    front: "Part on one side, hair swept across.", sides: "Short.", back: "Tapered." },
  { name: "Long layers, tied back or loose", types: ["straight", "wavy", "curly", "coily"], lengths: ["long"], shapes: ["unsure", "oval", "round", "square", "heart"],
    why: "For anyone growing it out. Layers stop long hair from looking flat.",
    ask: "Trim the ends, add light layers, keep the length.",
    front: "Face-framing pieces.", sides: "Layered.", back: "Even length." },
  { name: "Buzz cut with a clean edge", types: ["straight", "wavy", "curly", "coily"], lengths: ["short"], shapes: ["unsure", "oval", "square"],
    why: "Zero styling. Works best with a good hairline and even head shape.",
    ask: "Number 2 or 3 clipper guard all over, shape up the hairline.",
    front: "Short and even.", sides: "Same length or lightly faded.", back: "Same length." },
  { name: "Textured fringe, longer top", types: ["straight", "wavy"], lengths: ["medium", "long"], shapes: ["unsure", "oblong", "heart", "oval"],
    why: "A fringe breaks up a longer face and softens the forehead.",
    ask: "Keep length on the top, cut a textured fringe, short sides.",
    front: "Fringe at the brow.", sides: "Short.", back: "Tapered." },
];

export function pickCuts({ type, length, shape }) {
  const scored = CUTS.map((c) => ({
    c, s: (c.types.includes(type) ? 3 : 0) + (c.lengths.includes(length) ? 2 : 0) + (c.shapes.includes(shape) ? 2 : 0),
  })).sort((a, b) => b.s - a.s);
  return scored.slice(0, 6).filter((x) => x.s >= 3).map(({ c }) => ({
    name: c.name, why: c.why, ask_barber: c.ask, front: c.front, sides: c.sides, back: c.back,
  }));
}

const HAIR_NOTE = {
  straight: ["Straight hair holds clean lines and shows cuts well.", "Use a little matte clay or sea salt spray for texture."],
  wavy: ["Wavy hair has natural volume and movement.", "A little light cream or sea salt spray on damp hair keeps waves defined."],
  curly: ["Curly hair has lots of body and shape.", "Use a leave-in conditioner on damp hair and scrunch. Do not brush it dry."],
  coily: ["Very curly hair is full of volume and strong shape.", "Keep it moisturised with leave-in cream and detangle on damp hair."],
};

export function buildGuide(sel) {
  const hair = HAIR_NOTE[sel.type];
  return {
    usable: true,
    face_shape: sel.shape === "unsure" ? "" : (SHAPES.find((s) => s[0] === sel.shape) || [, ""])[1].toLowerCase(),
    summary: `Based on what you picked: ${sel.type} hair, ${sel.length} length. ${SHAPE_NOTE[sel.shape]}`,
    categories: [
      { name: "Hair", note: hair[0] },
      { name: "Skin care", note: "A simple routine is enough: gentle cleanser, light moisturiser, sunscreen in the morning." },
      { name: "Grooming", note: "Keep brows natural. Clean nails, tidy neckline, and fresh breath matter more than any product." },
      { name: "Photos", note: "Face the light. Daylight from a window in front of you makes a bigger difference than any product." },
    ],
    strengths: [hair[0], "You can change a haircut. It grows back."],
    weaknesses: ["A trim every 3 to 4 weeks keeps the shape sharp", "One small styling product goes a long way"],
    tips: [
      { title: "Trim the sides and neck every 3 to 4 weeks", detail: "The top can grow while the sides stay clean. This is the cheapest upgrade." },
      { title: "Style it right", detail: hair[1] },
      { title: "Wash hair 2 to 3 times a week", detail: "Washing every day dries hair out. On other days rinse with water." },
      { title: "Keep skin simple", detail: "Cleanser, moisturiser, sunscreen. If spots bother you, a doctor or pharmacist can help." },
      { title: "Sleep and water", detail: "8 to 9 hours of sleep and enough water help skin and energy more than any product." },
    ],
    haircuts: pickCuts(sel),
  };
}

// ---- Common foods, approximate kcal per serving ----
export const FOODS = [
  ["Rice, cooked", "1 cup", 205], ["Pasta, cooked", "1 cup", 220], ["Bread", "1 slice", 80], ["Pita", "1 medium", 165],
  ["Egg", "1 large", 75], ["Omelette", "2 eggs", 190], ["Chicken breast, grilled", "100 g", 165], ["Chicken schnitzel", "1 piece", 320],
  ["Beef burger patty", "1 patty", 280], ["Hamburger with bun", "1", 520], ["Hot dog with bun", "1", 290], ["Pizza slice", "1 slice", 285],
  ["Falafel ball", "1", 55], ["Falafel in pita", "1", 550], ["Shawarma in pita", "1", 620], ["Hummus", "2 tbsp", 80],
  ["Tahini", "1 tbsp", 90], ["Salad, mixed", "1 bowl", 60], ["Cucumber and tomato", "1 bowl", 40], ["French fries", "1 medium portion", 365],
  ["Potato, baked", "1 medium", 160], ["Sweet potato", "1 medium", 115], ["Tuna, canned", "1 can", 120], ["Salmon, baked", "100 g", 200],
  ["Cheese, yellow", "1 slice", 70], ["Cottage cheese", "1 small tub", 110], ["Yogurt", "1 cup", 120], ["Milk", "1 cup", 125],
  ["Chocolate milk", "1 cup", 190], ["Cereal with milk", "1 bowl", 250], ["Oatmeal", "1 bowl", 170], ["Granola bar", "1", 130],
  ["Apple", "1", 95], ["Banana", "1", 105], ["Orange", "1", 65], ["Grapes", "1 cup", 100], ["Watermelon", "1 slice", 85],
  ["Peanut butter", "1 tbsp", 95], ["Nuts, mixed", "1 handful", 170], ["Bamba", "1 small bag", 150], ["Chips", "1 small bag", 150],
  ["Chocolate bar", "1", 230], ["Ice cream", "1 scoop", 140], ["Cookie", "1", 80], ["Cake slice", "1", 350],
  ["Cola", "1 can", 140], ["Juice", "1 cup", 110], ["Protein shake", "1", 160], ["Water", "1 glass", 0],
  ["Sandwich with cheese", "1", 350], ["Tuna sandwich", "1", 400], ["Shakshuka", "1 portion", 280], ["Soup, vegetable", "1 bowl", 90],
  ["Sushi roll", "6 pieces", 250], ["Sabich", "1", 600], ["Burekas", "1", 330], ["Rice and chicken", "1 plate", 620],
];
