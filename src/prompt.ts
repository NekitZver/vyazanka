// Turns a free-text request ("chunky ribbed beanie, 56 cm") into a template and field values.
// ponytail: keyword matching, no language model; swap in an LLM call if users write things this misses

export interface ParsedPrompt {
  templateId: string;
  yarn?: string; // name of a standard weight in YARN_WEIGHTS
  numbers: number[]; // centimeter values in the order they were written
}

// first match wins: dog before sweater, so "свитер для собаки" is a dog sweater
const ITEMS: [string, RegExp][] = [
  ["dog-sweater", /dog|puppy|собак|пёс|пес|щен/i],
  ["sweater", /sweater|pullover|jumper|свитер|пуловер|джемпер/i],
  ["snood", /snood|cowl|infinity|снуд|хомут/i],
  ["scarf", /scarf|шарф/i],
  ["hat", /hat|beanie|cap|toque|bonnet|шапк|шапоч|берет/i],
];

// order matters: "super bulky" before "bulky"
const YARNS: [string, RegExp][] = [
  ["Super bulky", /super[ -]?(bulky|chunky)|очень толст/i],
  ["Chunky", /bulky|chunky|толст|объёмн|объемн/i],
  ["Worsted", /worsted|aran|аран|средн/i],
  ["DK", /\bdk\b|double knit/i],
  ["Sport", /\bsport\b/i],
  ["Fingering", /fingering|sock yarn|носоч|тонк/i],
  ["Lace", /\blace\b|кружевн/i],
];

export function parsePrompt(text: string): ParsedPrompt | null {
  const item = ITEMS.find(([, re]) => re.test(text));
  if (!item) return null;
  const yarn = YARNS.find(([, re]) => re.test(text));
  const numbers = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:cm|см)/gi)].map((m) => Number(m[1].replace(",", ".")));
  return { templateId: item[0], yarn: yarn?.[0], numbers };
}
