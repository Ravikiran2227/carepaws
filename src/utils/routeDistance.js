const ORS_API_KEY = import.meta.env.VITE_OPENROUTESERVICE_API_KEY;
const ORS_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';

function isValidCoordinate(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

export async function getDrivingDistanceKm(origin, destination) {
  if (!ORS_API_KEY) return null;
  if (!origin || !destination) return null;
  if (!isValidCoordinate(origin.lat, origin.lng) || !isValidCoordinate(destination.lat, destination.lng)) {
    return null;
  }

  const response = await fetch(ORS_DIRECTIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: ORS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      coordinates: [
        [Number(origin.lng), Number(origin.lat)],
        [Number(destination.lng), Number(destination.lat)],
      ],
      units: 'km',
    }),
  });

  if (!response.ok) {
    throw new Error(`openrouteservice distance request failed: ${response.status}`);
  }

  const data = await response.json();
  const distance =
    data?.routes?.[0]?.summary?.distance ??
    data?.features?.[0]?.properties?.summary?.distance;

  return Number.isFinite(distance) ? distance : null;
}
