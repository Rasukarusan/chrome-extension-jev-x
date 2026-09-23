import { TIER_LABEL } from '../shared/tier'
import type { StampTier, Verdict } from '../shared/types'
import { burstSvg, stampSvg } from './stamp-svg'

const HOST_ATTR = 'data-odorokiya-stamp'

const STYLE = `
:host { all: initial; position: absolute; top: 44px; right: 20px; z-index: 2; pointer-events: none; }
.stamp { position: relative; width: 190px; transform: rotate(-8deg); pointer-events: auto; cursor: pointer;
  filter: drop-shadow(0 2px 0 rgba(0,0,0,.08)); }
.stamp svg { width: 100%; height: auto; display: block; }
.kanji { font-family: "Hiragino Sans", "Hiragino Kaku Gothic StdN", "Noto Sans JP", "Yu Gothic", sans-serif; }
.burst { position: absolute; left: 50%; top: 50%; width: 260px; translate: -50% -50%; opacity: 0; pointer-events: none; }
.burst svg { width: 100%; height: auto; }
.pending { visibility: hidden; }
.detail { position: absolute; top: 100%; right: 0; margin-top: 6px; padding: 10px 12px; width: 220px;
  background: #fff; color: #222; border: 3px solid #ee4a16; border-radius: 12px; font: 12px/1.6 system-ui, sans-serif;
  transform: rotate(8deg); transform-origin: top right; box-shadow: 0 6px 20px rgba(0,0,0,.15); }
.detail[hidden] { display: none; }
.detail b { color: #ee4a16; font-size: 14px; }
.detail dl { display: grid; grid-template-columns: auto 1fr; gap: 0 10px; margin: 6px 0 8px; }
.detail dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
.detail button { all: unset; cursor: pointer; color: #ee4a16; font-weight: 700; }
`

const SIGNAL_LABELS = {
  aboutAi: 'AIの話題',
  hype: '誇張度',
  fomo: '焦らせ度',
  bait: 'いいね乞い',
  substance: '中身',
} as const

export interface Stamp {
  /** 画面に入ったタイミングで呼ぶ。ドンと押す。 */
  slam(): void
  remove(): void
}

export function mountStamp(
  article: HTMLElement,
  tier: StampTier,
  verdict: Verdict,
  options: { animate: boolean; onPeel: () => void },
): Stamp {
  article.querySelector(`[${HOST_ATTR}]`)?.remove()
  if (getComputedStyle(article).position === 'static') article.style.position = 'relative'

  const host = document.createElement('div')
  host.setAttribute(HOST_ATTR, tier)
  const root = host.attachShadow({ mode: 'closed' })
  root.innerHTML = `
    <style>${STYLE}</style>
    <div class="stamp ${options.animate ? 'pending' : ''}" role="img" aria-label="${TIER_LABEL[tier]}">
      <div class="burst">${burstSvg()}</div>
      ${stampSvg(tier)}
      <div class="detail" hidden>
        <b>${TIER_LABEL[tier]}</b>
        <div>驚き屋度 ${percent(verdict.score)}</div>
        <dl>${Object.entries(SIGNAL_LABELS)
          .map(([key, label]) => `<dt>${label}</dt><dd>${percent(verdict.signals[key as keyof typeof SIGNAL_LABELS])}</dd>`)
          .join('')}${verdict.signals.mentionsJev ? '<dt>Jevに言及</dt><dd>あり</dd>' : ''}</dl>
        <button type="button">スタンプをはがす</button>
      </div>
    </div>`
  article.append(host)

  const stamp = root.querySelector<HTMLElement>('.stamp')!
  const detail = root.querySelector<HTMLElement>('.detail')!
  // article 自体がクリックで投稿詳細へ遷移するので、スタンプ上の操作は外に漏らさない
  stamp.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.composedPath().some((el) => el instanceof HTMLButtonElement)) {
      host.remove()
      options.onPeel()
      return
    }
    detail.hidden = !detail.hidden
  })

  let slammed = !options.animate
  return {
    slam() {
      if (slammed) return
      slammed = true
      stamp.classList.remove('pending')
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
      playSlam(article, stamp, root.querySelector<HTMLElement>('.burst')!)
    },
    remove: () => host.remove(),
  }
}

function playSlam(article: HTMLElement, stamp: HTMLElement, burst: HTMLElement) {
  const duration = 460
  const impact = 0.55
  stamp.animate(
    [
      { transform: 'scale(3.2) rotate(-24deg)', opacity: 0 },
      { transform: 'scale(0.88) rotate(-8deg)', opacity: 1, offset: impact },
      { transform: 'scale(1.06) rotate(-8deg)', offset: 0.75 },
      { transform: 'scale(1) rotate(-8deg)' },
    ],
    { duration, easing: 'cubic-bezier(.5,0,.75,0)' },
  )
  const delay = duration * impact
  burst.animate(
    [
      { transform: 'scale(0.6)', opacity: 1 },
      { transform: 'scale(1.25)', opacity: 0 },
    ],
    { duration: 380, delay, easing: 'ease-out' },
  )
  article.animate(
    [
      { transform: 'translate(0, 0)' },
      { transform: 'translate(-4px, 3px)' },
      { transform: 'translate(4px, -2px)' },
      { transform: 'translate(-2px, 1px)' },
      { transform: 'translate(0, 0)' },
    ],
    { duration: 220, delay, easing: 'linear' },
  )
}

const percent = (v: number) => `${Math.round(v * 100)}%`
