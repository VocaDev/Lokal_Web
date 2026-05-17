/**
 * Liki Suggestor — pure runner.
 *
 * One Haiku call that picks language + tone + visual from the chat phase
 * answers. The client kicks this off in the background during the
 * DropTransition; results land before the user reaches the form screens
 * and pre-select the relevant cards. Misses are graceful — the screens just
 * show no badge and the user picks manually.
 *
 * Temperature 0.5 (lower than evaluator's 0.7) — this is selection, not
 * creative generation. Determinism helps consistent "this kind of business
 * → this kind of styling" intuition.
 */

import { anthropic } from '@/lib/anthropic';
import { parseModelJson } from '@/lib/json-extract';

export type SuggestorArgs = {
  businessName: string;
  industryText: string;
  industryChip?: string;
  city: string;
  uniqueness: string;
  businessDescription: string;
  detectedLanguage: 'sq' | 'en' | 'mixed';
};

export type SuggestorResult = {
  language: 'sq' | 'en' | null;
  tone: 'miqesor' | 'profesional' | 'bisedor' | 'i-fuqishem' | null;
  visual: 'warm' | 'dark' | 'trust' | 'modern' | 'editorial' | 'family' | null;
};

const SUGGESTOR_STATIC_SYSTEM_PROMPT = `Ti je Liki. Po analizon një biznes nga Kosova për të sugjeruar tri gjëra:
gjuhë + ton komunikimi + stil vizual. Zgjedhja jote bëhet pre-zgjedhje për
përdoruesin — ai mund ta ndryshojë, por sugjerimi yt duhet të ketë kuptim
për biznesin specifik.

STILET VIZUALE (zgjedh saktë 1):
- warm: tradicionale, familjare, drurë e krem. (berber tradicional, restorant familjar, rrobaqepëse e vjetër)
- dark: moderne, urbane, kontrast i fortë. (palestër moderne, kafene urbane, studio fotografike)
- trust: profesionale, klinike, blu e qetë. (dentist, klinika, avokat, kontabilist, klinikë veterinare)
- modern: energjike, e gjallë, e re. (kafene re, sallon trendi, palestër CrossFit, brand e re)
- editorial: si revistë, akademik, klasik. (kurse, studio dizajni, dyqan libri, ekspozitë)
- family: mirëpritës, i thjeshtë, i ngrohtë. (restorant familjar, parukerinë lagjeje, dyqan rrobash fëmijësh)

TONET (zgjedh saktë 1):
- miqesor: si me një shok, "ne", "ti", i ngrohtë
- profesional: serioz, formal, fokus në kompetencë (klinika, ligji, kontabilist)
- bisedor: kosovar, regjistër lokal ("tash", "n'", "çka"), për biznese me popullaritet lokal
- i-fuqishem: i drejtpërdrejtë, energjik, pa lulëzime (palestër, marketing, brand sportiv)

GJUHA (zgjedh saktë 1):
- sq: nëse përshkrimi/unikaliteti janë në shqip ose përdorimi Albania/Kosovo, audiencë lokale
- en: nëse përshkrimi është në anglisht ose audiencë ndërkombëtare/expat

PARIMET E ZGJEDHJES:
- Mendoje me kujdes — mos shko "default te bisedor"
- Përshtate me ATË BIZNES specifik, jo me kategori të përgjithshme
- Berber familjar lagjeje → warm + miqesor + sq
- Klinikë dentare moderne → trust + profesional + sq
- Palestër CrossFit → modern + i-fuqishem + sq
- Restorant me kuzhinë italiane për turista → editorial + profesional + en
- Studio fotografike artisanal → editorial + miqesor + sq

OUTPUT: VETËM JSON i pastër, asgjë tjetër:
{ "language": "sq"|"en", "tone": "miqesor"|"profesional"|"bisedor"|"i-fuqishem", "visual": "warm"|"dark"|"trust"|"modern"|"editorial"|"family" }`;

const VALID_TONES = new Set(['miqesor', 'profesional', 'bisedor', 'i-fuqishem']);
const VALID_VISUALS = new Set(['warm', 'dark', 'trust', 'modern', 'editorial', 'family']);

export async function runSuggestor(args: SuggestorArgs): Promise<SuggestorResult> {
  const userPrompt = `BIZNESI: ${args.businessName}
LLOJI (fjalët e përdoruesit): ${args.industryText}
KATEGORIA: ${args.industryChip ?? 'e papercaktuar'}
QYTETI: ${args.city}

UNIKALITETI (përgjigja e plotë e përdoruesit):
${args.uniqueness || '(s\'dha përgjigje)'}

PËRSHKRIMI (përgjigja e plotë):
${args.businessDescription || '(s\'dha përgjigje)'}

GJUHA E ZBULUAR NGA INPUTET: ${args.detectedLanguage}

Sugjero language + tone + visual. Mendoje me kujdes — biznesi specifik, jo kategoria.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    temperature: 0.5,
    system: [
      {
        type: 'text',
        text: SUGGESTOR_STATIC_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const parsed = parseModelJson(text) as Partial<SuggestorResult> | null;

  const language: SuggestorResult['language'] =
    parsed?.language === 'en' ? 'en' : parsed?.language === 'sq' ? 'sq' : null;
  const tone: SuggestorResult['tone'] =
    parsed?.tone && VALID_TONES.has(parsed.tone) ? (parsed.tone as SuggestorResult['tone']) : null;
  const visual: SuggestorResult['visual'] =
    parsed?.visual && VALID_VISUALS.has(parsed.visual) ? (parsed.visual as SuggestorResult['visual']) : null;

  return { language, tone, visual };
}
