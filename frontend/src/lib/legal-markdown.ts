/**
 * The small Markdown the legal texts in src/legal are written in: headings (#, ##, ###), paragraphs, lists
 * (- and 1.), quotes (>), pipe tables, **bold**, `code`, [links](#/...) and bare https:// addresses.
 * It returns plain data that React renders, so no HTML from the text ever reaches the page.
 */
export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; children: Inline[] }

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; children: Inline[] }
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'list'; ordered: boolean; items: Inline[][] }
  | { type: 'quote'; paragraphs: Inline[][] }
  | { type: 'table'; header: Inline[][]; rows: Inline[][][] }

/** Only the app's own pages and https addresses become links; anything else stays text. */
export function safeHref(href: string): string | null {
  const value = href.trim()
  if (/^#\/[a-z0-9/_-]*$/i.test(value)) return value
  if (/^https:\/\/[^\s"'<>]+$/i.test(value)) return value
  return null
}

const INLINE = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|(https:\/\/[^\s<>()]+[^\s<>().,;:!?])/g

export function parseInline(source: string): Inline[] {
  const out: Inline[] = []
  let last = 0
  const push = (text: string) => {
    if (!text) return
    const previous = out[out.length - 1]
    if (previous?.type === 'text') previous.text += text
    else out.push({ type: 'text', text })
  }
  for (const match of source.matchAll(INLINE)) {
    push(source.slice(last, match.index))
    last = match.index + match[0].length
    const [, strong, code, label, href, bare] = match
    if (strong !== undefined) out.push({ type: 'strong', children: parseInline(strong) })
    else if (code !== undefined) out.push({ type: 'code', text: code })
    else if (label !== undefined) {
      const safe = safeHref(href)
      if (safe) out.push({ type: 'link', href: safe, children: parseInline(label) })
      else push(match[0])
    } else if (bare !== undefined) out.push({ type: 'link', href: bare, children: [{ type: 'text', text: bare }] })
  }
  push(source.slice(last))
  return out
}

const cells = (line: string) =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => parseInline(cell.trim()))
const isTableRule = (line: string) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line.trim())
const listItem = /^(\s*)(-|\d+\.)\s+(.*)$/

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length as 1 | 2 | 3, children: parseInline(heading[2].trim()) })
      i++
      continue
    }

    if (line.startsWith('>')) {
      const paragraphs: Inline[][] = []
      let current: string[] = []
      while (i < lines.length && lines[i].startsWith('>')) {
        const text = lines[i].replace(/^>\s?/, '')
        if (!text.trim()) { if (current.length) paragraphs.push(parseInline(current.join(' '))); current = [] }
        else current.push(text.trim())
        i++
      }
      if (current.length) paragraphs.push(parseInline(current.join(' ')))
      blocks.push({ type: 'quote', paragraphs })
      continue
    }

    if (line.trim().startsWith('|') && i + 1 < lines.length && isTableRule(lines[i + 1])) {
      const header = cells(line)
      const rows: Inline[][][] = []
      i += 2
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(cells(lines[i])); i++ }
      blocks.push({ type: 'table', header, rows })
      continue
    }

    const item = listItem.exec(line)
    if (item) {
      const ordered = item[2] !== '-'
      const items: string[] = []
      while (i < lines.length) {
        const next = listItem.exec(lines[i])
        if (next && (next[2] !== '-') === ordered) items.push(next[3].trim())
        else if (lines[i].trim() && !next && /^\s{2,}/.test(lines[i]) && items.length) items[items.length - 1] += ' ' + lines[i].trim()
        else break
        i++
      }
      blocks.push({ type: 'list', ordered, items: items.map(parseInline) })
      continue
    }

    const paragraph: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|>|\|)/.test(lines[i]) && !listItem.test(lines[i])) {
      paragraph.push(lines[i].trim())
      i++
    }
    blocks.push({ type: 'paragraph', children: parseInline(paragraph.join(' ')) })
  }
  return blocks
}

/** The words of some inline content, for titles and accessible names. */
export function inlineText(children: Inline[]): string {
  return children.map(child => (child.type === 'text' || child.type === 'code' ? child.text : inlineText(child.children))).join('')
}

/** A text's own title: its first # line. */
export function documentTitle(source: string): string {
  const heading = parseMarkdown(source).find(block => block.type === 'heading' && block.level === 1)
  return heading?.type === 'heading' ? inlineText(heading.children) : ''
}
