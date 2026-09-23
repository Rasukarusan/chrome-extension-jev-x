import { describe, expect, it } from 'vitest'
import { stampTier } from '../src/shared/tier'

describe('stampTier', () => {
  it.each([
    [0.54, 'miro'],
    [0.55, 'odorokiya'],
    [0.77, 'odorokiya'],
    [0.78, 'tokkyu'],
  ] as const)('閾値0.55でスコア%sなら%s', (score, tier) => {
    expect(stampTier(score, 0.55)).toBe(tier)
  })
})
