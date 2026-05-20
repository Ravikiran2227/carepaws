import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { getImageExtension, uploadImageFile, validateImageFile } from '../utils/imageUpload';

export default function Profile() {
  const { currentUser, userData, setUserData } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [bio, setBio] = useState('');
  const [services, setServices] = useState([]);
  const [preferredPets, setPreferredPets] = useState([]);
  const [specialNeeds, setSpecialNeeds] = useState(false);
  const [availability, setAvailability] = useState([]);
  const [photoURL, setPhotoURL] = useState('');
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const serviceOptions = ['Walking', 'Sitting', 'Boarding', 'Drop-in Visits', 'Grooming'];
  const petOptions = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];
  const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    if (userData) {
      setFirstName(userData.firstName || '');
      setLastName(userData.lastName || '');
      setBio(userData.bio || '');
      setServices(userData.services || []);
      setPreferredPets(userData.preferredPets || []);
      setSpecialNeeds(Boolean(userData.specialNeeds || userData.canHandleSpecialNeeds));
      setAvailability(userData.availability || []);
      setPhotoURL(userData.photoURL || '');
      if (userData.location) {
        setLatitude(userData.location.lat ?? '');
        setLongitude(userData.location.lng ?? '');
      }
    }
  }, [userData]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocation is not supported by your browser.' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocating(false);
        setMessage({ type: 'success', text: 'Location retrieved successfully.' });
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setMessage({ type: 'error', text: 'Failed to retrieve location.' });
        setLocating(false);
      }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      let uploadedPhotoURL = photoURL;
      if (profileImageFile) {
        const extension = getImageExtension(profileImageFile);
        uploadedPhotoURL = await uploadImageFile(
          `profileImages/${currentUser.uid}/avatar-${Date.now()}.${extension}`,
          profileImageFile
        );
      }

      const updateData = {
        firstName,
        lastName,
        photoURL: uploadedPhotoURL,
        ...(userData.role === 'carer' && {
          bio,
          services,
          preferredPets,
          specialNeeds,
          canHandleSpecialNeeds: specialNeeds,
          availability
        })
      };

      if (latitude !== '' && longitude !== '') {
        updateData.location = {
          lat: parseFloat(latitude),
          lng: parseFloat(longitude)
        };
      }

      await updateDoc(userRef, updateData);
      setUserData?.({ ...userData, ...updateData });
      setPhotoURL(uploadedPhotoURL);
      setProfileImageFile(null);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || !userData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Your Profile</h1>

      {message.text && (
        <div className={`mb-6 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-100">
          <div className="w-24 h-24 rounded-full bg-brand-50 border border-brand-100 overflow-hidden flex items-center justify-center text-2xl font-bold text-brand-700">
            {profileImageFile ? (
              <img src={URL.createObjectURL(profileImageFile)} alt="Profile preview" className="w-full h-full object-cover" />
            ) : photoURL ? (
              <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U'
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Profile Picture</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                try {
                  if (file) validateImageFile(file);
                  setProfileImageFile(file);
                  setMessage({ type: '', text: '' });
                } catch (error) {
                  setProfileImageFile(null);
                  setMessage({ type: 'error', text: error.message });
                }
              }}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
            />
            <p className="text-xs text-slate-400 mt-2">Uploads to Firebase Storage when enabled.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Editable Fields */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
              required
            />
          </div>
        </div>

        {/* Read-only Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">
              Email
            </label>
            <input
              type="email"
              value={userData.email || ''}
              disabled
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-500 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-slate-400">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">
              Role
            </label>
            <input
              type="text"
              value={userData.role || ''}
              disabled
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-500 cursor-not-allowed capitalize"
            />
          </div>
        </div>

        {userData.role === 'carer' && (
          <div className="pt-6 border-t border-slate-100 space-y-6">
            <h2 className="text-lg font-medium text-slate-800">Carer Profile</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors min-h-24"
                placeholder="Tell pet owners about your experience."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Services Offered</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {serviceOptions.map((service) => (
                  <label key={service} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={services.includes(service)}
                      onChange={(e) => {
                        setServices((prev) => e.target.checked
                          ? [...prev, service]
                          : prev.filter((item) => item !== service));
                      }}
                    />
                    {service}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Pets</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {petOptions.map((pet) => (
                  <label key={pet} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={preferredPets.includes(pet)}
                      onChange={(e) => {
                        setPreferredPets((prev) => e.target.checked
                          ? [...prev, pet]
                          : prev.filter((item) => item !== pet));
                      }}
                    />
                    {pet}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={specialNeeds}
                onChange={(e) => setSpecialNeeds(e.target.checked)}
              />
              I can handle pets with medical or special needs
            </label>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Availability</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dayOptions.map((day) => (
                  <label key={day} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={availability.includes(day)}
                      onChange={(e) => {
                        setAvailability((prev) => e.target.checked
                          ? [...prev, day]
                          : prev.filter((item) => item !== day));
                      }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Location Fields */}
        <div className="pt-6 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            <h2 className="text-lg font-medium text-slate-800">Location Management</h2>
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={locating}
              className="px-4 py-2 text-sm bg-brand-50 text-brand-700 border border-brand-200 rounded-md font-medium hover:bg-brand-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors"
            >
              {locating ? 'Locating...' : 'Use Current Location'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
                placeholder="e.g. 40.7128"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
                placeholder="e.g. -74.0060"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-brand-600 text-white rounded-md font-medium hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
