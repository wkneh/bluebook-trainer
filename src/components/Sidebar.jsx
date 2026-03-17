import React, { useState } from 'react'
import RULE_SETS from '../ruleSets.js'

export default function Sidebar({ activeRuleSet, onSelectRuleSet, onQuiz, loading }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && <h2>Rule Sets</h2>}
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed
              ? <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
              : <><polyline points="11 17 6 12 11 7"/><line x1="18" y1="12" x2="6" y2="12"/></>
            }
          </svg>
        </button>
      </div>

      {!collapsed && (
        <nav className="sidebar-nav">
          {RULE_SETS.map(rs => {
            const isActive = activeRuleSet === rs.id
            return (
              <div key={rs.id} className={`sidebar-item ${isActive ? 'active' : ''}`}>
                <button
                  className="sidebar-rule-btn"
                  onClick={() => onSelectRuleSet(rs.id)}
                  disabled={loading}
                >
                  <span className="rule-label">{rs.label}</span>
                  {isActive && <span className="active-dot" />}
                </button>
                <button
                  className="sidebar-quiz-btn"
                  onClick={() => onQuiz(rs.id)}
                  disabled={loading}
                  title={`Quiz: ${rs.label}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  Quiz
                </button>
              </div>
            )
          })}
        </nav>
      )}

      {!collapsed && (
        <div className="sidebar-footer">
          <button
            className="sidebar-new-chat-btn"
            onClick={() => onSelectRuleSet(null)}
            disabled={loading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Chat
          </button>
        </div>
      )}
    </aside>
  )
}
