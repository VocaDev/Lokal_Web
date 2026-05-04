// Kosovo lexical substitution layer.
//
// Mechanical post-processing pass that catches the model's Tirana-Albanian
// defaults and rewrites them to Kosovo equivalents. Field research of real
// Kosovo SMB writing shows the model's default vocabulary (tani, tek, çfarë,
// fqinj, makinë, shtëpia) is the single biggest "this was written by AI /
// foreigner" tell — Kosovars use specific variant words. This pass closes
// that gap deterministically without touching the prompt.
//
// Tone-conditional:
//   Tier 1 — applied for ALL tones
//   Tier 2 — applied for casual + friendly
//   Tier 3 — applied for casual only
//
// Word boundaries: JS \b is ASCII-only, which is broken for Albanian
// letters (ë, ç) — \bmakinë\b would not match "makinë " because ë is
// non-word in JS. We use Albanian-aware lookbehind/lookahead instead.

const ALB_WORD_CHAR = '[A-Za-z0-9_ëËçÇ]';

function buildRegex(word: string): RegExp {
  return new RegExp(`(?<!${ALB_WORD_CHAR})${word}(?!${ALB_WORD_CHAR})`, 'gi');
}

function preserveCase(original: string, replacement: string): string {
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

interface Rule {
  pattern: RegExp;
  replacement: string;
}

// Order within Tier 2 matters: longest first so the broader form
// doesn't fire on the narrower form's prefix before its turn.
const TIER_1: Rule[] = [
  { pattern: buildRegex('tani'), replacement: 'tash' },
  { pattern: buildRegex('tek'), replacement: 'te' },
];

const TIER_2: Rule[] = [
  { pattern: buildRegex('fqinjët'), replacement: 'kojshitë' },
  { pattern: buildRegex('fqinji'), replacement: 'kojshia' },
  { pattern: buildRegex('fqinj'), replacement: 'kojshi' },
];

const TIER_3: Rule[] = [
  { pattern: buildRegex('çfarë'), replacement: 'çka' },
  { pattern: buildRegex('shtëpia'), replacement: 'shpia' },
  { pattern: buildRegex('makinë'), replacement: 'veturë' },
  // si → qysh: skipped. Distinguishing "si" as "how" (question word) from
  // "si" as "as/like" (preposition) is too fragile in regex; mis-firing
  // would mangle legitimate uses. Future work: try a tagger or heuristic.
];

export function applyKosovoSubstitutions(text: string, tone: string): string {
  if (typeof text !== 'string' || text.length === 0) return text;

  const rules: Rule[] = [...TIER_1];
  if (tone === 'casual' || tone === 'friendly') rules.push(...TIER_2);
  if (tone === 'casual') rules.push(...TIER_3);

  let count = 0;
  let result = text;
  for (const { pattern, replacement } of rules) {
    result = result.replace(pattern, (match) => {
      count++;
      return preserveCase(match, replacement);
    });
  }

  if (count > 0) {
    console.log('[kosovo-subs] applied', count, 'substitutions for tone:', tone);
  }
  return result;
}
