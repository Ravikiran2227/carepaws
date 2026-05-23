export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;

  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function getCompatibilityScore(pet, carer, distance) {
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
    const petMatchesPreference = preferredPets.some((preference) =>
      (petType && preference === petType) ||
      (petBreed && (petBreed.includes(preference) || preference.includes(petBreed)))
    );

    if (petMatchesPreference) {
      petFitScore += 15;
    }
  }

  if (hasMedicalNeeds && handlesSpecialNeeds) {
    petFitScore += 10;
  } else if (!hasMedicalNeeds) {
    petFitScore += 10;
  }

  if (services.length > 0) {
    petFitScore += 10;
  }

  return Math.round(Math.min(100, ratingScore + completedScore + Math.min(35, petFitScore) + proximityScore));
}
