import mammoth from 'mammoth'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import { parseOfficeAsync } from 'officeparser'

export async function parseFile(buffer, filename, mimetype) {
  const ext = filename.split('.').pop().toLowerCase()

  switch (ext) {
    case 'docx':
      return parseDocx(buffer)
    case 'doc':
      return parseDoc(buffer)
    case 'pdf':
      return parsePdf(buffer)
    case 'pptx':
    case 'ppt':
      return parsePptx(buffer)
    case 'txt':
    case 'md':
      return buffer.toString('utf-8')
    case 'rtf':
      return parseRtf(buffer)
    default:
      throw new Error(`Unsupported file type: .${ext}`)
  }
}

async function parseDocx(buffer) {
  const result = await mammoth.convertToHtml({ buffer })
  return cleanHtml(result.value)
}

async function parseDoc(buffer) {
  const text = await parseOfficeAsync(buffer, { outputAs: 'text' })
  return text
}

async function parsePdf(buffer) {
  const data = await pdf(buffer)
  return data.text
}

async function parsePptx(buffer) {
  const text = await parseOfficeAsync(buffer, { outputAs: 'text' })
  return text
}

async function parseRtf(buffer) {
  const text = await parseOfficeAsync(buffer, { outputAs: 'text' })
  return text
}

function cleanHtml(html) {
  return html
    .replace(/<(?!\/?(i|b|u|em|strong|sup|sub)[ >])[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/<em>/g, '<i>')
    .replace(/<\/em>/g, '</i>')
    .replace(/<strong>/g, '<b>')
    .replace(/<\/strong>/g, '</b>')
    .trim()
}
