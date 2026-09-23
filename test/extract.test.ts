// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { extractPost } from '../src/content/extract'

const article = (html: string) => {
  const el = document.createElement('article')
  el.setAttribute('data-testid', 'tweet')
  el.innerHTML = html
  return el
}

describe('extractPost', () => {
  it('投稿IDと本文（絵文字の alt を含む）を取り出す', () => {
    const el = article(`
      <a href="/someone/status/1234567890"><time datetime="2026-09-23T00:00:00Z">1時間</time></a>
      <div data-testid="tweetText"><span>このAIヤバすぎる</span><img alt="🔥"><span>絶対見て</span></div>`)
    expect(extractPost(el)).toEqual({ id: '1234567890', text: 'このAIヤバすぎる🔥絶対見て' })
  })

  it('引用ポストがあっても本体の本文を使う', () => {
    const el = article(`
      <a href="/a/status/1"><time>1h</time></a>
      <div data-testid="tweetText">本体</div>
      <div><a href="/b/status/2"><time>2h</time></a><div data-testid="tweetText">引用元</div></div>`)
    expect(extractPost(el)).toEqual({ id: '1', text: '本体' })
  })

  it('時刻リンクのない広告は対象外', () => {
    expect(extractPost(article('<div data-testid="tweetText">広告です</div>'))).toBeNull()
  })

  it('本文のない投稿は対象外', () => {
    expect(extractPost(article('<a href="/a/status/1"><time>1h</time></a>'))).toBeNull()
  })
})
