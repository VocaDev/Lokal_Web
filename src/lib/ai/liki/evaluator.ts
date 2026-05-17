/**
 * Liki Evaluator — pure runner.
 *
 * Single Haiku call that does two jobs at once: (1) judge whether an answer
 * to the uniqueness/description question is "good" or "weak", and (2) if
 * weak, generate a personalised follow-up question. The third flag
 * `offer_choices` signals to the client that the user seems stuck and should
 * see industry-specific picklist options (Mjeti 2).
 *
 * Pattern mirrors src/lib/ai/brand-brief.ts: static system prompt cached
 * (ephemeral), dynamic context in the user message. Industry context lives
 * in the user message because cache slot economics favor one warm cache over
 * many cold ones.
 */

import { anthropic } from '@/lib/anthropic';
import { parseModelJson } from '@/lib/json-extract';
import { applyKosovoSubstitutions } from '@/lib/kosovo-substitutions';
import { getIndustryProfile } from '@/lib/liki/industry-profiles';

export type EvaluatorArgs = {
  question: 'uniqueness' | 'description';
  answer: string;
  followupAnswer?: string;
  industryChip?: string;
  industryText: string;
  businessName: string;
  language: 'sq' | 'en';
};

export type EvaluatorResult = {
  quality: 'good' | 'weak';
  followup: string | null;
  offer_choices: boolean;
};

const EVALUATOR_STATIC_SYSTEM_PROMPT = `Ti je Liki — intervistues miqësor dhe kurioz për pronarë biznesi nga Kosova.
Roli yt: nxjerrësh specifika UNIKE që e dallojnë biznesin nga konkurrenca.

PARIMET (gjithmonë):
- KURRË gjykim, presion, ton mësues
- Specifika > abstrakte ("rri hapur vonë për ata me turne" > "shërbim i mirë")
- Sjellje e kaluar konkrete > pretendime ("javën e kaluar kam pasur..." > "jam i mirë")
- Anti-leading: mos sugjero përgjigje, vetëm pyet me kërshëri
- Toni kosovar (regjistër lokal: "tash", "n'", "çka") për gjuhën 'sq'
- Pa aforizëm, pa banale, pa marketing-speak
- Follow-up SHKURT — max 2 fjali

ÇFARË ËSHTË WEAK:
- ≤3 fjalë gjithsej
- E përgjithshme ("jam i mirë", "kemi cilësi", "shërbim profesional")
- Vetëm mbiemra pa sjellje konkrete
- "Punoj me dashuri" e ngjashme (sentiment pa specifikë)
- Përsëritje e llojit të biznesit ("jam berber dhe pres flokë")

ÇFARË ËSHTË GOOD:
- Sjellje konkrete (orari, çmim, vend, klientelë specifike, teknikë)
- Krahasim konkret me të tjerë
- Detaj numerik ose ekzakt (sa vite, sa kohë, çfarë madhësia)
- Pa fjalë gjenerike

KUR shfaqen choices (offer_choices=true):
- Vetëm për pyetjen 'uniqueness'
- Vetëm nëse përdoruesi tashmë dha një përgjigje weak DHE ka bërë tashmë një follow-up (followupAnswer ekziston) DHE prap është weak
- Asnjëherë për 'description'

OUTPUT: VETËM JSON i pastër, asgjë tjetër:
{ "quality": "good" | "weak", "followup": "tekst" ose null, "offer_choices": true ose false }

Nëse followupAnswer ekziston (kjo është thirrja e 2-të për të njëjtën pyetje):
- Kthe quality bazuar te të dyja përgjigjet të bashkuara
- followup: GJITHMONË null (max 1 follow-up)
- offer_choices: true vetëm nëse për 'uniqueness' DHE të dyja përgjigjet weak`;

export async function runEvaluator(args: EvaluatorArgs): Promise<EvaluatorResult> {
  const { question, answer, followupAnswer, industryChip, industryText, businessName, language } = args;
  const profile = getIndustryProfile(industryChip);

  const userPrompt = `PYETJA: ${question === 'uniqueness' ? 'Çfarë e bën biznesin ndryshe' : 'Përshkrimi i biznesit'}
LLOJI I BIZNESIT: ${industryText} (kategori: ${industryChip ?? 'e papercaktuar'})
EMRI: ${businessName}
GJUHA: ${language}

KONTEKST INDUSTRIE (përdore për follow-up specifik):
${profile.industryContext}

PËRGJIGJA E PËRDORUESIT:
${answer || '(bosh)'}
${followupAnswer ? `\nPËRGJIGJA PAS FOLLOW-UP (kjo është përgjigja e 2-të):\n${followupAnswer}\n\nKjo është thirrja e DYTË për të njëjtën pyetje. followup duhet të jetë null pavarësisht.` : ''}

Vlerëso. Nëse weak dhe nuk është thirrja e dytë, gjenero follow-up që orienton drejt sjelljes konkrete.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 400,
    temperature: 0.7,
    system: [
      {
        type: 'text',
        text: EVALUATOR_STATIC_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const parsed = parseModelJson(text) as Partial<EvaluatorResult> | null;

  // Defensive normalization — Haiku occasionally returns string 'true'/'false'
  // or omits fields. Coerce to the contract our client expects.
  const quality: 'good' | 'weak' = parsed?.quality === 'weak' ? 'weak' : 'good';
  const offerChoicesRaw: unknown = parsed?.offer_choices;
  const offer_choices = quality === 'weak' && question === 'uniqueness' && !!followupAnswer && Boolean(offerChoicesRaw);

  let followup: string | null = null;
  if (quality === 'weak' && !followupAnswer && typeof parsed?.followup === 'string' && parsed.followup.trim().length > 0) {
    followup = applyKosovoSubstitutions(parsed.followup.trim(), 'friendly');
  }

  return { quality, followup, offer_choices };
}
