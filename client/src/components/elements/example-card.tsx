import { useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'

export interface ElementExample { id: string; title: string; description: string; section: string; wide?: boolean; Preview: ComponentType; source: string }

function HighlightedCode({ source }: { source: string }) {
  const tokens = source.split(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:import|from|export|default|function|return|const|let|if|else|async|await|type|true|false|null|undefined|new|as)\b|\b\d+(?:\.\d+)?\b|\b[A-Z][A-Za-z0-9_]*\b)/g)
  return <>{tokens.map((token, index) => {
    const kind = /^\/[/*]/.test(token) ? 'comment' : /^["'`]/.test(token) ? 'string' : /^(import|from|export|default|function|return|const|let|if|else|async|await|type|true|false|null|undefined|new|as)$/.test(token) ? 'keyword' : /^\d/.test(token) ? 'number' : /^[A-Z]\w*$/.test(token) ? 'type' : ''
    return kind ? <span key={index} className={'element-token-' + kind}>{token}</span> : token
  })}</>
}
async function copyText(source: string) {
  try { if (navigator.clipboard) { await navigator.clipboard.writeText(source); return } } catch { /* Try the selection-based fallback. */ }
  const area = document.createElement('textarea')
  const focused = document.activeElement as HTMLElement | null
  area.value = source
  area.style.cssText = 'position:fixed;left:-9999px;top:0'
  document.body.appendChild(area)
  try { area.select(); if (!document.execCommand('copy')) throw new Error('Copy unavailable') }
  finally { area.remove(); focused?.focus() }
}
export function ExampleCard({ example }: { example: ElementExample }) {
  const [open, setOpen] = useState(false), [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const titleId = 'element-' + example.id + '-title', codeId = 'element-' + example.id + '-code'
  const Preview = example.Preview
  return <article className={`element-example${example.wide ? ' element-example-wide' : ''}`} aria-labelledby={titleId} data-example={example.id}>
    <header className="element-example-heading"><div><h3 id={titleId}>{example.title}</h3><p>{example.description}</p></div><button className="element-code-toggle" type="button" aria-expanded={open} aria-controls={codeId} onClick={() => setOpen(!open)}><span aria-hidden="true">{'</>'}</span>{open ? 'Hide code' : 'Show code'}</button></header>
    <div className="element-preview" aria-label={example.title + ' preview'}><Preview /></div>
    <div className="element-code" id={codeId} hidden={!open}>
      {open && <><div className="element-code-toolbar"><span>React · TypeScript</span><button type="button" onClick={async () => {
        clearTimeout(timer.current)
        try { await copyText(example.source); setCopyState('copied') } catch { setCopyState('error') }
        timer.current = setTimeout(() => setCopyState('idle'), 2500)
      }}>{copyState === 'copied' ? 'Copied' : 'Copy code'}</button></div><pre tabIndex={0} aria-label={example.title + ' source code'}><code><HighlightedCode source={example.source} /></code></pre><span className={copyState === 'error' ? 'element-copy-error' : 'tl-sr-only'} role="status">{copyState === 'copied' ? 'Code copied to clipboard.' : copyState === 'error' ? 'Unable to copy. Select the code and copy it manually.' : ''}</span></>}
    </div>
  </article>
}
