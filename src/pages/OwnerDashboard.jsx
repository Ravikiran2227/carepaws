import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Plus, Edit2, Trash2, Star, Clock, MessageCircle, ShieldCheck } from 'lucide-react';
import { getOrCreateConversation } from '../utils/chatHelpers';
import { getImageExtension, uploadImageFile, validateImageFile } from '../utils/imageUpload';
import { getDrivingDistanceKm } from '../utils/routeDistance';
import { calculateDistance, getCompatibilityScore } from '../utils/matching';

function FilterDropdown({ value, options, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) || options[0];

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-left text-sm font-semibold text-slate-700 shadow-inner outline-none transition hover:bg-white focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
      >
        <span>{selected.label}</span>
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">⌄</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                option.value === value
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OwnerDashboard() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pets, setPets] = useState([]);
  const [carers, setCarers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carersLoading, setCarersLoading] = useState(false);
  const activeTab = searchParams.get('tab') || 'carers';
  const [useRecommendation, setUseRecommendation] = useState(false);
  const [serviceFilter, setServiceFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [minRating, setMinRating] = useState('');
  const [maxDistance, setMaxDistance] = useState('');
  const [carerSearch, setCarerSearch] = useState('');
  const [selectedCarer, setSelectedCarer] = useState(null);
  const [reportCarer, setReportCarer] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [bookingCarer, setBookingCarer] = useState(null);
  const [bookingForm, setBookingForm] = useState({ petId: '', service: '', date: '' });
  const [bookingError, setBookingError] = useState('');

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  // Pet form state
  const [showPetForm, setShowPetForm] = useState(false);
  const [editingPetId, setEditingPetId] = useState(null);
  const emptyPetForm = { name: '', type: 'Dog', breed: '', age: '', feeding: '', medical: '', behaviour: '', imageUrl: '' };
  const [petForm, setPetForm] = useState(emptyPetForm);
  const [petImageFile, setPetImageFile] = useState(null);

  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
        }
      );
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    fetchData();

    const bookingsQuery = query(collection(db, 'bookings'), where('ownerId', '==', currentUser.uid));
    const unsubscribeBookings = onSnapshot(bookingsQuery, (snap) => {
      const ownerBookings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(ownerBookings);
    });

    return () => {
      if (unsubscribeBookings) unsubscribeBookings();
    };
  }, [currentUser, userLocation, useRecommendation, serviceFilter, availabilityFilter, minRating, maxDistance, carerSearch]);

  async function fetchData() {
    if (loading) {
      setLoading(true);
    } else {
      setCarersLoading(true);
    }
    try {
      // Fetch Pets
      const petsQuery = query(collection(db, 'pets'), where('ownerId', '==', currentUser.uid));
      const petsSnap = await getDocs(petsQuery);
      const fetchedPets = petsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPets(fetchedPets);

      // Fetch Carers
      const carersQuery = query(collection(db, 'users'), where('role', '==', 'carer'));
      const carersSnap = await getDocs(carersQuery);
      let fetchedCarers = carersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch all reviews to calculate ratings
      const allReviewsQuery = query(collection(db, 'reviews'));
      // const allReviewsSnap = await getDocs(allReviewsQuery);
      // const allReviews = allReviewsSnap.docs.map(doc => doc.data());

      let allReviews = [];

      try {
        const allReviewsSnap = await getDocs(allReviewsQuery);
        allReviews = allReviewsSnap.docs.map(doc => doc.data());
      } catch {
        allReviews = [];
      }

      // Fetch all completed bookings to calculate completed services
      const allBookingsQuery = query(collection(db, 'bookings'), where('status', '==', 'completed'));
      // const allBookingsSnap = await getDocs(allBookingsQuery);
      // const allBookings = allBookingsSnap.docs.map(doc => doc.data());

      let allBookings = [];

      try {
        const allBookingsSnap = await getDocs(allBookingsQuery);
        allBookings = allBookingsSnap.docs.map(doc => doc.data());
      } catch {
        allBookings = [];
      }

      // Recommendation Logic
      fetchedCarers = await Promise.all(fetchedCarers.map(async (carer) => {



        const carerReviews = allReviews.filter(r => r.carerId === carer.id);
        const reviewCount = carerReviews.length;
        const averageRating = reviewCount > 0
          ? carerReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : 0;

        let distance = null;
        let straightLineDistance = null;
        if (userLocation && carer.location) {
          straightLineDistance = calculateDistance(
            userLocation.lat, userLocation.lng,
            carer.location.lat, carer.location.lng
          );
          try {
            distance = await getDrivingDistanceKm(userLocation, carer.location);
          } catch (error) {
            console.warn('openrouteservice distance failed:', error);
          }
          distance = distance ?? straightLineDistance;
        }

        const completedServices = allBookings.filter(b => b.carerId === carer.id).length;
        const scoreCarer = { ...carer, rating: averageRating, completedServices };
        const compatibilityScore = fetchedPets.length > 0
          ? Math.max(...fetchedPets.map(pet => getCompatibilityScore(pet, scoreCarer, distance)))
          : getCompatibilityScore({ type: '', breed: '', medical: '' }, scoreCarer, distance);

        let finalScore = 0;
        if (useRecommendation) {
          finalScore = compatibilityScore;
        }

        return {
          ...carer,
          reviewCount,
          rating: averageRating,
          reviews: carerReviews,
          distance,
          straightLineDistance,
          compatibilityScore,
          completedServices,
          finalScore
        };
      }));

      // Recommendation Logic

      if (useRecommendation) {
        fetchedCarers = fetchedCarers.filter(carer =>
          carer.distance == null || carer.distance <= 10
        );
      }

      if (serviceFilter) {
        fetchedCarers = fetchedCarers.filter(carer =>
          (carer.services || ['Walking', 'Sitting']).includes(serviceFilter)
        );
      }

      if (availabilityFilter) {
        fetchedCarers = fetchedCarers.filter(carer =>
          (carer.availability || []).includes(availabilityFilter)
        );
      }

      if (minRating) {
        fetchedCarers = fetchedCarers.filter(carer => carer.rating >= Number(minRating));
      }

      if (maxDistance && userLocation) {
        fetchedCarers = fetchedCarers.filter(carer =>
          carer.distance == null || carer.distance <= Number(maxDistance)
        );
      }

      if (carerSearch.trim()) {
        const search = carerSearch.trim().toLowerCase();
        fetchedCarers = fetchedCarers.filter(carer =>
          `${carer.firstName || ''} ${carer.lastName || ''}`.toLowerCase().includes(search) ||
          String(carer.email || '').toLowerCase().includes(search)
        );
      }

      // Sorting
      if (useRecommendation) {
        fetchedCarers.sort((a, b) => b.finalScore - a.finalScore);
      } else {
        fetchedCarers.sort((a, b) => b.rating - a.rating);
      }

      setCarers(fetchedCarers);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setCarersLoading(false);
    }
  }

  async function handleAddPet(e) {
    e.preventDefault();
    try {
      let imageUrl = petForm.imageUrl || '';
      if (petImageFile) {
        const extension = getImageExtension(petImageFile);
        const petImageId = editingPetId || `${currentUser.uid}-${Date.now()}`;
        imageUrl = await uploadImageFile(
          `petImages/${currentUser.uid}/${petImageId}-${Date.now()}.${extension}`,
          petImageFile
        );
      }

      if (editingPetId) {
        await updateDoc(doc(db, 'pets', editingPetId), { ...petForm, imageUrl });
      } else {
        await addDoc(collection(db, 'pets'), {
          ...petForm,
          imageUrl,
          ownerId: currentUser.uid,
          createdAt: new Date().toISOString()
        });
      }
      setShowPetForm(false);
      setEditingPetId(null);
      setPetForm(emptyPetForm);
      setPetImageFile(null);
      fetchData();
    } catch (error) {
      console.error("Error adding pet", error);
      alert(error.message || 'Could not save pet image/profile.');
    }
  }

  function handleEditPet(pet) {
    setEditingPetId(pet.id);
    setPetForm({
      name: pet.name || '',
      type: pet.type || 'Dog',
      breed: pet.breed || '',
      age: pet.age || '',
      feeding: pet.feeding || '',
      medical: pet.medical || '',
      behaviour: pet.behaviour || '',
      imageUrl: pet.imageUrl || ''
    });
    setPetImageFile(null);
    setShowPetForm(true);
  }

  function openBookingModal(carer) {
    if (pets.length === 0) {
      alert("Please add a pet first!");
      return;
    }
    setBookingCarer(carer);
    setBookingError('');
    setBookingForm({
      petId: pets[0]?.id || '',
      service: (carer.services || ['Walking', 'Sitting'])[0] || '',
      date: ''
    });
  }

  async function handleSubmitBooking(e) {
    e.preventDefault();
    if (!bookingCarer) return;
    const selectedPet = pets.find(pet => pet.id === bookingForm.petId) || pets[0];
    const requestedDay = new Date(bookingForm.date).toLocaleDateString('en-US', { weekday: 'long' });

    if (bookingCarer.availability?.length && !bookingCarer.availability.includes(requestedDay)) {
      setBookingError(`This carer is not available on ${requestedDay}. Choose ${bookingCarer.availability.join(', ')}.`);
      return;
    }

    try {
      const cleanOwnerName = userData ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() : (currentUser?.displayName || 'Unknown');

      const bookingRef = await addDoc(collection(db, 'bookings'), {
        ownerId: currentUser?.uid || '',
        ownerName: cleanOwnerName || 'Unknown',
        petId: selectedPet?.id || '',
        petName: selectedPet?.name || 'Unknown',
        petBreed: selectedPet?.breed || 'Unknown',
        carerId: bookingCarer.id || '',
        service: bookingForm.service.trim(),
        date: bookingForm.date,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'notifications'), {
        userId: bookingCarer.id,
        type: 'new_booking',
        text: `You have a new booking request for ${bookingForm.service} on ${bookingForm.date}.`,
        bookingId: bookingRef.id,
        read: false,
        createdAt: serverTimestamp()
      });

      setBookingCarer(null);
      setBookingForm({ petId: '', service: '', date: '' });
    } catch (error) {
      console.error("Error booking carer", error);
      setBookingError('Could not request this booking. Please try again.');
    }
  }

  async function handleDeletePet(petId) {
    if (confirm('Are you sure you want to remove this pet?')) {
      try {
        await deleteDoc(doc(db, 'pets', petId));
        fetchData();
      } catch (error) {
        console.error("Error deleting pet", error);
      }
    }
  }

  async function handleReview(booking, rating, comment) {
    try {
      // Add review
      await addDoc(collection(db, 'reviews'), {
        bookingId: booking.id,
        carerId: booking.carerId,
        ownerId: currentUser.uid,
        rating,
        comment,
        createdAt: serverTimestamp()
      });

      // Mark booking as reviewed
      await updateDoc(doc(db, 'bookings', booking.id), { reviewed: true });

      // Force UI update immediately
      setBookings(prev =>
        prev.map(b =>
          b.id === booking.id ? { ...b, reviewed: true } : b
        )
      );

      alert('Review submitted successfully!');
      // fetchData();
    } catch (error) {
      console.error("Error submitting review", error);
    }
  }

  async function handleMessageCarer(carer) {
    try {
      if (!currentUser) throw new Error('User not logged in');
      if (!carer || !carer.id) throw new Error('Invalid carer information');

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

      console.log("Owner:", owner);
      console.log("Carer:", carerInfo);

      const convId = await getOrCreateConversation(owner, carerInfo);

      if (convId) {
        navigate(`/chat/${convId}`);
      } else {
        throw new Error('Failed to generate conversation ID');
      }
    } catch (error) {
      console.error('Error opening chat:', error);
      alert('Could not start conversation: ' + error.message);
    }
  }

  async function handleSubmitReport(e) {
    e.preventDefault();
    if (!reportCarer || !reportReason.trim()) return;
    await addDoc(collection(db, 'reports'), {
      reporterId: currentUser.uid,
      reportedUserId: reportCarer.id,
      reportedUserName: `${reportCarer.firstName || ''} ${reportCarer.lastName || ''}`.trim(),
      reason: reportReason.trim(),
      status: 'open',
      createdAt: serverTimestamp()
    });
    setReportCarer(null);
    setReportReason('');
    alert('Report submitted.');
  }

  if (loading) return <div className="p-8 text-center"><Clock className="animate-spin inline mr-2" /> Loading dashboard...</div>;

  const totalBookings = bookings.length;

  const completedBookings = bookings.filter(
    (b) => b.status === 'completed'
  ).length;

  const pendingBookings = bookings.filter(
    (b) => b.status === 'pending'
  ).length;

  const serviceOptions = [
    { value: '', label: 'All services' },
    { value: 'Walking', label: 'Walking' },
    { value: 'Sitting', label: 'Sitting' },
    { value: 'Boarding', label: 'Boarding' },
    { value: 'Drop-in Visits', label: 'Drop-in Visits' },
    { value: 'Grooming', label: 'Grooming' },
  ];
  const availabilityOptions = [
    { value: '', label: 'Any availability' },
    ...['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => ({ value: day, label: day })),
  ];
  const ratingOptions = [
    { value: '', label: 'Any rating' },
    { value: '4', label: '4+ stars' },
    { value: '3', label: '3+ stars' },
    { value: '1', label: '1+ stars' },
  ];

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow border">
          <h3 className="text-sm text-gray-500">Total Bookings</h3>
          <p className="text-2xl font-bold">{totalBookings}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow border">
          <h3 className="text-sm text-gray-500">Completed</h3>
          <p className="text-2xl font-bold text-green-600">{completedBookings}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow border">
          <h3 className="text-sm text-gray-500">Pending</h3>
          <p className="text-2xl font-bold text-yellow-600">{pendingBookings}</p>
        </div>
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Pet Owner Dashboard</h1>
        <p className="text-slate-600 mt-2">Manage your pets, find carers, and track bookings.</p>
      </div>

      <div className="lg:hidden grid grid-cols-3 gap-2 mb-6">
        {[
          ['carers', 'Find Carers'],
          ['pets', 'My Pets'],
          ['bookings', 'My Bookings']
        ].map(([tab, label]) => (
          <Link
            key={tab}
            to={`/dashboard?tab=${tab}`}
            className={`text-center rounded-lg px-3 py-2 text-sm font-medium border ${
              activeTab === tab
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {activeTab === 'pets' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Your Furry Friends</h2>
            <button
              onClick={() => {
                setShowPetForm(!showPetForm);
                setEditingPetId(null);
                setPetForm(emptyPetForm);
                setPetImageFile(null);
              }}
              className="bg-brand-100 text-brand-700 px-4 py-2 rounded-lg font-medium hover:bg-brand-200 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Pet
            </button>
          </div>

          {showPetForm && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
              <h3 className="font-semibold mb-4">{editingPetId ? 'Edit Pet' : 'Add a New Pet'}</h3>
              <form onSubmit={handleAddPet} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Pet Name" className="border p-2 rounded" value={petForm.name} onChange={e => setPetForm({ ...petForm, name: e.target.value })} />
                <select required className="border p-2 rounded" value={petForm.type} onChange={e => setPetForm({ ...petForm, type: e.target.value })}>
                  {['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'].map(type => <option key={type}>{type}</option>)}
                </select>
                <input required placeholder="Breed" className="border p-2 rounded" value={petForm.breed} onChange={e => setPetForm({ ...petForm, breed: e.target.value })} />
                <input required type="number" placeholder="Age" className="border p-2 rounded" value={petForm.age} onChange={e => setPetForm({ ...petForm, age: e.target.value })} />
                <input required placeholder="Feeding instructions" className="border p-2 rounded" value={petForm.feeding} onChange={e => setPetForm({ ...petForm, feeding: e.target.value })} />
                <input placeholder="Medical needs" className="border p-2 rounded" value={petForm.medical} onChange={e => setPetForm({ ...petForm, medical: e.target.value })} />
                <input placeholder="Behaviour notes" className="border p-2 rounded" value={petForm.behaviour} onChange={e => setPetForm({ ...petForm, behaviour: e.target.value })} />
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 items-center">
                  <div className="h-32 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center text-sm text-slate-400">
                    {petImageFile ? (
                      <img src={URL.createObjectURL(petImageFile)} alt="Pet preview" className="w-full h-full object-cover" />
                    ) : petForm.imageUrl ? (
                      <img src={petForm.imageUrl} alt="Pet" className="w-full h-full object-cover" />
                    ) : (
                      'Pet photo'
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Pet Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        try {
                          if (file) validateImageFile(file);
                          setPetImageFile(file);
                        } catch (error) {
                          setPetImageFile(null);
                          alert(error.message);
                        }
                      }}
                      className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
                    />
                    <p className="text-xs text-slate-400 mt-2">Uploads to Firebase Storage when enabled.</p>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-700">{editingPetId ? 'Update Pet' : 'Save Pet'}</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pets.map(pet => (
              <div key={pet.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative group">
                <div className="h-44 -mx-6 -mt-6 mb-5 bg-slate-50 border-b border-slate-100 overflow-hidden rounded-t-xl">
                  {pet.imageUrl ? (
                    <img src={pet.imageUrl} alt={pet.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No pet image</div>
                  )}
                </div>
                <button
                  onClick={() => handleEditPet(pet)}
                  className="absolute top-4 right-12 text-slate-400 hover:text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit Pet"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeletePet(pet.id)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove Pet"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-lg pr-8">{pet.name}</h3>
                <p className="text-slate-500 text-sm mb-4">{pet.type || 'Pet'} - {pet.breed}, {pet.age} yrs</p>
                <div className="space-y-2 text-sm">
                  <p><strong>Feeding:</strong> {pet.feeding}</p>
                  {pet.medical && <p><strong>Medical:</strong> {pet.medical}</p>}
                  {pet.behaviour && <p><strong>Behaviour:</strong> {pet.behaviour}</p>}
                </div>
              </div>
            ))}
            {pets.length === 0 && !showPetForm && (
              <p className="text-slate-500 col-span-3">You haven't added any pets yet.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'carers' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Available Carers</h2>
            <button
              onClick={() => setUseRecommendation(!useRecommendation)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${useRecommendation
                ? 'bg-brand-600 text-white hover:bg-brand-700'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
            >
              {useRecommendation ? 'Show All' : 'Apply Smart Match'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <input className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100" type="search" placeholder="Search carer name" value={carerSearch} onChange={(e) => setCarerSearch(e.target.value)} />
            <FilterDropdown value={serviceFilter} options={serviceOptions} onChange={setServiceFilter} />
            <FilterDropdown value={availabilityFilter} options={availabilityOptions} onChange={setAvailabilityFilter} />
            <FilterDropdown value={minRating} options={ratingOptions} onChange={setMinRating} />
            <input className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100" type="number" min="1" placeholder="Max distance km" value={maxDistance} onChange={(e) => setMaxDistance(e.target.value)} />
          </div>
          {carersLoading && (
            <div className="mb-4 text-sm text-slate-500">Updating carers...</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 items-stretch">
            {carers.map((carer, index) => (
              <div
                key={carer.id}
                onClick={() => navigate(`/carers/${carer.id}`)}
                className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg hover:border-brand-200 transition-all h-[575px] flex flex-col overflow-hidden"
              >
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-3 min-h-12">
                    <h3 className="font-bold text-lg text-slate-900 leading-snug min-w-0 pr-2">{carer.firstName} {carer.lastName}</h3>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {useRecommendation && index === 0 && carer.finalScore > 0 && (
                        <div className="bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                          Top Match
                        </div>
                      )}
                      <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shadow-sm border ${
                        carer.verified
                          ? 'bg-green-600 text-white border-green-700'
                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }`}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {carer.verified ? 'Verified' : 'Pending'}
                      </div>
                    </div>
                  </div>
                  <div>
                    {carer.distance != null && (
                      <div className="mt-2 inline-flex max-w-full items-center rounded-md bg-brand-50 border border-brand-100 px-2 py-1 text-xs font-semibold text-brand-700">
                        {carer.distance.toFixed(1)} km away
                      </div>
                    )}

                    <div className="mt-3 w-44">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                        <span>Compatibility</span>
                        <span>{carer.compatibilityScore ?? 0}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${carer.compatibilityScore ?? 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-start text-amber-500 text-sm mt-3 min-h-14">
                      <div className="text-sm text-slate-600 flex-1 min-w-0">
                        {carer.reviews && carer.reviews.length > 0 ? (
                          carer.reviews.slice(0, 2).map((r, i) => (
                            <p key={i} className="italic truncate">{r.comment || 'No comment'}</p>
                          ))
                        ) : (
                          <p className="text-slate-400">No reviews yet</p>
                        )}
                      </div>
                      <div className="flex items-center shrink-0 ml-2">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="ml-1 font-medium">
                          {carer.rating > 0 ? carer.rating.toFixed(1) : 'New'}
                        </span>
                        {carer.reviewCount > 0 && (
                          <span className="ml-1 text-slate-500">({carer.reviewCount})</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-700 mb-5 leading-relaxed h-16 overflow-hidden">
                  {carer.bio || "Hi! I'm a passionate pet lover ready to take care of your furry friends."}
                </p>
                <div className="mb-5 min-h-28">
                  <strong className="text-xs text-slate-500 uppercase tracking-wider">Services offered:</strong>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(carer.services || ['Walking', 'Sitting']).map(s => (
                      <span key={s} className="bg-slate-100 text-slate-700 text-sm px-3 py-1.5 rounded-md">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="mb-6 min-h-20">
                  <strong className="text-xs text-slate-500 uppercase tracking-wider">Availability:</strong>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed line-clamp-3">
                    {(carer.availability || []).join(', ') || 'Not specified'}
                  </p>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/carers/${carer.id}`);
                    }}
                    className="flex-1 border border-slate-300 text-slate-700 px-3 py-2.5 rounded-lg font-semibold hover:bg-slate-50 transition-colors text-sm"
                  >
                    Profile
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMessageCarer(carer);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-brand-600 text-brand-600 px-3 py-2.5 rounded-lg font-semibold hover:bg-brand-50 transition-colors text-sm"
                  >
                    <MessageCircle className="w-4 h-4" /> Message
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openBookingModal(carer);
                    }}
                    className="flex-1 bg-brand-600 text-white px-3 py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition-colors text-sm"
                  >
                    Book
                  </button>
                </div>
              </div>
            ))}
          </div>
          {carers.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">No carers match these filters.</div>
          )}
        </div>
      )}

      {activeTab === 'bookings' && (
        <div>
          <h2 className="text-xl font-semibold mb-6">Your Bookings</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {bookings.map(booking => (
                  <tr key={booking.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{booking.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{booking.service}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          booking.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {booking.status === 'completed' && !booking.reviewed && (
                        <button
                          // onClick={() => {
                          //   const rating = prompt("Rate out of 5:");
                          //   const comment = prompt("Leave a comment:");
                          //   if(rating && comment) handleReview(booking, parseInt(rating), comment);
                          // }}

                          onClick={() => setSelectedBooking(booking)}
                          className="text-brand-600 hover:text-brand-900 font-medium"
                        >
                          Leave Review
                        </button>
                      )}
                      {booking.reviewed && <span className="text-slate-500">Reviewed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bookings.length === 0 && (
              <div className="p-6 text-center text-slate-500">No bookings found.</div>
            )}

            {selectedBooking && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-xl w-96 shadow-lg">
                  <h2 className="text-lg font-semibold mb-4">Leave a Review</h2>

                  {/* ⭐ Star Rating */}
                  <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`text-2xl ${star <= rating ? 'text-yellow-500' : 'text-gray-300'
                          }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  {/* 💬 Comment */}
                  <textarea
                    placeholder="Write your feedback..."
                    className="w-full border p-2 rounded mb-4"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />

                  {/* Buttons */}
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setSelectedBooking(null)}
                      className="px-3 py-1 text-gray-600"
                    >
                      Cancel
                    </button>
                    {/* <button
                      onClick={() => {
                        handleReview(selectedBooking, rating, comment);
                        setSelectedBooking(null);
                        setRating(0);
                        setComment('');
                      }}
                      className="bg-brand-600 text-white px-4 py-2 rounded"
                    >
                      Submit
                    </button> */}

                    <button
                      onClick={() => {
                        if (rating === 0) {
                          alert("Please select a rating ⭐");
                          return;
                        }

                        if (!comment.trim()) {
                          alert("Please write a comment 💬");
                          return;
                        }

                        handleReview(selectedBooking, rating, comment);
                        setSelectedBooking(null);
                        setRating(0);
                        setComment('');
                      }}
                      className="bg-brand-600 text-white px-4 py-2 rounded"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedCarer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-lg">
            <h2 className="text-xl font-bold mb-1">{selectedCarer.firstName} {selectedCarer.lastName}</h2>
            <p className="text-sm text-slate-500 mb-4">{selectedCarer.verified ? 'Verified carer' : 'Pending platform verification'}</p>
            <p className="text-slate-700 mb-4">{selectedCarer.bio || "No bio added yet."}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
              <p><strong>Rating:</strong> {selectedCarer.rating > 0 ? selectedCarer.rating.toFixed(1) : 'New'}</p>
              <p><strong>Completed:</strong> {selectedCarer.completedServices || 0}</p>
              <p><strong>Services:</strong> {(selectedCarer.services || ['Walking', 'Sitting']).join(', ')}</p>
              <p><strong>Availability:</strong> {(selectedCarer.availability || []).join(', ') || 'Not specified'}</p>
              <p><strong>Preferred pets:</strong> {(selectedCarer.preferredPets || []).join(', ') || 'Not specified'}</p>
              <p><strong>Distance:</strong> {selectedCarer.distance != null ? `${selectedCarer.distance.toFixed(1)} km` : 'Unknown'}</p>
            </div>
            <div className="mb-4">
              <strong className="text-sm">Recent feedback</strong>
              {(selectedCarer.reviews || []).length ? selectedCarer.reviews.slice(0, 3).map((review, i) => (
                <p key={i} className="text-sm text-slate-600 mt-1">"{review.comment}"</p>
              )) : <p className="text-sm text-slate-500 mt-1">No reviews yet.</p>}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setReportCarer(selectedCarer)} className="px-4 py-2 text-red-600">Report</button>
              <button onClick={() => setSelectedCarer(null)} className="px-4 py-2 text-slate-600">Close</button>
              <button onClick={() => openBookingModal(selectedCarer)} className="px-4 py-2 bg-brand-600 text-white rounded">Book</button>
            </div>
          </div>
        </div>
      )}

      {reportCarer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmitReport} className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Report {reportCarer.firstName}</h2>
            <textarea
              required
              className="w-full border p-2 rounded mb-4 min-h-28"
              placeholder="Describe the issue."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReportCarer(null)} className="px-3 py-2 text-slate-600">Cancel</button>
              <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded">Submit Report</button>
            </div>
          </form>
        </div>
      )}

      {bookingCarer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmitBooking} className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Book {bookingCarer.firstName} {bookingCarer.lastName}</h2>
            <p className="text-sm text-slate-500 mb-5">Choose your pet, service, and date.</p>

            {bookingError && (
              <div className="mb-4 rounded-lg bg-red-50 text-red-700 border border-red-100 p-3 text-sm">
                {bookingError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pet</label>
                <select
                  required
                  value={bookingForm.petId}
                  onChange={(e) => setBookingForm({ ...bookingForm, petId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                >
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>{pet.name} ({pet.breed})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service</label>
                <select
                  required
                  value={bookingForm.service}
                  onChange={(e) => setBookingForm({ ...bookingForm, service: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                >
                  {(bookingCarer.services || ['Walking', 'Sitting']).map((service) => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  required
                  type="date"
                  value={bookingForm.date}
                  onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Available: {(bookingCarer.availability || []).join(', ') || 'Any day'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setBookingCarer(null)} className="px-4 py-2 text-slate-600">Cancel</button>
              <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg font-medium">Request Booking</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

