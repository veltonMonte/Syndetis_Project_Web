import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { inlineText, parseInline, parseMarkdown, safeHref } from '../src/lib/legal-markdown.ts'
import { LEGAL_SLUGS, LEGAL_VERSIONS } from '../src/lib/legal-versions.ts'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const documents = LEGAL_SLUGS.map(slug => ({ slug, source: read(`../src/legal/${slug}.md`) }))

test('o Markdown dos textos legais vira blocos, sem HTML', () => {
  const blocks = parseMarkdown([
    '# Título',
    '',
    '> **Rascunho.** Revisar.',
    '',
    '## 1. Seção',
    '',
    'Um parágrafo com [link](#/legal/privacidade) e `SESSION`,',
    'que continua na linha de baixo. Veja https://www.gov.br/anpd.',
    '',
    '1. primeiro',
    '2. segundo',
    '',
    '- item',
    '',
    '| Dados | Para quê |',
    '| --- | --- |',
    '| Nome | Conta |',
    '<script>alert(1)</script>',
  ].join('\n'))
  assert.deepEqual(blocks.map(block => block.type), ['heading', 'quote', 'heading', 'paragraph', 'list', 'list', 'table', 'paragraph'])
  const paragraph = blocks[3]
  assert.equal(paragraph.type, 'paragraph')
  if (paragraph.type === 'paragraph') {
    assert.equal(inlineText(paragraph.children), 'Um parágrafo com link e SESSION, que continua na linha de baixo. Veja https://www.gov.br/anpd.')
    const links = paragraph.children.filter(child => child.type === 'link')
    assert.deepEqual(links.map(link => link.type === 'link' && link.href), ['#/legal/privacidade', 'https://www.gov.br/anpd'])
  }
  const table = blocks[6]
  assert.equal(table.type === 'table' && table.rows.length, 1)
  // Raw HTML is only text: React escapes it.
  const last = blocks[7]
  assert.equal(last.type === 'paragraph' && inlineText(last.children), '<script>alert(1)</script>')
})

test('só links do próprio app e https viram link', () => {
  assert.equal(safeHref('#/legal/cookies'), '#/legal/cookies')
  assert.equal(safeHref('https://syndetis.online'), 'https://syndetis.online')
  assert.equal(safeHref('javascript:alert(1)'), null)
  assert.equal(safeHref('http://example.com'), null)
  const inline = parseInline('[clique](javascript:alert(1))')
  assert.ok(inline.every(child => child.type === 'text'))
})

test('cada texto tem título, versão em vigor e o aviso de rascunho', () => {
  for (const { slug, source } of documents) {
    assert.match(source, /^# \S/, `${slug}: começa com o título`)
    assert.ok(source.includes(`Versão ${LEGAL_VERSIONS.termsVersion}`), `${slug}: mostra a versão em vigor`)
    assert.match(source, /Rascunho para revisão jurídica/, `${slug}: avisa que é rascunho`)
  }
})

test('os links entre os textos levam a páginas que existem', () => {
  for (const { slug, source } of documents) {
    for (const [, target] of source.matchAll(/\(#\/legal\/([a-z-]+)\)/g)) {
      assert.ok((LEGAL_SLUGS as readonly string[]).includes(target), `${slug}: #/legal/${target} não existe`)
    }
  }
})

test('o auth-service aceita exatamente as versões que o app mostra', () => {
  const properties = read('../../services/auth-service/src/main/resources/application.properties')
  assert.match(properties, new RegExp(`^auth\\.legal\\.terms-version=${LEGAL_VERSIONS.termsVersion}$`, 'm'))
  assert.match(properties, new RegExp(`^auth\\.legal\\.privacy-version=${LEGAL_VERSIONS.privacyVersion}$`, 'm'))
})
