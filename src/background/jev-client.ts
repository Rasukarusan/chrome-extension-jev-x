/** TypeSafe System One API (https://docs.typesafe.ai/api) の薄いクライアント。 */

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone'
const RETRYABLE = new Set([429, 529])
const MAX_ATTEMPTS = 3

export type JevQuestion =
  | { type: 'noul'; instructions: string; criteria?: { true?: string; false?: string } }
  | { type: 'choice'; instructions: string; criteria: Record<string, string | null> }
  | { type: 'score'; instructions: string; criteria: readonly string[] }

export interface JevRequest {
  model: string
  state: unknown
  questions: Record<string, JevQuestion>
}

export type JevAnswer =
  | { type: 'noul'; noul: number }
  | { type: 'choice'; choice: string; probabilities: Record<string, number>; confidence: number }
  | { type: 'score'; score: number; probabilities: Record<string, number>; confidence: number }

export type JevAnswers = Record<string, JevAnswer | undefined>

export class JevError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

export async function systemOne(apiKey: string, body: JevRequest): Promise<JevAnswers> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const json = (await res.json()) as { answers: JevAnswers }
      return json.answers
    }
    if (RETRYABLE.has(res.status) && attempt < MAX_ATTEMPTS) {
      await sleep(2 ** attempt * 500 + Math.random() * 250)
      continue
    }
    throw new JevError(res.status, await res.text())
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
