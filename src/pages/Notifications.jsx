import { useNotifications } from '../hooks/useNotifications';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Notifications() {
  const { notifications } = useNotifications();
  const navigate = useNavigate();

  const formatNotificationTime = (value) => {
    if (!value) return '';
    const date = value.toDate ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      try {
        await updateDoc(doc(db, 'notifications', notification.id), {
          read: true
        });
      } catch (error) {
        console.error('Error updating notification:', error);
      }
    }

    if (notification.type === 'new_message' && notification.conversationId) {
      navigate(`/chat/${notification.conversationId}`);
      return;
    }

    if (notification.type === 'new_booking') {
      navigate('/carer');
      return;
    }

    if (['booking_status', 'booking_reminder'].includes(notification.type)) {
      navigate('/dashboard?tab=bookings');
      return;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-slate-900">Notifications</h1>
      {notifications.length === 0 ? (
        <p className="text-slate-500">No notifications yet.</p>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                n.read 
                  ? 'bg-white border-slate-200 text-slate-700' 
                  : 'bg-brand-50 border-brand-200 text-slate-900 font-semibold'
              }`}
            >
              <p className="text-base mb-1">{n.text}</p>
              <p className={`text-xs ${n.read ? 'text-slate-400' : 'text-brand-600 font-normal'}`}>
                {formatNotificationTime(n.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
