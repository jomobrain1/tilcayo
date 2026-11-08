import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Marked } from 'marked';
import { createHighlighter } from 'shiki';

const root = fileURLToPath(new URL('../', import.meta.url));
const [markdown, css, script] = await Promise.all([
  readFile(path.join(root, 'README.md'), 'utf8'),
  readFile(path.join(root, 'docs/readme.css'), 'utf8'),
  readFile(path.join(root, 'docs/readme.js'), 'utf8'),
]);
const highlighter = await createHighlighter({
  themes: ['dark-plus'],
  langs: ['bash', 'powershell', 'ini', 'typescript'],
});
const snippets = [];
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const labels = { bash: 'Bash', powershell: 'PowerShell', ini: 'Configuration', typescript: 'TypeScript', text: 'Text' };
const marked = new Marked({
  gfm: true,
  renderer: {
    heading({ tokens, text, depth }) {
      const id = text.toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, '').replaceAll(' ', '-');
      return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
    },
    code({ text, lang = 'text' }) {
      const language = Object.hasOwn(labels, lang) ? lang : 'text';
      const name = labels[language];
      const index = snippets.push(text) - 1;
      const highlighted = highlighter.codeToHtml(text, {
        lang: language,
        theme: 'dark-plus',
        transformers: language === 'typescript' ? [{
          name: 'editor-brackets',
          tokens(lines) {
            for (const line of lines) for (const token of line) {
              if (/^[{}\[\]]+$/.test(token.content.trim())) token.color = '#FFD700';
            }
          },
        }] : [],
      });
      return `<section class="code-panel" aria-label="${escape(name)} code block">
<button type="button" class="copy-code" data-code-index="${index}" aria-label="Copy code"><svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M12 4V3H3v9h1"/></svg><span>Copy</span></button>
${highlighted}
</section>\n`;
    },
  },
});
try {
  const body = marked.parse(markdown.replaceAll('\r\n', '\n').replace(/<!-- styled-readme-link:start -->[\s\S]*?<!-- styled-readme-link:end -->\n?/, ''));
  const data = JSON.stringify(snippets).replaceAll('<', '\\u003c');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>Tilcayo · README</title><style>${css}</style></head>
<body><header class="reader-toolbar"><a href="README.md">README.md</a><span>VS Code Dark+</span></header><main>${body}</main><p id="copy-status" class="sr-only" role="status" aria-live="polite"></p><script type="application/json" id="readme-snippets">${data}</script><script>${script}</script></body></html>\n`;
  await writeFile(path.join(root, 'README.html'), html);
  console.log(`Built README.html with ${snippets.length} Dark+ code panels and independent Copy buttons.`);
} finally {
  highlighter.dispose();
}
