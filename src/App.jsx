import React from 'react'
import Chat from './components/Chat.jsx'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Bluebook Trainer</h1>
        <span className="header-sub">Citation Practice with Rich Formatting</span>
      </header>
      <main className="app-main">
        <Chat />
      </main>
    </div>
  )
}
