import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * Renders the left sidebar list of all conversations for the current user.
 *
 * @param {Array}  conversations - from useConversations()
 * @param {boolean} loading
 * @param {string|null} activeId - currently open conversationId
 */
export default function ConversationList({ conversations, loading, activeId }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  /** Returns the other participant's name from the stored participantNames map */
  function getOtherName(conv) {
    if (!conv.participantNames) return 'Unknown';
    const otherId = conv.participantIds.find((id) => id !== currentUser.uid);
    return conv.participantNames[otherId] || 'Unknown';
  }

  function getOtherPhoto(conv) {
    const otherId = conv.participantIds.find((id) => id !== currentUser.uid);
    return conv.participantPhotos?.[otherId] || '';
  }

  /** Returns initials for the avatar */
  function getInitials(name) {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /** Safely formats Firestore Timestamp or ISO string */
  function formatTime(ts) {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return formatDistanceToNow(date, { addSuffix: true });
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 items-center animate-pulse">
            <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-200 rounded w-2/3" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
        <MessageCircle className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No conversations yet</p>
        <p className="text-xs mt-1">Book a carer to start chatting</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {conversations.map((conv) => {
        const name = getOtherName(conv);
        const photoURL = getOtherPhoto(conv);
        const initials = getInitials(name);
        const isActive = conv.id === activeId;
        const unreadCount = conv.unreadCounts?.[currentUser.uid] ?? 0;
        const hasUnread = unreadCount > 0;

        return (
          <li key={conv.id}>
            <button
              onClick={() => navigate(`/chat/${conv.id}`)}
              className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors
                ${isActive
                  ? 'bg-brand-50 border-r-2 border-brand-600'
                  : 'hover:bg-slate-50'
                }`}
            >
              {/* Avatar */}
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold
                ${isActive ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {photoURL ? (
                  <img src={photoURL} alt={name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  initials
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className={`text-sm font-semibold truncate ${isActive ? 'text-brand-700' : 'text-slate-800'}`}>
                    {name}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {hasUnread && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {formatTime(conv.updatedAt)}
                    </span>
                  </div>
                </div>
                <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
                  {conv.lastMessage || 'Start the conversation…'}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
