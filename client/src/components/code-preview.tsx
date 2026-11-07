import { useId, useState } from 'react'

const examples = {
  route: [
    "import { defineRoutes } from '@tilcayo/core'",
    "import { z } from 'zod'",
    '',
    'const query = z.object({',
    "  name: z.string().default('Tilcayo'),",
    '})',
    '',
    'export default defineRoutes(router => {',
    "  router.get('/api/hello', ctx =>",
    '    ctx.response.success({',
    '      message: `Hello, ${ctx.query.name}!`,',
    '    }), { validate: { query } })',
    '})',
  ],
  types: [
    'export interface GreetingQuery {',
    '  name?: string',
    '}',
    '',
    'export interface GreetingResponse {',
    '  success: true',
    '  message: string',
    '  data: {',
    '    message: string',
    '  }',
    '}',
  ],
}
function Highlight({ line }: { line: string }) {
  return <>{line.split(/('[^']*'|`[^`]*`|\b(?:import|from|const|export|default|return|interface|type|string|number|true)\b|\b(?:defineRoutes|object|success)\b)/g).map((token, index) => {
    const color = /^['`]/.test(token) ? 'string' : /^(import|from|const|export|default|return|interface|type)$/.test(token) ? 'keyword' : /^(string|number|true)$/.test(token) ? 'type' : /^(defineRoutes|object|success)$/.test(token) ? 'function' : undefined
    return <span key={index} className={color ? 'code-' + color : undefined}>{token}</span>
  })}</>
}
export function CodePreview() {
  const [tab, setTab] = useState<'route' | 'types'>('route')
  const id = useId()
  return <section className="starter-code-editor" aria-label="Tilcayo TypeScript code preview">
    <div className="code-titlebar" aria-hidden="true"><i /><i /><i /><span>tilcayo-app</span></div>
    <div className="code-workspace">
      <div className="code-activity" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M7 2h9l4 4v16H7ZM3 6v13m10-17v6h7" /></svg>
        <svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6" /></svg>
        <svg viewBox="0 0 24 24"><circle cx="6" cy="4" r="2" /><circle cx="6" cy="20" r="2" /><circle cx="18" cy="6" r="2" /><path d="M6 6v12m0-6c8 0 12-1 12-4" /></svg>
        <svg viewBox="0 0 24 24"><path d="M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z" /></svg>
      </div>
      <div className="code-explorer" aria-hidden="true">
        <strong><span>{'\u2304'}</span> tilcayo-app</strong>
        <div className="code-folder"><span className="code-chevron" /> <span>{'\u25b1'}</span> src</div>
        <div className="code-folder code-indent"><span className="code-chevron" /> <span>{'\u25b1'}</span> routes</div>
        <div className={'code-file code-indent-2' + (tab === 'route' ? ' selected' : '')}><small>TS</small> hello.routes.ts</div>
        <div className="code-file code-indent"><small>TS</small> app.ts</div>
        <div className={'code-file code-indent' + (tab === 'types' ? ' selected' : '')}><small>TS</small> types.ts</div>
        <div className="code-file"><small>{'{}'}</small> package.json</div>
      </div>
      <div className="code-main">
        <div className="code-tabs" role="tablist" aria-label="Code examples">
          {(['route', 'types'] as const).map(key => <button type="button" key={key} id={`${id}-${key}`} role="tab" aria-selected={tab === key} aria-controls={`${id}-panel`} tabIndex={tab === key ? 0 : -1} onClick={() => setTab(key)} onKeyDown={event => {
            if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return
            event.preventDefault()
            const next = event.key === 'Home' ? 'route' : event.key === 'End' ? 'types' : key === 'route' ? 'types' : 'route'
            setTab(next)
            event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[id="${id}-${next}"]`)?.focus()
          }}><small>TS</small>{key === 'route' ? 'hello.routes.ts' : 'types.ts'}<span aria-hidden="true">{'\u00d7'}</span></button>)}
        </div>
        <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${tab}`} tabIndex={0} className="code-content">
          <pre><code>{examples[tab].map((line, index) => <span className="code-line" key={index}><span className="code-number" aria-hidden="true">{index + 1}</span><span><Highlight line={line || ' '} /></span>{'\n'}</span>)}</code></pre>
        </div>
      </div>
    </div>
  </section>
}
