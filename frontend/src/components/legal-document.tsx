import { Fragment, type ReactNode } from 'react'
import { Table } from '@/components/echo/table'
import { inlineText, parseMarkdown, type Block, type Inline } from '@/lib/legal-markdown'

function InlineContent({ children }: { children: Inline[] }) {
  return (
    <>
      {children.map((child, index) => {
        if (child.type === 'text') return <Fragment key={index}>{child.text}</Fragment>
        if (child.type === 'code') return <code key={index}>{child.text}</code>
        if (child.type === 'strong') return <strong key={index}><InlineContent>{child.children}</InlineContent></strong>
        const external = child.href.startsWith('https://')
        return (
          <a key={index} href={child.href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            <InlineContent>{child.children}</InlineContent>
          </a>
        )
      })}
    </>
  )
}

/** Renders one legal text from src/legal. Tables are named after the heading above them. */
export function LegalDocumentBody({ source }: { source: string }) {
  const blocks = parseMarkdown(source)
  let section = ''
  const rendered: ReactNode[] = []
  blocks.forEach((block: Block, index) => {
    if (block.type === 'heading') {
      section = inlineText(block.children)
      // The page title is drawn by the page; the text's own # line is skipped.
      if (block.level === 1) return
      const Heading = block.level === 2 ? 'h2' : 'h3'
      rendered.push(<Heading key={index}><InlineContent>{block.children}</InlineContent></Heading>)
    } else if (block.type === 'paragraph') {
      rendered.push(<p key={index}><InlineContent>{block.children}</InlineContent></p>)
    } else if (block.type === 'list') {
      const List = block.ordered ? 'ol' : 'ul'
      rendered.push(
        <List key={index}>
          {block.items.map((item, itemIndex) => <li key={itemIndex}><InlineContent>{item}</InlineContent></li>)}
        </List>,
      )
    } else if (block.type === 'quote') {
      rendered.push(
        <aside key={index} className="legal-callout">
          {block.paragraphs.map((paragraph, paragraphIndex) => (
            <p key={paragraphIndex}><InlineContent>{paragraph}</InlineContent></p>
          ))}
        </aside>,
      )
    } else {
      rendered.push(
        <Table key={index} caption={section || 'Tabela'} hideCaption>
          <Table.Head>
            <Table.Row>
              {block.header.map((cell, cellIndex) => (
                <Table.HeaderCell key={cellIndex}><InlineContent>{cell}</InlineContent></Table.HeaderCell>
              ))}
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {block.rows.map((row, rowIndex) => (
              <Table.Row key={rowIndex}>
                {row.map((cell, cellIndex) => cellIndex === 0
                  ? <Table.HeaderCell key={cellIndex} scope="row"><InlineContent>{cell}</InlineContent></Table.HeaderCell>
                  : <Table.Cell key={cellIndex}><InlineContent>{cell}</InlineContent></Table.Cell>)}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>,
      )
    }
  })
  return <div className="legal-body">{rendered}</div>
}

