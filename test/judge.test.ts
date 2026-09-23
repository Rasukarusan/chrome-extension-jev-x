import { describe, expect, it } from 'vitest'
import { buildRequest, HYPE_LEVELS, mentionsJev, scoreSignals, toVerdict } from '../src/background/judge'
import type { JevAnswers } from '../src/background/jev-client'
import { stampTier } from '../src/shared/tier'
import { DEFAULT_SETTINGS } from '../src/shared/types'

const TEXT = 'このAIツールすごい'
const verdict = (text: string, a: JevAnswers) => toVerdict(a, text)
const answers = (o: { aboutAi: number; hype: number; fomo: number; bait: number; substance: number }): JevAnswers => ({
  aboutAi: { type: 'noul', noul: o.aboutAi },
  hype: { type: 'score', score: o.hype, probabilities: {}, confidence: 1 },
  fomo: { type: 'noul', noul: o.fomo },
  bait: { type: 'noul', noul: o.bait },
  substance: { type: 'noul', noul: o.substance },
})

describe('buildRequest', () => {
  it('投稿本文を state に入れ、5つの問いを投げる', () => {
    const req = buildRequest('すごい')
    expect(req.state).toEqual({ post: 'すごい' })
    expect(Object.keys(req.questions)).toEqual(['aboutAi', 'hype', 'fomo', 'bait', 'substance'])
  })
})

describe('toVerdict', () => {
  it('典型的な驚き屋は高スコアになる', () => {
    const v = verdict(TEXT, answers({ aboutAi: 0.98, hype: 3.8, fomo: 0.95, bait: 0.8, substance: 0.05 }))
    expect(v.score).toBeGreaterThan(0.85)
  })

  it('煽りのない中身のあるAI投稿も驚き屋になる', () => {
    const v = verdict(TEXT, answers({ aboutAi: 0.97, hype: 0, fomo: 0, bait: 0, substance: 1 }))
    expect(stampTier(v.score, DEFAULT_SETTINGS.threshold)).toBe('odorokiya')
  })

  it('強く煽るAI投稿は特級になる', () => {
    const v = verdict(TEXT, answers({ aboutAi: 0.98, hype: 2.5, fomo: 0.6, bait: 0.2, substance: 0.3 }))
    expect(stampTier(v.score, DEFAULT_SETTINGS.threshold)).toBe('tokkyu')
  })

  it('Jev に触れていれば AI の話題と判定されなくても驚き屋になる', () => {
    const v = verdict('Jev使ってみた', answers({ aboutAi: 0.1, hype: 0, fomo: 0, bait: 0, substance: 1 }))
    expect(v.signals.mentionsJev).toBe(true)
    expect(stampTier(v.score, DEFAULT_SETTINGS.threshold)).toBe('odorokiya')
  })

  it('Jev に触れていて少し盛り上がっていれば特級になる', () => {
    const v = verdict('Jevヤバい', answers({ aboutAi: 0.99, hype: 2, fomo: 0.2, bait: 0, substance: 0.4 }))
    expect(stampTier(v.score, DEFAULT_SETTINGS.threshold)).toBe('tokkyu')
  })

  it('AIの話題でもJevの言及もなければ煽っていても0', () => {
    const v = verdict(TEXT, answers({ aboutAi: 0.1, hype: 4, fomo: 1, bait: 1, substance: 0 }))
    expect(v.score).toBe(0)
  })

  it('hype は段階数で 0..1 に正規化される', () => {
    const v = verdict(TEXT, answers({ aboutAi: 1, hype: HYPE_LEVELS.length - 1, fomo: 0, bait: 0, substance: 1 }))
    expect(v.signals.hype).toBe(1)
  })

  it('型の違う回答は例外にする', () => {
    const broken = { ...answers({ aboutAi: 1, hype: 1, fomo: 0, bait: 0, substance: 0 }), fomo: undefined }
    expect(() => verdict(TEXT, broken)).toThrow()
  })
})

describe('scoreSignals', () => {
  it('0..1 に収まる', () => {
    expect(scoreSignals({ aboutAi: 1, hype: 1, fomo: 1, bait: 1, substance: 0, mentionsJev: true })).toBe(1)
  })
})

describe('mentionsJev', () => {
  it.each([
    ['Jevすごい', true],
    ['話題のジェブを試した', true],
    ['TypeSafe AI 爆速', true],
    ['JEV-1.13 リリース', true],
    ['jevelry', false],
    ['Claude がすごい', false],
  ])('%s → %s', (text, expected) => {
    expect(mentionsJev(text)).toBe(expected)
  })
})
