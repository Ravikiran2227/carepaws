import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Users, CalendarDays, PawPrint, TrendingUp, ShieldCheck, Flag, Star, X, LayoutDashboard, UserRound, ListChecks } from 'lucide-react';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [pets, setPets] = useState([]);
  const [reports, setReports] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedCarer, setSelectedCarer] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingUser, setEditingUser] = useState(null);
  const [editingPet, setEditingPet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const bookingsSnap = await getDocs(collection(db, 'bookings'));
      setBookings(bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const petsSnap = await getDocs(collection(db, 'pets'));
      setPets(petsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const reportsSnap = await getDocs(collection(db, 'reports'));
      setReports(reportsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const reviewsSnap = await getDocs(collection(db, 'reviews'));
      setReviews(reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching data for admin:", error);
    }
    setLoading(false);
  }

  async function handleVerifyCarer(userId, verified) {
    await updateDoc(doc(db, 'users', userId), {
      verified,
      verifiedAt: verified ? serverTimestamp() : null
    });
    setUsers(prev => prev.map(user => user.id === userId ? { ...user, verified } : user));
    setSelectedCarer(prev => prev?.id === userId ? { ...prev, verified } : prev);
  }

  async function handleResolveReport(reportId) {
    await updateDoc(doc(db, 'reports', reportId), {
      status: 'resolved',
      resolvedAt: serverTimestamp()
    });
    setReports(prev => prev.map(report => report.id === reportId ? { ...report, status: 'resolved' } : report));
  }

  async function handleDeleteUser(userId) {
    if (!confirm('Remove this user profile from Firestore?')) return;
    await deleteDoc(doc(db, 'users', userId));
    setUsers(prev => prev.filter(user => user.id !== userId));
  }

  async function handleSaveUser(e) {
    e.preventDefault();
    if (!editingUser) return;
    const payload = {
      firstName: editingUser.firstName || '',
      lastName: editingUser.lastName || '',
      email: editingUser.email || '',
      role: editingUser.role || 'owner',
      bio: editingUser.bio || '',
      services: Array.isArray(editingUser.services)
        ? editingUser.services
        : String(editingUser.services || '').split(',').map(item => item.trim()).filter(Boolean),
      availability: Array.isArray(editingUser.availability)
        ? editingUser.availability
        : String(editingUser.availability || '').split(',').map(item => item.trim()).filter(Boolean),
      verified: Boolean(editingUser.verified)
    };
    await updateDoc(doc(db, 'users', editingUser.id), payload);
    setUsers(prev => prev.map(user => user.id === editingUser.id ? { ...user, ...payload } : user));
    setEditingUser(null);
  }

  async function handleDeletePet(petId) {
    if (!confirm('Remove this pet profile?')) return;
    await deleteDoc(doc(db, 'pets', petId));
    setPets(prev => prev.filter(pet => pet.id !== petId));
  }

  async function handleSavePet(e) {
    e.preventDefault();
    if (!editingPet) return;
    const payload = {
      name: editingPet.name || '',
      type: editingPet.type || 'Dog',
      breed: editingPet.breed || '',
      age: editingPet.age || '',
      feeding: editingPet.feeding || '',
      medical: editingPet.medical || '',
      behaviour: editingPet.behaviour || '',
      imageUrl: editingPet.imageUrl || ''
    };
    await updateDoc(doc(db, 'pets', editingPet.id), payload);
    setPets(prev => prev.map(pet => pet.id === editingPet.id ? { ...pet, ...payload } : pet));
    setEditingPet(null);
  }

  if (loading) return <div className="p-8 text-center">Loading admin data...</div>;

  const totalCarers = users.filter(u => u.role === 'carer').length;
  const totalOwners = users.filter(u => u.role === 'owner').length;
  const pendingCarers = users.filter(u => u.role === 'carer' && !u.verified);
  const openReports = reports.filter(r => r.status !== 'resolved');
  const completedBookings = bookings.filter(b => b.status === 'completed').length;

  function getCarerStats(carer) {
    const carerReviews = reviews.filter(review => review.carerId === carer.id);
    const carerBookings = bookings.filter(booking => booking.carerId === carer.id);
    const completed = carerBookings.filter(booking => booking.status === 'completed').length;
    const averageRating = carerReviews.length
      ? carerReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / carerReviews.length
      : 0;

    return { carerReviews, carerBookings, completed, averageRating };
  }

  function getUserDisplayName(userId) {
    const user = users.find(item => item.id === userId || item.uid === userId);
    if (!user) return userId || 'Unknown';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || userId;
  }

  const adminTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'recentBookings', label: 'Recent Bookings', icon: ListChecks },
    { id: 'verification', label: 'Carer Verification', icon: ShieldCheck },
    { id: 'carers', label: 'Carers', icon: ShieldCheck },
    { id: 'owners', label: 'Pet Owners', icon: UserRound },
    { id: 'pets', label: 'Pets', icon: PawPrint },
    { id: 'reports', label: 'Reports', icon: Flag },
  ];

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        <aside className="admin-sidebar border border-slate-200 rounded-xl shadow-sm p-3 h-fit lg:sticky lg:top-24">
          {adminTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`admin-sidebar-link w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === id
                  ? 'active'
                  : ''
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </aside>

        <main>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-600 mt-2">Platform overview and analytics.</p>
      </div>

      {activeTab === 'overview' && (
        <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-3 bg-brand-100 text-brand-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Total Users</p>
              <h3 className="text-2xl font-bold text-slate-900">{users.length}</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Total Bookings</p>
              <h3 className="text-2xl font-bold text-slate-900">{bookings.length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-3 bg-pink-100 text-pink-600 rounded-lg">
              <PawPrint className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Registered Pets</p>
              <h3 className="text-2xl font-bold text-slate-900">{pets.length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Completed Jobs</p>
              <h3 className="text-2xl font-bold text-slate-900">{completedBookings}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Pet Owners</p>
          <h3 className="text-2xl font-bold text-slate-900">{totalOwners}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Carers</p>
          <h3 className="text-2xl font-bold text-slate-900">{totalCarers}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Pending Verification</p>
          <h3 className="text-2xl font-bold text-yellow-700">{pendingCarers.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Open Reports</p>
          <h3 className="text-2xl font-bold text-red-700">{openReports.length}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Recent Users</h2>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {users.slice(0, 5).map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 capitalize">{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Recent Bookings</h2>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {bookings.slice(0, 5).map(booking => (
                <tr key={booking.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{booking.service}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 capitalize">{booking.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-slate-800">Carer Verification</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {users.filter(user => user.role === 'carer').map(user => (
              <div key={user.id} className="p-4 flex items-center justify-between gap-4">
                <button
                  onClick={() => setSelectedCarer(user)}
                  className="text-left flex-1 rounded-lg p-2 -m-2 hover:bg-slate-50 transition-colors"
                >
                  <p className="font-medium text-slate-900">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  <p className="text-xs text-slate-500">{(user.services || []).join(', ') || 'No services listed'}</p>
                  <p className="text-xs text-brand-700 mt-1">View detailed profile</p>
                </button>
                <button
                  onClick={() => handleVerifyCarer(user.id, !user.verified)}
                  className={`px-3 py-2 rounded text-sm font-medium ${user.verified ? 'bg-slate-100 text-slate-700' : 'bg-brand-600 text-white'}`}
                >
                  {user.verified ? 'Unverify' : 'Verify'}
                </button>
              </div>
            ))}
            {users.filter(user => user.role === 'carer').length === 0 && (
              <div className="p-6 text-center text-slate-500">No carers found.</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-slate-800">Reports and Disputes</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {reports.map(report => (
              <div key={report.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{report.reportedUserName || report.reportedUserId}</p>
                    <p className="text-sm text-slate-600 mt-1">{report.reason}</p>
                    <p className="text-xs text-slate-400 mt-1">Status: {report.status || 'open'}</p>
                  </div>
                  {report.status !== 'resolved' && (
                    <button
                      onClick={() => handleResolveReport(report.id)}
                      className="px-3 py-2 rounded bg-green-600 text-white text-sm font-medium"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
            {reports.length === 0 && (
              <div className="p-6 text-center text-slate-500">No reports submitted.</div>
            )}
          </div>
        </div>
      </div>

        </>
      )}

      {activeTab === 'carers' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Manage Carers</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {users.filter(user => user.role === 'carer').map(user => (
              <div key={user.id} className="p-5 flex items-center justify-between gap-4">
                <button onClick={() => setSelectedCarer(user)} className="text-left flex-1">
                  <p className="font-semibold text-slate-900">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  <p className="text-xs text-slate-500">{(user.services || []).join(', ') || 'No services listed'}</p>
                </button>
                <div className="flex gap-2">
                  <button onClick={() => setEditingUser(user)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold">Edit</button>
                  <button onClick={() => handleDeleteUser(user.id)} className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-semibold">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'recentBookings' && (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Recent Bookings</h2>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {bookings.map(booking => (
                <tr key={booking.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{booking.service}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{booking.date || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{booking.ownerName || getUserDisplayName(booking.ownerId)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 capitalize">{booking.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {bookings.length === 0 && <div className="p-8 text-center text-slate-500">No bookings found.</div>}
        </section>
      )}

      {activeTab === 'verification' && (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-slate-800">Carer Verification</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {users.filter(user => user.role === 'carer').map(user => (
              <div key={user.id} className="p-5 flex items-center justify-between gap-4">
                <button
                  onClick={() => setSelectedCarer(user)}
                  className="text-left flex-1 rounded-lg p-2 -m-2 hover:bg-slate-50 transition-colors"
                >
                  <p className="font-medium text-slate-900">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  <p className="text-xs text-slate-500">{(user.services || []).join(', ') || 'No services listed'}</p>
                  <p className="text-xs text-brand-700 mt-1">View detailed profile</p>
                </button>
                <button
                  onClick={() => handleVerifyCarer(user.id, !user.verified)}
                  className={`px-3 py-2 rounded text-sm font-medium ${user.verified ? 'bg-slate-100 text-slate-700' : 'bg-brand-600 text-white'}`}
                >
                  {user.verified ? 'Unverify' : 'Verify'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'owners' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Manage Pet Owners</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {users.filter(user => user.role === 'owner').map(user => (
              <div key={user.id} className="p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  <p className="text-xs text-slate-500">{pets.filter(pet => pet.ownerId === user.id || pet.ownerId === user.uid).length} pets registered</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingUser(user)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold">Edit</button>
                  <button onClick={() => handleDeleteUser(user.id)} className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-semibold">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'pets' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Manage Pet Profiles</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-5">
            {pets.map(pet => (
              <div key={pet.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="h-40 bg-slate-50">
                  {pet.imageUrl ? <img src={pet.imageUrl} alt={pet.name} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-slate-400">No image</div>}
                </div>
                <div className="p-4">
                  <p className="font-semibold text-slate-900">{pet.name}</p>
                  <p className="text-sm text-slate-500">{pet.type || 'Pet'} - {pet.breed || 'Unknown breed'}</p>
                  <p className="text-sm text-slate-500">Owner: {getUserDisplayName(pet.ownerId)}</p>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setEditingPet(pet)} className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold">Edit</button>
                    <button onClick={() => handleDeletePet(pet.id)} className="flex-1 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-semibold">Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'reports' && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Reports and Disputes</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {reports.map(report => (
              <div key={report.id} className="p-5 flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{report.reportedUserName || report.reportedUserId}</p>
                  <p className="text-sm text-slate-600 mt-1">{report.reason}</p>
                  <p className="text-xs text-slate-400 mt-1">Status: {report.status || 'open'}</p>
                </div>
                {report.status !== 'resolved' && (
                  <button onClick={() => handleResolveReport(report.id)} className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold">Resolve</button>
                )}
              </div>
            ))}
            {reports.length === 0 && <div className="p-8 text-center text-slate-500">No reports submitted.</div>}
          </div>
        </section>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveUser} className="bg-white rounded-xl shadow-lg w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Edit User</h2>
              <button type="button" onClick={() => setEditingUser(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="border rounded-lg px-3 py-2" placeholder="First name" value={editingUser.firstName || ''} onChange={e => setEditingUser({ ...editingUser, firstName: e.target.value })} />
              <input className="border rounded-lg px-3 py-2" placeholder="Last name" value={editingUser.lastName || ''} onChange={e => setEditingUser({ ...editingUser, lastName: e.target.value })} />
              <input className="border rounded-lg px-3 py-2" placeholder="Email" value={editingUser.email || ''} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} />
              <select className="border rounded-lg px-3 py-2" value={editingUser.role || 'owner'} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}>
                <option value="owner">Owner</option>
                <option value="carer">Carer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {editingUser.role === 'carer' && (
              <>
                <textarea className="w-full border rounded-lg px-3 py-2" placeholder="Bio" value={editingUser.bio || ''} onChange={e => setEditingUser({ ...editingUser, bio: e.target.value })} />
                <input className="w-full border rounded-lg px-3 py-2" placeholder="Services comma separated" value={(editingUser.services || []).join?.(', ') || editingUser.services || ''} onChange={e => setEditingUser({ ...editingUser, services: e.target.value })} />
                <input className="w-full border rounded-lg px-3 py-2" placeholder="Availability comma separated" value={(editingUser.availability || []).join?.(', ') || editingUser.availability || ''} onChange={e => setEditingUser({ ...editingUser, availability: e.target.value })} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(editingUser.verified)} onChange={e => setEditingUser({ ...editingUser, verified: e.target.checked })} /> Verified carer</label>
              </>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-slate-600">Cancel</button>
              <button className="px-5 py-2 rounded-lg bg-brand-600 text-white font-semibold">Save</button>
            </div>
          </form>
        </div>
      )}

      {editingPet && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSavePet} className="bg-white rounded-xl shadow-lg w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Edit Pet</h2>
              <button type="button" onClick={() => setEditingPet(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="border rounded-lg px-3 py-2" placeholder="Name" value={editingPet.name || ''} onChange={e => setEditingPet({ ...editingPet, name: e.target.value })} />
              <input className="border rounded-lg px-3 py-2" placeholder="Type" value={editingPet.type || ''} onChange={e => setEditingPet({ ...editingPet, type: e.target.value })} />
              <input className="border rounded-lg px-3 py-2" placeholder="Breed" value={editingPet.breed || ''} onChange={e => setEditingPet({ ...editingPet, breed: e.target.value })} />
              <input className="border rounded-lg px-3 py-2" placeholder="Age" value={editingPet.age || ''} onChange={e => setEditingPet({ ...editingPet, age: e.target.value })} />
            </div>
            <textarea className="w-full border rounded-lg px-3 py-2" placeholder="Feeding" value={editingPet.feeding || ''} onChange={e => setEditingPet({ ...editingPet, feeding: e.target.value })} />
            <textarea className="w-full border rounded-lg px-3 py-2" placeholder="Medical" value={editingPet.medical || ''} onChange={e => setEditingPet({ ...editingPet, medical: e.target.value })} />
            <textarea className="w-full border rounded-lg px-3 py-2" placeholder="Behaviour" value={editingPet.behaviour || ''} onChange={e => setEditingPet({ ...editingPet, behaviour: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Image URL" value={editingPet.imageUrl || ''} onChange={e => setEditingPet({ ...editingPet, imageUrl: e.target.value })} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingPet(null)} className="px-4 py-2 text-slate-600">Cancel</button>
              <button className="px-5 py-2 rounded-lg bg-brand-600 text-white font-semibold">Save</button>
            </div>
          </form>
        </div>
      )}

      {selectedCarer && (() => {
        const { carerReviews, carerBookings, completed, averageRating } = getCarerStats(selectedCarer);
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedCarer.firstName} {selectedCarer.lastName}</h2>
                  <p className="text-sm text-slate-500">{selectedCarer.email}</p>
                  <p className={`inline-flex mt-2 px-2 py-1 rounded-full text-xs font-semibold ${selectedCarer.verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {selectedCarer.verified ? 'Verified' : 'Pending verification'}
                  </p>
                </div>
                <button onClick={() => setSelectedCarer(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="border border-slate-200 rounded-xl p-4">
                    <p className="text-sm text-slate-500">Rating</p>
                    <p className="text-2xl font-bold text-slate-900">{averageRating ? averageRating.toFixed(1) : 'New'}</p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4">
                    <p className="text-sm text-slate-500">Reviews</p>
                    <p className="text-2xl font-bold text-slate-900">{carerReviews.length}</p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4">
                    <p className="text-sm text-slate-500">Bookings</p>
                    <p className="text-2xl font-bold text-slate-900">{carerBookings.length}</p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4">
                    <p className="text-sm text-slate-500">Completed</p>
                    <p className="text-2xl font-bold text-slate-900">{completed}</p>
                  </div>
                </div>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Profile Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="border border-slate-200 rounded-xl p-4">
                      <p className="text-slate-500 mb-1">Bio</p>
                      <p className="text-slate-800">{selectedCarer.bio || 'No bio added.'}</p>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-4">
                      <p className="text-slate-500 mb-1">Services Offered</p>
                      <p className="text-slate-800">{(selectedCarer.services || []).join(', ') || 'No services listed.'}</p>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-4">
                      <p className="text-slate-500 mb-1">Preferred Pets</p>
                      <p className="text-slate-800">{(selectedCarer.preferredPets || []).join(', ') || 'No preferred pets listed.'}</p>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-4">
                      <p className="text-slate-500 mb-1">Availability</p>
                      <p className="text-slate-800">{(selectedCarer.availability || []).join(', ') || 'No availability set.'}</p>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-4">
                      <p className="text-slate-500 mb-1">Special Needs Support</p>
                      <p className="text-slate-800">{selectedCarer.specialNeeds || selectedCarer.canHandleSpecialNeeds ? 'Yes' : 'No'}</p>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-4">
                      <p className="text-slate-500 mb-1">Location</p>
                      <p className="text-slate-800">
                        {selectedCarer.location ? `${selectedCarer.location.lat}, ${selectedCarer.location.lng}` : 'No location saved.'}
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Reviews</h3>
                  {carerReviews.length ? (
                    <div className="space-y-3">
                      {carerReviews.map(review => (
                        <div key={review.id} className="border border-slate-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-amber-500 mb-2">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="font-semibold">{Number(review.rating || 0).toFixed(1)}</span>
                          </div>
                          <p className="text-sm text-slate-700">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No reviews yet.</p>
                  )}
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Booking History</h3>
                  {carerBookings.length ? (
                    <div className="overflow-hidden border border-slate-200 rounded-xl">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Service</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Owner</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {carerBookings.map(booking => (
                            <tr key={booking.id}>
                              <td className="px-4 py-3 text-sm text-slate-900">{booking.service}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{booking.date}</td>
                              <td className="px-4 py-3 text-sm text-slate-600 capitalize">{booking.status}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{booking.ownerName || getUserDisplayName(booking.ownerId)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No bookings found for this carer.</p>
                  )}
                </section>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button onClick={() => setSelectedCarer(null)} className="px-4 py-2 text-slate-600">Close</button>
                  <button
                    onClick={() => handleVerifyCarer(selectedCarer.id, !selectedCarer.verified)}
                    className={`px-5 py-2 rounded-lg font-semibold ${selectedCarer.verified ? 'bg-slate-100 text-slate-700' : 'bg-brand-600 text-white'}`}
                  >
                    {selectedCarer.verified ? 'Unverify Carer' : 'Verify Carer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
        </main>
      </div>
    </div>
  );
}
