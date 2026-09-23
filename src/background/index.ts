import { loadSettings } from '../shared/settings'
import type { JudgeError, JudgeResult, Message, Post, Signals } from '../shared/types'
import { JevError, systemOne } from './jev-client'
import { buildRequest, scoreSignals, toVerdict } from './judge'

const MAX_CONCURRENCY = 4

/**
 * Jev の回答はブラウザセッション中だけ保持する（Service Worker が止まっても残る）。
 * 驚き屋度の式を変えても効くよう、保存するのはシグナルだけにして点数は毎回計算する。
 */
const cacheKey = (id: string) => `signals:v2:${id}`
const inflight = new Map<string, Promise<JudgeResult>>()

let running = 0
const waiting: Array<() => void> = []

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENCY) await new Promise<void>((r) => waiting.push(r))
  running++
  try {
    return await fn()
  } finally {
    running--
    waiting.shift()?.()
  }
}

async function evaluate(text: string): Promise<JudgeResult> {
  const { apiKey } = await loadSettings()
  if (!apiKey) return fail('no_api_key', 'API キーが未設定です')
  try {
    const answers = await withSlot(() => systemOne(apiKey, buildRequest(text)))
    const verdict = toVerdict(answers, text)
    await setBadge('')
    return { ok: true, verdict }
  } catch (e) {
    console.warn('[驚き屋] Jev の判定に失敗しました', e)
    return fail(classify(e), describe(e))
  }
}

async function judgePost(post: Post): Promise<JudgeResult> {
  const key = cacheKey(post.id)
  const cached = (await chrome.storage.session.get(key))[key] as Signals | undefined
  if (cached) return { ok: true, verdict: { score: scoreSignals(cached), signals: cached } }

  const pending = inflight.get(post.id)
  if (pending) return pending

  const promise = evaluate(post.text).then(async (result) => {
    if (result.ok) await chrome.storage.session.set({ [key]: result.verdict.signals })
    return result
  })
  inflight.set(post.id, promise)
  try {
    return await promise
  } finally {
    inflight.delete(post.id)
  }
}

function classify(e: unknown): JudgeError {
  if (e instanceof JevError) {
    if (e.status === 401 || e.status === 403) return 'unauthorized'
    if (e.status === 429 || e.status === 529) return 'rate_limited'
    return 'unknown'
  }
  return e instanceof TypeError ? 'network' : 'unknown'
}

function describe(e: unknown): string {
  if (e instanceof JevError) return `HTTP ${e.status}: ${e.message}`
  return e instanceof Error ? e.message : String(e)
}

function fail(error: JudgeError, detail: string): JudgeResult {
  void setBadge('!', `判定エラー: ${detail}`)
  return { ok: false, error, detail }
}

async function setBadge(text: string, title = 'AI驚き屋スタンプの設定') {
  await chrome.action.setBadgeText({ text })
  await chrome.action.setTitle({ title })
  if (text) await chrome.action.setBadgeBackgroundColor({ color: '#ee4a16' })
}

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  const handle = message.type === 'judge' ? judgePost(message.post) : evaluate(message.text)
  handle.then(sendResponse)
  return true
})

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage())

chrome.runtime.onInstalled.addListener(async () => {
  const { apiKey } = await loadSettings()
  if (!apiKey) {
    await setBadge('!')
    await chrome.runtime.openOptionsPage()
  }
})
