/** タイムライン上の1投稿。判定に必要な最小限の情報だけを持つ。 */
export interface Post {
  id: string
  text: string
}

/** 判定の材料。数値は Jev の回答を 0..1 に正規化したもの、mentionsJev は本文から機械的に検出したもの。 */
export interface Signals {
  aboutAi: number
  hype: number
  fomo: number
  bait: number
  substance: number
  mentionsJev: boolean
}

export interface Verdict {
  /** 驚き屋度 0..1 */
  score: number
  signals: Signals
}

export type StampTier = 'miro' | 'odorokiya' | 'tokkyu'

export interface Settings {
  apiKey: string
  enabled: boolean
  /** この驚き屋度以上でスタンプを押す */
  threshold: number
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  enabled: true,
  threshold: 0.55,
}

export type JudgeResult =
  | { ok: true; verdict: Verdict }
  | { ok: false; error: JudgeError; detail: string }

export type JudgeError = 'no_api_key' | 'unauthorized' | 'rate_limited' | 'network' | 'unknown'

export type Message =
  | { type: 'judge'; post: Post }
  | { type: 'judgeText'; text: string }
