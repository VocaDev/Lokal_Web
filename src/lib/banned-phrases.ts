// Shared banned-phrase lists for AI prompt construction.
//
// Two lists, two failure modes:
//
// BANNED_PHRASES — English-language marketing clichés that signal
// generic / lazy copy. Banned in customer-facing output regardless of
// language. Used by both /api/brand-brief and /api/generate-variants
// system prompts; also used by the post-process banned-phrase sweep.
//
// BANNED_KOSOVAR_WORDS — Albanian-specific words that signal
// Tirana-Tosk filler or translated marketing instead of authentic
// Kosovar speech. The full annotated list with replacement guidance
// lives inside the kosovarCopyRules block in generate-variants
// (gated on language === 'sq' || 'both'). This summary form exists
// so the brand-brief prompt — which doesn't get the kosovarCopyRules
// block — can still steer Haiku away from these terms in fields like
// targetCustomer / definingTraits / voice that are quoted verbatim
// downstream.

export const BANNED_PHRASES: readonly string[] = [
  'top-notch', 'premium quality', 'one-stop shop', 'we pride ourselves',
  'commitment to excellence', 'passionate about', 'unmatched quality',
  'unparalleled', 'state-of-the-art', 'cutting-edge', 'delighting our customers',
  'satisfaction is our priority', 'experience the difference', 'a cut above',
  'second to none', 'elevate your', 'unleash your', 'discover the',
  'where style meets', 'more than just',
];

export const BANNED_KOSOVAR_WORDS: readonly string[] = [
  'cilësor', 'cilësinë', 'cilësia',
  'eksperiencë', 'eksperienca',
  'profesional', // banned only as standalone claim ("ofron shërbim profesional")
  'atmosferë mikpritëse',
  'zgjedhja e duhur', 'zgjedhja ideale',
  'sipas standardeve evropiane',
  'Anëtarësohu tani', 'Anëtarësohu',
  'transformim', // beauty/fitness contexts
  'udhëtim',     // metaphorical "journey" sense only
  'me vëmendje', 'vëmendshëm',
  'terma të rënda',
  'ka nevojë për',
];
