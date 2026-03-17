import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import fs from 'fs'
import Anthropic from '@anthropic-ai/sdk'
import { parseFile } from './server/fileParser.js'
import path from 'path'
import { fileURLToPath } from 'url'
import RULE_SETS from './src/ruleSets.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')))
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
})

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-opus-4-6'

app.get('/api/model', (_req, res) => {
  res.json({ model: MODEL })
})

const slideCache = new Map()

async function getSlideContent(ruleSetId) {
  if (slideCache.has(ruleSetId)) return slideCache.get(ruleSetId)

  const ruleSet = RULE_SETS.find(r => r.id === ruleSetId)
  if (!ruleSet) return null

  const filePath = path.join(__dirname, 'src', 'slides', ruleSet.file)
  const buffer = fs.readFileSync(filePath)
  const text = await parseFile(buffer, ruleSet.file, 'application/pdf')
  slideCache.set(ruleSetId, text)
  return text
}

app.get('/api/slides', (_req, res) => {
  res.json(RULE_SETS.map(({ id, label }) => ({ id, label })))
})

app.get('/api/slides/:id', async (req, res) => {
  const ruleSet = RULE_SETS.find(r => r.id === req.params.id)
  if (!ruleSet) return res.status(404).json({ error: 'Rule set not found' })

  try {
    const content = await getSlideContent(ruleSet.id)
    res.json({ id: ruleSet.id, label: ruleSet.label, content })
  } catch (err) {
    console.error(`Failed to parse slide ${ruleSet.file}:`, err)
    res.status(500).json({ error: `Failed to parse slides: ${err.message}` })
  }
})

const BASE_SYSTEM_PROMPT = `You are an expert Bluebook citation tutor. You help law students learn proper legal citation formatting according to The Bluebook: A Uniform System of Citation.

CRITICAL: When you write citations or formatted text, you MUST use HTML tags to indicate formatting:
- Use <i>text</i> for italics (case names, book titles, signals, etc.)
- Use <sc>text</sc> for SMALL CAPS (authors of law review articles, institutional authors, periodical names in some contexts, etc.)
- Use <b>text</b> for bold when needed
- Use <u>text</u> for underline when needed

The user's messages may also contain these HTML tags to indicate their formatting. Pay attention to whether they used the correct formatting.

For example:
- A case citation: <i>Brown v. Board of Education</i>, 347 U.S. 483 (1954).
- A law review article: <sc>John Smith</sc>, <i>Article Title</i>, 100 <sc>Harv. L. Rev.</sc> 1 (1987).
- A book: <sc>Author Name</sc>, <sc>Book Title</sc> 45 (2d ed. 2020).

When correcting citations, clearly explain what formatting should be used and why according to Bluebook rules. Always show the corrected citation with proper HTML formatting tags.

When the user uploads a document, analyze any citations in it for Bluebook compliance and provide feedback.`

async function buildSystemPrompt(ruleSetId) {
  if (!ruleSetId) return BASE_SYSTEM_PROMPT

  try {
    const content = await getSlideContent(ruleSetId)
    if (!content) return BASE_SYSTEM_PROMPT

    const ruleSet = RULE_SETS.find(r => r.id === ruleSetId)
    return BASE_SYSTEM_PROMPT +
      `\n\n--- BLUEBOOK RULES REFERENCE (${ruleSet.label}) ---\n` +
      `Below are the training slides for ${ruleSet.label}. Use this as your authoritative reference when answering questions and evaluating citations:\n\n${content}`
  } catch (err) {
    console.error('Failed to load rule set for system prompt:', err.message)
    return BASE_SYSTEM_PROMPT
  }
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, ruleSetId } = req.body

    const systemPrompt = await buildSystemPrompt(ruleSetId)

    const apiMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }))

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      cache_control: { type: 'ephemeral' },
      system: systemPrompt,
      messages: apiMessages,
      temperature: 0.3,
    })

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ content: text })}\n\n`)
    })

    stream.on('error', (error) => {
      console.error('Stream error:', error)
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
    })

    stream.on('end', () => {
      res.write('data: [DONE]\n\n')
      res.end()
    })
  } catch (error) {
    console.error('Chat error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: error.message })
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
      res.end()
    }
  }
})

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { originalname, buffer, mimetype } = req.file
    const text = await parseFile(buffer, originalname, mimetype)

    res.json({
      filename: originalname,
      text: text.slice(0, 50000),
      truncated: text.length > 50000,
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: `Failed to parse file: ${error.message}` })
  }
})

if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
