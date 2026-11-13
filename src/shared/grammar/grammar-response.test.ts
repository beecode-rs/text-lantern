// Supplements: no grammar-response.contract.yaml exists on purpose.
// Covers: grammarResponseParser.parse - clean JSON, fenced JSON, prose-wrapped JSON, missing-field
// fallbacks ('' for correctedText/langCode/explanation, isIgnored false), invalid issue filtering, error cases.
// Contract yaml cannot express this subject: test-contractor's function strategy invokes
// `module[subject][method](...params)` detached from the object, so `this` inside `parse` is
// undefined and the call crashes before any assertion runs. `parse` genuinely relies on `this`
// (`this._stripCodeFences`, `this._normalizeParsed`, ...), so it needs a receiver - hence Vitest.
import { describe, expect, it } from 'vitest'

import { grammarResponseParser } from '#src/shared/grammar/grammar-response'

describe('grammarResponseParser.parse', () => {
  it('parses a clean JSON object exactly in shape', () => {
    expect(
      grammarResponseParser.parse({
        raw: '{"langCode":"en","issues":[{"original":"teh","suggestion":"the","explanation":"Typo."}],"correctedText":"the text"}',
      }),
    ).toEqual({
      correctedText: 'the text',
      issues: [{ explanation: 'Typo.', isIgnored: false, location: null, original: 'teh', suggestion: 'the' }],
      langCode: 'en',
    })
  })

  it('parses JSON wrapped in ```json fences', () => {
    expect(
      grammarResponseParser.parse({
        raw: '```json\n{"langCode":"sr","issues":[],"correctedText":"Zdravo svete!"}\n```',
      }),
    ).toEqual({ correctedText: 'Zdravo svete!', issues: [], langCode: 'sr' })
  })

  it('extracts the outermost object from prose before and after the JSON', () => {
    expect(
      grammarResponseParser.parse({
        raw: 'Sure! Here is the corrected result: {"langCode":"en","issues":[{"original":"recieve","suggestion":"receive","explanation":"Spelling."}],"correctedText":"Please receive the package."} Hope this helps!',
      }),
    ).toEqual({
      correctedText: 'Please receive the package.',
      issues: [
        { explanation: 'Spelling.', isIgnored: false, location: null, original: 'recieve', suggestion: 'receive' },
      ],
      langCode: 'en',
    })
  })

  it('falls back to empty langCode, correctedText and issues for an empty JSON object', () => {
    expect(grammarResponseParser.parse({ raw: '{}' })).toEqual({ correctedText: '', issues: [], langCode: '' })
  })

  it('falls back to empty langCode and empty explanation when missing', () => {
    expect(
      grammarResponseParser.parse({
        raw: '{"correctedText":"Some text.","issues":[{"original":"a","suggestion":"b"}]}',
      }),
    ).toEqual({
      correctedText: 'Some text.',
      issues: [{ explanation: '', isIgnored: false, location: null, original: 'a', suggestion: 'b' }],
      langCode: '',
    })
  })

  it('falls back to empty correctedText when missing', () => {
    expect(grammarResponseParser.parse({ raw: '{"langCode":"en","issues":[]}' })).toEqual({
      correctedText: '',
      issues: [],
      langCode: 'en',
    })
  })

  it('filters issue entries missing original or suggestion (absent or empty) and non-object entries, keeping valid ones', () => {
    expect(
      grammarResponseParser.parse({
        raw: '{"langCode":"sr","issues":[{"original":"grad","suggestion":"grad ","explanation":"Missing space."},{"original":"solo"},{"suggestion":"x"},"not-an-object",null,{"original":"","suggestion":"y"},{"original":"z","suggestion":""}],"correctedText":"grad "}',
      }),
    ).toEqual({
      correctedText: 'grad ',
      issues: [
        { explanation: 'Missing space.', isIgnored: false, location: null, original: 'grad', suggestion: 'grad ' },
      ],
      langCode: 'sr',
    })
  })

  it('coerces a non-string explanation to its string form', () => {
    expect(
      grammarResponseParser.parse({
        raw: '{"langCode":"en","issues":[{"original":"a","suggestion":"b","explanation":42}],"correctedText":"ab"}',
      }),
    ).toEqual({
      correctedText: 'ab',
      issues: [{ explanation: '42', isIgnored: false, location: null, original: 'a', suggestion: 'b' }],
      langCode: 'en',
    })
  })

  it('throws a cut-short error for prose that trails an unparseable object without closing JSON', () => {
    expect(() => grammarResponseParser.parse({ raw: 'I am sorry, but { I cannot parse this } at all.' })).toThrow(
      'Grammar check response is cut short before the JSON object ends. The model output was probably truncated by its token limit. Try checking a shorter selection.',
    )
  })

  it('throws a cut-short error when the response is truncated mid-string before the JSON ends', () => {
    expect(() =>
      grammarResponseParser.parse({
        raw: '{"langCode":"sr","issues":[{"original":"moze","suggestion":"može","explanation":"Nedostaje dijakritika."}],"correctedText":"A ovo je na srpskom, da vidimo. Da li stvarno može i srpski',
      }),
    ).toThrow(
      'Grammar check response is cut short before the JSON object ends. The model output was probably truncated by its token limit. Try checking a shorter selection.',
    )
  })

  it('throws a cut-short error for a truncated response even when trailing whitespace follows', () => {
    expect(() =>
      grammarResponseParser.parse({
        raw: '{"langCode":"sr","issues":[{"original":"moze","suggestion":"može","explanation":"Nedostaje dijakritika."}],"correctedText":"Tekst   ',
      }),
    ).toThrow('Grammar check response is cut short before the JSON object ends')
  })

  it('throws the invalid-JSON error when a misescaped quote breaks an otherwise complete response', () => {
    expect(() =>
      grammarResponseParser.parse({
        raw: '{"langCode":"sr","issues":[{"original":"da","suggestion":"Da","explanation":"Prvo slovo rečenice treba biti veliko.\\"}],"correctedText":"Da."}',
      }),
    ).toThrow('Grammar check response is not valid JSON:')
  })

  it('throws for prose without any braces', () => {
    expect(() => grammarResponseParser.parse({ raw: 'Completely plain prose with no braces.' })).toThrow(
      'Grammar check response does not contain a JSON object',
    )
  })

  it('throws for an empty response', () => {
    expect(() => grammarResponseParser.parse({ raw: '' })).toThrow(
      'Grammar check response does not contain a JSON object',
    )
  })

  it('throws for a top-level JSON array', () => {
    expect(() => grammarResponseParser.parse({ raw: '[1, 2, 3]' })).toThrow(
      'Grammar check response does not contain a JSON object',
    )
  })

  it('throws for a top-level JSON string', () => {
    expect(() => grammarResponseParser.parse({ raw: '"definitely not an object"' })).toThrow(
      'Grammar check response does not contain a JSON object',
    )
  })
})
