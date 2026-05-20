import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMessages } from '../hooks/useMessages';
import { sendMessage } from '../utils/chatHelpers';
import { Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Renders the real-time message thread for a single conversation.
 *
 * @param {string} conversationId
 * @param {string} otherName - display name of the other participant
 */
export default function ChatWindow({ conversationId, otherName, otherPhotoURL, receiverId }) {
  const { currentUser } = useAuth();
  const { messages, loading } = useMessages(conversationId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // Reset the current user's unread count when a conversation is opened
  useEffect(() => {
    if (!conversationId || !currentUser) return;
    updateDoc(doc(db, 'conversations', conversationId), {
      [`unreadCounts.${currentUser.uid}`]: 0,
    }).catch(() => {}); // silently ignore if doc doesn't exist yet
  }, [conversationId, currentUser]);

  // Auto-scroll to latest message whenever the list changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(conversationId, currentUser.uid, receiverId, text);
      setText('');
    } finally {
      setSending(false);
    }
  }

  // Allow sending with Enter (Shift+Enter for newline)
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  /** Safely convert Firestore Timestamp → Date */
  function toDate(ts) {
    if (!ts) return null;
    return ts.toDate ? ts.toDate() : new Date(ts);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold">
            {otherPhotoURL ? (
              <img src={otherPhotoURL} alt={otherName} className="h-full w-full rounded-full object-cover" />
            ) : (
              otherName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
            )}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{otherName}</p>
            <p className="text-xs text-green-500 font-medium">Online</p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-slate-50">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin text-slate-400 w-6 h-6" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
            <p>No messages yet.</p>
            <p className="text-xs mt-1">Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === currentUser.uid;
            const date = toDate(msg.createdAt);
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
                    ${isMine
                      ? 'bg-brand-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-800 rounded-bl-sm border border-slate-200'
                    }`}
                >
                  {msg.text}
                </div>
                {date && (
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {format(date, 'h:mm a')}
                  </span>
                )}
              </div>
            );
          })
        )}
        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSend}
        className="px-4 py-3 border-t border-slate-200 bg-white flex items-end gap-3 shrink-0"
      >
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          className="flex-1 resize-none border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 
                     placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 
                     focus:border-brand-500 transition-shadow max-h-32 overflow-y-auto"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-10 h-10 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed
                     text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
        >
          {sending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />
          }
        </button>
      </form>
    </div>
  );
}
