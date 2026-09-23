import type { Signals, Verdict } from '../shared/types'
import type { JevAnswers, JevRequest } from './jev-client'

/**
 * AI驚き屋の判定を、Jev が得意な「字義通りに答えられる原子的な問い」に分解する。
 * 最終スコアの合成はコード側で行う（Jev の Composite scoring パターン）。
 */
export const HYPE_LEVELS = [
  'Neutral and factual. Describes the tool or news plainly.',
  'Mildly positive. Some enthusiasm but no exaggeration.',
  'Clearly excited. Uses strong praise such as "すごい", "便利すぎる", "革命的".',
  'Heavy exaggeration. Stacks superlatives and alarm emojis (🔥🚨🤯), e.g. "ヤバすぎる", "エグい", "神ツール", "次元が違う".',
  'Extreme sensationalism. Claims the world, an industry, or a profession has changed forever, e.g. "〇〇は終わった", "人類の歴史が変わった", "もう人間いらない".',
] as const

export const QUESTIONS = {
  aboutAi: {
    type: 'noul',
    instructions:
      'Is this social media post mainly about AI, such as generative AI, LLMs, chatbots, AI agents, or an AI product, model, or feature?',
    criteria: {
      true: 'The main topic is an AI tool, AI model, AI feature, or AI news.',
      false: 'AI is not the main topic, or not mentioned at all.',
    },
  },
  hype: {
    type: 'score',
    instructions: 'How exaggerated and sensational is the tone of this post?',
    criteria: [...HYPE_LEVELS],
  },
  fomo: {
    type: 'noul',
    instructions:
      'Does this post pressure the reader with fear of missing out or urgency, telling them they must check or use something right now or be left behind?',
    criteria: {
      true: 'Phrases like "絶対見るべき", "知らないとヤバい", "今すぐ使え", "使ってない人は置いていかれる", "保存必須", "まだ〇〇してるの？".',
      false: 'No pressure on the reader. The post simply shares information or an opinion.',
    },
  },
  bait: {
    type: 'noul',
    instructions:
      'Is this post engagement bait, asking for likes, reposts, bookmarks, or follows, or teasing details in the replies or a thread?',
    criteria: {
      true: 'Phrases like "いいねした人に配布", "リプ欄に続く", "スレッドで解説👇", "フォローして", "RTで拡散".',
      false: 'No request for engagement and no teasing of hidden content.',
    },
  },
  substance: {
    type: 'noul',
    instructions:
      'Does this post contain concrete substance, such as results from the author\'s own testing, specific numbers or benchmarks, reproducible steps, or honest limitations and caveats?',
    criteria: {
      true: 'Contains verifiable specifics or mentions weaknesses and limits.',
      false: 'Only impressions, praise, or claims without specifics.',
    },
  },
} as const

const WEIGHTS = { hype: 0.4, fomo: 0.3, bait: 0.15, lackOfSubstance: 0.15 } as const

/** AIの話題でなければ、どれだけ煽っていても驚き屋ではない。 */
const ABOUT_AI_GATE = 0.5

/**
 * AIの話題というだけで驚き屋度はこの値から始まる。
 * 既定の閾値を上回る値にしてあり、AIの話題は煽りの強さにかかわらず驚き屋になる。
 */
const AI_BASE = 0.6

/** Jev に触れている投稿は、AIの話題かどうかを問わず驚き屋とし、さらに上乗せする。 */
const JEV_BONUS = 0.1
const JEV_PATTERN = /(?<![a-z])jev(?![a-z])|ジェブ|ジェヴ|type\s?safe/i

export const mentionsJev = (text: string) => JEV_PATTERN.test(text)

export function buildRequest(text: string): JevRequest {
  return { model: 'jev-latest', state: { post: text }, questions: QUESTIONS }
}

export function toSignals(answers: JevAnswers, text: string): Signals {
  const noul = (key: string) => {
    const a = answers[key]
    if (a?.type !== 'noul') throw new Error(`Jev answer "${key}" is not a noul`)
    return a.noul
  }
  const hype = answers.hype
  if (hype?.type !== 'score') throw new Error('Jev answer "hype" is not a score')

  return {
    aboutAi: noul('aboutAi'),
    hype: hype.score / (HYPE_LEVELS.length - 1),
    fomo: noul('fomo'),
    bait: noul('bait'),
    substance: noul('substance'),
    mentionsJev: mentionsJev(text),
  }
}

export function scoreSignals(s: Signals): number {
  if (!s.mentionsJev && s.aboutAi < ABOUT_AI_GATE) return 0
  const hypeness =
    WEIGHTS.hype * s.hype +
    WEIGHTS.fomo * s.fomo +
    WEIGHTS.bait * s.bait +
    WEIGHTS.lackOfSubstance * (1 - s.substance)
  const bonus = s.mentionsJev ? JEV_BONUS : 0
  return Math.min(1, Math.max(0, AI_BASE + (1 - AI_BASE) * hypeness + bonus))
}

export function toVerdict(answers: JevAnswers, text: string): Verdict {
  const signals = toSignals(answers, text)
  return { score: scoreSignals(signals), signals }
}
