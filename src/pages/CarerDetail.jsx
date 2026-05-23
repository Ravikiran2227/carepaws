import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { ArrowLeft, CalendarDays, Flag, MessageCircle, ShieldCheck, Star } from 'lucide-react';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { getOrCreateConversation } from '../utils/chatHelpers';

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getCompatibilityScore(pet, carer, distance) {
  if (!pet || !carer) return 0;

  const preferredPets = (carer.preferredPets || []).map((item) => String(item).toLowerCase());
  const services = carer.services || ['Walking', 'Sitting'];
  const petType = String(pet.type || '').toLowerCase();
  const petBreed = String(pet.breed || '').toLowerCase();
  const hasMedicalNeeds = Boolean(String(pet.medical || '').trim());
  const handlesSpecialNeeds = Boolean(carer.specialNeeds || carer.canHandleSpecialNeeds);
  const ratingScore = Math.min(25, ((carer.rating || 0) / 5) * 25);
  const completedScore = Math.min(20, (carer.completedServices || 0) * 2);
  const proximityScore = distance == null ? 0 : Math.max(0, 20 - Math.min(20, distance * 2));
  let petFitScore = 0;

  if (preferredPets.length > 0) {
    const match = preferredPets.some((preference) =>
      (petType && preference === petType) ||
      (petBreed && (petBreed.includes(preference) || preference.includes(petBreed)))
    );
    if (match) petFitScore += 15;
  }

  if (hasMedicalNeeds && handlesSpecialNeeds) petFitScore += 10;
  else if (!hasMedicalNeeds) petFitScore += 10;
  if (services.length > 0) petFitScore += 10;

  return Math.round(Math.min(100, ratingScore + completedScore + Math.min(35, petFitScore) + proximityScore));
}

