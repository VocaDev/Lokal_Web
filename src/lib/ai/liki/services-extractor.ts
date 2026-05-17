/**
 * Liki Services Extractor — pure runner.
 *
 * Takes the free-text services blob the user typed and turns it into a
 * structured array Haiku can be trusted to render in the services section.
 * No invention: prices and durations only when explicitly in the text.
 *
 * Temperature 0.3 — extraction, not generation. We want the same input to
 * produce the same output across runs so the user gets predictable behavior.
 */

import { anthropic } from '@/lib/anthropic';
import { parseModelJson } from '@/lib/json-extract';

export type ServicesExtractorArgs = {
  servicesRaw: string;
  industryChip?: string;
  industryText: string;
  language: 'sq' | 'en';
};

export type ServicesExtractorResult = {
  services: Array<{ name: string; price?: string; durationMinutes?: number }>;
};

const SERVICES_EXTRACTOR_STATIC_SYSTEM_PROMPT = `Ti je Liki. Po nxjerr shërbimet nga teksti i lirë i pronarit të biznesit.

REGULLAT:
- Nxjerr ÇDO shërbim që përmend, jo vetëm "kryesoret"
- Përdor emrat ekzakt siç i shkruan përdoruesi — pa rishkrim, pa "përmirësim"
- ÇMIMET vetëm nëse janë EKSPLICITE në tekst (psh "5€", "5 EUR", "5 euro", "rreth 10")
- KOHËZGJATJA vetëm nëse është eksplicite ("30 min", "1 orë", "një orë e gjysmë" → 90)
- MOS shpik çmime ose kohë që nuk janë te teksti
- Maksimum 50 shërbime
- Filtroni out: salutime ("Përshëndetje"), hyrje ("Ja çfarë bëj:"), fjali jo-shërbimi
- Trato presje, pikëpresje DHE rresht të ri si ndarës shërbimesh
- Mos shto shërbime që nuk janë në tekst

OUTPUT: VETËM JSON i pastër, asgjë tjetër:
{
  "services": [
    { "name": "Prerje flokësh", "price": "5€", "durationMinutes": 30 },
    { "name": "Larje + stilim" }
  ]
}

Nëse teksti nuk përmban shërbime (psh vetëm përshëndetje), kthe { "services": [] }.`;

export async function runServicesExtractor(args: ServicesExtractorArgs): Promise<ServicesExtractorResult> {
  const userPrompt = `LLOJI I BIZNESIT: ${args.industryText} (${args.industryChip ?? 'i papercaktuar'})
GJUHA: ${args.language}

TEKSTI I PËRDORUESIT:
${args.servicesRaw}

Nxjerr shërbimet siç janë në tekst.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 800,
    temperature: 0.3,
    system: [
      {
        type: 'text',
        text: SERVICES_EXTRACTOR_STATIC_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const parsed = parseModelJson(text) as { services?: unknown } | null;

  if (!parsed?.services || !Array.isArray(parsed.services)) {
    return { services: [] };
  }

  // Defensive coercion — Haiku may return numbers as strings or omit fields.
  const services: ServicesExtractorResult['services'] = [];
  for (const raw of parsed.services.slice(0, 50)) {
    if (!raw || typeof raw !== 'object') continue;
    const obj = raw as Record<string, unknown>;
    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    if (!name || name.length > 120) continue;
    const item: { name: string; price?: string; durationMinutes?: number } = { name };
    if (typeof obj.price === 'string' && obj.price.trim()) item.price = obj.price.trim();
    else if (typeof obj.price === 'number' && Number.isFinite(obj.price)) item.price = String(obj.price);
    if (typeof obj.durationMinutes === 'number' && Number.isFinite(obj.durationMinutes)) {
      item.durationMinutes = Math.round(obj.durationMinutes);
    }
    services.push(item);
  }

  return { services };
}
