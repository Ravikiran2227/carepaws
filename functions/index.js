const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function getBookingDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function createReminder({ booking, bookingId, userId, audience }) {
  const markerField = audience === 'owner' ? 'ownerReminderSent' : 'carerReminderSent';
  if (!userId || booking[markerField]) return null;

  const notificationRef = db.collection('notifications').doc();
  const bookingRef = db.collection('bookings').doc(bookingId);
  const petName = booking.petName || 'a pet';
  const service = booking.service || 'care';
  const date = booking.date || 'soon';

  const text = audience === 'owner'
    ? `Reminder: ${service} for ${petName} is scheduled on ${date}.`
    : `Reminder: ${service} for ${petName} is scheduled on ${date}.`;

  const batch = db.batch();
  batch.set(notificationRef, {
    userId,
    type: 'booking_reminder',
    text,
    read: false,
    bookingId,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  batch.update(bookingRef, {
    [markerField]: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return batch.commit();
}

exports.sendBookingReminders = onSchedule(
  {
    schedule: 'every 60 minutes',
    timeZone: 'Asia/Kolkata',
    region: 'asia-south1'
  },
  async () => {
    const now = Date.now();
    const snapshot = await db
      .collection('bookings')
      .where('status', '==', 'accepted')
      .get();

    const jobs = [];

    snapshot.forEach((doc) => {
      const booking = doc.data();
      const bookingDate = getBookingDate(booking.date);
      if (!bookingDate) return;

      const timeUntilBooking = bookingDate.getTime() - now;
      if (timeUntilBooking < 0 || timeUntilBooking > DAY_MS) return;

      jobs.push(createReminder({
        booking,
        bookingId: doc.id,
        userId: booking.ownerId,
        audience: 'owner'
      }));
      jobs.push(createReminder({
        booking,
        bookingId: doc.id,
        userId: booking.carerId,
        audience: 'carer'
      }));
    });

    await Promise.all(jobs.filter(Boolean));
  }
);
