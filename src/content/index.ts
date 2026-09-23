import { loadSettings } from '../shared/settings'
import { stampTier, TIER_LABEL } from '../shared/tier'
import type { JudgeResult, Message, Settings, Verdict } from '../shared/types'
import { extractPost, TWEET_SELECTOR } from './extract'
import { mountStamp, type Stamp } from './stamp'

/** 短すぎる投稿は判定材料が足りないので送らない。 */
const MIN_TEXT_LENGTH = 15

const percent = (v: number) => `${Math.round(v * 100)}%`

interface Tracked {
  postId: string
  verdict?: Verdict
  stamp?: Stamp
}

const tracked = new Map<HTMLElement, Tracked>()
/** 一度ドンと押した投稿は、仮想スクロールで再描画されても静かに貼るだけにする。 */
const slammedIds = new Set<string>()
const peeledIds = new Set<string>()

let settings: Settings
/** API キー未設定・無効なら、設定が変わるまで問い合わせを止める。 */
let halted = false

// 画面に近づいた投稿から先読みで判定する
const nearObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      nearObserver.unobserve(entry.target)
      void judge(entry.target as HTMLElement)
    }
  },
  { rootMargin: '1200px 0px' },
)

// スタンプは投稿がしっかり見えた瞬間に押す
const slamObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      slamObserver.unobserve(entry.target)
      const state = tracked.get(entry.target as HTMLElement)
      if (!state?.stamp) continue
      state.stamp.slam()
      slammedIds.add(state.postId)
    }
  },
  { threshold: 0.6 },
)

function scan() {
  for (const [article, state] of tracked) {
    if (!article.isConnected) {
      state.stamp?.remove()
      tracked.delete(article)
    }
  }
  document.querySelectorAll<HTMLElement>(TWEET_SELECTOR).forEach((article) => {
    const post = extractPost(article)
    if (!post) return
    const state = tracked.get(article)
    if (state?.postId === post.id) return
    // 同じ要素が別の投稿に使い回された
    state?.stamp?.remove()
    tracked.set(article, { postId: post.id })
    nearObserver.observe(article)
  })
}

async function judge(article: HTMLElement) {
  if (!settings.enabled || halted) return
  const state = tracked.get(article)
  const post = extractPost(article)
  if (!state || !post || post.id !== state.postId) return
  if (post.text.length < MIN_TEXT_LENGTH) return

  const result = await send({ type: 'judge', post })
  if (!result) return
  if (!result.ok) {
    console.warn(`[驚き屋] 判定エラー (${result.error}): ${result.detail}`)
    if (result.error === 'no_api_key' || result.error === 'unauthorized') halted = true
    return
  }
  const tier = stampTier(result.verdict.score, settings.threshold)
  console.info(`[驚き屋] ${percent(result.verdict.score)} ${TIER_LABEL[tier]} ${post.text.slice(0, 40)}`, result.verdict.signals)
  // 判定中にスクロールで別の投稿に変わっていたら捨てる
  if (tracked.get(article) !== state) return
  state.verdict = result.verdict
  render(article, state)
}

function render(article: HTMLElement, state: Tracked) {
  state.stamp?.remove()
  state.stamp = undefined
  if (!settings.enabled || !state.verdict || peeledIds.has(state.postId)) return

  const tier = stampTier(state.verdict.score, settings.threshold)
  const animate = !slammedIds.has(state.postId)
  state.stamp = mountStamp(article, tier, state.verdict, {
    animate,
    onPeel: () => {
      peeledIds.add(state.postId)
      state.stamp = undefined
    },
  })
  if (animate) slamObserver.observe(article)
}

async function send(message: Message): Promise<JudgeResult | undefined> {
  try {
    return await chrome.runtime.sendMessage<Message, JudgeResult>(message)
  } catch {
    // 拡張の再読み込み後など、古いコンテンツスクリプトが残っている
    return undefined
  }
}

function scheduleScan() {
  let queued = false
  return () => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      scan()
    })
  }
}

async function main() {
  settings = await loadSettings()

  chrome.storage.onChanged.addListener(async (_changes, area) => {
    if (area !== 'local') return
    settings = await loadSettings()
    halted = false
    for (const [article, state] of tracked) {
      if (state.verdict) render(article, state)
      else nearObserver.observe(article)
    }
  })

  const onMutation = scheduleScan()
  new MutationObserver(onMutation).observe(document.body, { childList: true, subtree: true })
  scan()
}

void main()
