import { useState, useRef, useEffect, useCallback } from 'react';
import * as sdk from 'matrix-js-sdk';
import { useSettings } from '../hooks/useSettings';
import { getMatrixAccessToken, getMatrixBotToken } from '../utils/matrixStorage';
import { getAIKey } from '../utils/aiStorage';
import { useI18n } from '../i18n';
import AIChatTab from './AIChatTab';
import styles from './chat/MatrixChatPage.module.css';

interface DisplayMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  isOwn: boolean;
}

type ChatMode = 'matrix' | 'ai';

export default function MatrixChatPage() {
  const { settings } = useSettings();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<ChatMode>('matrix');
  const [client, setClient] = useState<sdk.MatrixClient | null>(null);
  const [syncState, setSyncState] = useState<string>('');
  const [rooms, setRooms] = useState<sdk.Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botActive, setBotActive] = useState(false);

  const clientRef = useRef<sdk.MatrixClient | null>(null);
  const botClientRef = useRef<sdk.MatrixClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Build display messages from a room's timeline
  const buildMessages = useCallback((room: sdk.Room, ownUserId: string): DisplayMessage[] => {
    return room.timeline
      .filter((e) => e.getType() === 'm.room.message')
      .map((e) => ({
        id: e.getId() || '',
        sender: e.getSender() || '',
        content: (e.getContent() as Record<string, string>).body || '',
        timestamp: e.getTs() || 0,
        isOwn: e.getSender() === ownUserId,
      }));
  }, []);

  // Initialize Matrix client
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const accessToken = await getMatrixAccessToken();
      const homeserver = settings.matrixHomeserver;
      const userId = settings.matrixUserId;

      if (!homeserver || !accessToken || !userId) {
        setConfigured(false);
        return;
      }
      if (cancelled) return;
      setConfigured(true);

      try {
        const matrixClient = sdk.createClient({
          baseUrl: homeserver,
          accessToken,
          userId,
          useAuthorizationHeader: true,
        });

        matrixClient.on(sdk.ClientEvent.Sync, (state: sdk.SyncState) => {
          if (cancelled) return;
          setSyncState(state);
          if (state === sdk.SyncState.Prepared || state === sdk.SyncState.Syncing) {
            const allRooms = matrixClient.getRooms();
            setRooms(allRooms);
            // Auto-select the configured room if no room is selected yet
            if (!selectedRoomId && settings.matrixRoomId) {
              const found = allRooms.find((r) => r.roomId === settings.matrixRoomId);
              if (found) setSelectedRoomId(found.roomId);
            }
          }
        });

        matrixClient.on(sdk.RoomEvent.Timeline, (event: sdk.MatrixEvent) => {
          if (cancelled) return;
          setRooms(matrixClient.getRooms());
          if (!selectedRoomId) return;
          const room = matrixClient.getRoom(selectedRoomId);
          if (!room) return;

          const content = event.getContent() as Record<string, any>;
          const relatesTo = content['m.relates_to'];

          // Handle edits (m.replace) — update existing message in place
          if (relatesTo?.rel_type === 'm.replace' && relatesTo.event_id) {
            const newBody = content['m.new_content']?.body;
            if (newBody) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === relatesTo.event_id ? { ...m, content: newBody } : m
                )
              );
            }
            return;
          }

          setMessages(buildMessages(room, userId));
          scrollToBottom();
        });

        await matrixClient.startClient({ initialSyncLimit: 30 });
        if (cancelled) {
          matrixClient.stopClient();
          return;
        }

        clientRef.current = matrixClient;
        setClient(matrixClient);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to connect');
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (clientRef.current) {
        clientRef.current.stopClient();
        clientRef.current = null;
      }
    };
  }, [settings.matrixHomeserver, settings.matrixUserId, buildMessages, scrollToBottom, selectedRoomId]);

  // Initialize AI Bot client
  useEffect(() => {
    const botUserId = settings.matrixBotUserId;
    const homeserver = settings.matrixHomeserver;
    const aiEndpoint = settings.aiEndpoint;

    if (!botUserId || !homeserver || !aiEndpoint) {
      setBotActive(false);
      return;
    }

    let cancelled = false;

    getMatrixBotToken().then((botToken) => {
      if (!botToken || cancelled) return;

      const botClient = sdk.createClient({
        baseUrl: homeserver,
        accessToken: botToken,
        userId: botUserId,
        useAuthorizationHeader: true,
      });

      botClient.on(sdk.RoomEvent.Timeline, async (event: sdk.MatrixEvent) => {
        if (cancelled) return;
        if (event.getType() !== 'm.room.message') return;

        const content = event.getContent() as Record<string, any>;
        if (content.msgtype !== 'm.text') return;

        // Ignore own messages and edits
        if (event.getSender() === botUserId) return;
        if (content['m.relates_to']?.rel_type === 'm.replace') return;

        const roomId = event.getRoomId();
        const room = botClient.getRoom(roomId);
        if (!room) return;

        // Build conversation context from recent messages
        const recentMessages = room.timeline
          .filter((e) => e.getType() === 'm.room.message')
          .slice(-20)
          .map((e) => {
            const c = e.getContent() as Record<string, any>;
            return {
              role: e.getSender() === botUserId ? 'assistant' as const : 'user' as const,
              content: c.body || '',
            };
          });

        try {
          const apiKey = await getAIKey();
          if (!apiKey || cancelled) return;

          const response = await fetch(aiEndpoint, {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: settings.aiModel || 'gpt-4o',
              messages: [
                { role: 'system', content: 'You are a helpful AI assistant in a Matrix chat room. Respond concisely and helpfully.' },
                ...recentMessages,
              ],
              temperature: 0.7,
              stream: false,
            }),
          });

          if (!response.ok || cancelled) return;

          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply && !cancelled) {
            await botClient.sendEvent(roomId!, sdk.EventType.RoomMessage, {
              msgtype: sdk.MsgType.Text,
              body: reply,
            });
          }
        } catch (err) {
          console.error('[MatrixBot] AI reply failed:', err);
        }
      });

      botClient.startClient({ initialSyncLimit: 30 }).then(() => {
        if (!cancelled) {
          botClientRef.current = botClient;
          setBotActive(true);
        }
      });
    });

    return () => {
      cancelled = true;
      if (botClientRef.current) {
        botClientRef.current.stopClient();
        botClientRef.current = null;
      }
      setBotActive(false);
    };
  }, [settings.matrixBotUserId, settings.matrixHomeserver, settings.aiEndpoint, settings.aiModel]);

  // Load messages when selecting a room
  useEffect(() => {
    if (!client || !selectedRoomId) {
      setMessages([]);
      return;
    }
    const room = client.getRoom(selectedRoomId);
    if (room) {
      setMessages(buildMessages(room, settings.matrixUserId || ''));
      scrollToBottom();
    }
  }, [client, selectedRoomId, settings.matrixUserId, buildMessages, scrollToBottom]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !client || !selectedRoomId) return;

    try {
      await client.sendEvent(selectedRoomId, sdk.EventType.RoomMessage, {
        msgtype: sdk.MsgType.Text,
        body: trimmed,
      });
      setInput('');
    } catch (err: any) {
      console.error('[MatrixChat] Send failed:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedRoom = selectedRoomId ? client?.getRoom(selectedRoomId) : null;

  const syncLabel = () => {
    if (!syncState) return t('matrixSyncConnecting');
    if (syncState === sdk.SyncState.Prepared || syncState === sdk.SyncState.Syncing) return t('matrixSyncConnected');
    if (syncState === sdk.SyncState.Error) return t('matrixSyncError');
    if (syncState === sdk.SyncState.Stopped) return t('matrixSyncStopped');
    return t('matrixSyncConnecting');
  };

  // Unconfigured state — still show tab switcher so user can switch to AI
  const matrixContent = (() => {
    if (!configured) {
      return (
        <div className={styles.page}>
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p>{t('aiConfigurePrompt')}</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.page}>
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon} style={{ background: 'rgba(255,59,48,0.08)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <p style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.page}>
      {/* Room list sidebar */}
      <aside className={styles.roomList}>
        <div className={styles.roomListHeader}>
          <span className={styles.roomListTitle}>{t('aiAssistantTitle')}</span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {botActive && (
              <span className={`${styles.syncBadge} ${styles.syncOk}`}>{t('aiBotEnabled')}</span>
            )}
            <span className={`${styles.syncBadge} ${syncState === sdk.SyncState.Prepared || syncState === sdk.SyncState.Syncing ? styles.syncOk : styles.syncPending}`}>
              {syncLabel()}
            </span>
          </div>
        </div>
        <div className={styles.roomListItems}>
          {rooms.length === 0 && (
            <div className={styles.roomListEmpty}>{t('matrixNoRooms')}</div>
          )}
          {rooms.map((room) => (
            <button
              key={room.roomId}
              className={`${styles.roomItem} ${selectedRoomId === room.roomId ? styles.roomItemActive : ''}`}
              onClick={() => setSelectedRoomId(room.roomId)}
            >
              <div className={styles.roomAvatar}>
                {(room.name || '#')[0].toUpperCase()}
              </div>
              <div className={styles.roomInfo}>
                <div className={styles.roomName}>{room.name}</div>
                <div className={styles.roomPreview}>
                  {room.timeline.length > 0
                    ? ((room.timeline[room.timeline.length - 1].getContent() as Record<string, string>).body || '').slice(0, 40)
                    : ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat area */}
      <div className={styles.chatArea}>
        {selectedRoom ? (
          <>
            <div className={styles.chatHeader}>
              <span className={styles.chatTitle}>{selectedRoom.name}</span>
              <span className={styles.chatMembers}>
                {selectedRoom.getJoinedMemberCount() || 0} members
              </span>
            </div>

            <div className={styles.messages}>
              {messages.length === 0 && (
                <div className={styles.messagesEmpty}>{t('matrixRoomEmpty')}</div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`${styles.messageRow} ${msg.isOwn ? styles.ownRow : ''}`}>
                  {!msg.isOwn && <div className={styles.msgAvatar}>{msg.sender[0]?.toUpperCase() || '?'}</div>}
                  <div className={styles.msgContent}>
                    {!msg.isOwn && <div className={styles.msgSender}>{msg.sender}</div>}
                    <div className={`${styles.msgBubble} ${msg.isOwn ? styles.msgOwn : styles.msgOther}`}>
                      {msg.content}
                    </div>
                    <div className={styles.msgTime}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
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
                  placeholder={t('aiInputPlaceholder')}
                  rows={1}
                />
                <button className={styles.sendBtn} onClick={handleSend} disabled={!input.trim()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.noRoomSelected}>
            <div className={styles.placeholderIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p>{t('aiPlaceholder')}</p>
          </div>
        )}
      </div>
    </div>
    );
  })();

  return (
    <div className={styles.outer}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'matrix' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('matrix')}
        >
          {t('matrixChatTab')}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'ai' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          {t('aiChatTab')}
        </button>
      </div>
      <div className={styles.tabContent}>
        {activeTab === 'matrix' ? matrixContent : <AIChatTab />}
      </div>
    </div>
  );
}
