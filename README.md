# Bluebook Trainer

A chat-based Bluebook citation trainer with full rich-text formatting support (italics, small caps, bold, underline) and file upload capabilities.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Add your OpenAI API key to `.env`:
   ```
   OPENAI_API_KEY=sk-...
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173)

## Features

- **Rich text input** — Format your citations with italics, small caps, bold, and underline directly in the editor
- **Keyboard shortcuts** — ⌘B (bold), ⌘I (italic), ⌘U (underline), ⌘⇧S (small caps)
- **Rich text output** — The AI responds with properly formatted Bluebook citations
- **File upload** — Upload Word docs (.docx), PDFs, PowerPoint slides (.pptx), and plain text for citation review
- **Streaming responses** — Low-latency streaming from GPT-4o-mini
- **Bluebook-aware** — The AI understands and enforces Bluebook formatting rules

## File Types Supported

| Format | Extensions |
|--------|-----------|
| Word | .docx, .doc |
| PDF | .pdf |
| PowerPoint | .pptx, .ppt |
| Plain text | .txt, .md |
| Rich Text | .rtf |
