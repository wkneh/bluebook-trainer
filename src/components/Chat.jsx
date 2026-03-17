import React, { useState, useRef, useEffect, useCallback } from 'react'
import MessageBubble from './MessageBubble.jsx'
import RichTextInput from './RichTextInput.jsx'
import FileUpload from './FileUpload.jsx'
import { editorHtmlToLlm } from '../utils/formatting.js'

export default function Chat({ initialMessages, restoredMessages, ruleSetId, loading: externalLoading, onMessagesChange }) {
  const [messages, setMessages] = useState(restoredMessages ?? [])
  const [streaming, setStreaming] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const bottomRef = useRef(null)
  const messagesAreaRef = useRef(null)
  const isNearBottomRef = useRef(true)
  const abortRef = useRef(null)
  const didAutoSend = useRef(false)

  useEffect(() => {
    const el = messagesAreaRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (atBottom || isNearBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    const el = messagesAreaRef.current
    if (!el) return
    const onScroll = () => {
      isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!streaming && messages.length > 0 && onMessagesChange) {
      onMessagesChange(messages, ruleSetId)
    }
  }, [messages, streaming, ruleSetId, onMessagesChange])

  const sendToApi = useCallback(async (allMessages) => {
    setStreaming(true)

    const assistantMsg = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const apiMessages = allMessages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, ruleSetId }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Request failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + parsed.content,
                }
                return updated
              })
            }
            if (parsed.error) {
              throw new Error(parsed.error)
            }
          } catch (e) {
            if (e.message !== 'Unexpected end of JSON input') {
              console.error('Parse error:', e)
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // Stopped by user
      } else {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `Error: ${err.message}. Please check your API key and try again.`,
          }
          return updated
        })
      }
    } finally {
      abortRef.current = null
      setStreaming(false)
    }
  }, [ruleSetId])

  useEffect(() => {
    if (!initialMessages || didAutoSend.current) return
    didAutoSend.current = true

    const userMsgs = initialMessages.map(m => ({
      role: m.role,
      content: m.content,
      displayHtml: m.displayHtml,
    }))

    setMessages(userMsgs)
    sendToApi(userMsgs)
  }, [initialMessages, sendToApi])

  const handleFileProcessed = useCallback((fileData) => {
    setPendingFile(fileData)
  }, [])

  const clearFile = useCallback(() => {
    setPendingFile(null)
  }, [])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const handleSubmit = useCallback(async (editorHtml) => {
    const llmContent = editorHtmlToLlm(editorHtml)

    let fullContent = llmContent
    let fileName = null

    if (pendingFile) {
      fileName = pendingFile.filename
      fullContent = `[Uploaded file: ${pendingFile.filename}]\n\nFile contents:\n${pendingFile.text}\n\n${llmContent}`
      setPendingFile(null)
    }

    const userDisplayHtml = editorHtml
      .replace(/<p>/g, '')
      .replace(/<\/p>/g, '<br>')
      .replace(/<br>$/, '')

    const userMsg = {
      role: 'user',
      content: fullContent,
      displayHtml: userDisplayHtml,
      file: fileName,
    }

    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    sendToApi(newMessages)
  }, [messages, pendingFile, sendToApi])

  return (
    <div className="chat-container">
      <div className="messages-area" ref={messagesAreaRef}>
        {messages.length === 0 && !externalLoading && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <h2>Bluebook Citation Trainer</h2>
            <p>Select a rule set from the sidebar to study or quiz yourself, or type a question below.</p>
            <p className="empty-hint">Use the toolbar to apply <i>italics</i>, <span className="small-caps">Small Caps</span>, <b>bold</b>, and <u>underline</u>.</p>
            <div className="shortcuts-grid">
              <div className="shortcut">
                <kbd>⌘B</kbd> Bold
              </div>
              <div className="shortcut">
                <kbd>⌘I</kbd> Italic
              </div>
              <div className="shortcut">
                <kbd>⌘U</kbd> Underline
              </div>
              <div className="shortcut">
                <kbd>⌘⇧S</kbd> Small Caps
              </div>
            </div>
          </div>
        )}
        {externalLoading && messages.length === 0 && (
          <div className="empty-state">
            <div className="loading-slides">
              <span className="upload-spinner" />
              <p>Loading slides...</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {streaming && (
          <div className="typing-indicator">
            <span /><span /><span />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="input-area">
        {pendingFile && (
          <div className="pending-file">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>{pendingFile.filename}</span>
            <button onClick={clearFile} className="remove-file" title="Remove file">×</button>
          </div>
        )}
        {streaming && (
          <button className="stop-btn" onClick={handleStop}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
            Stop generating
          </button>
        )}
        <div className="input-row">
          <FileUpload onFileProcessed={handleFileProcessed} disabled={streaming} />
          <RichTextInput onSubmit={handleSubmit} disabled={streaming} />
        </div>
      </div>
    </div>
  )
}
