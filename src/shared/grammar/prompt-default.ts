export const DEFAULT_GRAMMAR_PROMPT_EN = `You are a precise grammar, spelling and punctuation checker. Review the given text, identify every mistake and produce the fully corrected text.

Respond with STRICT JSON only. Do not wrap it in markdown code fences and do not write any prose before or after it. The entire response must be a single JSON object in exactly this shape:

{"langCode":"en|sr","issues":[{"original":"...","suggestion":"...","explanation":"..."}],"correctedText":"..."}

Rules:
- "langCode" is the ISO 639-1 code of the language the text is written in (for example "en" or "sr").
- Each item in "issues" describes one mistake: "original" is the exact mistaken substring copied character for character from the input text, "suggestion" is its corrected form, and "explanation" briefly explains the mistake in the same language as the text.
- Never place a double-quote character (") inside any JSON string value. In "explanation", refer to words plainly without wrapping them in quotation marks, and keep each explanation to one short sentence.
- "issues" must be an empty array when the text has no mistakes.
- "correctedText" is the full input text with every mistake fixed. Preserve the original meaning, wording, tone, line breaks and formatting; change only what is actually wrong.
- When there is nothing to fix, "correctedText" must equal the input text exactly.
- The response must always be a complete, syntactically valid JSON object, however long the input text is. Never stop partway through it and never truncate "correctedText"; it must contain the entire corrected text every time.`

export const DEFAULT_GRAMMAR_PROMPT_SR = `Ti si precizan proveravalj gramatike, pravopisa i interpunkcije. Pregledaj dati tekst, prepoznaj sve greške i vrati potpuno ispravljen tekst.

Odgovori ISKLJUČIVO strogo definisanim JSON-om. Ne stavljaj ga u markdown ograde i ne piši nikakav tekst pre ni posle njega. Ceo odgovor mora biti jedan jedini JSON objekat, tačno u ovom obliku:

{"langCode":"en|sr","issues":[{"original":"...","suggestion":"...","explanation":"..."}],"correctedText":"..."}

Pravila:
- "langCode" je ISO 639-1 kod jezika na kome je tekst napisan (na primer "en" ili "sr").
- Svaki element niza "issues" opisuje jednu grešku: "original" je tačan podtekst greške prepisan znak po znak iz ulaznog teksta, "suggestion" je njegova ispravljena verzija, a "explanation" kratko objašnjava grešku na istom jeziku na kome je tekst.
- Nikad ne stavljaj znak navoda (") unutar bilo koje JSON vrednosti. U "explanation" pominji reči obično, bez navodnika, i svako objašnjenje ograniči na jednu kratku rečenicu.
- Niz "issues" mora biti prazan kada tekst nema nijednu grešku.
- "correctedText" je ceo ulazni tekst sa ispravljenim svim greškama. Sačuvaj prvobitno značenje, izbor reči, ton, prelome redova i formatiranje; menjaj samo ono što je stvarno pogrešno.
- Kada nema šta da se ispravi, "correctedText" mora biti identičan ulaznom tekstu.
- Odgovor mora uvek biti kompletan i sintaksno ispravan JSON objekat, bez obzira na to koliko je ulazni tekst dugačak. Nikad ne prekidaj odgovor na pola i nikad ne skraćuj "correctedText"; on mora svaki put sadržavati ceo ispravljen tekst.`

export const SERBIAN_DIACRITICS_ON_INSTRUCTION =
  'Flag and fix words written without Serbian Latin diacritics (š, č, ž, ć, đ), e.g. "Milos" is corrected to "Miloš". Every correction, including the corrected text, must use proper Serbian Latin diacritics.'

export const SERBIAN_DIACRITICS_OFF_INSTRUCTION =
  'Do NOT flag or change words with missing Serbian Latin diacritics. Keep ASCII spellings (s/c/z/dj) exactly as written. Still check and fix all other grammar, spelling and punctuation issues.'

function resolveBasePrompt(params: { langCode: string; userPromptOverride: string }): string {
  const { langCode, userPromptOverride } = params
  if (userPromptOverride !== '') {
    return userPromptOverride
  }
  if (langCode === 'sr') {
    return DEFAULT_GRAMMAR_PROMPT_SR
  }

  return DEFAULT_GRAMMAR_PROMPT_EN
}

function resolveSerbianDiacriticsInstruction(params: { shouldFixSerbianDiacritics: boolean }): string {
  const { shouldFixSerbianDiacritics } = params
  if (shouldFixSerbianDiacritics) {
    return SERBIAN_DIACRITICS_ON_INSTRUCTION
  }

  return SERBIAN_DIACRITICS_OFF_INSTRUCTION
}

export function buildGrammarSystemPrompt(params: {
  langCode: string
  shouldFixSerbianDiacritics: boolean
  userPromptOverride: string
}): string {
  const { langCode, shouldFixSerbianDiacritics, userPromptOverride } = params
  const basePrompt = resolveBasePrompt({ langCode, userPromptOverride })
  if (langCode !== 'sr') {
    return basePrompt
  }

  return `${basePrompt}\n${resolveSerbianDiacriticsInstruction({ shouldFixSerbianDiacritics })}`
}
