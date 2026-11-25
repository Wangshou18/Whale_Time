import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: true })

export function renderMarkdown(content: string): string {
  if (!content.trim()) return ''
  const raw = marked.parse(content, { async: false }) as string
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button'],
  })
}

export function stripMarkdown(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, ' [代码块] ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' [图片] ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function excerpt(content: string, length = 90): string {
  const text = stripMarkdown(content)
  if (text.length <= length) return text
  return `${text.slice(0, length)}…`
}
