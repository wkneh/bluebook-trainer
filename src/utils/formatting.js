/**
 * Convert TipTap HTML output to the annotated format the LLM understands.
 * TipTap outputs <em>, <strong>, <u>, <span class="small-caps">.
 * We convert to <i>, <b>, <u>, <sc> for the LLM.
 */
export function editorHtmlToLlm(html) {
  return html
    .replace(/<em>/g, '<i>')
    .replace(/<\/em>/g, '</i>')
    .replace(/<strong>/g, '<b>')
    .replace(/<\/strong>/g, '</b>')
    .replace(/<span class="small-caps">(.*?)<\/span>/g, '<sc>$1</sc>')
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .trim()
}

/**
 * Convert LLM response text into safe display HTML.
 * The LLM outputs raw <i>, <b>, <u>, <sc> tags inside plain text.
 * We need to preserve those while escaping everything else.
 *
 * Strategy: extract formatting tags as placeholders before escaping,
 * then restore them after. This is streaming-safe because incomplete
 * tags just stay as escaped text until the next render completes them.
 */
export function llmToDisplayHtml(text) {
  const placeholders = []
  let idx = 0

  // Pull out our known formatting tags and replace with placeholders
  const TAGS = /(<\/?(?:i|b|u|em|strong|sup|sub|fix)>|<sc>|<\/sc>)/gi
  let safe = text.replace(TAGS, (match) => {
    const key = `\x00${idx++}\x00`
    let replacement
    const lower = match.toLowerCase()
    if (lower === '<em>') replacement = '<i>'
    else if (lower === '</em>') replacement = '</i>'
    else if (lower === '<strong>') replacement = '<b>'
    else if (lower === '</strong>') replacement = '</b>'
    else if (lower === '<sc>') replacement = '<span class="small-caps">'
    else if (lower === '</sc>') replacement = '</span>'
    else if (lower === '<fix>') replacement = '<div class="fix-citation">'
    else if (lower === '</fix>') replacement = '</div>'
    else replacement = match
    placeholders.push({ key, replacement })
    return key
  })

  // Escape everything that remains
  safe = safe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  // Restore our formatting tags
  for (const { key, replacement } of placeholders) {
    safe = safe.replace(key, replacement)
  }

  // Markdown block-level elements (must run before newline→<br> conversion)
  // Headings: ### text
  safe = safe.replace(/^(#{1,6})\s+(.+)$/gm, (_match, hashes, content) => {
    const level = hashes.length
    return `<h${level}>${content}</h${level}>`
  })

  // Unordered lists: - item or * item
  safe = safe.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>')

  // Ordered lists: 1. item
  safe = safe.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')

  // Wrap consecutive <li> runs in <ul>
  safe = safe.replace(/((?:<li>.*?<\/li>\n?)+)/g, '<ul>$1</ul>')

  // Inline code: `code`
  safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Markdown inline: **bold** and *italic*
  safe = safe.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  safe = safe.replace(/\*(.+?)\*/g, '<i>$1</i>')

  // Horizontal rules
  safe = safe.replace(/^---+$/gm, '<hr>')

  // Newlines to <br> (but not after block elements)
  safe = safe.replace(/\n/g, '<br>')
  safe = safe.replace(/(<\/h[1-6]>)<br>/g, '$1')
  safe = safe.replace(/(<\/ul>)<br>/g, '$1')
  safe = safe.replace(/(<\/li>)<br>/g, '$1')
  safe = safe.replace(/(<hr>)<br>/g, '$1')

  return safe
}

export function extractFixCitation(text) {
  const match = text.match(/<fix>([\s\S]*?)<\/fix>/i)
  if (!match) return null
  return match[1].trim()
}

export function llmToEditorHtml(llmText) {
  return llmText
    .replace(/<i>/gi, '<em>')
    .replace(/<\/i>/gi, '</em>')
    .replace(/<b>/gi, '<strong>')
    .replace(/<\/b>/gi, '</strong>')
    .replace(/<sc>(.*?)<\/sc>/gi, '<span class="small-caps">$1</span>')
    .replace(/\n/g, '')
}

export function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '').trim()
}