export default function CarerDetail() {
  const { carerId } = useParams();
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [carer, setCarer] = useState(null);
  const [pets, setPets] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [completedServices, setCompletedServices] = useState(0);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({ petId: '', service: '', date: '' });
  const [bookingError, setBookingError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const carerSnap = await getDoc(doc(db, 'users', carerId));
        const carerData = carerSnap.exists() ? { id: carerSnap.id, ...carerSnap.data() } : null;
        if (!carerData) {
          setCarer(null);
          return;
        }

        let reviewData = [];
        let petData = [];
        let completedCount = 0;

        try {
          const reviewsSnap = await getDocs(query(collection(db, 'reviews'), where('carerId', '==', carerId)));
          reviewData = reviewsSnap.docs.map((item) => ({ id: item.id, ...item.data() }));
        } catch {
          reviewData = [];
        }

        try {
          const petsSnap = await getDocs(query(collection(db, 'pets'), where('ownerId', '==', currentUser.uid)));
          petData = petsSnap.docs.map((item) => ({ id: item.id, ...item.data() }));
        } catch {
          petData = [];
        }

        try {
          const completedSnap = await getDocs(query(collection(db, 'bookings'), where('carerId', '==', carerId), where('status', '==', 'completed')));
          completedCount = completedSnap.docs.length;
        } catch {
          completedCount = 0;
        }

        const averageRating = reviewData.length
          ? reviewData.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewData.length
          : 0;

        setCarer(carerData ? { ...carerData, rating: averageRating, completedServices: completedCount } : null);
        setReviews(reviewData);
        setPets(petData);
        setCompletedServices(completedCount);

        if (carerData?.location && userData?.location) {
          setDistance(calculateDistance(userData.location.lat, userData.location.lng, carerData.location.lat, carerData.location.lng));
        }
      } catch (error) {
        console.error('Error loading carer details:', error);
        try {
          const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'carer')));
          const matchedCarer = usersSnap.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .find((item) => item.id === carerId);
          if (matchedCarer) {
            setCarer({ ...matchedCarer, rating: 0, completedServices: 0 });
          }
        } catch (fallbackError) {
          console.error('Fallback carer lookup failed:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    }

    if (currentUser && carerId) loadData();
  }, [carerId, currentUser, userData]);

  const compatibility = useMemo(() => {
    if (!carer) return 0;
    return pets.length
      ? Math.max(...pets.map((pet) => getCompatibilityScore(pet, carer, distance)))
      : getCompatibilityScore({ type: '', breed: '', medical: '' }, carer, distance);
  }, [carer, pets, distance]);

  function openBooking() {
    setBookingError('');
    setBookingForm({
      petId: pets[0]?.id || '',
      service: (carer.services || ['Walking', 'Sitting'])[0] || '',
      date: ''
    });
    setBookingOpen(true);
  }

  async function handleMessage() {
    const owner = {
      uid: currentUser.uid,
      firstName: userData?.firstName || 'Unknown',
      lastName: userData?.lastName || 'Owner',
      photoURL: userData?.photoURL || '',
    };
    const carerInfo = {
      uid: carer.id,
      firstName: carer.firstName || 'Unknown',
      lastName: carer.lastName || 'Carer',
      photoURL: carer.photoURL || '',
    };
    const conversationId = await getOrCreateConversation(owner, carerInfo);
    navigate(`/chat/${conversationId}`);
  }

  async function handleSubmitBooking(e) {
    e.preventDefault();
    if (!pets.length) {
      setBookingError('Please add a pet before requesting a booking.');
      return;
    }

    const selectedPet = pets.find((pet) => pet.id === bookingForm.petId) || pets[0];
    const requestedDay = new Date(bookingForm.date).toLocaleDateString('en-US', { weekday: 'long' });
    if (carer.availability?.length && !carer.availability.includes(requestedDay)) {
      setBookingError(`This carer is not available on ${requestedDay}. Choose ${carer.availability.join(', ')}.`);
      return;
    }

    const ownerName = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'Unknown';
    const bookingRef = await addDoc(collection(db, 'bookings'), {
      ownerId: currentUser.uid,
      ownerName,
      petId: selectedPet.id,
      petName: selectedPet.name || 'Unknown',
      petBreed: selectedPet.breed || 'Unknown',
      carerId: carer.id,
      service: bookingForm.service,
      date: bookingForm.date,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    await addDoc(collection(db, 'notifications'), {
      userId: carer.id,
      type: 'new_booking',
      text: `You have a new booking request for ${bookingForm.service} on ${bookingForm.date}.`,
      bookingId: bookingRef.id,
      read: false,
      createdAt: serverTimestamp()
    });

    setBookingOpen(false);
  }

  async function handleSubmitReport(e) {
    e.preventDefault();
    if (!reportReason.trim()) return;
    await addDoc(collection(db, 'reports'), {
      reporterId: currentUser.uid,
      reportedUserId: carer.id,
      reportedUserName: `${carer.firstName || ''} ${carer.lastName || ''}`.trim(),
      reason: reportReason.trim(),
      status: 'open',
      createdAt: serverTimestamp()
    });
    setReportReason('');
    setReportOpen(false);
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-600">Loading carer profile...</div>;
  }

  if (!carer) {
    return <div className="p-8 text-center text-slate-600">Carer not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/dashboard?tab=carers')}
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to carers
      </button>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center text-lg font-bold">
                  {carer.photoURL ? (
                    <img src={carer.photoURL} alt={carer.firstName || 'Carer'} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    `${carer.firstName?.[0] || ''}${carer.lastName?.[0] || ''}`.toUpperCase() || 'C'
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{carer.firstName} {carer.lastName}</h1>
                  <p className={`text-sm font-medium ${carer.verified ? 'text-green-700' : 'text-yellow-700'}`}>
                    {carer.verified ? 'Verified carer' : 'Pending platform verification'}
                  </p>
                </div>
              </div>
              <p className={`inline-flex items-center gap-1 text-sm font-semibold ${carer.verified ? 'text-green-700' : 'text-yellow-700'}`}>
                <ShieldCheck className="w-4 h-4" />
                {carer.verified ? 'Verified by CarePaws' : 'Not verified yet'}
              </p>
            </div>

            <div className="w-full lg:w-80">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
                <span>Compatibility Score</span>
                <span className="text-brand-700">{compatibility}%</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${compatibility}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-2">Based on pet fit, services, availability, ratings, and completed work.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          <main className="lg:col-span-2 p-6 md:p-8 space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">About</h2>
              <p className="text-slate-700 leading-relaxed">{carer.bio || "Hi! I'm a passionate pet lover ready to take care of your furry friends."}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Services</h2>
              <div className="flex flex-wrap gap-2">
                {(carer.services || ['Walking', 'Sitting']).map((service) => (
                  <span key={service} className="bg-brand-50 text-brand-700 border border-brand-100 text-sm px-3 py-1 rounded-md">{service}</span>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">All Reviews</h2>
              {reviews.length ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-amber-500 mb-2">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-semibold">{Number(review.rating || 0).toFixed(1)}</span>
                      </div>
                      <p className="text-sm text-slate-700">{review.comment || 'No comment provided.'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No reviews yet.</p>
              )}
            </section>
          </main>

          <aside className="p-6 md:p-8 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200">
            <div className="space-y-5">
              <div>
                <p className="text-sm text-slate-500">Rating</p>
                <p className="font-semibold text-slate-900">
                  {carer.rating > 0 ? `${carer.rating.toFixed(1)} (${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'})` : 'New'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Completed Services</p>
                <p className="font-semibold text-slate-900">{completedServices}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Distance</p>
                <p className="font-semibold text-slate-900">{distance != null ? `${distance.toFixed(1)} km` : 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-2">Availability</p>
                <div className="flex items-start gap-2 text-slate-800">
                  <CalendarDays className="w-4 h-4 mt-0.5 text-brand-600" />
                  <p className="text-sm">{(carer.availability || []).join(', ') || 'Any day'}</p>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button onClick={openBooking} className="w-full bg-brand-600 hover:bg-brand-700 text-white px-4 py-3 rounded-lg font-semibold">
                  Book Carer
                </button>
                <button onClick={handleMessage} className="w-full inline-flex items-center justify-center gap-2 border border-brand-600 text-brand-700 px-4 py-3 rounded-lg font-semibold hover:bg-brand-50">
                  <MessageCircle className="w-4 h-4" /> Message
                </button>
                <button onClick={() => setReportOpen(true)} className="w-full inline-flex items-center justify-center gap-2 border border-red-200 text-red-600 px-4 py-3 rounded-lg font-semibold hover:bg-red-50">
                  <Flag className="w-4 h-4" /> Report
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {bookingOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmitBooking} className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Request Booking</h2>
            <p className="text-sm text-slate-500 mb-5">Choose your pet, service, and date.</p>
            {bookingError && <div className="mb-4 rounded-lg bg-red-50 text-red-700 border border-red-100 p-3 text-sm">{bookingError}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pet</label>
                <select required value={bookingForm.petId} onChange={(e) => setBookingForm({ ...bookingForm, petId: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name} ({pet.breed})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service</label>
                <select required value={bookingForm.service} onChange={(e) => setBookingForm({ ...bookingForm, service: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  {(carer.services || ['Walking', 'Sitting']).map((service) => <option key={service} value={service}>{service}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input required type="date" value={bookingForm.date} onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                <p className="text-xs text-slate-500 mt-1">Available: {(carer.availability || []).join(', ') || 'Any day'}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setBookingOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
              <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg font-medium">Request Booking</button>
            </div>
          </form>
        </div>
      )}

      {reportOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmitReport} className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Report {carer.firstName}</h2>
            <textarea required className="w-full border p-2 rounded mb-4 min-h-28" placeholder="Describe the issue." value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReportOpen(false)} className="px-3 py-2 text-slate-600">Cancel</button>
              <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded">Submit Report</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
