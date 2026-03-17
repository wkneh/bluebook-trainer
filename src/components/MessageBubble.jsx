import React from 'react'
import { llmToDisplayHtml } from '../utils/formatting.js'

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="message message-user">
        <div className="message-label">You</div>
        <div
          className="message-content"
          dangerouslySetInnerHTML={{ __html: message.displayHtml }}
        />
        {message.file && (
          <div className="message-file">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {message.file}
          </div>
        )}
      </div>
    )
  }

  const html = llmToDisplayHtml(message.content)

  return (
    <div className="message message-assistant">
      <div className="message-label">Bluebook Tutor</div>
      <div
        className="message-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
