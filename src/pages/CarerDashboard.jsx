import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, doc, updateDoc, getDoc, addDoc, onSnapshot, increment, serverTimestamp } from 'firebase/firestore';
import { Check, X, Clock, CalendarDays, Save } from 'lucide-react';

export default function CarerDashboard() {
  const { currentUser, userData, setUserData } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState([]);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    setAvailability(userData?.availability || []);
  }, [userData]);

  useEffect(() => {
    if (!currentUser) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'bookings'), where('carerId', '==', currentUser.uid));

    const unsubscribe = onSnapshot(q, async (snap) => {
      try {
        const bookingsData = [];
        for (const d of snap.docs) {
          const booking = { id: d.id, ...d.data() };

          // Fetch pet details
          if (booking.petId && !booking.petName) {
            try {
              const petDoc = await getDoc(doc(db, 'pets', booking.petId));
              if (petDoc.exists()) {
                booking.pet = petDoc.data();
              }
            } catch (err) {
              console.error("Error fetching pet details", err);
            }
          }

          // Fetch owner details
          if (booking.ownerId && !booking.ownerName) {
            try {
              const ownerDoc = await getDoc(doc(db, 'users', booking.ownerId));
              if (ownerDoc.exists()) {
                booking.owner = ownerDoc.data();
              }
            } catch (err) {
              console.error("Error fetching owner details", err);
            }
          }

          bookingsData.push(booking);
        }

        setBookings(bookingsData);
      } catch (error) {
        console.error("Error processing bookings:", error);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching bookings snapshot:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  async function updateBookingStatus(booking, status) {
    try {
      await updateDoc(doc(db, 'bookings', booking.id), { status });

      // Increment completed services when booking is completed
      if (status === 'completed') {
        await updateDoc(doc(db, 'users', booking.carerId), {
          completedServices: increment(1)
        });
      }

      if (['accepted', 'rejected', 'declined'].includes(status)) {
        await addDoc(collection(db, 'notifications'), {
          userId: booking.ownerId,
          type: 'booking_status',
          text: `Your booking request has been ${status === 'rejected' ? 'declined' : status}.`,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      // onSnapshot handles the state update, no need to manually fetchBookings()
    } catch (error) {
      console.error("Error updating status:", error);
    }
  }

  async function handleSaveAvailability() {
    if (!currentUser) return;
    setSavingAvailability(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { availability });
      setUserData?.({ ...userData, availability });
      alert('Availability updated.');
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Could not update availability.');
    } finally {
      setSavingAvailability(false);
    }
  }

  if (loading) return <div className="p-8 text-center"><Clock className="animate-spin inline mr-2" /> Loading dashboard...</div>;

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const otherBookings = bookings.filter(b => b.status !== 'pending');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Carer Dashboard</h1>
        <p className="text-slate-600 mt-2">Manage your booking requests and schedule.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-brand-600" />
            <h2 className="text-xl font-semibold text-slate-800">Availability</h2>
          </div>
          <button
            onClick={handleSaveAvailability}
            disabled={savingAvailability}
            className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {savingAvailability ? 'Saving...' : 'Save Availability'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {dayOptions.map((day) => {
            const selected = availability.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setAvailability((prev) => selected
                    ? prev.filter((item) => item !== day)
                    : [...prev, day]);
                }}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  selected
                    ? 'bg-brand-50 border-brand-600 text-brand-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Requests */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-slate-800">Pending Requests</h2>
          {pendingBookings.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
              No pending requests right now.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingBookings.map(booking => (
                <div key={booking.id} className="bg-white border border-yellow-200 shadow-sm rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{booking.service}</h3>
                      <p className="text-slate-500">{booking.date}</p>
                    </div>
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      New Request
                    </span>
                  </div>

                  {/* <div className="bg-slate-50 p-4 rounded-lg mb-4 text-sm">
                    <p className="mb-2"><strong>Pet:</strong> {booking.pet?.name} ({booking.pet?.breed}, {booking.pet?.age} yrs)</p>
                    <p><strong>Owner:</strong> {booking.owner?.firstName} {booking.owner?.lastName}</p>
                  </div> */}

                  {/* <div className="bg-slate-50 p-4 rounded-lg mb-4 text-sm">
                    <p className="mb-2">
                      <strong>Pet:</strong> {booking.petName} ({booking.petBreed})
                    </p>
                    <p>
                      <strong>Owner:</strong> {booking.ownerName}
                    </p>
                  </div> */}

                  <div className="bg-slate-50 p-4 rounded-lg mb-4 text-sm space-y-2">
                    <p>
                      🐾 <strong>Pet:</strong> {booking.petName || booking.pet?.name || "Unknown"}
                      <span className="text-slate-500"> ({booking.petBreed || booking.pet?.breed || "-"})</span>
                    </p>

                    <p>
                      👤 <strong>Owner:</strong> {booking.ownerName || (booking.owner ? `${booking.owner.firstName || ''} ${booking.owner.lastName || ''}`.trim() : "Unknown")}
                    </p>

                    <p>
                      📅 <strong>Date:</strong> {booking.date || "Unknown"}
                    </p>

                    <p>
                      🛠 <strong>Service:</strong> {booking.service || "Unknown"}
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => updateBookingStatus(booking, 'accepted')}
                      className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg font-medium transition-colors flex justify-center items-center"
                    >
                      <Check className="w-4 h-4 mr-2" /> Accept
                    </button>
                    <button
                      onClick={() => updateBookingStatus(booking, 'rejected')}
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-2 rounded-lg font-medium transition-colors flex justify-center items-center"
                    >
                      <X className="w-4 h-4 mr-2" /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accepted/Completed */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-slate-800">Your Schedule</h2>
          {otherBookings.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
              No upcoming bookings.
            </div>
          ) : (
            <div className="space-y-4">
              {otherBookings.map(booking => (
                <div key={booking.id} className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{booking.service}</h3>
                      <p className="text-slate-500">{booking.date}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full 
                      ${booking.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        booking.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                      {booking.status}
                    </span>
                  </div>

                  <div className="text-sm text-slate-600">
                    <p><strong>Pet:</strong> {booking.petName || booking.pet?.name || "Unknown"} ({booking.petBreed || booking.pet?.breed || "-"})</p>
                    <p><strong>Owner:</strong> {booking.ownerName || (booking.owner ? `${booking.owner.firstName || ''} ${booking.owner.lastName || ''}`.trim() : "Unknown")}</p>
                  </div>

                  {booking.status === 'accepted' && (
                    <button
                      onClick={() => updateBookingStatus(booking, 'completed')}
                      className="mt-4 w-full bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 rounded-lg font-medium transition-colors"
                    >
                      Mark as Completed
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
