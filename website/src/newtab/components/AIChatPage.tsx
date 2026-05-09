import { useState, useRef, useEffect, useCallback } from 'react';
import { useSettings } from '../hooks/useSettings';
import { getAIKey } from '../utils/aiStorage';
import { useI18n } from '../i18n';
import styles from '../styles/components/AIChatPage.module.css';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
  streaming?: boolean;
}

let msgCounter = 0;
function genId() { return `msg-${Date.now()}-${++msgCounter}`; }

export default function AIChatPage() {
  const { settings } = useSettings();
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const cleanup = useCallback(() => {
    setIsStreaming(false);
    if (portRef.current) {
      portRef.current.disconnect();
      portRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const apiKey = await getAIKey();
    if (!settings.aiEndpoint || !apiKey) return;

    const userMsg: ChatMessage = { id: genId(), role: 'user', content: trimmed };
    const assistantMsg: ChatMessage = { id: genId(), role: 'assistant', content: '', streaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);

    const allMessages = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
    const assistantId = assistantMsg.id;

    const port = chrome.runtime.connect({ name: 'AI_CHAT_STREAM' });
    portRef.current = port;

    port.postMessage({
      endpoint: settings.aiEndpoint,
      apiKey,
      model: settings.aiModel || 'gpt-4o',
      messages: allMessages,
      temperature: 0.7,
    });

    port.onMessage.addListener((msg: { type: string; content?: string; error?: string }) => {
      if (msg.type === 'chunk' && msg.content) {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: m.content + msg.content } : m)
        );
      } else if (msg.type === 'done') {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m)
        );
        cleanup();
      } else if (msg.type === 'error') {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: msg.error || 'Unknown error', error: true, streaming: false } : m)
        );
        cleanup();
      }
    });

    port.onDisconnect.addListener(() => {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId && m.streaming ? { ...m, streaming: false } : m)
      );
      cleanup();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    cleanup();
    setMessages([]);
  };

  const configured = !!(settings.aiEndpoint);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('aiAssistantTitle')}</h1>
        {messages.length > 0 && (
          <button className={styles.clearBtn} onClick={handleClear} title={t('clear')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        )}
      </div>

      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p>{configured ? t('aiPlaceholder') : t('aiConfigurePrompt')}</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`${styles.messageRow} ${msg.role === 'user' ? styles.userRow : styles.assistantRow}`}>
            {msg.role === 'assistant' && (
              <div className={styles.avatar}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
            )}
            <div className={`${styles.bubble} ${msg.role === 'user' ? styles.user : styles.assistant} ${msg.error ? styles.msgError : ''}`}>
              {msg.content}
              {msg.streaming && <span className={styles.cursor}>{t('aiStreamingCursor')}</span>}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputBar}>
        <div className={styles.inputContainer}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={configured ? t('aiInputPlaceholder') : t('aiNoConfig')}
            disabled={!configured}
            rows={1}
          />
          <button
            className={styles.sendBtn}
            onClick={isStreaming ? cleanup : handleSend}
            disabled={!configured && !isStreaming}
          >
            {isStreaming ? (
              <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
