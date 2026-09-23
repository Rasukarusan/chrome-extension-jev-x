import type { Post } from '../shared/types'

export const TWEET_SELECTOR = 'article[data-testid="tweet"]'

/**
 * X の投稿 article から ID と本文を取り出す。
 * 投稿時刻のリンクを持たないもの（広告など）は判定対象外として null を返す。
 */
export function extractPost(article: Element): Post | null {
  const permalink = article.querySelector('a[href*="/status/"] time')?.closest('a')
  const id = permalink?.getAttribute('href')?.match(/\/status\/(\d+)/)?.[1]
  if (!id) return null

  // 引用ポストも tweetText を持つが、DOM 順で最初に現れるのが本体
  const textEl = article.querySelector('[data-testid="tweetText"]')
  const text = textEl ? readText(textEl).trim() : ''
  if (!text) return null

  return { id, text }
}

/** 絵文字は img[alt] で描画されるので alt も本文として拾う。 */
function readText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? ''
  if (node instanceof Element && node.tagName === 'IMG') return node.getAttribute('alt') ?? ''
  let out = ''
  node.childNodes.forEach((child) => (out += readText(child)))
  return out
}
