import React, { useState, useCallback, useEffect } from 'react'
import Chat from './components/Chat.jsx'
import Sidebar from './components/Sidebar.jsx'
import RULE_SETS from './ruleSets.js'

const QUIZ_PROMPT = (label) =>
  `Please quiz me interactively on ${label}. Follow these instructions exactly:\n` +
  `1. Present me with ONE citation at a time that contains MULTIPLE errors (typically 2-4) related to ${label}.\n` +
  `2. DO NOT copy citations directly from the slides. Instead, carefully construct original, realistic citations that test the same rules and patterns covered in the training material. Use different case names, authors, titles, volumes, and dates.\n` +
  `3. IMPORTANT: Always wrap the citation I need to fix in <fix>...</fix> tags. For example: <fix><i>Smith v. Jones</i> 500 U.S. 100 (2000).</fix>\n` +
  `4. Briefly indicate how many errors the citation contains so I know what to look for.\n` +
  `5. Wait for me to identify and fix the errors before giving feedback.\n` +
  `6. After I respond, tell me which corrections I got right, which I missed, explain the relevant Bluebook rules, and show the fully corrected citation with proper formatting.\n` +
  `7. Then present the next question (again wrapped in <fix> tags).\n` +
  `8. Keep going until I say stop.\n\n` +
  `Start now with the first question.`

const STUDY_PROMPT = (label) =>
  `I'd like to study ${label}. Please give me a clear summary of the key rules and formatting requirements from the training slides, with examples.`

function loadSession() {
  try {
    const raw = localStorage.getItem('bb-session')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSession(data) {
  try { localStorage.setItem('bb-session', JSON.stringify(data)) } catch {}
}

export default function App() {
  const saved = loadSession()
  const [modelName, setModelName] = useState('')
  const [activeRuleSet, setActiveRuleSet] = useState(saved?.activeRuleSet ?? null)

  useEffect(() => {
    fetch('/api/model').then(r => r.json()).then(d => setModelName(d.model)).catch(() => {})
  }, [])
  const [loading, setLoading] = useState(false)
  const [chatKey, setChatKey] = useState(0)
  const [initialMessages, setInitialMessages] = useState(null)
  const [chatRuleSetId, setChatRuleSetId] = useState(saved?.ruleSetId ?? null)
  const [restoredMessages, setRestoredMessages] = useState(saved?.messages ?? null)

  const handleMessagesChange = useCallback((msgs, rsId) => {
    saveSession({ messages: msgs, ruleSetId: rsId, activeRuleSet: rsId })
  }, [])

  const startSession = useCallback((ruleSetId, mode) => {
    const ruleSet = RULE_SETS.find(r => r.id === ruleSetId)
    const prompt = mode === 'quiz'
      ? QUIZ_PROMPT(ruleSet.label)
      : STUDY_PROMPT(ruleSet.label)

    setActiveRuleSet(ruleSetId)
    setChatRuleSetId(ruleSetId)
    setRestoredMessages(null)
    setInitialMessages([{
      role: 'user',
      content: prompt,
      displayHtml: mode === 'quiz'
        ? `<b>Quiz me:</b> ${ruleSet.label}`
        : `<b>Study:</b> ${ruleSet.label}`,
    }])
    setChatKey(k => k + 1)
  }, [])

  const handleSelectRuleSet = useCallback((ruleSetId) => {
    if (ruleSetId === null) {
      setActiveRuleSet(null)
      setChatRuleSetId(null)
      setRestoredMessages(null)
      setInitialMessages(null)
      saveSession(null)
      setChatKey(k => k + 1)
      return
    }
    startSession(ruleSetId, 'study')
  }, [startSession])

  const handleQuiz = useCallback((ruleSetId) => {
    startSession(ruleSetId, 'quiz')
  }, [startSession])

  return (
    <div className="app">
      <Sidebar
        activeRuleSet={activeRuleSet}
        onSelectRuleSet={handleSelectRuleSet}
        onQuiz={handleQuiz}
        loading={loading}
      />
      <div className="app-body">
        <header className="app-header">
          <h1>Bluebook Trainer</h1>
          <span className="header-sub">Citation Practice with Rich Formatting</span>
          {modelName && <span className="header-model">{modelName}</span>}
        </header>
        <main className="app-main">
          <Chat
            key={chatKey}
            initialMessages={initialMessages}
            restoredMessages={restoredMessages}
            ruleSetId={chatRuleSetId}
            loading={loading}
            onMessagesChange={handleMessagesChange}
          />
        </main>
      </div>
    </div>
  )
}
