import type { StampTier } from '../shared/types'

const INK = '#ee4a16'
const PAPER = '#f3f0e2'

/** 炎の舌を横に並べたパス。高さと傾きに揺らぎを持たせて手描き感を出す。 */
function flamePath(left: number, right: number, base: number): string {
  const heights = [30, 46, 36, 52, 40, 48, 32]
  const w = (right - left) / heights.length
  let d = `M${left},${base}`
  heights.forEach((h, i) => {
    const x0 = left + i * w
    const lean = i % 2 ? 0.15 : -0.1
    const tipX = x0 + w * (0.5 + lean)
    const tipY = base - h
    d += ` C${x0 - w * 0.25},${base - h * 0.55} ${tipX - w * 0.1},${tipY + h * 0.3} ${tipX},${tipY}`
    d += ` C${tipX + w * 0.6},${tipY + h * 0.45} ${x0 + w * 1.2},${base - h * 0.45} ${x0 + w},${base - h * 0.12}`
  })
  return `${d} L${right},${base + 24} L${left},${base + 24} Z`
}

interface StampDesign {
  text: string
  fontSize: number
  ruby: string
  /** 熱盛スタンプに倣い、ルビは右下か左上に重ねる */
  rubyAt: 'bottomRight' | 'topLeft'
  flames: boolean
}

const DESIGNS: Record<StampTier, StampDesign> = {
  miro: { text: '見ろ！', fontSize: 68, ruby: 'ゼッタイ', rubyAt: 'topLeft', flames: false },
  odorokiya: { text: '驚屋', fontSize: 88, ruby: 'オドロキヤ', rubyAt: 'bottomRight', flames: false },
  tokkyu: { text: '驚屋', fontSize: 88, ruby: 'オドロキヤ', rubyAt: 'bottomRight', flames: true },
}

/** 熱盛スタンプ風の SVG。縁のガタつきは feTurbulence による変位で作る。 */
export function stampSvg(tier: StampTier): string {
  const design = DESIGNS[tier]
  const top = design.flames ? 50 : 8
  const height = top + 120
  const flames = design.flames ? `<path d="${flamePath(22, 198, top + 18)}" fill="${INK}"/>` : ''
  const ruby =
    design.rubyAt === 'bottomRight'
      ? { x: 200, y: top + 104, anchor: 'end' }
      : { x: 26, y: top + 32, anchor: 'start' }

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 ${height}" width="220" height="${height}" aria-hidden="true">
  <defs>
    <filter id="rough-${tier}" filterUnits="userSpaceOnUse" x="0" y="0" width="220" height="${height}">
      <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" seed="7"/>
      <feDisplacementMap in="SourceGraphic" scale="5" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="wobble-${tier}" filterUnits="userSpaceOnUse" x="0" y="0" width="220" height="${height}">
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="1" seed="2"/>
      <feDisplacementMap in="SourceGraphic" scale="2" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  <g filter="url(#rough-${tier})">
    ${flames}
    <rect x="12" y="${top + 6}" width="196" height="106" rx="24" fill="${PAPER}" stroke="${INK}" stroke-width="11"/>
  </g>
  <g filter="url(#wobble-${tier})" class="kanji" font-weight="900">
    <text x="110" y="${top + 60 + design.fontSize * 0.39}" text-anchor="middle" font-size="${design.fontSize}" letter-spacing="-8"
      fill="${INK}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round">${design.text}</text>
    <text x="${ruby.x}" y="${ruby.y}" text-anchor="${ruby.anchor}" font-size="21" letter-spacing="-1"
      fill="#fff" stroke="${INK}" stroke-width="7" paint-order="stroke" stroke-linejoin="round">${design.ruby}</text>
  </g>
</svg>`
}

/** 押した瞬間に広がる集中線。 */
export function burstSvg(): string {
  const cx = 130
  const cy = 90
  const lines = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2
    const inner = 70
    const outer = i % 2 ? 100 : 112
    const x = (r: number) => (cx + Math.cos(a) * r).toFixed(1)
    const y = (r: number) => (cy + Math.sin(a) * r * 0.75).toFixed(1)
    return `<line x1="${x(inner)}" y1="${y(inner)}" x2="${x(outer)}" y2="${y(outer)}"/>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 180" width="260" height="180"
    stroke="${INK}" stroke-width="7" stroke-linecap="round">${lines}</svg>`
}
