/**
 * Industry-specific Liki context — used by both the AI runners (evaluator,
 * suggestor) to specialize Haiku prompts, and by the client UI (ChoicesPicker)
 * to surface concrete "stuck-user" options on the uniqueness question.
 *
 * Keyed by the same `industryChip` enum that inferIndustryChip() returns.
 * Unknown industries fall back to `other`.
 *
 * `uniquenessChoices`: 3-4 industry-specific phrasings of common
 *   differentiators. The "Diçka tjetër ➜ shkruaj" escape hatch is added by
 *   ChoicesPicker at render time, not here, so the data stays focused.
 *
 * `industryContext`: 1-2 sentences injected into Haiku's system prompt.
 *   Describes what specific differentiators are common in this industry in
 *   Kosovo, biasing the follow-up generation toward concrete behavior.
 */

export type IndustryProfile = {
  uniquenessChoices: string[];
  industryContext: string;
};

export const INDUSTRY_PROFILES: Record<string, IndustryProfile> = {
  barbershop: {
    uniquenessChoices: [
      'Shpejtësia, pa pritje',
      'Trajtim personal — i njoh klientët',
      'Stile moderne / fade master',
      'Orare të gjata ose punë te shtëpia',
    ],
    industryContext: `Berberitë në Kosovë dallohen për: shpejtësi (pa pritje), mardhënie personale me klientë të rregullt, mjeshtëri specifike (fade, mjekër), orare të zgjatura për punëtorët e turneve, ose çmim. Pyet për sjellje konkrete — "javën e kaluar bëra X" — jo për pretendime.`,
  },

  restaurant: {
    uniquenessChoices: [
      'Recetë familjare / tradicionale',
      'Përbërës specifikë (lokalë, sezonalë)',
      'Atmosfera (bahçe, oxhak, terrasë)',
      'Specialitete që s\'i bën dikush tjetër',
    ],
    industryContext: `Restorantet në Kosovë dallohen për: receta familjare të paskaluara, përbërës specifikë (mish lokal, perime sezonale), atmosfera unike (bahçe, oxhak), specialitete të shtëpisë, ose orare të veçanta. Pyet për gjellë specifike, jo për "kuzhinë cilësore".`,
  },

  clinic: {
    uniquenessChoices: [
      'Pajisje moderne / teknologji specifike',
      'Mjekë me shkollim jashtë (Gjermani, Austri)',
      'Pa pritje / termin të shpejtë',
      'Trajtim personal, vazhdueshmëri',
    ],
    industryContext: `Klinikat private në Kosovë dallohen për: pajisje moderne (CT, laser, etj.), shkollimi i mjekëve jashtë vendit, koha e shkurtër e pritjes, vazhdueshmëri e kujdesit, ose specializim i ngushtë. Pyet për prova konkrete, jo për "shërbim profesional".`,
  },

  beauty_salon: {
    uniquenessChoices: [
      'Bridal sessions / dasma',
      'Teknika specifike (balayage, microblading)',
      'Lidhje afatgjate me klientë të rregullta',
      'Produkte premium',
    ],
    industryContext: `Sallonet e bukurisë në Kosovë dallohen për: punë me nuse (bridal sessions 4-6h), teknika specifike (balayage, microblading, ekstension), klientela e rregullt vjetore, produkte premium, ose orare të dedikuara. Pyet për shembuj konkretë — "kam bërë X për dasmën e Y".`,
  },

  gym: {
    uniquenessChoices: [
      'Trajner personal / klasa në grup',
      'Pajisje specifike (CrossFit, funksional)',
      'Atmosferë (jo intimiduese, miqësore)',
      'Orare të hapura / heshjet me orare',
    ],
    industryContext: `Palestrat në Kosovë dallohen për: trajnim personal me trajner të dedikuar, klasa në grup (CrossFit, funksional, yoga), atmosferë (jo gym i frikshëm tradicional), pajisje specifike, ose orare. Pyet për programe konkrete, jo "fitness për të gjithë".`,
  },

  rrobaqepese: {
    uniquenessChoices: [
      'Qep nga zeroja vs vetëm rregullime',
      'Material i klientit vs e di vetë çfarë sjell',
      'Specializim (kostume, fustane, uniforma)',
      'Koha e dorëzimit / urgjenca',
    ],
    industryContext: `Rrobaqepëset në Kosovë dallohen për: qep nga zeroja vs vetëm rregullime, punë me material të klientit, specializim (kostume burrash, fustane nuseje, uniforma), koha e dorëzimit, ose çmimi. Pyet për shembuj specifikë të punëve të fundit.`,
  },

  retail: {
    uniquenessChoices: [
      'Mallra që s\'gjenden gjetkë / import direkt',
      'Brand i veçantë / dyqan i markës',
      'Cilësia / origjina (BE, vendi specifik)',
      'Asortiment i thellë në një kategori',
    ],
    industryContext: `Dyqanet në Kosovë dallohen për: mallra që s'gjenden gjetkë (import direkt nga vendet specifike), brendet që përfaqësojnë, cilësia/origjina e produktit, asortiment i thellë në një kategori (pa gjithçka). Pyet për produkte specifike që mban, jo për "cilësi".`,
  },

  auto: {
    uniquenessChoices: [
      'Specializim (BMW, Volkswagen, hibride)',
      'Pajisje diagnostikuese',
      'Servis i shpejtë / pa pritje',
      'Garanci në punë',
    ],
    industryContext: `Servisset auto në Kosovë dallohen për: specializim në markë (BMW, VW, etj.), pajisje diagnostikuese, koha e servisit, garanci në punë, ose marrëdhënie afatgjate me klientë. Pyet për prova konkrete — "kam riparuar X të modelit Y".`,
  },

  lavazh: {
    uniquenessChoices: [
      'Lavazh me detajim',
      'Lavazh me dorë vs makineri',
      'Trajtime specifike (qeramike, polish)',
      'Pickup / kthim te puna',
    ],
    industryContext: `Lavazhet në Kosovë dallohen për: lavazh të thellë me detajim, lavazh me dorë vs makineri, trajtime specifike (qeramike, polish, tea), shërbim pickup, ose çmim/shpejtësi. Pyet për paketat dhe çmimet konkrete.`,
  },

  photography: {
    uniquenessChoices: [
      'Specializim (dasma, foshnja, biznes)',
      'Stil i veçantë (editorial, reportage)',
      'Pajisje / studio profesionale',
      'Editim i përfshirë / shpejtësia',
    ],
    industryContext: `Fotografët në Kosovë dallohen për: specializim (dasma, foshnja, makina, korporata), stil i veçantë (editorial, dokumentar), pajisje profesionale, koha e dorëzimit të fotografive, ose paketa specifike. Pyet për shembuj të fundit, jo për "fotografi cilësore".`,
  },

  education: {
    uniquenessChoices: [
      'Madhësia e grupit (deri 6, 12, 20)',
      'Metodologjia (interaktive, project-based)',
      'Mësues me eksperiencë specifike',
      'Rezultate konkrete (pranime, çertifikata)',
    ],
    industryContext: `Kurset/akademitë në Kosovë dallohen për: madhësia e grupit (intim vs i madh), metodologjia (interaktive, project-based, drill), mësuesit (eksperiencë jashtë vendit, profesionistë), rezultate konkrete (pranime në universitet, vende pune). Pyet për prova specifike — "studentët e mi janë pranuar te X".`,
  },

  other: {
    uniquenessChoices: [
      'Cilësi që e prek nga afër',
      'Çmim më i mirë se konkurrenca',
      'Shërbim personal — i njoh klientët',
      'Eksperiencë e gjatë në fushë',
    ],
    industryContext: `Biznes i përgjithshëm në Kosovë. Pyet për sjellje konkrete që e dallon nga konkurrenca — "javën e kaluar kam bërë X për klientin Y" — jo për pretendime të përgjithshme si "cilësi e mirë".`,
  },
};

export function getIndustryProfile(chip: string | undefined): IndustryProfile {
  if (chip && INDUSTRY_PROFILES[chip]) return INDUSTRY_PROFILES[chip];
  return INDUSTRY_PROFILES.other;
}
