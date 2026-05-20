import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Real-time listener for messages inside a single conversation.
 * Attaches an onSnapshot listener when conversationId changes and
 * automatically cleans up when the component unmounts or the id changes.
 *
 * @param {string|null} conversationId
 * @returns {{ messages: Array, loading: boolean }}
 */
export function useMessages(conversationId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    // onSnapshot fires immediately with current data, then on every change
    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Returned function is called by React on unmount or when conversationId changes
    return unsubscribe;
  }, [conversationId]);

  return { messages, loading };
}
