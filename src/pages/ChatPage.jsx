import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConversations } from '../hooks/useConversations';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';
import { MessageCircle, ArrowLeft } from 'lucide-react';

export default function ChatPage() {
  const { conversationId } = useParams(); // undefined on /chat
  const { currentUser } = useAuth();
  const { conversations, loading } = useConversations();
  const navigate = useNavigate();

  // Find the active conversation document so we can derive the other person's name
  const activeConv = conversations.find((c) => c.id === conversationId) || null;

  function getOtherName(conv) {
    if (!conv?.participantNames) return 'Loading…';
    const otherId = conv.participantIds.find((id) => id !== currentUser.uid);
    return conv.participantNames[otherId] || 'User';
  }

  const otherName = getOtherName(activeConv);
  const receiverId = activeConv?.participantIds?.find((id) => id !== currentUser?.uid) 
                     || (conversationId ? conversationId.split('_').find(id => id !== currentUser?.uid) : null);
  const otherPhotoURL = receiverId ? activeConv?.participantPhotos?.[receiverId] || '' : '';

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
      style={{ height: 'calc(100vh - 4rem)' }}
    >
      <div className="flex h-full rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">

        {/* ── Left panel: conversation list ── */}
        {/* On mobile: hide when a conversation is open */}
        <aside
          className={`w-full sm:w-80 shrink-0 border-r border-slate-200 flex flex-col
            ${conversationId ? 'hidden sm:flex' : 'flex'}`}
        >
          {/* Sidebar header */}
          <div className="px-5 py-4 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-brand-600" />
              <h1 className="font-bold text-slate-800 text-base">Messages</h1>
            </div>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              conversations={conversations}
              loading={loading}
              activeId={conversationId}
            />
          </div>
        </aside>

        {/* ── Right panel: chat window or empty state ── */}
        <main className={`flex-1 flex flex-col min-w-0
          ${conversationId ? 'flex' : 'hidden sm:flex'}`}
        >
          {conversationId ? (
            <>
              {/* Mobile back button */}
              <button
                onClick={() => navigate('/chat')}
                className="sm:hidden flex items-center gap-1 px-4 pt-3 text-sm text-brand-600 font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <ChatWindow
                conversationId={conversationId}
                otherName={otherName}
                otherPhotoURL={otherPhotoURL}
                receiverId={receiverId}
              />
            </>
          ) : (
            /* Empty state — no conversation selected */
            <div className="flex flex-col items-center justify-center h-full text-slate-400 select-none">
              <MessageCircle className="w-14 h-14 mb-4 opacity-30" />
              <p className="font-semibold text-slate-600">Your messages</p>
              <p className="text-sm mt-1">Select a conversation to start chatting</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
