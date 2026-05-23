import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Generates a deterministic conversation ID from two user UIDs.
 * Sorting ensures the same ID is produced regardless of argument order.
 * e.g. getConversationId("xyz", "abc") === getConversationId("abc", "xyz") === "abc_xyz"
 */
export function getConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

/**
 * Gets an existing conversation between owner and carer, or creates one if it
 * doesn't exist. Participant names are stored in the document so the
 * ConversationList can display them without extra lookups.
 *
 * @param {Object} owner  - { uid, firstName, lastName }
 * @param {Object} carer  - { uid, firstName, lastName }
 * @returns {string} conversationId
 */
export async function getOrCreateConversation(owner, carer) {
  const conversationId = getConversationId(owner.uid, carer.uid);
  const ref = doc(db, 'conversations', conversationId);
  const snap = await getDoc(ref);

  const participantIds = [
    String(owner.uid || ''),
    String(carer.uid || '')
  ].filter(Boolean);

  const participantNames = {
    [owner.uid]: `${owner.firstName} ${owner.lastName}`.trim() || 'Unknown',
    [carer.uid]: `${carer.firstName} ${carer.lastName}`.trim() || 'Unknown',
  };
  const participantPhotos = {
    [owner.uid]: owner.photoURL || '',
    [carer.uid]: carer.photoURL || '',
  };

  if (!snap.exists()) {
    console.log("Creating conversation with:", { ownerId: owner.uid, carerId: carer.uid });
    await setDoc(ref, {
      participantIds,
      participantNames,
      participantPhotos,
      lastMessage: '',
      unreadCounts: {
        [owner.uid]: 0,
        [carer.uid]: 0
      },
      updatedAt: serverTimestamp(),
    });
  } else {
    // Patch existing document just in case it is missing participantIds (from older bugs)
    const data = snap.data();
    if (!data.participantIds || !data.participantIds.includes(String(owner.uid)) || !data.participantPhotos) {
      await updateDoc(ref, { participantIds, participantNames, participantPhotos });
    } else if (owner.photoURL || carer.photoURL) {
      await updateDoc(ref, {
        [`participantPhotos.${owner.uid}`]: owner.photoURL || data.participantPhotos?.[owner.uid] || '',
        [`participantPhotos.${carer.uid}`]: carer.photoURL || data.participantPhotos?.[carer.uid] || '',
      });
    }
  }

  return conversationId;
}

/**
 * Sends a message to a conversation's subcollection and updates the parent
 * conversation document with the latest message preview + timestamp.
 * Also atomically increments the receiver's unread count.
 *
 * @param {string} conversationId
 * @param {string} senderId   - UID of the sender
 * @param {string} receiverId - UID of the receiver
 * @param {string} text       - Message content
 */
export async function sendMessage(conversationId, senderId, receiverId, text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  // 1. Add message to subcollection
  await addDoc(
    collection(db, 'conversations', conversationId, 'messages'),
    {
      senderId,
      text: trimmed,
      createdAt: serverTimestamp(),
    }
  );

  // 2. Update conversation preview and increment the receiver's unread count
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: trimmed,
    updatedAt: serverTimestamp(),
    [`unreadCounts.${receiverId}`]: increment(1),
  });

  // 3. Create notification for receiver
  await addDoc(collection(db, 'notifications'), {
    userId: receiverId,
    type: 'new_message',
    text: 'You have a new message.',
    conversationId,
    senderId,
    read: false,
    createdAt: serverTimestamp()
  });
}
