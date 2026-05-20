import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

/**
 * Real-time listener for all conversations the current user participates in.
 * Uses array-contains on participantIds, ordered by updatedAt desc (most recent first).
 *
 * NOTE: Firestore requires a composite index for array-contains + orderBy on
 * different fields. On first run Firebase will log a direct link to create it.
 *
 * @returns {{ conversations: Array, loading: boolean }}
 */
export function useConversations() {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const results = await Promise.all(snap.docs.map(async (conversationDoc) => {
        const conversation = { id: conversationDoc.id, ...conversationDoc.data() };
        const participantPhotos = { ...(conversation.participantPhotos || {}) };
        const participantNames = { ...(conversation.participantNames || {}) };
        let shouldPatchConversation = false;

        await Promise.all((conversation.participantIds || []).map(async (participantId) => {
          try {
            const userSnap = await getDoc(doc(db, 'users', participantId));
            if (!userSnap.exists()) return;

            const user = userSnap.data();
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

            if (user.photoURL && participantPhotos[participantId] !== user.photoURL) {
              participantPhotos[participantId] = user.photoURL;
              shouldPatchConversation = true;
            }

            if (fullName && participantNames[participantId] !== fullName) {
              participantNames[participantId] = fullName;
              shouldPatchConversation = true;
            }
          } catch (error) {
            console.error('Error loading conversation participant:', error);
          }
        }));

        if (shouldPatchConversation) {
          updateDoc(doc(db, 'conversations', conversation.id), {
            participantPhotos,
            participantNames,
          }).catch(() => {});
        }

        return {
          ...conversation,
          participantNames,
          participantPhotos,
        };
      }));

      results.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis?.() || 0;
        const timeB = b.updatedAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setConversations(results);
      setLoading(false);
    }, (error) => {
      console.error("Error loading conversations:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  return { conversations, loading };
}
