import React, { useCallback, useRef, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import SmallCaps from '../utils/smallCaps.js'

const TOOLBAR_BUTTONS = [
  { id: 'bold', label: 'B', mark: 'bold', title: 'Bold (⌘B)', style: { fontWeight: 700 } },
  { id: 'italic', label: 'I', mark: 'italic', title: 'Italic (⌘I)', style: { fontStyle: 'italic' } },
  { id: 'underline', label: 'U', mark: 'underline', title: 'Underline (⌘U)', style: { textDecoration: 'underline' } },
  { id: 'smallCaps', label: 'Sc', mark: 'smallCaps', title: 'Small Caps (⌘⇧S)', style: { fontVariant: 'small-caps', fontSize: '0.85em', fontWeight: 600 } },
]

export default function RichTextInput({ onSubmit, disabled }) {
  const submitRef = useRef(null)

  const doSubmit = useCallback(() => {
    submitRef.current?.()
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        horizontalRule: false,
      }),
      Underline,
      SmallCaps,
      Placeholder.configure({
        placeholder: 'Type a citation or ask about Bluebook rules...',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'rich-input-editor',
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          doSubmit()
          return true
        }
        return false
      },
    },
  })

  useEffect(() => {
    submitRef.current = () => {
      if (!editor || disabled) return
      const html = editor.getHTML()
      const text = editor.getText().trim()
      if (!text) return
      onSubmit(html)
      editor.commands.clearContent()
    }
  }, [editor, onSubmit, disabled])

  if (!editor) return null

  return (
    <div className="rich-input-container">
      <div className="rich-input-toolbar">
        {TOOLBAR_BUTTONS.map(btn => (
          <button
            key={btn.id}
            type="button"
            className={`toolbar-btn ${editor.isActive(btn.mark) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleMark(btn.mark).run()}
            title={btn.title}
            style={btn.style}
          >
            {btn.label}
          </button>
        ))}
        <div className="toolbar-hint">
          Shift+Enter for newline
        </div>
      </div>
      <div className="rich-input-editor-wrap">
        <EditorContent editor={editor} />
        <button
          type="button"
          className="send-btn"
          onClick={doSubmit}
          disabled={disabled || !editor.getText().trim()}
          title="Send message"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
