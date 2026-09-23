import { loadSettings, saveSettings } from '../shared/settings'
import { stampTier, TIER_LABEL } from '../shared/tier'
import type { JudgeError, JudgeResult, Message } from '../shared/types'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const apiKey = $<HTMLInputElement>('apiKey')
const enabled = $<HTMLInputElement>('enabled')
const threshold = $<HTMLInputElement>('threshold')
const thresholdLabel = $<HTMLSpanElement>('thresholdLabel')
const saved = $<HTMLSpanElement>('saved')
const sample = $<HTMLTextAreaElement>('sample')
const tryButton = $<HTMLButtonElement>('try')
const result = $<HTMLDivElement>('result')

const ERROR_MESSAGES: Record<JudgeError, string> = {
  no_api_key: 'API キーが未設定です。',
  unauthorized: 'API キーが無効です。',
  rate_limited: 'レート制限中です。少し待ってから試してください。',
  network: 'Jev に接続できませんでした。',
  unknown: '判定に失敗しました。',
}

const percent = (v: number) => `${Math.round(v * 100)}%`

async function init() {
  const settings = await loadSettings()
  apiKey.value = settings.apiKey
  enabled.checked = settings.enabled
  threshold.value = String(settings.threshold)
  thresholdLabel.textContent = percent(settings.threshold)

  $('saveKey').addEventListener('click', async () => {
    await saveSettings({ apiKey: apiKey.value.trim() })
    await chrome.action.setBadgeText({ text: '' })
    saved.textContent = '保存しました'
  })
  enabled.addEventListener('change', () => saveSettings({ enabled: enabled.checked }))
  threshold.addEventListener('input', () => (thresholdLabel.textContent = percent(Number(threshold.value))))
  threshold.addEventListener('change', () => saveSettings({ threshold: Number(threshold.value) }))

  tryButton.addEventListener('click', async () => {
    const text = sample.value.trim() || sample.placeholder
    tryButton.disabled = true
    result.textContent = '判定中…'
    const res = await chrome.runtime.sendMessage<Message, JudgeResult>({ type: 'judgeText', text })
    tryButton.disabled = false
    if (!res.ok) {
      result.textContent = `${ERROR_MESSAGES[res.error]}\n${res.detail}`
      return
    }
    const { score, signals } = res.verdict
    const tier = stampTier(score, Number(threshold.value))
    result.textContent = [
      `${TIER_LABEL[tier]}（驚き屋度 ${percent(score)}）`,
      `AIの話題 ${percent(signals.aboutAi)} / 誇張度 ${percent(signals.hype)} / 焦らせ度 ${percent(signals.fomo)}`,
      `いいね乞い ${percent(signals.bait)} / 中身 ${percent(signals.substance)}`,
      ...(signals.mentionsJev ? ['Jevに言及あり（驚き屋確定）'] : []),
    ].join('\n')
  })
}

void init()
