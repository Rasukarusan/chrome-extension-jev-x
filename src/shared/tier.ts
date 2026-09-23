import type { StampTier } from './types'

/**
 * 閾値未満は「見ろ！」、閾値以上は驚き屋、閾値と満点の中間以上は特級驚き屋。
 * 判定した投稿には必ずどれか1つのスタンプを押す。
 */
export function stampTier(score: number, threshold: number): StampTier {
  if (score < threshold) return 'miro'
  return score >= threshold + (1 - threshold) / 2 ? 'tokkyu' : 'odorokiya'
}

export const TIER_LABEL: Record<StampTier, string> = {
  miro: '見ろ！',
  odorokiya: 'AI驚き屋',
  tokkyu: '特級AI驚き屋',
}
