import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Database, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import type { ApiResponse } from '../../lib/api';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ExecutedQuery {
  sql: string;
  success: boolean;
  rowCount: number;
  error?: string;
  result?: any[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  queries?: ExecutedQuery[];
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Custom Markdown Renderer ────────────────────────────────────────────────

function formatMessageContent(content: string) {
  if (!content) return null;

  const lines = content.split('\n');
  const formattedElements: React.ReactNode[] = [];
  let tableRows: string[][] = [];
  let inTable = false;
  let listItems: string[] = [];
  let inList = false;

  const flushTable = (key: number) => {
    if (tableRows.length === 0) return null;
    const headers = tableRows[0];
    const rows = tableRows.slice(1).filter(r => r.some(cell => cell.trim() !== '' && !cell.includes('---')));

    inTable = false;
    const currentTableRows = [...tableRows];
    tableRows = [];

    return (
      <div key={`table-${key}`} className="table-responsive-container" style={{ margin: '12px 0', overflowX: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-default)' }}>
              {headers.map((h, i) => (
                <th key={i} style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{h.trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} style={{ borderBottom: rowIndex < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none', transition: 'background var(--t-fast)' }}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{cell.trim()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const flushList = (key: number) => {
    inList = false;
    const currentListItems = [...listItems];
    listItems = [];
    return (
      <ul key={`list-${key}`} style={{ paddingLeft: '20px', margin: '8px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
        {currentListItems.map((item, idx) => (
          <li key={idx} style={{ marginBottom: '4px' }}>
            {parseInlineMarkdown(item)}
          </li>
        ))}
      </ul>
    );
  };

  const parseInlineMarkdown = (text: string): React.ReactNode => {
    // Basic bold **text** and inline code `code` parsing
    const parts: React.ReactNode[] = [];
    let currentText = text;
    let idx = 0;

    // Helper regexes
    const boldRegex = /\*\*(.*?)\*\*/g;
    const codeRegex = /`(.*?)`/g;

    // A simple parsing loop to identify matches sequentially
    const tokens: { type: 'bold' | 'code' | 'text'; text: string; index: number }[] = [];
    
    let match;
    while ((match = boldRegex.exec(text)) !== null) {
      tokens.push({ type: 'bold', text: match[1], index: match.index });
    }
    
    // Reset regex
    codeRegex.lastIndex = 0;
    while ((match = codeRegex.exec(text)) !== null) {
      tokens.push({ type: 'code', text: match[1], index: match.index });
    }

    // Sort tokens by their index
    tokens.sort((a, b) => a.index - b.index);

    let lastIdx = 0;
    for (const token of tokens) {
      if (token.index < lastIdx) continue; // skip nested/overlapping matches
      
      // Add text leading up to token
      if (token.index > lastIdx) {
        parts.push(text.slice(lastIdx, token.index));
      }

      if (token.type === 'bold') {
        parts.push(<strong key={idx++} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{token.text}</strong>);
        lastIdx = token.index + token.text.length + 4; // ** is 4 chars
      } else {
        parts.push(
          <code key={idx++} style={{
            fontFamily: 'monospace',
            background: 'rgba(255,255,255,0.06)',
            padding: '2px 5px',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--indigo-400)'
          }}>{token.text}</code>
        );
        lastIdx = token.index + token.text.length + 2; // ` is 2 chars
      }
    }

    if (lastIdx < text.length) {
      parts.push(text.slice(lastIdx));
    }

    return parts.length > 0 ? <>{parts}</> : text;
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

    // Table parsing
    if (trimmed.startsWith('|')) {
      if (inList) {
        formattedElements.push(flushList(idx));
      }
      inTable = true;
      const cells = line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
      // Skip markdown table delimiter row e.g. |---|---|
      if (!cells.every(c => c.startsWith('-'))) {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      formattedElements.push(flushTable(idx));
    }

    // List parsing
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(trimmed.slice(2));
      continue;
    } else if (inList) {
      formattedElements.push(flushList(idx));
    }

    // Header parsing
    if (trimmed.startsWith('### ')) {
      formattedElements.push(
        <h4 key={idx} style={{ margin: '14px 0 6px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {parseInlineMarkdown(trimmed.slice(4))}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      formattedElements.push(
        <h3 key={idx} style={{ margin: '16px 0 8px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {parseInlineMarkdown(trimmed.slice(3))}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      formattedElements.push(
        <h2 key={idx} style={{ margin: '18px 0 10px', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {parseInlineMarkdown(trimmed.slice(2))}
        </h2>
      );
    } else if (trimmed === '') {
      formattedElements.push(<div key={idx} style={{ height: '8px' }} />);
    } else {
      formattedElements.push(
        <p key={idx} style={{ margin: '6px 0', fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
          {parseInlineMarkdown(line)}
        </p>
      );
    }
  }

  // Flush remaining table or list if lines ended
  if (inTable) formattedElements.push(flushTable(lines.length));
  if (inList) formattedElements.push(flushList(lines.length));

  return <div style={{ display: 'flex', flexDirection: 'column' }}>{formattedElements}</div>;
}

// ─── Collapsible Query Inspector Component ─────────────────────────────────────

function QueryInspector({ queries }: { queries?: ExecutedQuery[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!queries || queries.length === 0) return null;

  return (
    <div style={{
      marginTop: 10,
      borderTop: '1px solid var(--border-subtle)',
      paddingTop: 8,
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          padding: '4px 0',
          fontFamily: 'inherit',
          width: '100%',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Database size={12} color="var(--indigo-400)" />
          Database Queries ({queries.length})
        </span>
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {isOpen && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginTop: 6,
          maxHeight: 250,
          overflowY: 'auto',
          paddingRight: 4
        }}>
          {queries.map((q, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(0,0,0,0.18)',
                border: `1px solid ${q.success ? 'var(--border-subtle)' : 'rgba(239, 68, 68, 0.2)'}`,
                borderRadius: '6px',
                padding: '8px',
                fontSize: '11px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{
                  fontFamily: 'monospace',
                  color: q.success ? 'var(--green-400)' : 'var(--red-400)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  {q.success ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                  {q.success ? `SUCCESS (rows: ${q.rowCount})` : 'FAILED'}
                </span>
              </div>
              <pre style={{
                fontFamily: 'monospace',
                background: 'rgba(0,0,0,0.22)',
                padding: '6px',
                borderRadius: '4px',
                overflowX: 'auto',
                color: 'var(--text-primary)',
                margin: '4px 0',
                border: '1px solid rgba(255, 255, 255, 0.03)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {q.sql}
              </pre>
              {q.error && (
                <div style={{ color: 'var(--red-400)', marginTop: 4, fontFamily: 'monospace' }}>
                  Error: {q.error}
                </div>
              )}
              {q.success && q.result && q.result.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', marginBottom: 2 }}>Sample Output:</div>
                  <pre style={{
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    color: 'var(--text-secondary)',
                    overflowX: 'auto',
                    margin: 0,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {JSON.stringify(q.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Chat Drawer Component ────────────────────────────────────────────────

export default function ChatDrawer({ isOpen, onClose }: ChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load conversation from session state when opening
  useEffect(() => {
    if (isOpen) {
      try {
        const stored = sessionStorage.getItem('orderpilot_assistant_chat');
        if (stored) {
          setMessages(JSON.parse(stored));
        } else {
          // Starter greeting
          setMessages([
            {
              role: 'assistant',
              content: "Hello! I'm the OrderPilot AI database assistant. Ask me anything about revenue, orders, inventory levels, customer activity, or system health. I have direct access to run read-only database metrics for you."
            }
          ]);
        }
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

  // Persist conversation to session storage
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('orderpilot_assistant_chat', JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    if (!textToSend) setInput('');

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Map frontend model back to request formats
      const payload = {
        messages: newMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      };

      const res = await api.post<ApiResponse<{ message: string; queries: ExecutedQuery[] }>>(
        '/ai-assistant/chat',
        payload
      );

      if (res.success && res.data) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: res.data.message,
            queries: res.data.queries
          }
        ]);
      } else {
        throw new Error(res.message || 'Failed to query assistant');
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Failed to fetch response: ${err?.message || 'Unknown network error'}. Please try again.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    const defaultMsg: ChatMessage[] = [
      {
        role: 'assistant',
        content: "Chat cleared. What else can I help you extract from the OrderPilot database?"
      }
    ];
    setMessages(defaultMsg);
    sessionStorage.setItem('orderpilot_assistant_chat', JSON.stringify(defaultMsg));
  };

  const quickPrompts = [
    { label: '📊 Month Revenue', text: 'How much total revenue (including tax) did we generate this month?' },
    { label: '📦 Pending Orders', text: 'How many pending orders do we have right now?' },
    { label: '⚠️ Low Stock Items', text: 'Which inventory items are currently low or critical in stock?' },
    { label: '🏭 Manufacturing status', text: 'Show me the number of active manufacturing jobs grouped by status.' }
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 900,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Drawer */}
      <div
        className="chat-drawer-panel"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '450px',
          maxWidth: '100%',
          background: 'rgba(17, 19, 24, 0.95)',
          backdropFilter: 'blur(16px)',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 901,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.01)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, var(--indigo-500), var(--purple-500))',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px var(--indigo-glow)'
            }}>
              <Sparkles size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>OrderPilot AI Assistant</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Connected to PostgreSQL Database</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={clearChat}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: 11, fontWeight: 500,
                padding: '4px 8px', borderRadius: '4px',
                transition: 'color var(--t-fast)',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Clear
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', display: 'flex',
                padding: '6px', borderRadius: 'var(--radius-sm)',
                transition: 'background var(--t-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Message area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    background: isUser ? 'var(--indigo-600)' : 'var(--bg-elevated)',
                    border: isUser ? 'none' : '1px solid var(--border-subtle)',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    padding: '12px 16px',
                    boxShadow: 'var(--shadow-sm)',
                    position: 'relative',
                  }}
                >
                  {/* Message body */}
                  <div style={{
                    color: isUser ? '#fff' : 'var(--text-primary)',
                    wordBreak: 'break-word',
                  }}>
                    {isUser ? m.content : formatMessageContent(m.content)}
                  </div>

                  {/* SQL Queries log overlay */}
                  {!isUser && m.queries && m.queries.length > 0 && (
                    <QueryInspector queries={m.queries} />
                  )}
                </div>
              </div>
            );
          })}

          {/* Loader */}
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px 16px 16px 4px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <div style={{ width: 6, height: 6, background: 'var(--indigo-400)', borderRadius: '50%', animation: 'livePulse 1s infinite' }} />
                  <div style={{ width: 6, height: 6, background: 'var(--indigo-400)', borderRadius: '50%', animation: 'livePulse 1s infinite 0.2s' }} />
                  <div style={{ width: 6, height: 6, background: 'var(--indigo-400)', borderRadius: '50%', animation: 'livePulse 1s infinite 0.4s' }} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>AI is compiling statistics...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick action chips */}
        {messages.length <= 1 && !isLoading && (
          <div style={{
            padding: '10px 20px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(0,0,0,0.08)'
          }}>
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(qp.text)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 12px',
                  color: 'var(--text-secondary)',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all var(--t-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--indigo-500)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                {qp.label}
              </button>
            ))}
          </div>
        )}

        {/* Input box */}
        <div style={{
          padding: '16px 20px 20px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(255,255,255,0.01)',
          display: 'flex',
          gap: 10,
          alignItems: 'center'
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask AI anything about the database... (e.g. revenue, stock levels)"
            rows={1}
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'var(--bg-base)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              padding: '10px 12px',
              fontFamily: 'inherit',
              fontSize: '13px',
              resize: 'none',
              outline: 'none',
              transition: 'border-color var(--t-fast)',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--indigo-500)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-strong)'}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, var(--indigo-600), var(--purple-500))',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
              cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: isLoading || !input.trim() ? 0.5 : 1,
              transition: 'all var(--t-fast)',
              boxShadow: isLoading || !input.trim() ? 'none' : '0 2px 10px rgba(99,102,241,0.3)',
            }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* Slide-in styles inline since globals.css contains standard style sheet */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
